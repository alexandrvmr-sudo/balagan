/* «Барабан» — по мотивам «Колеса невероятных масштабов». Ведущий — сам Великий Барабан.
   В начале каждый задаёт Барабану личный вопрос. Раунд: три вопроса → за них дают сектора →
   сектора тайно ставят на Барабан → лучшие игроки раунда крутят его свайпом на телефоне.
   На Барабане есть «Банкрот», «Приз» и «×2». После раунда — победитель раунда.
   Набрал цель — крутишь Колесо победы: с каждой попыткой победных секторов больше.
   Победитель получает ответ на свой вопрос. */

import { line, aiEnabled } from '../ai.mjs';
import { data, Deck, shuffle, pick, rnd, secs, clean, close, norm, TEST_MODE, playing, clamp } from '../lib.mjs';

const PACK = data('baraban.json');

/* 16 секторов. Числа растут от раунда к раунду, особые сектора — по правилам ниже */
const BASE = [1000, 2500, 'bank', 1500, 5000, 750, 3000, 'x2', 2000, 1250, 4000, 'prize', 1750, 500, 3500, 2250];
const GROW = [1, 1.5, 2, 2.5, 3, 3.5];
const GOAL = Number(process.env.BALAGAN_BAR_GOAL) || (TEST_MODE ? 4000 : 15000);
const MAX_SETS = TEST_MODE ? 2 : 6;
const PER_SET = TEST_MODE ? 2 : 3;
const SPINS = TEST_MODE ? 2 : 3;
const WIN_SLOTS = 12;
const TYPES = ['multi', 'number', 'list', 'match', 'poll'];

const T = {
  intro: secs('BALAGAN_BAR_INTRO', 8, 3),
  ask: secs('BALAGAN_BAR_ASK', 45, 20),
  rintro: secs('BALAGAN_BAR_RINTRO', 6, 3),
  multi: secs('BALAGAN_BAR_MULTI', 30, 14),
  number: secs('BALAGAN_BAR_NUMBER', 25, 12),
  list: secs('BALAGAN_BAR_LIST', 45, 20),
  match: secs('BALAGAN_BAR_MATCH', 35, 15),
  poll: secs('BALAGAN_BAR_POLL', 25, 12),
  qresult: secs('BALAGAN_BAR_QRESULT', 10, 5),
  place: secs('BALAGAN_BAR_PLACE', 35, 15),
  swipe: secs('BALAGAN_BAR_SWIPE', 15, 6),
  settle: secs('BALAGAN_BAR_SETTLE', 6, 3),     // после остановки — разбор выигрыша
  roundEnd: secs('BALAGAN_BAR_ROUNDEND', 12, 5),
  winIntro: secs('BALAGAN_BAR_WININTRO', 6, 3),
};
const SPIN_MS = TEST_MODE ? [3000, 4500] : [6500, 9500];

const HOST = 'Ты — Великий Барабан, всезнающий и немного обидчивый ведущий телеигры. Говоришь торжественно, но смешно.';

const SAY = {
  rintro: [
    'Раунд первый! Отвечайте — получайте сектора.',
    'Раунд второй! Сектора дорожают в полтора раза.',
    'Раунд третий! Ставки удваиваются!',
    'Раунд четвёртый! Барабан тяжелеет от денег.',
    'Раунд пятый! Втрое дороже, втрое страшнее.',
    'Раунд шестой! Последний шанс. Барабан устал, но держится.',
  ],
  hint: { multi: 'Выберите все верные.', number: 'Угадайте число.', list: 'Назовите как можно больше.', match: 'Соедините пары.', poll: 'Голосуйте! Кто из вас?' },
  qres: ['Барабан доволен.', 'Барабан впечатлён. Слегка.', 'Ну-ну. Бывало и хуже.', 'Неплохо для людей.', 'Барабан всё видел.'],
  place: ['Ставьте сектора на меня. Тайно! Совпадёте — поделите выигрыш.', 'Сектора на Барабан! Не стесняйтесь, я не кусаюсь. Почти.'],
  empty: ['Мимо! Здесь никого.', 'Пусто. Барабан забирает себе.', 'Никто сюда не поставил. Обидно.'],
  bank: ['Банкрот! Ха-ха-ха!', 'Банкрот! Барабан смеётся последним.'],
  bankEmpty: ['Банкрот! Но тут никого. Повезло.'],
  prize: ['Сектор «Приз» на барабане!', 'Приз! Открываем шкатулку!'],
  x2: ['Удвоение! Следующий оборот платит вдвое!'],
  x2bonus: ['Удвоение на последнем обороте! Барабан дарит ещё один!'],
  win: ['Победа! Барабан склоняет обод.', 'Победа! Я знал. Я всё знаю.'],
  lose: ['Не сегодня! Ещё круг.', 'Барабан сказал: рано! Играем дальше.'],
};

export default {
  id: 'baraban',
  title: 'Барабан',
  tagline: 'Викторина и удача: ставь сектора и крути Великий Барабан',
  minPlayers: 2,
  maxPlayers: 8,
  tags: ['Викторина', 'Везение'],
  ratings: ['family', 'adult', 'hard'],
  minutes: 25,
  usesAI: true,
  intro: 'Внимание! В студии Великий Барабан! Я знаю ответы на все вопросы. Почти на все.',
  rules: [
    'Задай Барабану личный вопрос — победитель получит ответ',
    'Отвечай на вопросы: чем лучше ответ, тем больше секторов',
    'Ставь сектора на Барабан. Лучшие игроки раунда крутят его свайпом',
    'Остановился на твоём секторе — очки твои. Берегись «Банкрота»!',
    `Набрал ${GOAL.toLocaleString('ru-RU')} — крути Колесо победы`,
  ],

  init(room) {
    room.state = {
      level: 'family', decks: null,
      asks: {}, set: 0, qn: 0, cur: null, answers: {}, done: {}, qres: null,
      earned: {}, roundGain: {}, roundSlices: {}, slices: {}, placed: {},
      wheel: [], angle: 0, spinNo: 0, spinsLeft: 0, double: false, spinner: null, spin: null, order: [],
      tries: {}, win: null, roundWin: null, winner: null, oracle: null,
    };
  },

  start(room) {
    const s = room.state;
    s.level = room.level;
    s.decks = Object.fromEntries(TYPES.map((t) => [t, new Deck(bank(t, s.level))]));
    room.phase = 'intro';
    room.say(this.intro, { who: 'baraban' });
    room.setTimer(T.intro, () => {
      room.phase = 'ask';
      room.say('Задайте мне вопрос, который вас мучает. Победитель получит ответ. Честный. Наверное.', { who: 'baraban' });
      room.setTimer(T.ask, () => startRound(room));
      room.push();
    });
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    if (p.audience) return;
    switch (msg.a) {
      case 'ask': {
        if (room.phase !== 'ask' || s.asks[p.id]) return;
        const q = clean(msg.q, 120);
        if (!q) return;
        s.asks[p.id] = q;
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.asks[x.id])) { room.clearTimer(); startRound(room); }
        return;
      }
      case 'multi': {
        if (!asking(room, 'multi') || s.answers[p.id]) return;
        s.answers[p.id] = [...new Set((msg.picks || []).map(Number).filter((i) => i >= 0 && i < s.cur.options.length))];
        return answered(room);
      }
      case 'num': {
        if (!asking(room, 'number') || s.answers[p.id] != null) return;
        const v = Number(String(msg.v).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(v)) return;
        s.answers[p.id] = v;
        return answered(room);
      }
      case 'item': {
        if (!asking(room, 'list') || s.done[p.id]) return;
        const text = clean(msg.text, 40);
        if (!text) return;
        const mine = (s.answers[p.id] = s.answers[p.id] || []);
        if (mine.length >= 25 || mine.some((x) => norm(x.text) === norm(text))) return;
        const hit = s.cur.items.findIndex((alts) => alts.some((a) => close(a, text)));
        const dup = hit >= 0 && mine.some((x) => x.hit === hit);
        mine.push({ text, hit: dup ? -1 : hit });
        room.sound(hit >= 0 && !dup ? 'coin' : 'clack');
        return;
      }
      case 'listDone': {
        if (!asking(room, 'list')) return;
        s.done[p.id] = true;
        return answered(room);
      }
      case 'match': {
        if (!asking(room, 'match') || s.answers[p.id]) return;
        const n = s.cur.left.length;
        const got = (msg.pairs || []).slice(0, n).map((x) => (Number.isInteger(x) && x >= 0 && x < n ? x : -1));
        s.answers[p.id] = got;
        return answered(room);
      }
      case 'poll': {
        if (!asking(room, 'poll') || s.answers[p.id] || msg.for === p.id || !room.byId(msg.for) || room.byId(msg.for).audience) return;
        s.answers[p.id] = msg.for;
        return answered(room);
      }
      case 'place': {
        if (room.phase !== 'place' || s.placed[p.id] || !s.earned[p.id]) return;
        s.slices[p.id] = toMap((msg.cells || []).map(Number).filter((c) => c >= 0 && c < s.wheel.length), s.earned[p.id]);
        s.placed[p.id] = true;
        room.sound('clack');
        if (placers(room).every((id) => s.placed[id] || !room.byId(id)?.connected)) { room.clearTimer(); afterPlace(room); }
        return;
      }
      case 'spin': {
        if (room.phase === 'spinWait' && s.spinner === p.id) { room.clearTimer(); spin(room, Number(msg.power)); }
        else if (room.phase === 'winWait' && s.win?.pid === p.id) { room.clearTimer(); winSpin(room, Number(msg.power)); }
        return;
      }
    }
  },

  /* ---------- экран ---------- */
  viewTV(room) {
    const s = room.state;
    const base = { set: s.set, sets: MAX_SETS, goal: GOAL, level: s.level, wheel: s.wheel, angle: s.angle, grow: GROW[s.set - 1] || 1, now: Date.now() };
    switch (room.phase) {
      case 'ask': return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: !!s.asks[p.id] })) };
      case 'roundIntro': return { ...base, types: roundTypes(room, s.set) };
      case 'question': {
        const c = s.cur;
        return { ...base, qn: s.qn, per: PER_SET, type: c.type, q: c.q,
          options: c.type === 'multi' ? c.options.map((o) => o.t) : null,
          left: c.left || null, right: c.right || null, need: c.type === 'list' ? c.items.length : null,
          progress: playing(room).map((p) => ({ id: p.id, done: c.type === 'list' ? !!s.done[p.id] : s.answers[p.id] != null,
            n: c.type === 'list' ? (s.answers[p.id] || []).filter((x) => x.hit >= 0).length : null })) };
      }
      case 'qresult': return { ...base, qn: s.qn, per: PER_SET, ...s.qres };
      case 'place': return { ...base, earned: s.earned, placed: s.placed };
      case 'spinWait':
      case 'spinning':
        return { ...base, slices: s.slices, spinner: s.spinner, spinNo: s.spinNo, spinsTotal: s.spinNo + s.spinsLeft, double: s.double, spin: room.phase === 'spinning' ? s.spin : null, roundGain: s.roundGain };
      case 'roundEnd': return { ...base, roundWin: s.roundWin, roundGain: s.roundGain };
      case 'winIntro':
      case 'winWait':
      case 'winSpin':
        return { ...base, win: s.win };
      case 'winner': return { ...base, winner: s.winner, oracle: s.oracle };
    }
    return base;
  },

  /* ---------- телефон ---------- */
  viewPlayer(room, p) {
    const s = room.state;
    const me = { level: s.level };
    if (room.phase === 'intro') return { ...me, wait: 'Великий Барабан выходит в студию' };
    if (room.phase === 'ask') {
      if (p.audience) return { ...me, wait: 'Игроки задают вопросы Барабану' };
      if (s.asks[p.id]) return { ...me, wait: 'Барабан запомнил твой вопрос' };
      return { ...me, ask: true, examples: shuffle(PACK.botAsk).slice(0, 2) };
    }
    if (room.phase === 'roundIntro') return { ...me, wait: `Раунд ${s.set}`, sub: 'сейчас будут вопросы' };
    if (room.phase === 'question') {
      if (p.audience) return { ...me, wait: 'Игроки отвечают' };
      const c = s.cur;
      const kind = { kind: c.type, qn: s.qn, per: PER_SET };
      if (c.type === 'multi') return s.answers[p.id] ? { ...me, wait: 'Ответ принят' } : { ...me, ...kind, multi: { q: c.q, options: c.options.map((o) => o.t) } };
      if (c.type === 'number') return s.answers[p.id] != null ? { ...me, wait: `Твой ответ: ${s.answers[p.id]}` } : { ...me, ...kind, number: { q: c.q } };
      if (c.type === 'match') return s.answers[p.id] ? { ...me, wait: 'Пары сданы' } : { ...me, ...kind, match: { q: c.q, left: c.left, right: c.right } };
      if (c.type === 'poll') {
        if (s.answers[p.id]) return { ...me, wait: 'Голос принят' };
        return { ...me, ...kind, poll: { q: c.q, options: playing(room).filter((x) => x.id !== p.id).map((x) => ({ id: x.id })) } };
      }
      if (s.done[p.id]) return { ...me, wait: 'Список сдан' };
      return { ...me, ...kind, list: { q: c.q, mine: (s.answers[p.id] || []).map((x) => ({ text: x.text, ok: x.hit >= 0 })) } };
    }
    if (room.phase === 'qresult') {
      const r = s.qres.rows.find((x) => x.id === p.id);
      return { ...me, wait: r ? (r.slices ? `+${r.slices} ${r.slices === 1 ? 'сектор' : 'сектора'}` : 'В этот раз без секторов') : 'Смотри на экран', sub: r?.detail || '' };
    }
    if (room.phase === 'place') {
      if (!s.earned[p.id]) return { ...me, wait: 'В этом раунде без секторов', sub: 'зато можно болеть за остальных' };
      if (s.placed[p.id]) return { ...me, wait: 'Сектора на Барабане. Ждём' };
      return { ...me, place: { n: s.earned[p.id], wheel: s.wheel } };
    }
    if (room.phase === 'spinWait') {
      if (s.spinner === p.id) return { ...me, swipe: { what: 'spin', no: s.spinNo, double: s.double } };
      return { ...me, wait: `Крутит ${room.byId(s.spinner)?.name || 'игрок'}`, sub: mySlices(s, p.id) };
    }
    if (room.phase === 'spinning') {
      const got = s.spin?.pay?.[p.id];
      return { ...me, wait: 'Барабан крутится!', sub: mySlices(s, p.id), after: got ? (got > 0 ? `+${got}` : `${got}`) : null };
    }
    if (room.phase === 'roundEnd') {
      const w = s.roundWin;
      const names = (w?.ids || []).map((id) => room.byId(id)?.name).join(' и ');
      return { ...me, wait: w ? (w.ids.includes(p.id) ? 'Ты выиграл раунд!' : `Раунд за: ${names}`) : 'Раунд без победителя', sub: `за раунд: ${s.roundGain[p.id] || 0}` };
    }
    if (room.phase === 'winWait' && s.win?.pid === p.id) return { ...me, swipe: { what: 'win', slots: s.win.slots } };
    if (['winIntro', 'winWait', 'winSpin'].includes(room.phase)) return { ...me, wait: s.win?.pid === p.id ? 'Твоё Колесо победы!' : `Колесо победы: ${room.byId(s.win?.pid)?.name}` };
    if (room.phase === 'winner') return { ...me, winner: s.winner, mine: s.winner === p.id, oracle: s.oracle };
    return { ...me, wait: 'Смотри на экран' };
  },

  /* ---------- боты ---------- */
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
      if (c.type === 'list' && !s.done[b.id]) {
        shuffle(c.items).slice(0, 2 + Math.floor(Math.random() * 3)).forEach((alts, i) => m.push({ delay: 2 + i * rnd(1.5, 3), msg: { a: 'item', text: alts[0] } }));
        m.push({ delay: 12, msg: { a: 'listDone' } });
      }
      if (c.type === 'match' && !s.answers[b.id]) m.push({ delay: rnd(4, 10), msg: { a: 'match', pairs: c.key.map((k) => (Math.random() < 0.6 ? k : Math.floor(Math.random() * c.key.length))) } });
      if (c.type === 'poll' && !s.answers[b.id]) m.push({ delay: rnd(2, 7), msg: { a: 'poll', for: pick(playing(room).filter((x) => x.id !== b.id)).id } });
    }
    if (room.phase === 'place' && s.earned[b.id] && !s.placed[b.id]) {
      m.push({ delay: rnd(2, 6), msg: { a: 'place', cells: Array.from({ length: s.earned[b.id] }, () => Math.floor(Math.random() * s.wheel.length)) } });
    }
    if (room.phase === 'spinWait' && s.spinner === b.id) m.push({ delay: rnd(1.5, 3.5), msg: { a: 'spin', power: rnd(0.4, 1) } });
    if (room.phase === 'winWait' && s.win?.pid === b.id) m.push({ delay: rnd(2, 4), msg: { a: 'spin', power: rnd(0.4, 1) } });
    return m;
  },
};

/* =================== механика =================== */

/* колода по уровню контента: своё + немного попроще */
function bank(type, level) {
  const fam = PACK[type] || [];
  if (level === 'adult') return [...PACK.adult[type], ...shuffle(fam).slice(0, Math.ceil(fam.length / 3))];
  if (level === 'hard') return [...PACK.hard[type], ...shuffle(PACK.adult[type]).slice(0, Math.ceil(PACK.adult[type].length / 2)), ...shuffle(fam).slice(0, 3)];
  return fam;
}

const asking = (room, type) => room.phase === 'question' && room.state.cur?.type === type;

function toMap(cells, n) {
  const want = cells.slice(0, n);
  while (want.length < n) want.push(Math.floor(Math.random() * BASE.length));
  const map = {};
  for (const c of want) map[c] = (map[c] || 0) + 1;
  return map;
}

const placers = (room) => Object.keys(room.state.earned).filter((id) => room.state.earned[id] > 0);

function mySlices(s, id) {
  const n = Object.values(s.slices[id] || {}).reduce((a, b) => a + b, 0);
  return n ? `твоих секторов на Барабане: ${n}` : 'твоих секторов на Барабане нет';
}

/* опрос — только когда есть за кого голосовать */
function roundTypes(room, set) {
  const out = [];
  for (let k = 0; k < PER_SET; k++) {
    let t = TYPES[(PER_SET * (set - 1) + k) % TYPES.length];
    if (t === 'poll' && playing(room).length < 3) t = 'multi';
    out.push(t);
  }
  return out;
}

/* сектора текущего раунда: числа подрастают */
function buildWheel(set) {
  const g = GROW[set - 1] || GROW[GROW.length - 1];
  return BASE.map((v) => (typeof v === 'number' ? { k: 'num', v: Math.round((v * g) / 50) * 50 } : { k: v }));
}

function startRound(room) {
  const s = room.state;
  s.set++;
  s.qn = 0;
  s.earned = {};
  s.roundGain = {};
  s.roundSlices = {};
  s.slices = {};
  s.placed = {};
  s.double = false;
  s.wheel = buildWheel(s.set);
  s.types = roundTypes(room, s.set);
  for (const p of playing(room)) if (!s.asks[p.id]) s.asks[p.id] = pick(PACK.botAsk);
  room.phase = 'roundIntro';
  room.sound('sting');
  room.say(SAY.rintro[Math.min(s.set - 1, SAY.rintro.length - 1)], { who: 'baraban' });
  room.setTimer(T.rintro, () => nextQuestion(room));
  room.push();
}

function nextQuestion(room) {
  const s = room.state;
  s.qn++;
  const type = s.types[s.qn - 1];
  const raw = s.decks[type].draw();
  if (type === 'multi') s.cur = { type, q: raw.q, options: shuffle([...raw.yes.map((t) => ({ t, ok: true })), ...raw.no.map((t) => ({ t, ok: false }))]) };
  if (type === 'number') s.cur = { type, q: raw.q, a: raw.a };
  if (type === 'list') s.cur = { type, q: raw.q, items: raw.items };
  if (type === 'match') {
    const order = shuffle(raw.pairs.map((_, i) => i));
    // слева — по порядку, справа — перемешано; key[i] — где справа правильный ответ для i-го слева
    s.cur = { type, q: raw.q, left: raw.pairs.map((x) => x[0]), right: order.map((i) => raw.pairs[i][1]), key: raw.pairs.map((_, i) => order.indexOf(i)) };
  }
  if (type === 'poll') s.cur = { type, q: raw };
  s.answers = {};
  s.done = {};
  room.phase = 'question';
  room.sound('open');
  room.say(`${raw.q || raw} ${SAY.hint[type]}`, { who: 'baraban' });
  room.setTimer(T[type], () => scoreQuestion(room));
  room.push();
}

function answered(room) {
  const s = room.state;
  room.sound('pop');
  const done = (p) => (s.cur.type === 'list' ? s.done[p.id] : s.answers[p.id] != null);
  if (playing(room).every((p) => !p.connected || done(p))) { room.clearTimer(); scoreQuestion(room); }
}

/* очки за ответ → места → сектора: 1-е место — 3, 2-е — 2, остальным с очками — 1 */
function scoreQuestion(room) {
  const s = room.state;
  const c = s.cur;
  const rows = playing(room).map((p) => ({ id: p.id, score: 0, detail: '', slices: 0 }));
  let correct = [];
  let stars = null;

  if (c.type === 'multi') {
    for (const r of rows) {
      const a = s.answers[r.id];
      if (!a) { r.detail = 'не ответил'; continue; }
      const good = a.filter((i) => c.options[i].ok).length, bad = a.length - good;
      r.score = Math.max(0, good * 2 - bad * 2 + (bad === 0 && good === c.options.filter((o) => o.ok).length ? 3 : 0));
      r.detail = `${good} верных, ${bad} мимо`;
    }
    correct = c.options.filter((o) => o.ok).map((o) => o.t);
  }
  if (c.type === 'list') {
    for (const r of rows) { const hits = (s.answers[r.id] || []).filter((x) => x.hit >= 0).length; r.score = hits; r.detail = `${hits} из ${c.items.length}`; }
    correct = c.items.map((alts) => alts[0]);
  }
  if (c.type === 'number') {
    const ranked = rows.filter((r) => s.answers[r.id] != null).sort((x, y) => Math.abs(s.answers[x.id] - c.a) - Math.abs(s.answers[y.id] - c.a));
    ranked.forEach((r, i) => { const g = s.answers[r.id]; r.guess = g; r.score = 100 - i - (g === c.a ? -50 : 0); r.detail = g === c.a ? `${g} — в точку!` : `${g} (мимо на ${+Math.abs(g - c.a).toFixed(2)})`; });
    for (const r of rows) if (s.answers[r.id] == null) r.detail = 'не ответил';
    correct = [String(c.a)];
  }
  if (c.type === 'match') {
    for (const r of rows) {
      const a = s.answers[r.id];
      if (!a) { r.detail = 'не ответил'; continue; }
      const ok = c.key.filter((k, i) => a[i] === k).length;
      r.score = ok;
      r.detail = `${ok} из ${c.key.length}`;
    }
    correct = c.left.map((l, i) => `${l} — ${c.right[c.key[i]]}`);
  }
  if (c.type === 'poll') {
    const votes = {};
    for (const v of Object.values(s.answers)) votes[v] = (votes[v] || 0) + 1;
    const top = Math.max(0, ...Object.values(votes));
    stars = Object.keys(votes).filter((id) => votes[id] === top);
    for (const r of rows) {
      const v = s.answers[r.id];
      const withCrowd = v && stars.includes(v);
      r.slices = (withCrowd ? 2 : 0) + (stars.includes(r.id) ? 1 : 0);
      r.detail = [withCrowd ? 'угадал с залом' : v ? 'против зала' : 'не голосовал', stars.includes(r.id) ? `звезда опроса · ${votes[r.id]} гол.` : ''].filter(Boolean).join(' · ');
      r.votes = votes[r.id] || 0;
    }
    correct = stars.map((id) => room.byId(id)?.name).filter(Boolean);
  }

  if (c.type !== 'poll') {
    const scored = rows.filter((r) => r.score > 0).sort((x, y) => y.score - x.score);
    let place = 0, prev = null;
    scored.forEach((r, i) => { if (r.score !== prev) { place = i; prev = r.score; } r.slices = place === 0 ? 3 : place === 1 ? 2 : 1; });
  }
  for (const r of rows) {
    s.earned[r.id] = (s.earned[r.id] || 0) + r.slices;
    s.roundSlices[r.id] = (s.roundSlices[r.id] || 0) + r.slices;
  }
  s.qres = { type: c.type, q: c.q, correct, stars, left: c.left || null, rows: rows.sort((x, y) => y.slices - x.slices) };
  room.phase = 'qresult';
  room.sound('reveal');
  room.say(c.type === 'number' ? `Правильный ответ: ${c.a}.` : c.type === 'poll' ? `Зал решил: ${correct.join(' и ') || 'никто'}!` : pick(SAY.qres), { who: 'baraban' });
  room.setTimer(T.qresult, () => (s.qn < s.types.length ? nextQuestion(room) : toPlace(room)));
  room.push();
}

function toPlace(room) {
  const s = room.state;
  if (!placers(room).length) return endRound(room);
  room.phase = 'place';
  room.sound('round');
  room.say(pick(SAY.place), { who: 'baraban' });
  room.setTimer(T.place, () => afterPlace(room));
  room.push();
}

function afterPlace(room) {
  const s = room.state;
  for (const id of placers(room)) if (!s.placed[id]) { s.slices[id] = toMap([], s.earned[id]); s.placed[id] = true; }
  // крутят лучшие игроки раунда — по числу заработанных секторов
  s.order = shuffle(playing(room).map((p) => p.id)).sort((a, b) => (s.roundSlices[b] || 0) - (s.roundSlices[a] || 0));
  s.spinNo = 0;
  s.spinsLeft = SPINS;
  waitSpin(room);
}

function waitSpin(room) {
  const s = room.state;
  s.spinNo++;
  s.spinsLeft--;
  const online = s.order.filter((id) => room.byId(id)?.connected);
  s.spinner = (online.length ? online : s.order)[(s.spinNo - 1) % Math.max(1, (online.length ? online : s.order).length)];
  s.spin = null;
  room.phase = 'spinWait';
  const name = room.byId(s.spinner)?.name || 'игрок';
  room.say(s.spinNo === 1 ? `${name}, крути меня! Свайпни на телефоне.` : `${name}, твой оборот!`, { who: 'baraban' });
  room.setTimer(T.swipe, () => spin(room, rnd(0.35, 0.8)));
  room.push();
}

/* барабан: куда встанет — решает сервер, сила свайпа — сколько оборотов и как долго */
function spin(room, power) {
  const s = room.state;
  const pw = clamp(Number.isFinite(power) ? power : 0.5, 0.15, 1);
  const n = s.wheel.length, step = 360 / n;
  const sector = Math.floor(Math.random() * n);
  const jitter = (Math.random() - 0.5) * step * 0.7;
  const to = turn(s.angle, -(sector + 0.5) * step + jitter, 3 + Math.round(pw * 5));
  const dur = Math.round(SPIN_MS[0] + (SPIN_MS[1] - SPIN_MS[0]) * pw);
  const cell = s.wheel[sector];
  const mult = s.double ? 2 : 1;
  const holders = Object.entries(s.slices).filter(([, m]) => m[sector]).map(([id, m]) => ({ id, n: m[sector] }));
  const total = holders.reduce((a, h) => a + h.n, 0);
  const pay = {};
  let value = 0, kind = cell.k, extra = false;
  s.double = false;

  if (cell.k === 'num' || cell.k === 'prize') {
    value = cell.k === 'prize' ? Math.round((rnd(4000, 8000) * (GROW[s.set - 1] || 1)) / 100) * 100 : cell.v;
    value *= mult;
    for (const h of holders) pay[h.id] = Math.round((value * h.n) / total / 10) * 10;
  }
  if (cell.k === 'bank') for (const h of holders) pay[h.id] = -Math.min(room.byId(h.id)?.score || 0, Math.round(1000 * (GROW[s.set - 1] || 1)) * h.n);
  if (cell.k === 'x2') {
    s.double = true;
    if (s.spinsLeft <= 0) { s.spinsLeft++; extra = true; }
  }
  for (const [id, pts] of Object.entries(pay)) {
    const p = room.byId(id);
    if (!p) continue;
    p.score = Math.max(0, p.score + pts);
    s.roundGain[id] = (s.roundGain[id] || 0) + pts;
  }
  const at = Date.now();
  s.spin = { from: s.angle, to, at, dur, sector, kind, value, mult, pay, empty: !holders.length, extra, power: pw };
  s.angle = to;
  room.phase = 'spinning';
  room.sound('whoosh2');
  // ведущий объявляет, когда барабан встанет
  setTimeout(() => {
    if (room.phase !== 'spinning' || s.spin?.at !== at) return;
    const line = kind === 'bank' ? (holders.length ? pick(SAY.bank) : pick(SAY.bankEmpty))
      : kind === 'x2' ? (extra ? pick(SAY.x2bonus) : pick(SAY.x2))
      : !holders.length ? pick(SAY.empty)
      : kind === 'prize' ? `${pick(SAY.prize)} ${value}!`
      : `${value}${mult > 1 ? ', вдвойне' : ''}!`;
    room.say(line, { who: 'baraban' });
  }, dur);
  room.setTimer(dur / 1000 + T.settle, () => (s.spinsLeft > 0 ? waitSpin(room) : endRound(room)));
  room.push();
}

/* новый угол: не меньше нужного числа оборотов вперёд и ровно на цели */
function turn(from, target, turns) {
  const base = from + turns * 360;
  const d = (((target - base) % 360) + 360) % 360;
  return base + d;
}

function endRound(room) {
  const s = room.state;
  const top = Math.max(0, ...Object.values(s.roundGain));
  const ids = top > 0 ? Object.keys(s.roundGain).filter((id) => s.roundGain[id] === top) : [];
  s.roundWin = ids.length ? { ids, pts: top } : null;
  const names = ids.map((id) => room.byId(id)?.name).filter(Boolean);
  room.phase = 'roundEnd';
  room.sound(ids.length ? 'win' : 'sad');
  room.say(!ids.length ? 'Раунд без победителя. Всё забираю себе.'
    : ids.length > 1 ? `Раунд делят ${names.join(' и ')}! По ${top}.`
    : `Раунд за игроком ${names[0]}! Плюс ${top}.`, { who: 'baraban' });
  room.setTimer(T.roundEnd, () => afterRound(room));
  room.push();
}

function afterRound(room) {
  const s = room.state;
  const ranked = [...playing(room)].sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  if (leader && leader.score >= GOAL) return winIntro(room, leader);
  if (s.set >= MAX_SETS) return finish(room, leader);
  startRound(room);
}

/* Колесо победы: с каждой попыткой победных секторов больше */
function winIntro(room, p) {
  const s = room.state;
  s.tries[p.id] = (s.tries[p.id] || 0) + 1;
  const wins = Math.min(WIN_SLOTS - 2, 3 * s.tries[p.id]);
  // победные сектора раскиданы по кругу
  const slots = Array(WIN_SLOTS).fill(false);
  shuffle(Array.from({ length: WIN_SLOTS }, (_, i) => i)).slice(0, wins).forEach((i) => { slots[i] = true; });
  s.win = { pid: p.id, slots, tries: s.tries[p.id], angle: 0, spin: null, won: null };
  room.phase = 'winIntro';
  room.sound('drumroll');
  room.say(`${p.name} набирает ${GOAL}! Колесо победы! Победных секторов: ${wins} из ${WIN_SLOTS}.`, { who: 'baraban' });
  room.setTimer(T.winIntro, () => {
    room.phase = 'winWait';
    room.setTimer(T.swipe, () => winSpin(room, rnd(0.35, 0.8)));
    room.push();
  });
  room.push();
}

function winSpin(room, power) {
  const s = room.state;
  const w = s.win;
  const pw = clamp(Number.isFinite(power) ? power : 0.5, 0.15, 1);
  const step = 360 / WIN_SLOTS;
  const sector = Math.floor(Math.random() * WIN_SLOTS);
  const won = w.slots[sector] || s.set >= MAX_SETS;
  // в последнем раунде колесо всё равно встанет на победу
  const target = won && !w.slots[sector] ? w.slots.indexOf(true) : sector;
  const to = turn(w.angle, -(target + 0.5) * step + (Math.random() - 0.5) * step * 0.6, 3 + Math.round(pw * 5));
  const dur = Math.round(SPIN_MS[0] + (SPIN_MS[1] - SPIN_MS[0]) * pw);
  w.spin = { from: w.angle, to, at: Date.now(), dur, sector: target };
  w.angle = to;
  w.won = won;
  room.phase = 'winSpin';
  room.sound('whoosh2');
  setTimeout(() => { if (room.phase === 'winSpin') room.say(pick(won ? SAY.win : SAY.lose), { who: 'baraban' }); }, dur);
  room.setTimer(dur / 1000 + T.settle, () => (won ? finish(room, room.byId(w.pid)) : startRound(room)));
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
  if (/(^| )ли( |$)/.test(t)) return pick(o['ли']);
  return pick(o.default);
}
