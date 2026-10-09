/* «Собеседование» — HR-нейросеть Анжела задаёт вопросы, а отвечать можно только чужими словами.
   Сначала разогрев: все пишут ответы на простые вопросы. Потом слова перемешиваются,
   и каждый собирает ответ на собеседовании из чужих слов, как магнитики на холодильнике.
   Очки — автору ответа и тем, чьи слова он взял. */

import { data, Deck, shuffle, pick, rnd, secs, clean, tally, playing, online } from '../lib.mjs';

const PACK = data('sobes.json');

const T = {
  ice: secs('BALAGAN_SOBES_ICE', 60, 30),
  ice2: secs('BALAGAN_SOBES_ICE2', 35, 20),
  compose: secs('BALAGAN_SOBES_COMPOSE', 80, 40),
  vote: secs('BALAGAN_SOBES_VOTE', 20, 12),
  reveal: secs('BALAGAN_SOBES_REVEAL', 7, 5),
  scores: secs('BALAGAN_SOBES_SCORES', 7, 5),
};
const VALUE = [1000, 1500, 2000];
const ANGELA = 'angela';
const MIN_WORDS = 4;
const MAX_TILES = 14;

const LINES = {
  ice: 'Здравствуйте. Я Анжела, нейросеть отдела кадров. Для начала — пара простых вопросов. Отвечайте развёрнуто, ваши слова мне ещё пригодятся.',
  ice2: 'Ещё немного о вас. Слов много не бывает.',
  compose: ['Отвечайте на вопрос. Чужими словами.', 'Собирайте ответ из того, что есть.', 'Анжела ждёт ваш ответ.'],
  win: ['Анжела довольна.', 'Хороший кандидат.', 'Записываю в личное дело.'],
  angelaWin: 'Анжела ответила лучше людей. Тревожный знак.',
};

export default {
  id: 'sobes',
  title: 'Собеседование',
  tagline: 'Отвечай HR-нейросети чужими словами — и получи должность',
  minPlayers: 3,
  maxPlayers: 10,
  tags: ['Слова', 'Шутки'],
  ratings: ['family', 'adult'],
  minutes: 20,
  intro: 'Собеседование. Отвечайте на вопросы отдела кадров. Но только чужими словами.',
  rules: [
    'Разогрев: ответь на пару простых вопросов, минимум четыре слова',
    'Слова перемешиваются и уходят другим игрокам',
    'Собери ответ на вопрос собеседования из чужих слов — как магнитики на холодильнике',
    'Голосуют все. Очки — автору и тем, чьи слова он взял',
    'Лучший кандидат получает должность',
  ],

  init(room) {
    room.state = {
      round: 0,
      ice: new Deck(PACK.icebreakers),
      q: PACK.rounds.map((r) => new Deck(r.questions)),
      bank: [],             // { w, by } — все слова из разогрева
      iceTasks: {},         // playerId → [{ q, done }]
      matches: [],          // { q, authors:[id,id|ANGELA], banks:{id:[tiles]}, answers:{id:[idx]}, votes }
      idx: 0,
      gains: {},
      job: null,
    };
  },

  start(room) { startIce(room, 2, T.ice, LINES.ice); },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'ice': {
        if (room.phase !== 'ice' || p.audience) return;
        const tasks = s.iceTasks[p.id] || [];
        const t = tasks[msg.n];
        if (!t || t.done) return;
        const text = clean(msg.text, 140);
        if (words(text).length < MIN_WORDS) return;
        t.done = true;
        for (const w of words(text)) s.bank.push({ w, by: p.id });
        room.sound('type');
        if (playing(room).every((x) => !x.connected || (s.iceTasks[x.id] || []).every((k) => k.done))) {
          room.clearTimer();
          startRound(room, s.round + 1);
        }
        return;
      }

      case 'compose': {
        if (room.phase !== 'compose' || p.audience) return;
        const m = s.matches.find((x) => x.authors.includes(p.id));
        if (!m || m.answers[p.id]) return;
        const bank = m.banks[p.id];
        const idx = (msg.tiles || []).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < bank.length);
        const uniq = [...new Set(idx)].slice(0, MAX_TILES);
        if (uniq.length < 2) return;
        m.answers[p.id] = uniq;
        room.sound('pop');
        if (s.matches.every((x) => x.authors.every((a) => a === ANGELA || x.answers[a] || !room.byId(a)?.connected))) {
          room.clearTimer();
          toVoting(room);
        }
        return;
      }

      case 'vote': {
        if (room.phase !== 'voting') return;
        const m = s.matches[s.idx];
        if (!m || m.authors.includes(p.id) || m.votes[p.id] || !m.authors.includes(msg.for)) return;
        m.votes[p.id] = msg.for;
        room.sound('vote');
        if (voters(room, m).every((id) => m.votes[id])) { room.clearTimer(); reveal(room); }
        return;
      }
    }
  },

  viewTV(room) {
    const s = room.state;
    const base = { round: s.round, rounds: PACK.rounds.length, roundTitle: PACK.rounds[s.round - 1]?.title || '' };
    if (room.phase === 'ice') {
      return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: (s.iceTasks[p.id] || []).filter((t) => t.done).length, need: (s.iceTasks[p.id] || []).length })), words: s.bank.length };
    }
    if (room.phase === 'compose') {
      return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: s.matches.some((m) => m.answers[p.id]) ? 1 : 0, need: 1 })) };
    }
    const m = s.matches[s.idx];
    if (room.phase === 'voting' && m) {
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, q: m.q, options: m.authors.map((a) => ({ id: a, tiles: tilesOf(m, a) })), voted: Object.keys(m.votes).length, voters: voters(room, m).length };
    }
    if (room.phase === 'reveal' && m) {
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, q: m.q, result: m.result };
    }
    if (room.phase === 'scores' || room.phase === 'winner') return { ...base, gains: s.gains, job: s.job };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    const my = { round: s.round };
    if (room.phase === 'ice') {
      if (p.audience) return { ...my, wait: 'Кандидаты рассказывают о себе' };
      const tasks = s.iceTasks[p.id] || [];
      const n = tasks.findIndex((t) => !t.done);
      if (n < 0) return { ...my, wait: 'Принято. Анжела запоминает ваши слова' };
      return { ...my, ice: { n, q: tasks[n].q, no: n + 1, of: tasks.length, min: MIN_WORDS } };
    }
    if (room.phase === 'compose') {
      if (p.audience) return { ...my, wait: 'Кандидаты собирают ответы' };
      const m = s.matches.find((x) => x.authors.includes(p.id));
      if (!m) return { ...my, wait: 'В этом раунде ты отдыхаешь' };
      if (m.answers[p.id]) return { ...my, wait: 'Ответ отправлен. Ждём остальных' };
      return { ...my, compose: { q: m.q, bank: m.banks[p.id].map((t) => ({ w: t.w, by: t.by })), max: MAX_TILES } };
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (!m) return my;
      if (m.authors.includes(p.id)) return { ...my, wait: 'Это твой ответ — смотри на экран' };
      return { ...my, vote: { q: m.q, options: m.authors.map((a) => ({ id: a, text: textOf(tilesOf(m, a)) })) }, votedFor: m.votes[p.id] || null };
    }
    if (room.phase === 'winner') {
      const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
      return { ...my, winner: top ? { id: top.id, name: top.name, score: top.score } : null, job: s.job };
    }
    return { ...my, wait: 'Смотри на экран' };
  },

  stepKey: (room) => `${room.phase}:${room.state.round}:${room.state.idx}`,

  botMoves(room, b) {
    const s = room.state;
    const moves = [];
    if (room.phase === 'ice' && !b.audience) {
      (s.iceTasks[b.id] || []).forEach((t, n) => { if (!t.done) moves.push({ delay: rnd(2, 6) + n * 2, msg: { a: 'ice', n, text: pick(PACK.botIce) } }); });
    }
    if (room.phase === 'compose' && !b.audience) {
      const m = s.matches.find((x) => x.authors.includes(b.id));
      if (m && !m.answers[b.id]) {
        const bank = m.banks[b.id];
        const own = shuffle(bank.map((_, i) => i).filter((i) => bank[i].by)).slice(0, 2 + Math.floor(Math.random() * 3));
        const glue = shuffle(bank.map((_, i) => i).filter((i) => !bank[i].by && /\p{L}/u.test(bank[i].w))).slice(0, 2);
        moves.push({ delay: rnd(4, 12), msg: { a: 'compose', tiles: shuffle([...own, ...glue]) } });
      }
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (m && !m.authors.includes(b.id)) moves.push({ delay: rnd(1.5, 6), msg: { a: 'vote', for: pick(m.authors) } });
    }
    return moves;
  },
};

/* =================== механика =================== */

/* слова и знаки препинания из ответа игрока */
function words(text) {
  return (String(text).toLowerCase().match(/[\p{L}\p{N}-]+|[!?]/gu) || []).filter((w) => w !== '-').slice(0, 30);
}

const tilesOf = (m, a) => (m.answers[a] || []).map((i) => m.banks[a][i]).filter(Boolean);

/* склеиваем фишки в фразу: знаки липнут к слову, первая буква заглавная */
function textOf(tiles) {
  let out = '';
  for (const t of tiles) out += /^[,.!?]$/.test(t.w) ? t.w : (out ? ' ' : '') + t.w;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function voters(room, m) {
  return online(room.players).filter((p) => !m.authors.includes(p.id)).map((p) => p.id);
}

function startIce(room, n, seconds, say) {
  const s = room.state;
  for (const p of playing(room)) s.iceTasks[p.id] = Array.from({ length: n }, () => ({ q: s.ice.draw(), done: false }));
  room.phase = 'ice';
  room.say(say);
  room.sound('round');
  room.setTimer(seconds, () => startRound(room, s.round + 1));
  room.push();
}

/* банк слов для игрока: слова двух-трёх других игроков, слова вопроса и связки */
function bankFor(room, pid, q) {
  const s = room.state;
  const others = shuffle([...new Set(s.bank.filter((t) => t.by !== pid).map((t) => t.by))]).slice(0, 3);
  const theirs = shuffle(s.bank.filter((t) => others.includes(t.by)));
  const seen = new Set();
  const tiles = [];
  for (const t of theirs) {
    if (seen.has(t.w) || tiles.length >= 26) continue;
    seen.add(t.w); tiles.push({ w: t.w, by: t.by });
  }
  for (const w of words(q)) if (!seen.has(w)) { seen.add(w); tiles.push({ w, by: null }); }
  for (const w of PACK.glue) if (!seen.has(w)) { seen.add(w); tiles.push({ w, by: null }); }
  return tiles;
}

function startRound(room, n) {
  const s = room.state;
  s.round = n;
  s.idx = 0;
  s.gains = {};
  const ring = shuffle(playing(room).map((p) => p.id));
  if (ring.length % 2) ring.push(ANGELA);
  s.matches = [];
  for (let i = 0; i < ring.length; i += 2) {
    const q = s.q[n - 1].draw();
    const authors = [ring[i], ring[i + 1]];
    const banks = {};
    for (const a of authors) banks[a] = bankFor(room, a, q);
    s.matches.push({ q, authors, banks, answers: {}, votes: {} });
  }
  // Анжела тоже отвечает — как умеет
  for (const m of s.matches) {
    if (!m.authors.includes(ANGELA)) continue;
    const b = m.banks[ANGELA];
    const idx = shuffle(b.map((_, i) => i).filter((i) => /\p{L}/u.test(b[i].w))).slice(0, 4 + Math.floor(Math.random() * 3));
    m.answers[ANGELA] = idx;
  }
  room.phase = 'compose';
  room.sound('open');
  room.say(`${PACK.rounds[n - 1].title}. ${pick(LINES.compose)}`);
  room.setTimer(T.compose, () => toVoting(room));
  room.push();
}

function toVoting(room) {
  const s = room.state;
  s.matches = s.matches.filter((m) => m.authors.some((a) => a !== ANGELA && m.answers[a]));
  s.idx = 0;
  if (!s.matches.length) return afterRound(room);
  openVote(room);
}

function openVote(room) {
  const s = room.state;
  const m = s.matches[s.idx];
  room.phase = 'voting';
  room.sound('open');
  const [a, b] = m.authors.map((x) => textOf(tilesOf(m, x)) || 'молчание');
  room.say(`${m.q} Первый кандидат: ${a}. Второй: ${b}.`);
  room.setTimer(T.vote, () => reveal(room));
  room.push();
}

function reveal(room) {
  const s = room.state;
  const m = s.matches[s.idx];
  const val = VALUE[s.round - 1];
  const t = tally(m.votes, m.authors);
  const total = Object.values(t).reduce((x, y) => x + y, 0);
  const rows = m.authors.map((a) => {
    const tiles = tilesOf(m, a);
    const gain = a === ANGELA || !tiles.length || !total ? 0 : Math.round((t[a] / total) * val / 10) * 10;
    if (gain) award(room, a, gain);
    // соавторы: каждое взятое чужое слово приносит его хозяину по 50 за голос
    const credit = {};
    if (t[a]) for (const tile of tiles) if (tile.by && tile.by !== a) credit[tile.by] = (credit[tile.by] || 0) + 50 * t[a];
    for (const [id, pts] of Object.entries(credit)) award(room, id, Math.min(pts, Math.round(val * 0.4)));
    const voters = Object.entries(m.votes).filter(([, to]) => to === a).map(([v]) => v);
    return { id: a, tiles, votes: t[a], pts: gain, credit, voters };
  }).sort((x, y) => y.votes - x.votes);
  m.result = { rows, tie: total > 0 && rows[0].votes === rows[1]?.votes };
  room.phase = 'reveal';
  room.sound('reveal');
  room.say(rows[0].id === ANGELA && rows[0].votes > rows[1].votes ? LINES.angelaWin : pick(LINES.win));
  room.setTimer(T.reveal, () => {
    if (s.idx + 1 < s.matches.length) { s.idx++; return openVote(room); }
    afterRound(room);
  });
  room.push();
}

function award(room, id, pts) {
  const p = room.byId(id);
  if (!p || !pts) return;
  p.score += pts;
  room.state.gains[id] = (room.state.gains[id] || 0) + pts;
}

function afterRound(room) {
  const s = room.state;
  if (s.round >= PACK.rounds.length) {
    s.job = pick(PACK.jobs);
    room.phase = 'winner';
    room.clearTimer();
    room.sound('win');
    const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
    if (top) room.say(`Поздравляю, ${top.name}. Вы приняты на должность: ${s.job}.`);
    return room.push();
  }
  room.phase = 'scores';
  room.sound('scores');
  room.setTimer(T.scores, () => startIce(room, 1, T.ice2, LINES.ice2));
  room.push();
}
