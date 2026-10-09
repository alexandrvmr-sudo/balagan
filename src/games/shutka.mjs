/* «Шутка на двоих» — затравка достаётся паре игроков, остальные голосуют за смешной ответ.
   Два раунда дуэлей и финал «Тройной удар»: три ответа на одну затравку, голоса — золото, серебро, бронза. */

import { ask, line, z, aiEnabled } from '../ai.mjs';
import { data, Deck, shuffle, pick, rnd, secs, clean, tally, playing, online } from '../lib.mjs';

const PACK = data('shutka.json');

const ROUNDS = Math.max(2, Math.min(4, Number(process.env.BALAGAN_ROUNDS) || 3));
const T = {
  write: secs('BALAGAN_WRITE', 80, 35),
  final: secs('BALAGAN_FINAL', 90, 40),
  vote: secs('BALAGAN_VOTE', 20, 12),
  fvote: secs('BALAGAN_FVOTE', 30, 15),
  reveal: secs('BALAGAN_REVEAL', 7, 5),
  scores: secs('BALAGAN_SCORES', 8, 5),
};
const value = (round) => (round >= ROUNDS ? 3000 : round * 1000);
const MEDAL = { gold: 3, silver: 2, bronze: 1 };

const HOST = 'Ты — Жанна, бойкая ведущая телешоу «Шутка на двоих». Тёплая, ироничная, подкалываешь по-доброму.';

const LINES = {
  round: ['Раунд первый! Каждому — по две затравки.', 'Раунд второй! Очки удваиваются.', 'Ещё раунд!'],
  final: ['Финал! Тройной удар: три ответа на одну затравку.'],
  shutout: ['Шутка! Все голоса — одному!', 'Разгром! Зал единогласен.', 'Чистая победа!'],
  tie: ['Ничья! Оба хороши.', 'Поровну. Зал не смог выбрать.'],
  silent: ['Кто-то промолчал — и проиграл.', 'Молчание — не всегда золото.'],
  win: ['Отличный ответ!', 'Зал сказал своё слово.', 'Вот это попадание!'],
};

export default {
  id: 'shutka',
  title: 'Шутка на двоих',
  tagline: 'Двоим — одна затравка, залу — выбрать, кто смешнее',
  minPlayers: 3,
  maxPlayers: 10,
  tags: ['Шутки'],
  ratings: ['family', 'adult', 'hard'],
  minutes: 15,
  usesAI: true,
  intro: 'Шутка на двоих! Двое отвечают на одну затравку, остальные выбирают, кто смешнее.',
  rules: [
    'Каждому приходят две затравки — допиши самое смешное',
    'С каждой затравкой сражается ещё один игрок',
    'Остальные голосуют. Все голоса себе — это «Шутка!» и бонус',
    'Финал «Тройной удар»: три ответа на одну затравку, голосуем медалями',
  ],

  init(room) {
    room.state = {
      round: 0,
      total: ROUNDS,
      topic: '',
      deck: new Deck(PACK.prompts),
      finalDeck: new Deck(PACK.final),
      safety: new Deck(PACK.safety),
      matches: [],
      idx: 0,
      quip: null,
      gains: {},
      note: aiEnabled ? null : 'ИИ выключен — играем на встроенном паке',
    };
  },

  async start(room) {
    if (aiEnabled) await cook(room);
    startRound(room, 1);
  },

  async onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'topic':
        if (p.isHost && room.phase === 'lobby') s.topic = clean(msg.topic, 120);
        return;

      case 'answer': {
        if (room.phase !== 'writing' || p.audience) return;
        const m = s.matches[msg.m];
        if (!m || m.final || !m.authors.includes(p.id) || m.answers[p.id]) return;
        const text = clean(msg.text, 90);
        if (!text) return;
        m.answers[p.id] = text;
        if (msg.safety) m.safety = { ...(m.safety || {}), [p.id]: true };
        return afterWrite(room);
      }

      case 'safety': {
        if (room.phase !== 'writing' || p.audience) return;
        const m = s.matches[msg.m];
        if (!m || m.final || !m.authors.includes(p.id) || m.answers[p.id]) return;
        m.answers[p.id] = s.safety.draw();
        m.safety = { ...(m.safety || {}), [p.id]: true };
        return afterWrite(room);
      }

      case 'triple': {
        if (room.phase !== 'writing' || p.audience) return;
        const m = s.matches[0];
        if (!m?.final || !m.authors.includes(p.id) || m.answers[p.id]) return;
        const three = (msg.texts || []).slice(0, 3).map((x) => clean(x, 50)).filter(Boolean);
        if (!three.length) return;
        while (three.length < 3) three.push(s.safety.draw());
        m.answers[p.id] = three;
        return afterWrite(room);
      }

      case 'vote': {
        if (room.phase !== 'voting') return;
        const m = s.matches[s.idx];
        if (!m || m.final || m.authors.includes(p.id) || m.votes[p.id]) return;
        if (!m.authors.includes(msg.for)) return;
        m.votes[p.id] = msg.for;
        room.sound('vote');
        if (allVoted(room, m)) { room.clearTimer(); reveal(room); }
        return;
      }

      case 'medals': {
        if (room.phase !== 'voting') return;
        const m = s.matches[0];
        if (!m?.final || m.votes[p.id]) return;
        const opts = finalOptions(m, p.id);
        const given = {};
        for (const k of ['gold', 'silver', 'bronze']) {
          const id = msg[k];
          if (id && opts.includes(id) && !Object.values(given).includes(id)) given[k] = id;
        }
        if (!Object.keys(given).length) return;
        m.votes[p.id] = given;
        room.sound('vote');
        if (allVoted(room, m)) { room.clearTimer(); reveal(room); }
        return;
      }
    }
  },

  /* ---------- экран ---------- */
  viewTV(room) {
    const s = room.state;
    const base = { round: s.round, total: s.total, value: value(s.round), note: s.note, topic: s.topic, final: s.round >= s.total };
    const m = s.matches[s.idx];

    if (room.phase === 'writing') {
      return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: doneCount(s, p.id), need: needCount(s, p.id) })) };
    }
    if (room.phase === 'voting' && m) {
      return {
        ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, prompt: m.prompt,
        options: m.final ? finalOptions(m, null).map((id) => ({ id, three: m.answers[id] })) : m.authors.map((id) => ({ id, text: m.answers[id] || null })),
        voted: Object.keys(m.votes).length, voters: voterIds(room, m).length,
      };
    }
    if (room.phase === 'reveal' && m) {
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, prompt: m.prompt, result: m.result, quip: s.quip };
    }
    if (room.phase === 'scores' || room.phase === 'winner') return { ...base, gains: s.gains };
    return base;
  },

  /* ---------- телефон ---------- */
  viewPlayer(room, p) {
    const s = room.state;
    const my = { round: s.round, total: s.total, value: value(s.round), final: s.round >= s.total };

    if (room.phase === 'lobby') return { topic: s.topic, ai: aiEnabled };
    if (room.phase === 'cooking') return { ...my, wait: 'Придумываем затравки под вашу компанию…' };

    if (room.phase === 'writing') {
      if (p.audience) return { ...my, wait: 'Игроки пишут шутки — голосовать будешь ты' };
      const mine = s.matches.map((m, i) => ({ m, i })).filter(({ m }) => m.authors.includes(p.id));
      const todo = mine.find(({ m }) => !m.answers[p.id]);
      if (!todo) return { ...my, wait: 'Готово! Ждём остальных' };
      if (todo.m.final) return { ...my, triple: { prompt: todo.m.prompt } };
      return { ...my, task: { m: todo.i, prompt: todo.m.prompt, no: mine.indexOf(todo) + 1, of: mine.length } };
    }

    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (!m) return my;
      if (m.final) {
        const opts = finalOptions(m, p.id);
        if (!opts.length) return { ...my, wait: 'Голосовать не за что — смотри на экран' };
        return { ...my, medals: { prompt: m.prompt, options: opts.map((id) => ({ id, three: m.answers[id] })) }, given: m.votes[p.id] || null };
      }
      if (m.authors.includes(p.id)) return { ...my, wait: 'Это твоя шутка — смотри на экран' };
      return { ...my, vote: { prompt: m.prompt, options: m.authors.map((id) => ({ id, text: m.answers[id] || '— промолчал —' })) }, votedFor: m.votes[p.id] || null };
    }

    if (room.phase === 'winner') {
      const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
      return { ...my, winner: top ? { id: top.id, name: top.name, score: top.score } : null };
    }
    return { ...my, wait: 'Смотри на экран' };
  },

  /* ---------- боты ---------- */
  stepKey: (room) => `${room.phase}:${room.state.round}:${room.state.idx}`,

  botMoves(room, b) {
    const s = room.state;
    const moves = [];
    if (room.phase === 'writing' && !b.audience) {
      s.matches.forEach((m, i) => {
        if (!m.authors.includes(b.id) || m.answers[b.id]) return;
        if (m.final) moves.push({ delay: rnd(3, 9), msg: { a: 'triple', texts: [s.safety.draw(), s.safety.draw(), s.safety.draw()] } });
        else moves.push({ delay: rnd(2, 8) + moves.length * 1.5, msg: { a: 'answer', m: i, text: s.safety.draw() } });
      });
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (m?.final) {
        const opts = shuffle(finalOptions(m, b.id));
        if (opts.length) moves.push({ delay: rnd(2, 7), msg: { a: 'medals', gold: opts[0], silver: opts[1], bronze: opts[2] } });
      } else if (m && !m.authors.includes(b.id)) {
        moves.push({ delay: rnd(1.5, 6), msg: { a: 'vote', for: pick(m.authors) } });
      }
    }
    return moves;
  },
};

/* =================== механика =================== */

const doneCount = (s, id) => s.matches.filter((m) => m.authors.includes(id) && m.answers[id]).length;
const needCount = (s, id) => s.matches.filter((m) => m.authors.includes(id)).length;

/* в финале — все ответившие, кроме себя */
const finalOptions = (m, voterId) => m.authors.filter((id) => m.answers[id] && id !== voterId);

function voterIds(room, m) {
  return online(room.players)
    .filter((p) => (m.final ? finalOptions(m, p.id).length > 0 : !m.authors.includes(p.id)))
    .map((p) => p.id);
}

const allVoted = (room, m) => { const ids = voterIds(room, m); return ids.length > 0 && ids.every((id) => m.votes[id]); };

function afterWrite(room) {
  const s = room.state;
  const everyone = playing(room).every((p) => !p.connected || doneCount(s, p.id) >= needCount(s, p.id));
  if (everyone) { room.clearTimer(); toVoting(room); }
}

/* ИИ придумывает затравки под компанию */
async function cook(room) {
  const s = room.state;
  room.phase = 'cooking';
  room.push();
  const names = playing(room).filter((p) => !p.bot).map((p) => p.name);
  const { data: res, note } = await ask({
    system: `${HOST}
Ты пишешь затравки для игры в духе Quiplash. Затравка — короткая фраза с пропуском ___, на которую игроки дописывают смешной ответ.
Хорошая затравка: 4–12 слов, конкретная, неожиданная, допускает десятки разных ответов.
Типы: «худшее название для…», «что сказать, когда…», «новая строчка в…», «тайный ингредиент…», «отзыв о…».
Опирайся на узнаваемый российский быт: дача, маркетплейсы и пункты выдачи, тёща, общий чат, созвоны, ипотека, нейросети.
Финальные затравки начинаются с «Три…» — на них отвечают тремя короткими пунктами.`,
    user: [
      s.topic ? `Тема вечера: ${s.topic}.` : 'Тема: дружеская вечеринка.',
      names.length ? `Играют: ${names.join(', ')}. Имена можно обыграть по-доброму не чаще чем в каждой пятой затравке.` : '',
      `Нужно ${playing(room).length * 2 + 4} обычных затравок и 3 финальные.`,
    ].filter(Boolean).join('\n'),
    schema: z.object({ prompts: z.array(z.string()), final: z.array(z.string()) }),
  });
  const ok = (list) => (list || []).map((x) => clean(x, 140)).filter((x) => x.length > 8 && x.includes('_'));
  const fresh = ok(res?.prompts);
  const fin = ok(res?.final);
  if (fresh.length) {
    s.deck.pushFront(fresh);
    if (fin.length) s.finalDeck.pushFront(fin);
    s.note = `${fresh.length + fin.length} затравок от ИИ${s.topic ? ` · «${s.topic}»` : ''}`;
  } else s.note = `${note || 'ИИ не ответил'} — играем на встроенном паке`;
}

function startRound(room, n) {
  const s = room.state;
  s.round = n;
  s.idx = 0;
  s.quip = null;
  s.gains = {};
  const ring = shuffle(playing(room).map((p) => p.id));

  if (n >= s.total) {
    s.matches = [{ prompt: s.finalDeck.draw(), authors: ring, answers: {}, votes: {}, final: true }];
    room.setTimer(T.final, () => toVoting(room));
    room.say(LINES.final[0]);
  } else {
    s.matches = ring.map((id, i) => ({ prompt: s.deck.draw(), authors: [id, ring[(i + 1) % ring.length]], answers: {}, votes: {} }));
    room.setTimer(T.write, () => toVoting(room));
    room.say(LINES.round[Math.min(n - 1, LINES.round.length - 1)]);
  }
  room.phase = 'writing';
  room.sound('round');
}

function toVoting(room) {
  const s = room.state;
  s.idx = 0;
  // пары, где никто ничего не написал, пропускаем
  s.matches = s.matches.filter((m) => m.final || m.authors.some((id) => m.answers[id]));
  if (!s.matches.length) return afterRound(room);
  openVote(room);
}

function openVote(room) {
  const s = room.state;
  const m = s.matches[s.idx];
  room.phase = 'voting';
  s.quip = null;
  room.sound('open');
  room.setTimer(m.final ? T.fvote : T.vote, () => reveal(room));
  if (m.final) room.say(`${m.prompt.replace('___', '')} Раздайте медали.`);
  else {
    const [a, b] = m.authors.map((id) => m.answers[id] || 'тишина');
    room.say(`${m.prompt.replace('___', '…')} ${a}. Или: ${b}.`);
  }
  room.push();
}

async function reveal(room) {
  const s = room.state;
  const m = s.matches[s.idx];
  if (!m) return afterReveal(room);
  const val = value(s.round);
  let rows;

  if (m.final) {
    const pts = Object.fromEntries(m.authors.map((id) => [id, 0]));
    const medals = Object.fromEntries(m.authors.map((id) => [id, { gold: 0, silver: 0, bronze: 0 }]));
    for (const given of Object.values(m.votes)) {
      for (const [k, id] of Object.entries(given)) { if (id in pts) { pts[id] += MEDAL[k]; medals[id][k]++; } }
    }
    const total = Object.values(pts).reduce((a, b) => a + b, 0) || 1;
    rows = m.authors.filter((id) => m.answers[id]).map((id) => {
      const p = room.byId(id);
      const gain = Math.round((pts[id] / total) * val / 10) * 10;
      award(room, id, gain);
      const voters = Object.entries(m.votes).flatMap(([v, given]) => Object.entries(given).filter(([, to]) => to === id).map(([k]) => ({ id: v, k })));
      return { id, three: m.answers[id], votes: pts[id], medals: medals[id], pts: gain, voters };
    }).sort((a, b) => b.votes - a.votes);
    m.result = { rows, final: true };
    room.say(rows[0] ? `Лучший тройной удар у игрока ${room.byId(rows[0].id)?.name}!` : 'Финал без ответов.');
  } else {
    const t = tally(m.votes, m.authors);
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    rows = m.authors.map((id) => {
      const silent = !m.answers[id];
      const gain = silent || !total ? 0 : Math.round((t[id] / total) * val / 10) * 10;
      const voters = Object.entries(m.votes).filter(([, to]) => to === id).map(([v]) => v);
      return { id, text: m.answers[id] || null, votes: t[id], pts: gain, safety: !!m.safety?.[id], voters };
    }).sort((a, b) => b.votes - a.votes);
    const shutout = total > 1 && rows[0].votes === total && rows[0].text;
    if (shutout) { rows[0].pts += Math.round(val * 0.25); rows[0].shutout = true; }
    for (const r of rows) award(room, r.id, r.pts);
    const tie = total > 0 && rows[0].votes === rows[1]?.votes;
    m.result = { rows, total, shutout, tie };
    room.say(shutout ? pick(LINES.shutout) : tie ? pick(LINES.tie) : rows.some((r) => !r.text) ? pick(LINES.silent) : pick(LINES.win));
    room.sound(shutout ? 'shutout' : 'reveal');
  }

  room.phase = 'reveal';
  room.setTimer(m.final ? T.reveal + 3 : T.reveal, () => afterReveal(room));
  room.push();

  // ведущая комментирует, если ИИ успеет
  if (aiEnabled && !m.final && rows[0]?.text) {
    const at = `${s.round}:${s.idx}`;
    const q = await line({
      host: HOST,
      user: `Затравка: «${m.prompt}». Победил ответ «${rows[0].text}» (${rows[0].votes} голосов)${rows[1]?.text ? `, проиграл «${rows[1].text}» (${rows[1].votes})` : ''}. Прокомментируй.`,
    });
    if (q && room.phase === 'reveal' && `${s.round}:${s.idx}` === at) { s.quip = q; room.say(q); room.push(); }
  }
}

function award(room, id, pts) {
  const p = room.byId(id);
  if (!p || !pts) return;
  p.score += pts;
  room.state.gains[id] = (room.state.gains[id] || 0) + pts;
}

function afterReveal(room) {
  const s = room.state;
  if (s.idx + 1 < s.matches.length) { s.idx++; return openVote(room); }
  afterRound(room);
}

function afterRound(room) {
  const s = room.state;
  if (s.round >= s.total) {
    room.phase = 'winner';
    room.clearTimer();
    room.sound('win');
    const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
    if (top) room.say(`Самый смешной человек вечера — ${top.name}!`);
    return room.push();
  }
  room.phase = 'scores';
  room.sound('scores');
  room.setTimer(T.scores, () => { startRound(room, s.round + 1); room.push(); });
  room.push();
}
