/* «Шутка на двоих» — затравка достаётся двум игрокам, остальные голосуют за смешной ответ.
   Фазы: lobby → cooking → writing → voting → reveal → scores → ... → winner */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiEnabled, generatePrompts, hostQuip } from '../ai.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const data = (f) => JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'data', f), 'utf8'));
const PACK = data('shutka.json');
const BOT_LINES = data('bot-lines.json').lines;

export const TEST_MODE = process.env.BALAGAN_TEST === '1';

export const MAX_WRITERS = 10;          // больше — заходят в зал
const num = (env, def) => Number(process.env[env]) || def;
const t = (env, normal, test) => num(env, TEST_MODE ? test : normal);
const WRITE_SECONDS = t('BALAGAN_WRITE', 80, 35);
const VOTE_SECONDS = t('BALAGAN_VOTE', 20, 12);
const REVEAL_SECONDS = t('BALAGAN_REVEAL', 7, 5);
const SCORES_SECONDS = t('BALAGAN_SCORES', 8, 5);
const TOTAL_ROUNDS = Math.max(1, Math.min(5, num('BALAGAN_ROUNDS', 3)));
const roundValue = (n, total) => (n >= total ? 3000 : n * 1000);
const ANSWER_MAX = 90;

const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const writers = (room) => room.players.filter((p) => !p.audience);
const audience = (room) => room.players.filter((p) => p.audience);

export default {
  id: 'shutka',
  title: 'Шутка на двоих',
  minPlayers: 3,
  maxPlayers: MAX_WRITERS,

  init(room) {
    room.state = {
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      topic: '',
      pool: shuffle(PACK.prompts),
      finalPool: shuffle(PACK.final),
      aiPrompts: null,
      cooking: false,
      matches: [],          // [{ prompt, authors:[id,id], answers:{id:text}, votes:{voterId:authorId}, done }]
      matchIdx: 0,
      quip: null,
      lastRound: null,      // итоги прошлого раунда для табло
      aiEnabled,
      aiNote: aiEnabled ? null : 'ИИ выключен — играем на встроенном паке',
    };
  },

  /* ---------- вход игрока ---------- */
  onPlayerJoin(room, player) {
    if (player.bot) return;
    const full = writers(room).length > MAX_WRITERS;
    const started = room.phase !== 'lobby';
    player.audience = full || started;
    if (player.audience) player.isHost = false;
  },

  /* ---------- действия с телефона ---------- */
  async onAction(room, player, msg) {
    const s = room.state;

    switch (msg.a) {
      case 'topic':
        if (!player.isHost || room.phase !== 'lobby') return;
        s.topic = String(msg.topic || '').slice(0, 120);
        return;

      case 'addBot': {
        if (!TEST_MODE || !player.isHost || room.phase !== 'lobby') return;
        if (writers(room).length >= MAX_WRITERS) return;
        addBot(room);
        return;
      }

      case 'dropBots': {
        if (!TEST_MODE || !player.isHost || room.phase !== 'lobby') return;
        for (const b of room.players.filter((x) => x.bot)) room.dropPlayer(b.id);
        return;
      }

      case 'start': {
        if (!player.isHost || room.phase !== 'lobby') return;
        if (writers(room).length < this.minPlayers) return;
        if (aiEnabled) await cook(room);
        startRound(room, 1);
        return;
      }

      case 'answer': {
        if (room.phase !== 'writing') return;
        const text = String(msg.text || '').replace(/\s+/g, ' ').trim().slice(0, ANSWER_MAX);
        if (!text) return;
        const m = s.matches.find((x) => x.authors.includes(player.id) && !x.answers[player.id]);
        if (!m) return;
        m.answers[player.id] = text;
        if (everyoneWrote(room)) { room.clearTimer(); toVoting(room); }
        return;
      }

      case 'vote': {
        if (room.phase !== 'voting') return;
        const m = s.matches[s.matchIdx];
        if (!m) return;
        if (m.final ? msg.for === player.id : m.authors.includes(player.id)) return;
        if (m.votes[player.id]) return;                     // голос не меняем
        if (!optionsFor(m, player.id).includes(msg.for)) return;
        m.votes[player.id] = msg.for;
        room.sound('vote');
        if (everyoneVoted(room, m)) { room.clearTimer(); reveal(room); }
        return;
      }

      case 'again': {
        if (!player.isHost || room.phase !== 'winner') return;
        this.init(room);
        room.players.forEach((p) => { p.score = 0; });
        // зал становится игроками, если место есть
        room.players.forEach((p, i) => { p.audience = i >= MAX_WRITERS; });
        if (room.players[0]) room.players[0].isHost = true;
        room.phase = 'lobby';
        room.clearTimer();
        return;
      }
    }
  },

  /* ---------- дедлайн фазы ---------- */
  onTimeout(room) {
    if (room.phase === 'writing') return toVoting(room);
    if (room.phase === 'voting') return reveal(room);
    if (room.phase === 'reveal') return afterReveal(room);
    if (room.phase === 'scores') return nextRound(room);
  },

  /* ---------- что видит телевизор ---------- */
  viewTV(room) {
    const s = room.state;
    const base = {
      round: s.round, totalRounds: s.totalRounds, topic: s.topic,
      aiEnabled: s.aiEnabled, aiNote: s.aiNote,
      audienceCount: audience(room).filter((p) => p.connected).length,
      writers: writers(room).map((p) => p.id),
      minPlayers: this.minPlayers,
    };

    if (room.phase === 'writing') {
      return {
        ...base,
        wrote: writers(room).map((p) => ({ id: p.id, done: answersOf(room, p).length, need: assignedTo(room, p) })),
        roundValue: roundValue(s.round, s.totalRounds),
      };
    }

    if (room.phase === 'voting') {
      const m = s.matches[s.matchIdx];
      if (!m) return base;
      return {
        ...base,
        matchNo: s.matchIdx + 1,
        matchTotal: s.matches.length,
        prompt: m.prompt,
        final: !!m.final,
        options: optionsFor(m, null).map((id) => ({ id, text: m.answers[id] || null })),
        voted: Object.keys(m.votes).length,
        voters: voterIds(room, m).length,
      };
    }

    if (room.phase === 'reveal') {
      const m = s.matches[s.matchIdx];
      if (!m) return base;
      return {
        ...base,
        matchNo: s.matchIdx + 1,
        matchTotal: s.matches.length,
        prompt: m.prompt,
        final: !!m.final,
        result: m.result,
        quip: s.quip,
      };
    }

    if (room.phase === 'scores' || room.phase === 'winner') {
      const table = writers(room).map((p) => ({ id: p.id, gained: s.lastRound?.[p.id] || 0 }));
      return { ...base, table, isFinal: room.phase === 'winner' };
    }

    return base;
  },

  /* ---------- что видит телефон ---------- */
  viewPlayer(room, p) {
    const s = room.state;
    const my = { audience: !!p.audience, round: s.round, roundValue: roundValue(s.round, s.totalRounds) };

    if (room.phase === 'lobby') {
      return { ...my, canStart: p.isHost && writers(room).length >= this.minPlayers,
        need: Math.max(0, this.minPlayers - writers(room).length),
        topic: s.topic, aiEnabled: s.aiEnabled,
        test: TEST_MODE, bots: room.players.filter((x) => x.bot).length };
    }

    if (room.phase === 'cooking') return { ...my, waiting: 'Придумываем задания под вашу компанию…' };

    if (room.phase === 'writing') {
      if (p.audience) return { ...my, waiting: 'Игроки пишут шутки. Голосовать будешь ты.' };
      const mine = s.matches.filter((m) => m.authors.includes(p.id));
      const pending = mine.find((m) => !m.answers[p.id]);
      return {
        ...my,
        task: pending ? { prompt: pending.prompt, no: mine.indexOf(pending) + 1, of: mine.length, final: !!pending.final } : null,
        waiting: pending ? null : 'Готово. Ждём остальных.',
      };
    }

    if (room.phase === 'voting') {
      const m = s.matches[s.matchIdx];
      if (!m) return my;
      if (!m.final && m.authors.includes(p.id)) return { ...my, waiting: 'Это твоя шутка — смотри на экран.' };
      const ids = optionsFor(m, p.id);
      if (!ids.length) return { ...my, waiting: 'Голосовать не за что — смотри на экран.' };
      return {
        ...my,
        vote: {
          prompt: m.prompt,
          final: !!m.final,
          options: ids.map((id) => ({ id, text: m.answers[id] || '— промолчал —' })),
        },
        votedFor: m.votes[p.id] || null,
      };
    }

    if (room.phase === 'winner') {
      const top = [...writers(room)].sort((a, b) => b.score - a.score)[0];
      return { ...my, winner: top ? { id: top.id, name: top.name, score: top.score } : null, canRestart: p.isHost };
    }

    return { ...my, waiting: 'Смотри на экран' };
  },
};

/* =================== боты (только в тестовом режиме) =================== */

const BOT_NAMES = ['Бот Сеня', 'Бот Клава', 'Бот Гоша', 'Бот Рита', 'Бот Зина', 'Бот Фёдор'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const soon = (min, max) => min + Math.random() * (max - min);

export function addBot(room) {
  const used = new Set(room.players.map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) || `Бот ${room.players.length + 1}`;
  const b = room.addPlayer(name);
  b.bot = true;
  b.isHost = false;
  b.audience = false;
  return b;
}

/* Снимаем запланированные ходы ботов — фаза сменилась */
function clearBots(room) {
  for (const id of room.botTimers || []) clearTimeout(id);
  room.botTimers = [];
}

function laterBot(room, seconds, fn) {
  room.botTimers = room.botTimers || [];
  room.botTimers.push(setTimeout(fn, seconds * 1000));
}

/* Боты пишут шутки */
function botsWrite(room) {
  clearBots(room);
  const s = room.state;
  for (const b of room.players.filter((p) => p.bot)) {
    const mine = s.matches.filter((m) => m.authors.includes(b.id));
    mine.forEach((m, i) => {
      laterBot(room, soon(2, Math.min(WRITE_SECONDS - 4, 10)) + i * 1.5, () => {
        if (room.phase !== 'writing' || m.answers[b.id]) return;
        m.answers[b.id] = pick(BOT_LINES);
        if (everyoneWrote(room)) { room.clearTimer(); clearBots(room); toVoting(room); }
        else room.push();
      });
    });
  }
}

/* Боты голосуют */
function botsVote(room) {
  clearBots(room);
  const s = room.state;
  const m = s.matches[s.matchIdx];
  if (!m) return;
  const idx = s.matchIdx;
  for (const b of room.players.filter((p) => p.bot)) {
    const opts = optionsFor(m, b.id);
    if (!opts.length || (!m.final && m.authors.includes(b.id))) continue;
    laterBot(room, soon(1.5, Math.min(VOTE_SECONDS - 3, 7)), () => {
      if (room.phase !== 'voting' || s.matchIdx !== idx || m.votes[b.id]) return;
      m.votes[b.id] = pick(opts);
      if (everyoneVoted(room, m)) { room.clearTimer(); clearBots(room); reveal(room); }
      else room.push();
    });
  }
}

/* =================== внутренняя механика =================== */

function answersOf(room, p) {
  return room.state.matches.filter((m) => m.authors.includes(p.id) && m.answers[p.id]);
}

/* сколько затравок досталось игроку: две в обычном раунде, одна в финале */
function assignedTo(room, p) {
  return room.state.matches.filter((m) => m.authors.includes(p.id)).length;
}

function everyoneWrote(room) {
  return writers(room).every((p) => !p.connected || answersOf(room, p).length >= assignedTo(room, p));
}

/* Варианты для голосующего: в финале — все ответившие, кроме себя; в обычном раунде — оба ответа пары */
function optionsFor(m, voterId) {
  if (!m.final) return m.authors;
  return m.authors.filter((id) => m.answers[id] && id !== voterId);
}

function voterIds(room, m) {
  return room.players
    .filter((p) => p.connected && (m.final ? optionsFor(m, p.id).length > 0 : !m.authors.includes(p.id)))
    .map((p) => p.id);
}

function everyoneVoted(room, m) {
  const ids = voterIds(room, m);
  return ids.length > 0 && ids.every((id) => m.votes[id]);
}

/* ИИ придумывает затравки под компанию */
async function cook(room) {
  const s = room.state;
  room.phase = 'cooking';
  s.cooking = true;
  room.push();
  const names = writers(room).map((p) => p.name);
  const { list, note } = await generatePrompts({ count: writers(room).length * 2 + 6, topic: s.topic, names });
  s.cooking = false;

  if (list?.length) {
    // затравки раздаются через pop(), поэтому свежие кладём в конец — они уйдут первыми
    const forFinal = list.slice(0, Math.min(2, list.length - 1));
    const forRounds = list.slice(forFinal.length);
    s.aiPrompts = list;
    s.pool = [...s.pool, ...forRounds];
    s.finalPool = [...s.finalPool, ...forFinal];
    s.aiNote = `${list.length} заданий от ИИ${s.topic ? ` · «${s.topic}»` : ''}`;
  } else {
    s.aiNote = `${note || 'ИИ не ответил'} — играем на встроенном паке`;
  }
}

/* Раздача: N затравок на N игроков, каждая достаётся паре соседей по кругу */
function startRound(room, n) {
  const s = room.state;
  s.round = n;
  s.matchIdx = 0;
  s.quip = null;
  s.lastRound = {};

  const ring = shuffle(writers(room).map((p) => p.id));
  const N = ring.length;

  if (n === s.totalRounds) {
    // финал: одна затравка на всех
    const prompt = s.finalPool.pop() || s.pool.pop() || 'Самое смешное, что случилось за этот вечер: ___';
    s.matches = [{ prompt, authors: ring, answers: {}, votes: {}, final: true }];
  } else {
    const picks = [];
    for (let i = 0; i < N; i++) picks.push(s.pool.pop() || PACK.prompts[i % PACK.prompts.length]);
    s.matches = picks.map((prompt, i) => ({
      prompt, authors: [ring[i], ring[(i + 1) % N]], answers: {}, votes: {},
    }));
  }

  room.phase = 'writing';
  room.sound('round');
  room.setTimer(WRITE_SECONDS, () => room.game.onTimeout(room));
  if (TEST_MODE) botsWrite(room);
  room.push();
}

function toVoting(room) {
  const s = room.state;
  s.matchIdx = 0;
  room.phase = 'voting';
  room.sound('open');
  room.setTimer(VOTE_SECONDS, () => room.game.onTimeout(room));
  if (TEST_MODE) botsVote(room);
  room.push();
}

/* Подсчёт голосов текущей пары */
async function reveal(room) {
  const s = room.state;
  const m = s.matches[s.matchIdx];
  if (!m) return afterReveal(room);

  const tally = {};
  for (const id of m.authors) tally[id] = 0;
  for (const target of Object.values(m.votes)) if (target in tally) tally[target]++;

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const value = roundValue(s.round, s.totalRounds);

  const shown = m.final ? m.authors.filter((id) => m.answers[id]) : m.authors;
  const rows = shown.map((id) => {
    const p = room.byId(id);
    const votes = tally[id] || 0;
    const noAnswer = !m.answers[id];
    const share = total ? votes / total : 0;
    const pts = noAnswer ? 0 : Math.round(share * value / 10) * 10;
    if (p) { p.score += pts; s.lastRound[id] = (s.lastRound[id] || 0) + pts; }
    return { id, name: p?.name || '—', color: p?.color || '#888', emoji: p?.emoji || '', text: m.answers[id] || null, votes, pts };
  }).sort((a, b) => b.votes - a.votes);

  const shutout = total > 1 && rows[0].votes === total && rows[0].text;
  if (shutout) {
    const p = room.byId(rows[0].id);
    const bonus = Math.round(value * 0.25);
    if (p) { p.score += bonus; s.lastRound[rows[0].id] += bonus; rows[0].pts += bonus; }
    rows[0].shutout = true;
  }

  m.result = { rows, total, shutout };
  room.phase = 'reveal';
  room.sound(shutout ? 'shutout' : 'reveal');
  s.quip = null;
  room.setTimer(REVEAL_SECONDS, () => room.game.onTimeout(room));
  room.push();

  // реплика ведущего догоняет экран, когда ИИ ответит
  if (aiEnabled && rows[0]?.text) {
    const atMatch = `${s.round}:${s.matchIdx}`;
    const line = await hostQuip({
      prompt: m.prompt,
      winner: { text: rows[0].text, name: rows[0].name, votes: rows[0].votes },
      loser: rows[1]?.text ? { text: rows[1].text, name: rows[1].name, votes: rows[1].votes } : null,
      shutout,
    });
    if (line && room.phase === 'reveal' && `${s.round}:${s.matchIdx}` === atMatch) {
      s.quip = line;
      room.push();
    }
  }
}

function afterReveal(room) {
  const s = room.state;
  if (s.matchIdx + 1 < s.matches.length) {
    s.matchIdx++;
    s.quip = null;
    room.phase = 'voting';
    room.sound('open');
    room.setTimer(VOTE_SECONDS, () => room.game.onTimeout(room));
    if (TEST_MODE) botsVote(room);
    return room.push();
  }
  // раунд кончился
  if (s.round >= s.totalRounds) {
    room.phase = 'winner';
    room.clearTimer();
    room.sound('win');
    return room.push();
  }
  room.phase = 'scores';
  room.sound('scores');
  room.setTimer(SCORES_SECONDS, () => room.game.onTimeout(room));
  room.push();
}

function nextRound(room) {
  startRound(room, room.state.round + 1);
}
