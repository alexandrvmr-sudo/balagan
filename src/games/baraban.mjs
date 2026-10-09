/* «Барабан» — викторина пополам с удачей. Ведущий — сам Великий Барабан.
   В начале каждый задаёт Барабану личный вопрос. Потом три вопроса подряд: лучшие получают сектора.
   Сектора тайно ставят на барабан, он крутится три раза. Набрал порог — крутишь победный оборот.
   Победитель получает ответ на свой вопрос. */

import { line, aiEnabled } from '../ai.mjs';
import { data, Deck, shuffle, pick, rnd, secs, clean, close, norm, TEST_MODE, playing, online } from '../lib.mjs';

const PACK = data('baraban.json');
const SECTORS = [1000, 2500, 500, 5000, 1500, 750, 3000, 1000, 2000, 500, 4000, 1250, 1750, 600, 3500, 900];
const THRESHOLD = Number(process.env.BALAGAN_BAR_GOAL) || (TEST_MODE ? 6000 : 20000);
const MAX_SETS = TEST_MODE ? 2 : 4;
const PER_SET = TEST_MODE ? 2 : 3;
const SPINS = 3;

const T = {
  ask: secs('BALAGAN_BAR_ASK', 40, 20),
  multi: secs('BALAGAN_BAR_MULTI', 25, 14),
  number: secs('BALAGAN_BAR_NUMBER', 20, 12),
  list: secs('BALAGAN_BAR_LIST', 40, 20),
  qresult: secs('BALAGAN_BAR_QRESULT', 7, 5),
  place: secs('BALAGAN_BAR_PLACE', 25, 14),
  spin: secs('BALAGAN_BAR_SPIN', 11, 9),
  winspin: secs('BALAGAN_BAR_WINSPIN', 11, 9),
};

const HOST = 'Ты — Великий Барабан, всезнающий и немного обидчивый ведущий телеигры. Говоришь торжественно, но смешно.';

export default {
  id: 'baraban',
  title: 'Барабан',
  tagline: 'Викторина и удача: ставь сектора на Великий Барабан',
  minPlayers: 2,
  maxPlayers: 8,
  minutes: 20,
  usesAI: true,
  intro: 'Внимание! В студии Великий Барабан. Он знает ответы на все вопросы. Почти.',
  rules: [
    'Задай Барабану личный вопрос — победитель получит ответ',
    'Отвечай на вопросы: выбери все верные, угадай число, назови как можно больше',
    'Лучшие получают сектора и тайно ставят их на Барабан',
    'Барабан крутится трижды — очки достаются тем, на чьём секторе он остановился',
    `Набрал ${THRESHOLD.toLocaleString('ru-RU')} — крутишь победный оборот`,
  ],

  init(room) {
    room.state = {
      decks: { multi: new Deck(PACK.multi), number: new Deck(PACK.number), list: new Deck(PACK.list) },
      asks: {},
      set: 0,
      qn: 0,
      cur: null,
      answers: {},
      qres: null,
      earned: {},
      slices: {},
      placed: {},
      spin: null,
      spinNo: 0,
      angle: 0,
      win: null,
      winner: null,
      oracle: null,
    };
  },

  start(room) {
    room.phase = 'ask';
    room.say(`${this.intro} Задайте Барабану вопрос, который вас мучает.`, { who: 'baraban' });
    room.sound('round');
    room.setTimer(T.ask, () => nextSet(room));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'ask': {
        if (room.phase !== 'ask' || p.audience || s.asks[p.id]) return;
        const q = clean(msg.q, 120);
        if (!q) return;
        s.asks[p.id] = q;
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.asks[x.id])) { room.clearTimer(); nextSet(room); }
        return;
      }
      case 'multi': {
        if (room.phase !== 'question' || s.cur.type !== 'multi' || p.audience || s.answers[p.id]) return;
        s.answers[p.id] = [...new Set((msg.picks || []).map(Number).filter((i) => i >= 0 && i < 8))];
        room.sound('pop');
        return checkAnswers(room);
      }
      case 'num': {
        if (room.phase !== 'question' || s.cur.type !== 'number' || p.audience || s.answers[p.id] != null) return;
        const v = Number(String(msg.v).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(v)) return;
        s.answers[p.id] = v;
        room.sound('pop');
        return checkAnswers(room);
      }
      case 'item': {
        if (room.phase !== 'question' || s.cur.type !== 'list' || p.audience) return;
        const text = clean(msg.text, 40);
        if (!text) return;
        const mine = (s.answers[p.id] = s.answers[p.id] || []);
        if (mine.length >= 20 || mine.some((x) => norm(x.text) === norm(text))) return;
        const hit = s.cur.items.findIndex((alts) => alts.some((a) => close(a, text)));
        const dup = hit >= 0 && mine.some((x) => x.hit === hit);
        mine.push({ text, hit: dup ? -1 : hit });
        room.sound(hit >= 0 && !dup ? 'coin' : 'clack');
        return;
      }
      case 'listDone': {
        if (room.phase !== 'question' || s.cur.type !== 'list' || p.audience) return;
        s.done = { ...(s.done || {}), [p.id]: true };
        return checkAnswers(room);
      }
      case 'place': {
        if (room.phase !== 'place' || s.placed[p.id] || !s.earned[p.id]) return;
        const want = (msg.cells || []).map(Number).filter((c) => c >= 0 && c < SECTORS.length).slice(0, s.earned[p.id]);
        const map = {};
        for (const c of want) map[c] = (map[c] || 0) + 1;
        // не расставленные сектора ставим сами
        let left = s.earned[p.id] - want.length;
        while (left-- > 0) { const c = Math.floor(Math.random() * SECTORS.length); map[c] = (map[c] || 0) + 1; }
        s.slices[p.id] = map;
        s.placed[p.id] = true;
        room.sound('clack');
        if (Object.keys(s.earned).filter((id) => s.earned[id] > 0 && room.byId(id)?.connected).every((id) => s.placed[id])) { room.clearTimer(); startSpins(room); }
        return;
      }
    }
  },

  viewTV(room) {
    const s = room.state;
    const base = { set: s.set, sets: MAX_SETS, goal: THRESHOLD, sectors: SECTORS };
    if (room.phase === 'ask') return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: !!s.asks[p.id] })) };
    if (room.phase === 'question') {
      const c = s.cur;
      return { ...base, qn: s.qn, per: PER_SET, type: c.type, q: c.q, options: c.type === 'multi' ? c.options.map((o) => o.t) : null, need: c.type === 'list' ? c.items.length : null,
        progress: playing(room).map((p) => ({ id: p.id, done: c.type === 'list' ? !!s.done?.[p.id] : s.answers[p.id] != null, n: c.type === 'list' ? (s.answers[p.id] || []).filter((x) => x.hit >= 0).length : null })) };
    }
    if (room.phase === 'qresult') return { ...base, qn: s.qn, per: PER_SET, ...s.qres };
    if (room.phase === 'place') return { ...base, earned: s.earned, placed: s.placed };
    if (room.phase === 'spin') return { ...base, slices: s.slices, spin: s.spin, spinNo: s.spinNo, angle: s.angle };
    if (room.phase === 'winspin') return { ...base, win: s.win };
    if (room.phase === 'winner') return { ...base, winner: s.winner, oracle: s.oracle };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    if (room.phase === 'ask') {
      if (p.audience) return { wait: 'Игроки задают вопросы Барабану' };
      if (s.asks[p.id]) return { wait: 'Барабан запомнил твой вопрос' };
      return { ask: true, examples: shuffle(PACK.botAsk).slice(0, 2) };
    }
    if (room.phase === 'question') {
      if (p.audience) return { wait: 'Игроки отвечают' };
      const c = s.cur;
      if (c.type === 'multi') return s.answers[p.id] ? { wait: 'Ответ принят' } : { multi: { q: c.q, options: c.options.map((o) => o.t) } };
      if (c.type === 'number') return s.answers[p.id] != null ? { wait: `Твой ответ: ${s.answers[p.id]}` } : { number: { q: c.q } };
      if (s.done?.[p.id]) return { wait: 'Список сдан' };
      return { list: { q: c.q, mine: (s.answers[p.id] || []).map((x) => ({ text: x.text, ok: x.hit >= 0 })) } };
    }
    if (room.phase === 'qresult') {
      const r = s.qres.rows.find((x) => x.id === p.id);
      return { wait: r ? `+${r.pts} очков · секторов: ${r.slices}` : 'Смотри на экран' };
    }
    if (room.phase === 'place') {
      if (!s.earned[p.id]) return { wait: 'В этот раз без секторов. Смотри, как крутится' };
      if (s.placed[p.id]) return { wait: 'Сектора на барабане. Ждём' };
      return { place: { n: s.earned[p.id], sectors: SECTORS } };
    }
    if (room.phase === 'spin') return { wait: 'Барабан крутится!' };
    if (room.phase === 'winspin') return { wait: s.win?.pid === p.id ? 'Твой победный оборот!' : 'Победный оборот!' };
    if (room.phase === 'winner') return { winner: s.winner, mine: s.winner === p.id, oracle: s.oracle };
    return { wait: 'Смотри на экран' };
  },

  stepKey: (room) => `${room.phase}:${room.state.set}:${room.state.qn}:${room.state.spinNo}`,

  botMoves(room, b) {
    const s = room.state;
    const m = [];
    if (b.audience) return m;
    if (room.phase === 'ask' && !s.asks[b.id]) m.push({ delay: rnd(2, 6), msg: { a: 'ask', q: pick(PACK.botAsk) } });
    if (room.phase === 'question') {
      const c = s.cur;
      if (c.type === 'multi' && !s.answers[b.id]) {
        const picks = c.options.map((o, i) => ((o.ok ? Math.random() < 0.7 : Math.random() < 0.25) ? i : -1)).filter((i) => i >= 0);
        m.push({ delay: rnd(3, 9), msg: { a: 'multi', picks } });
      }
      if (c.type === 'number' && s.answers[b.id] == null) m.push({ delay: rnd(3, 8), msg: { a: 'num', v: Math.round(c.a * rnd(0.7, 1.3)) } });
      if (c.type === 'list' && !s.done?.[b.id]) {
        shuffle(c.items).slice(0, 2 + Math.floor(Math.random() * 3)).forEach((alts, i) => m.push({ delay: 2 + i * rnd(1.5, 3), msg: { a: 'item', text: alts[0] } }));
        m.push({ delay: 12, msg: { a: 'listDone' } });
      }
    }
    if (room.phase === 'place' && s.earned[b.id] && !s.placed[b.id]) {
      m.push({ delay: rnd(2, 6), msg: { a: 'place', cells: Array.from({ length: s.earned[b.id] }, () => Math.floor(Math.random() * SECTORS.length)) } });
    }
    return m;
  },
};

/* =================== механика =================== */

const TYPES = ['multi', 'number', 'list'];

function nextSet(room) {
  const s = room.state;
  s.set++;
  s.qn = 0;
  s.earned = {};
  for (const p of playing(room)) if (!s.asks[p.id]) s.asks[p.id] = pick(PACK.botAsk);
  nextQuestion(room);
}

function nextQuestion(room) {
  const s = room.state;
  s.qn++;
  const type = TYPES[(s.set + s.qn) % 3];
  const raw = s.decks[type].draw();
  if (type === 'multi') s.cur = { type, q: raw.q, options: shuffle([...raw.yes.map((t) => ({ t, ok: true })), ...raw.no.map((t) => ({ t, ok: false }))]) };
  if (type === 'number') s.cur = { type, q: raw.q, a: raw.a };
  if (type === 'list') s.cur = { type, q: raw.q, items: raw.items };
  s.answers = {};
  s.done = {};
  room.phase = 'question';
  room.sound('open');
  const hint = { multi: 'Выберите все верные.', number: 'Угадайте число.', list: 'Назовите как можно больше.' }[type];
  room.say(`${raw.q}. ${hint}`, { who: 'baraban' });
  room.setTimer(T[type], () => scoreQuestion(room));
  room.push();
}

function checkAnswers(room) {
  const s = room.state;
  const done = (p) => (s.cur.type === 'list' ? s.done?.[p.id] : s.answers[p.id] != null);
  if (playing(room).every((p) => !p.connected || done(p))) { room.clearTimer(); scoreQuestion(room); }
}

function scoreQuestion(room) {
  const s = room.state;
  const c = s.cur;
  const rows = playing(room).map((p) => {
    const a = s.answers[p.id];
    let pts = 0, detail = '';
    if (c.type === 'multi' && a) {
      const good = a.filter((i) => c.options[i].ok).length, bad = a.length - good;
      pts = Math.max(0, good * 250 - bad * 150);
      detail = `${good} верных, ${bad} мимо`;
    }
    if (c.type === 'list' && a) {
      const hits = a.filter((x) => x.hit >= 0).length;
      pts = hits * 200;
      detail = `${hits} из ${c.items.length}`;
    }
    if (c.type === 'number' && a != null) detail = `${a}`;
    return { id: p.id, pts, detail, guess: c.type === 'number' ? a : null };
  });
  if (c.type === 'number') {
    const ranked = rows.filter((r) => r.guess != null).sort((x, y) => Math.abs(x.guess - c.a) - Math.abs(y.guess - c.a));
    const prize = [1000, 600, 300];
    ranked.forEach((r, i) => { r.pts = (prize[i] ?? 100) + (r.guess === c.a ? 500 : 0); r.detail = `${r.guess} (мимо на ${Math.abs(r.guess - c.a)})`; });
  }
  // сектора по местам: 1-е — три, 2-е — два, остальным с очками — один
  const scored = rows.filter((r) => r.pts > 0).sort((x, y) => y.pts - x.pts);
  let place = 0, prev = null;
  scored.forEach((r, i) => { if (r.pts !== prev) { place = i; prev = r.pts; } r.slices = place === 0 ? 3 : place === 1 ? 2 : 1; });
  for (const r of rows) {
    r.slices = r.slices || 0;
    const p = room.byId(r.id);
    if (p) p.score += r.pts;
    s.earned[r.id] = (s.earned[r.id] || 0) + r.slices;
  }
  const correct = c.type === 'multi' ? c.options.filter((o) => o.ok).map((o) => o.t) : c.type === 'number' ? [String(c.a)] : c.items.map((alts) => alts[0]);
  s.qres = { type: c.type, q: c.q, correct, rows: rows.sort((x, y) => y.pts - x.pts) };
  room.phase = 'qresult';
  room.sound('reveal');
  room.say(c.type === 'number' ? `Правильный ответ: ${c.a}.` : 'Барабан доволен. Почти.', { who: 'baraban' });
  room.setTimer(T.qresult, () => (s.qn < PER_SET ? nextQuestion(room) : toPlace(room)));
  room.push();
}

function toPlace(room) {
  const s = room.state;
  s.slices = {};
  s.placed = {};
  if (!Object.values(s.earned).some((n) => n > 0)) return afterSpins(room);
  room.phase = 'place';
  room.sound('round');
  room.say('Ставьте сектора на Барабан. Тайно.', { who: 'baraban' });
  room.setTimer(T.place, () => {
    for (const [id, n] of Object.entries(s.earned)) {
      if (!n || s.placed[id]) continue;
      const map = {};
      for (let i = 0; i < n; i++) { const c = Math.floor(Math.random() * SECTORS.length); map[c] = (map[c] || 0) + 1; }
      s.slices[id] = map; s.placed[id] = true;
    }
    startSpins(room);
  });
  room.push();
}

function startSpins(room) {
  room.state.spinNo = 0;
  spinOnce(room);
}

function spinOnce(room) {
  const s = room.state;
  s.spinNo++;
  const sector = Math.floor(Math.random() * SECTORS.length);
  const total = Object.values(s.slices).reduce((n, m) => n + (m[sector] || 0), 0);
  const payouts = {};
  if (total) {
    for (const [id, m] of Object.entries(s.slices)) {
      if (!m[sector]) continue;
      const pts = Math.round((SECTORS[sector] * m[sector]) / total / 10) * 10;
      payouts[id] = pts;
      const p = room.byId(id);
      if (p) p.score += pts;
    }
  }
  // барабан крутится минимум на четыре полных оборота и останавливается на секторе под стрелкой
  const step = 360 / SECTORS.length;
  const target = 360 - (sector * step + step / 2);
  const base = Math.ceil(s.angle / 360) * 360;
  s.angle = base + 360 * 4 + target;
  s.spin = { sector, value: SECTORS[sector], payouts, empty: !total };
  room.phase = 'spin';
  room.sound('spin');
  room.say(s.spinNo === 1 ? 'Крутите барабан!' : s.spinNo === SPINS ? 'Последний оборот!' : 'Ещё оборот!', { who: 'baraban' });
  room.setTimer(T.spin, () => (s.spinNo < SPINS ? spinOnce(room) : afterSpins(room)));
  room.push();
}

function afterSpins(room) {
  const s = room.state;
  const leader = [...playing(room)].sort((a, b) => b.score - a.score)[0];
  if (leader && leader.score >= THRESHOLD) return winSpin(room, leader);
  if (s.set >= MAX_SETS) return finish(room, leader);
  nextSet(room);
}

function winSpin(room, p) {
  const s = room.state;
  const won = Math.random() < 0.55 || s.set >= MAX_SETS;
  s.win = { pid: p.id, won };
  room.phase = 'winspin';
  room.sound('drumroll');
  room.say(`${p.name} набрал больше ${THRESHOLD.toLocaleString('ru-RU')}. Победный оборот!`, { who: 'baraban' });
  room.setTimer(T.winspin, () => {
    if (won) return finish(room, p);
    room.say('Барабан сказал: ещё круг!', { who: 'baraban' });
    nextSet(room);
  });
  room.push();
}

async function finish(room, p) {
  const s = room.state;
  room.clearTimer();
  s.winner = p?.id || null;
  const q = s.asks[s.winner] || 'Что меня ждёт?';
  let answer = null;
  if (aiEnabled) {
    answer = await line({ host: HOST, user: `Игрок ${p?.name} выиграл и спросил: «${q}». Дай пророческий ответ: смешной, абсурдный, добрый, 1–2 предложения.`, max: 240 });
  }
  s.oracle = { q, a: answer || oracle(q) };
  room.phase = 'winner';
  room.sound('win');
  room.say(`${p?.name} спрашивал: ${q} Барабан отвечает: ${s.oracle.a}`, { who: 'baraban' });
  room.push();
}

/* запасной оракул: ответ зависит от вопросительного слова */
function oracle(q) {
  const t = norm(q);
  const o = PACK.oracle;
  for (const k of ['почему', 'когда', 'где', 'кто', 'как', 'сколько']) if (t.startsWith(k) || t.includes(` ${k} `)) return pick(o[k]);
  if (/(^| )ли( |$)/.test(t)) return pick(o["ли"]);
  return pick(o.default);
}
