/* «Санаторий» — викторина в заброшенном советском санатории «Тихий час».
   Ошибся — идёшь на процедуру. Не пережил процедуру — становишься призраком и играешь дальше.
   Финал — побег по коридору: отмечаешь, что подходит под категорию. Призраки бегут быстрее и могут вселиться в живого. */

import { data, Deck, shuffle, pick, rnd, secs, TEST_MODE, playing, online } from '../lib.mjs';

const PACK = data('sanatoriy.json');
const TOTAL_Q = Number(process.env.BALAGAN_SAN_Q) || (TEST_MODE ? 5 : 8);
const TRACK = TEST_MODE ? 7 : 10;
const MAX_ESC = 8;

const T = {
  intro: secs('BALAGAN_SAN_INTRO', 7, 4),
  q: secs('BALAGAN_SAN_Q_TIME', 20, 12),
  qreveal: secs('BALAGAN_SAN_QREVEAL', 5, 4),
  proc: secs('BALAGAN_SAN_PROC', 6, 4),
  poison: secs('BALAGAN_SAN_POISON', 18, 10),
  drink: secs('BALAGAN_SAN_DRINK', 18, 10),
  analiz: secs('BALAGAN_SAN_ANALIZ', 20, 12),
  schet: secs('BALAGAN_SAN_SCHET', 25, 15),
  obhod: secs('BALAGAN_SAN_OBHOD', 15, 10),
  verdict: secs('BALAGAN_SAN_VERDICT', 7, 5),
  escape: secs('BALAGAN_SAN_ESCAPE', 20, 12),
  escReveal: secs('BALAGAN_SAN_ESCREVEAL', 6, 4),
};

const PROCS = {
  kompot: { title: 'Компот', desc: 'Перед пациентами стаканы компота. Остальные тайно подсыпают в них снотворное. Пациенты выбирают, что выпить.' },
  analiz: { title: 'Анализы', desc: 'Девять пробирок, в двух — плохие результаты. Каждый пациент вскрывает две.' },
  schet: { title: 'Устный счёт', desc: 'Четыре примера. Ошибся дважды — тихий час навсегда.' },
  obhod: { title: 'Обход', desc: 'Спрячьтесь в одной из пяти палат. Главврач заглянет в две.' },
};

const DOC = {
  intro: 'Добро пожаловать в санаторий «Тихий час». Я главврач. Отвечайте правильно — и, может быть, вас выпишут.',
  right: ['Здоровы. Пока.', 'Все ответили верно. Скучно.', 'Сегодня без процедур.'],
  wrong: ['Неверно. Пройдёмте на процедуру.', 'Ошибочка. Сестра, готовьте процедурную.', 'Диагноз ясен.'],
  died: ['Тихий час продлится вечно.', 'Ещё одна душа в коридоре.', 'Выписан. В другом смысле.'],
  survived: ['Повезло. В этот раз.', 'Живучие.', 'Процедура прошла успешно. Для вас.'],
  escape: 'Двери открыты. Бегите по коридору — отмечайте всё, что подходит под категорию. Призраки бегут быстрее.',
};

export default {
  id: 'sanatoriy',
  title: 'Санаторий',
  tagline: 'Викторина в санатории, откуда не выписывают',
  minPlayers: 2,
  maxPlayers: 8,
  tags: ['Викторина', 'Ужасы'],
  minutes: 20,
  intro: 'Санаторий «Тихий час». Отсюда ещё никого не выписали.',
  rules: [
    'Отвечай на вопросы — за верный ответ очки',
    'Ошибся — идёшь на процедуру: компот, анализы, устный счёт или обход',
    'Не пережил процедуру — становишься призраком, но играешь дальше',
    'Финал — побег по коридору: отмечай всё, что подходит под категорию',
    'Призраки бегут быстрее и могут вселиться в живого. Первый у выхода — выписан',
  ],

  init(room) {
    room.state = {
      deck: new Deck(PACK.questions),
      escDeck: new Deck(PACK.escape),
      qn: 0,
      cur: null,
      answers: {},
      dead: {},
      patients: [],
      proc: null,
      lastProc: null,
      verdict: null,
      esc: null,
      winner: null,
    };
  },

  start(room) {
    room.phase = 'intro';
    room.say(DOC.intro, { who: 'sanatoriy' });
    room.sound('creak');
    room.setTimer(T.intro, () => nextQuestion(room));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    const pr = s.proc;
    switch (msg.a) {
      case 'answer': {
        if (room.phase !== 'question' || p.audience || s.answers[p.id] != null) return;
        const i = Number(msg.i);
        if (!(i >= 0 && i < 4)) return;
        s.answers[p.id] = i;
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.answers[x.id] != null)) { room.clearTimer(); qReveal(room); }
        return;
      }

      case 'poison': {
        if (room.phase !== 'poison' || s.patients.includes(p.id) || pr.poison[p.id] != null) return;
        const g = Number(msg.g);
        if (!(g >= 0 && g < pr.glasses)) return;
        pr.poison[p.id] = g;
        room.sound('drip');
        if (poisoners(room).every((id) => pr.poison[id] != null)) { room.clearTimer(); startDrink(room); }
        return;
      }

      case 'drink': {
        if (room.phase !== 'drink' || !s.patients.includes(p.id) || pr.drinks[p.id] != null) return;
        const g = Number(msg.g);
        if (!(g >= 0 && g < pr.glasses)) return;
        pr.drinks[p.id] = g;
        if (s.patients.every((id) => pr.drinks[id] != null)) { room.clearTimer(); resolveKompot(room); }
        return;
      }

      case 'scratch': {
        if (room.phase !== 'analiz' || !s.patients.includes(p.id)) return;
        const card = pr.cards[p.id];
        const c = Number(msg.c);
        if (!card || card.done || !(c >= 0 && c < 9) || card.opened.includes(c)) return;
        card.opened.push(c);
        if (card.skulls.includes(c)) { card.done = true; card.dead = true; room.sound('death'); }
        else if (card.opened.length >= 2) { card.done = true; room.sound('right'); }
        else room.sound('pop');
        if (s.patients.every((id) => pr.cards[id].done)) { room.clearTimer(); resolveAnaliz(room); }
        return;
      }

      case 'math': {
        if (room.phase !== 'schet' || !s.patients.includes(p.id)) return;
        const m = pr.math[p.id];
        if (!m || m.i >= m.list.length || Number(msg.i) !== m.i) return;
        const ok = Number(msg.v) === m.list[m.i].ans;
        if (ok) m.right++;
        m.i++;
        room.sound(ok ? 'right' : 'wrong');
        if (s.patients.every((id) => pr.math[id].i >= pr.math[id].list.length)) { room.clearTimer(); resolveSchet(room); }
        return;
      }

      case 'hide': {
        if (room.phase !== 'obhod' || !s.patients.includes(p.id) || pr.hide[p.id] != null) return;
        const r = Number(msg.r);
        if (!(r >= 0 && r < 5)) return;
        pr.hide[p.id] = r;
        room.sound('creak');
        if (s.patients.every((id) => pr.hide[id] != null)) { room.clearTimer(); resolveObhod(room); }
        return;
      }

      case 'esc': {
        if (room.phase !== 'escape' || p.audience || s.esc.sub[p.id]) return;
        const picks = (msg.picks || []).slice(0, 3).map(Boolean);
        while (picks.length < 3) picks.push(false);
        s.esc.sub[p.id] = picks;
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.esc.sub[x.id])) { room.clearTimer(); escReveal(room); }
        return;
      }
    }
  },

  viewTV(room) {
    const s = room.state;
    const base = { qn: s.qn, total: TOTAL_Q, dead: s.dead, alive: alive(room).map((p) => p.id) };
    if (room.phase === 'question') return { ...base, q: s.cur.q, options: s.cur.options, answered: Object.keys(s.answers) };
    if (room.phase === 'qreveal') {
      const picks = {};
      for (const [pid, i] of Object.entries(s.answers)) (picks[i] = picks[i] || []).push(pid);
      return { ...base, q: s.cur.q, options: s.cur.options, correct: s.cur.correct, picks, patients: s.patients };
    }
    if (['procIntro', 'poison', 'drink', 'analiz', 'schet', 'obhod'].includes(room.phase)) {
      const pr = s.proc;
      const v = { ...base, proc: { id: pr.id, ...PROCS[pr.id] }, patients: s.patients };
      if (room.phase === 'poison') v.poisonDone = poisoners(room).map((id) => ({ id, done: pr.poison[id] != null }));
      if (room.phase === 'poison' || room.phase === 'drink') v.glasses = pr.glasses;
      if (room.phase === 'drink') v.drunk = s.patients.map((id) => ({ id, done: pr.drinks[id] != null }));
      if (room.phase === 'analiz') v.cards = Object.fromEntries(s.patients.map((id) => [id, { opened: pr.cards[id].opened, skulls: pr.cards[id].opened.filter((c) => pr.cards[id].skulls.includes(c)), dead: pr.cards[id].dead, done: pr.cards[id].done }]));
      if (room.phase === 'schet') v.math = Object.fromEntries(s.patients.map((id) => [id, { i: pr.math[id].i, right: pr.math[id].right, of: pr.math[id].list.length }]));
      if (room.phase === 'obhod') v.hidden = s.patients.map((id) => ({ id, done: pr.hide[id] != null }));
      return v;
    }
    if (room.phase === 'verdict') return { ...base, proc: { id: s.proc.id, ...PROCS[s.proc.id] }, verdict: s.verdict };
    if (room.phase === 'escape' || room.phase === 'escReveal') {
      const e = s.esc;
      return { ...base, track: TRACK, pos: e.pos, ghosts: Object.keys(s.dead), cat: e.q.cat, items: e.q.items.map((it) => ({ t: it.t, ok: room.phase === 'escReveal' ? it.ok : null })), submitted: Object.keys(e.sub), moves: room.phase === 'escReveal' ? e.moves : null, swaps: room.phase === 'escReveal' ? e.swaps : null, n: e.n };
    }
    if (room.phase === 'winner') return { ...base, winner: s.winner, pos: s.esc?.pos, track: TRACK };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    const ghost = !!s.dead[p.id];
    const my = { ghost };
    const pr = s.proc;
    if (room.phase === 'intro') return { ...my, wait: 'Добро пожаловать в санаторий' };
    if (room.phase === 'question') {
      if (p.audience) return { ...my, wait: 'Пациенты отвечают' };
      if (s.answers[p.id] != null) return { ...my, wait: 'Ответ принят' };
      return { ...my, question: { q: s.cur.q, options: s.cur.options, n: s.qn, of: TOTAL_Q } };
    }
    if (room.phase === 'qreveal') {
      const a = s.answers[p.id];
      return { ...my, wait: a == null ? 'Ты промолчал' : a === s.cur.correct ? 'Верно!' : 'Неверно…', mood: a === s.cur.correct ? 'ok' : 'bad' };
    }
    if (room.phase === 'procIntro') return { ...my, wait: s.patients.includes(p.id) ? `Процедура «${PROCS[pr.id].title}». Готовься` : `Процедура «${PROCS[pr.id].title}»`, mood: s.patients.includes(p.id) ? 'bad' : null };
    if (room.phase === 'poison') {
      if (s.patients.includes(p.id)) return { ...my, wait: 'Кто-то подсыпает снотворное в компот…', mood: 'bad' };
      if (p.audience) return { ...my, wait: 'Здоровые подсыпают снотворное' };
      if (pr.poison[p.id] != null) return { ...my, wait: 'Готово. Хи-хи' };
      return { ...my, poison: { glasses: pr.glasses } };
    }
    if (room.phase === 'drink') {
      if (!s.patients.includes(p.id)) return { ...my, wait: 'Пациенты выбирают стакан' };
      if (pr.drinks[p.id] != null) return { ...my, wait: 'Выпил. Ждём…', mood: 'bad' };
      return { ...my, drink: { glasses: pr.glasses } };
    }
    if (room.phase === 'analiz') {
      if (!s.patients.includes(p.id)) return { ...my, wait: 'Пациенты сдают анализы' };
      const c = pr.cards[p.id];
      return { ...my, analiz: { opened: c.opened, skulls: c.opened.filter((x) => c.skulls.includes(x)), done: c.done, dead: c.dead } };
    }
    if (room.phase === 'schet') {
      if (!s.patients.includes(p.id)) return { ...my, wait: 'Пациенты решают примеры' };
      const m = pr.math[p.id];
      if (m.i >= m.list.length) return { ...my, wait: `Верно ${m.right} из ${m.list.length}` };
      return { ...my, schet: { i: m.i, of: m.list.length, text: m.list[m.i].text, right: m.right } };
    }
    if (room.phase === 'obhod') {
      if (!s.patients.includes(p.id)) return { ...my, wait: 'Пациенты прячутся по палатам' };
      if (pr.hide[p.id] != null) return { ...my, wait: `Ты в палате №${pr.hide[p.id] + 1}. Тихо…`, mood: 'bad' };
      return { ...my, obhod: true };
    }
    if (room.phase === 'verdict') {
      const died = s.verdict?.died?.includes(p.id);
      return { ...my, wait: died ? 'Ты стал призраком. Но игра продолжается' : s.patients.includes(p.id) ? 'Выжил!' : 'Смотри на экран', mood: died ? 'bad' : null };
    }
    if (room.phase === 'escape') {
      if (p.audience) return { ...my, wait: 'Пациенты бегут к выходу' };
      if (s.esc.sub[p.id]) return { ...my, wait: 'Бежим!' };
      return { ...my, escape: { cat: s.esc.q.cat, items: s.esc.q.items.map((it) => it.t), pos: s.esc.pos[p.id], track: TRACK } };
    }
    if (room.phase === 'escReveal') return { ...my, wait: `+${s.esc.moves[p.id] || 0} шагов · ты на клетке ${s.esc.pos[p.id]} из ${TRACK}` };
    if (room.phase === 'winner') return { ...my, winner: s.winner, mine: s.winner === p.id };
    return my;
  },

  stepKey: (room) => `${room.phase}:${room.state.qn}:${room.state.esc?.n || 0}`,

  botMoves(room, b) {
    const s = room.state;
    const pr = s.proc;
    const m = [];
    if (room.phase === 'question' && !b.audience && s.answers[b.id] == null) {
      m.push({ delay: rnd(2, 8), msg: { a: 'answer', i: Math.random() < 0.55 ? s.cur.correct : Math.floor(Math.random() * 4) } });
    }
    if (room.phase === 'poison' && poisoners(room).includes(b.id)) m.push({ delay: rnd(2, 6), msg: { a: 'poison', g: Math.floor(Math.random() * pr.glasses) } });
    if (room.phase === 'drink' && s.patients.includes(b.id)) m.push({ delay: rnd(2, 6), msg: { a: 'drink', g: Math.floor(Math.random() * pr.glasses) } });
    if (room.phase === 'analiz' && s.patients.includes(b.id)) {
      const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      m.push({ delay: rnd(2, 4), msg: { a: 'scratch', c: cells[0] } }, { delay: rnd(5, 7), msg: { a: 'scratch', c: cells[1] } });
    }
    if (room.phase === 'schet' && s.patients.includes(b.id)) {
      pr.math[b.id].list.forEach((x, i) => m.push({ delay: 2 + i * rnd(1.5, 3), msg: { a: 'math', i, v: Math.random() < 0.75 ? x.ans : x.ans + 1 } }));
    }
    if (room.phase === 'obhod' && s.patients.includes(b.id)) m.push({ delay: rnd(2, 6), msg: { a: 'hide', r: Math.floor(Math.random() * 5) } });
    if (room.phase === 'escape' && !b.audience && !s.esc.sub[b.id]) {
      m.push({ delay: rnd(3, 8), msg: { a: 'esc', picks: s.esc.q.items.map((it) => (Math.random() < 0.65 ? it.ok : !it.ok)) } });
    }
    return m;
  },
};

/* =================== механика =================== */

const alive = (room) => playing(room).filter((p) => !room.state.dead[p.id]);
const poisoners = (room) => online(room.players).filter((p) => !room.state.patients.includes(p.id) && !p.audience).map((p) => p.id);

function nextQuestion(room) {
  const s = room.state;
  s.qn++;
  if (s.qn > TOTAL_Q || (alive(room).length <= 1 && playing(room).length > 1)) return startEscape(room);
  const raw = s.deck.draw();
  const order = shuffle([0, 1, 2, 3]);
  s.cur = { q: raw.q, options: order.map((i) => raw.options[i]), correct: order.indexOf(raw.answer) };
  s.answers = {};
  s.patients = [];
  room.phase = 'question';
  room.sound('open');
  room.say(`Вопрос ${s.qn}. ${raw.q}`, { who: 'sanatoriy' });
  room.setTimer(T.q, () => qReveal(room));
  room.push();
}

function qReveal(room) {
  const s = room.state;
  for (const p of playing(room)) {
    if (s.answers[p.id] === s.cur.correct) p.score += 1000;
  }
  s.patients = alive(room).filter((p) => s.answers[p.id] !== s.cur.correct).map((p) => p.id);
  room.phase = 'qreveal';
  room.sound(s.patients.length ? 'wrong' : 'right');
  room.say(`Правильный ответ: ${s.cur.options[s.cur.correct]}. ${s.patients.length ? pick(DOC.wrong) : pick(DOC.right)}`, { who: 'sanatoriy' });
  room.setTimer(T.qreveal, () => (s.patients.length ? procIntro(room) : nextQuestion(room)));
  room.push();
}

function procIntro(room) {
  const s = room.state;
  const ids = Object.keys(PROCS).filter((id) => id !== s.lastProc);
  // компоту нужны отравители — если все пациенты, выбираем другое
  const usable = ids.filter((id) => id !== 'kompot' || poisonersFor(room).length > 0);
  const id = pick(usable.length ? usable : ids);
  s.lastProc = id;
  s.proc = { id };
  room.phase = 'procIntro';
  room.sound('creak');
  room.say(`Процедура «${PROCS[id].title}». ${PROCS[id].desc}`, { who: 'sanatoriy' });
  room.setTimer(T.proc, () => beginProc(room));
  room.push();
}

const poisonersFor = (room) => online(room.players).filter((p) => !room.state.patients.includes(p.id) && !p.audience);

function beginProc(room) {
  const s = room.state;
  const pr = s.proc;
  if (pr.id === 'kompot') {
    pr.glasses = Math.max(4, Math.min(8, s.patients.length + 3));
    pr.poison = {};
    pr.drinks = {};
    room.phase = 'poison';
    room.setTimer(T.poison, () => startDrink(room));
  } else if (pr.id === 'analiz') {
    pr.cards = Object.fromEntries(s.patients.map((id) => [id, { skulls: shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 2), opened: [], done: false, dead: false }]));
    room.phase = 'analiz';
    room.setTimer(T.analiz, () => resolveAnaliz(room, true));
  } else if (pr.id === 'schet') {
    pr.math = Object.fromEntries(s.patients.map((id) => [id, { list: problems(), i: 0, right: 0 }]));
    room.phase = 'schet';
    room.setTimer(T.schet, () => resolveSchet(room));
  } else {
    pr.hide = {};
    room.phase = 'obhod';
    room.setTimer(T.obhod, () => resolveObhod(room));
  }
  room.sound('round');
  room.push();
}

function startDrink(room) {
  const s = room.state;
  const pr = s.proc;
  pr.poisoned = [...new Set(Object.values(pr.poison))];
  if (!pr.poisoned.length) pr.poisoned = shuffle([...Array(pr.glasses).keys()]).slice(0, 2);
  room.phase = 'drink';
  room.say('Снотворное в стаканах. Пациенты, выбирайте.', { who: 'sanatoriy' });
  room.setTimer(T.drink, () => resolveKompot(room));
  room.push();
}

function resolveKompot(room) {
  const s = room.state;
  const pr = s.proc;
  for (const id of s.patients) if (pr.drinks[id] == null) pr.drinks[id] = Math.floor(Math.random() * pr.glasses);
  const died = s.patients.filter((id) => pr.poisoned.includes(pr.drinks[id]));
  verdict(room, died, { glasses: pr.glasses, poisoned: pr.poisoned, drinks: pr.drinks, poison: pr.poison });
}

function resolveAnaliz(room, timeout = false) {
  const s = room.state;
  const pr = s.proc;
  if (timeout) {
    for (const id of s.patients) {
      const c = pr.cards[id];
      while (!c.done) {
        const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => !c.opened.includes(x));
        const x = pick(free);
        c.opened.push(x);
        if (c.skulls.includes(x)) { c.done = true; c.dead = true; }
        else if (c.opened.length >= 2) c.done = true;
      }
    }
  }
  const died = s.patients.filter((id) => pr.cards[id].dead);
  verdict(room, died, { cards: Object.fromEntries(s.patients.map((id) => [id, { opened: pr.cards[id].opened, skulls: pr.cards[id].skulls }])) });
}

function problems() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const kind = i % 3;
    if (kind === 0) { const a = 12 + Math.floor(Math.random() * 70), b = 11 + Math.floor(Math.random() * 60); out.push({ text: `${a} + ${b}`, ans: a + b }); }
    if (kind === 1) { const a = 50 + Math.floor(Math.random() * 50), b = 11 + Math.floor(Math.random() * 38); out.push({ text: `${a} − ${b}`, ans: a - b }); }
    if (kind === 2) { const a = 3 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 13); out.push({ text: `${a} × ${b}`, ans: a * b }); }
  }
  return out;
}

function resolveSchet(room) {
  const s = room.state;
  const pr = s.proc;
  const died = s.patients.filter((id) => pr.math[id].right < 3);
  verdict(room, died, { math: Object.fromEntries(s.patients.map((id) => [id, { right: pr.math[id].right, of: pr.math[id].list.length }])) });
}

function resolveObhod(room) {
  const s = room.state;
  const pr = s.proc;
  for (const id of s.patients) if (pr.hide[id] == null) pr.hide[id] = Math.floor(Math.random() * 5);
  pr.checked = shuffle([0, 1, 2, 3, 4]).slice(0, 2);
  const died = s.patients.filter((id) => pr.checked.includes(pr.hide[id]));
  verdict(room, died, { hide: pr.hide, checked: pr.checked });
}

function verdict(room, died, details) {
  const s = room.state;
  room.clearTimer();
  for (const id of died) s.dead[id] = true;
  s.verdict = { died, survived: s.patients.filter((id) => !died.includes(id)), details };
  room.phase = 'verdict';
  room.sound(died.length ? 'death' : 'right');
  if (died.length) setTimeout(() => room.sound('ghost'), 900);
  const names = died.map((id) => room.byId(id)?.name).filter(Boolean).join(', ');
  room.say(died.length ? `${names}. ${pick(DOC.died)}` : pick(DOC.survived), { who: 'sanatoriy' });
  room.setTimer(T.verdict, () => nextQuestion(room));
  room.push();
}

/* ---------- побег ---------- */
function startEscape(room) {
  const s = room.state;
  s.esc = { pos: {}, n: 0, sub: {}, q: null, moves: {}, swaps: [] };
  for (const p of playing(room)) s.esc.pos[p.id] = s.dead[p.id] ? 0 : 2;
  room.say(DOC.escape, { who: 'sanatoriy' });
  nextEscape(room);
}

function nextEscape(room) {
  const s = room.state;
  const e = s.esc;
  e.n++;
  const c = s.escDeck.draw();
  const yes = 1 + Math.floor(Math.random() * 2);
  const items = shuffle([...shuffle(c.yes).slice(0, yes).map((t) => ({ t, ok: true })), ...shuffle(c.no).slice(0, 3 - yes).map((t) => ({ t, ok: false }))]);
  e.q = { cat: c.cat, items };
  e.sub = {};
  e.moves = {};
  e.swaps = [];
  room.phase = 'escape';
  room.sound('drumroll');
  room.say(c.cat, { who: 'sanatoriy' });
  room.setTimer(T.escape, () => escReveal(room));
  room.push();
}

function escReveal(room) {
  const s = room.state;
  const e = s.esc;
  for (const p of playing(room)) {
    const sub = e.sub[p.id];
    let c = 0;
    if (sub) e.q.items.forEach((it, i) => { if (sub[i] === it.ok) c++; });
    let step = c;
    if (s.dead[p.id] && c > 0) step += 1;   // призраки быстрее
    e.moves[p.id] = step;
    e.pos[p.id] += step;
  }
  // призрак, догнавший живого, вселяется в него
  for (const g of playing(room).filter((p) => s.dead[p.id])) {
    const victim = alive(room).filter((a) => e.pos[g.id] >= e.pos[a.id] && !e.swaps.some((x) => x.victim === a.id))
      .sort((a, b) => e.pos[b.id] - e.pos[a.id])[0];
    if (victim) {
      delete s.dead[g.id];
      s.dead[victim.id] = true;
      e.swaps.push({ ghost: g.id, victim: victim.id });
    }
  }
  room.phase = 'escReveal';
  room.sound(e.swaps.length ? 'ghost' : 'reveal');
  const swapLine = e.swaps.map((x) => `${room.byId(x.ghost)?.name} вселяется в ${room.byId(x.victim)?.name}!`).join(' ');
  room.say(`${e.q.items.filter((it) => it.ok).map((it) => it.t).join(', ')} — да. ${swapLine}`, { who: 'sanatoriy' });

  const best = Math.max(...Object.values(e.pos));
  room.setTimer(T.escReveal, () => {
    if (best >= TRACK || e.n >= MAX_ESC) return finish(room);
    nextEscape(room);
  });
  room.push();
}

function finish(room) {
  const s = room.state;
  const e = s.esc;
  const list = playing(room).sort((a, b) => (e.pos[b.id] - e.pos[a.id]) || (b.score - a.score));
  const w = list[0];
  s.winner = w?.id || null;
  if (w) w.score += 5000;
  room.phase = 'winner';
  room.clearTimer();
  room.sound('win');
  room.say(w ? `${w.name} выписан из санатория. Остальные… остаются на тихий час.` : 'Никто не выписан.', { who: 'sanatoriy' });
  room.push();
}
