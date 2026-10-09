/* «Палата №6» — смертельная викторина в больнице, откуда не выписывают. Механика как в Trivia Murder Party 2.
   Верный ответ — 1000 ₽. Ошибся — в процедурную на мини-игру. Здоровые там тоже играют: травят, колют, голосуют.
   Умер — становишься призраком и играешь дальше. После 9-го вопроса — «Последняя палата»: выживает один.
   Финал — побег по коридору: сзади ползёт тьма, у выхода барьер, призраки вселяются в живых. */

import { data, Deck, shuffle, pick, rnd, secs, clean, norm, close, TEST_MODE, playing, online } from '../lib.mjs';

const PACK = data('sanatoriy.json');
const TOTAL_Q = Number(process.env.BALAGAN_SAN_Q) || (TEST_MODE ? 6 : 9);
const TRACK = TEST_MODE ? 8 : 11;
const MAX_ESC = 10;
const MONEY = 1000;

const T = {
  intro: secs('BALAGAN_SAN_INTRO', 15, 8),
  q: secs('BALAGAN_SAN_Q_TIME', 22, 13),
  qreveal: secs('BALAGAN_SAN_QREVEAL', 10, 7),
  procIntro: secs('BALAGAN_SAN_PROC', 9, 6),
  poison: secs('BALAGAN_SAN_POISON', 18, 11),
  pills: secs('BALAGAN_SAN_PILLS', 15, 10),
  analiz: secs('BALAGAN_SAN_ANALIZ', 25, 15),
  schet: secs('BALAGAN_SAN_SCHET', 30, 20),
  lift: secs('BALAGAN_SAN_LIFT', 20, 12),
  consilium: secs('BALAGAN_SAN_CONS', 30, 16),
  draw: secs('BALAGAN_SAN_DRAW', 50, 25),
  vote: secs('BALAGAN_SAN_VOTE', 22, 12),
  hide: secs('BALAGAN_SAN_HIDE', 15, 10),
  stab: secs('BALAGAN_SAN_STAB', 15, 10),
  give: secs('BALAGAN_SAN_GIVE', 15, 10),
  write: secs('BALAGAN_SAN_WRITE', 40, 20),
  lastroom: secs('BALAGAN_SAN_LAST', 20, 12),
  verdict: secs('BALAGAN_SAN_VERDICT', 10, 7),
  escIntro: secs('BALAGAN_SAN_ESCINTRO', 12, 7),
  escape: secs('BALAGAN_SAN_ESCAPE', 18, 12),
  escReveal: secs('BALAGAN_SAN_ESCREVEAL', 8, 6),
  winner: 0,
};

/* процедуры: кто нужен и что говорит главврач */
const PROCS = {
  pills:     { title: 'Таблетки',     need: (P, S) => P >= 1 && S >= 1, say: 'Процедура «Таблетки». Здоровые тайно подсыпают яд в одну таблетку. Пациенты выбирают, что проглотить. За каждую жертву отравитель получает пятьсот рублей.' },
  analiz:    { title: 'Анализы',      need: (P) => P >= 1,           say: 'Процедура «Анализы». Девять пробирок. В одной — смертельный диагноз. Каждый пациент вскрывает три.' },
  schet:     { title: 'Устный счёт',  need: (P) => P >= 1,           say: 'Процедура «Устный счёт». Решайте примеры, пока не кончится время. Кто решит меньше всех — останется на вечный тихий час.' },
  lift:      { title: 'Лифт',         need: (P) => P >= 2,           say: 'Процедура «Лифт». Два больничных лифта. Выберете один и тот же — спуститесь все. Разделитесь — тяжёлый оборвётся.' },
  consilium: { title: 'Консилиум',    need: (P, S) => P >= 2 || (P >= 1 && S >= 1), say: 'Процедура «Консилиум». Я называю тему, вы — ответ. Совпали с кем-то — умрёте. Думайте нестандартно.' },
  rentgen:   { title: 'Рентген',      need: (P) => P >= 2,           say: 'Процедура «Рентген». Пациенты рисуют, остальные голосуют. Худший рисунок отправится в морг.' },
  kapel:     { title: 'Капельница',   need: (P, S) => P >= 1 && S >= 1, say: 'Процедура «Капельница». Пациенты прячутся на койках. Здоровые ставят капельницы вслепую. Кого найдут — того и прокапают.' },
  tonometr:  { title: 'Тонометр',     need: (P) => P >= 2,           say: 'Процедура «Тонометр». Меряем давление. У кого выше всех — тот и не выживет. Здоровые могут добавить кому-нибудь лишний кубик.' },
  zapiska:   { title: 'Записка',      need: (P) => P >= 2,           say: 'Процедура «Записка». Пациенты пишут ответ, все голосуют. Самая скучная записка станет предсмертной.' },
};

const DOC = {
  intro: [
    'Добро пожаловать в Палату номер шесть. Я главврач. Вы поступили к нам с подозрением на глупость. Будем лечить викториной.',
    'Правила простые. Отвечаете правильно — получаете деньги. Ошибаетесь — идёте на процедуру. Умрёте — не страшно, призраки тоже играют.',
  ],
  question: ['Вопрос номер {n}.', 'Следующий вопрос. Номер {n}.', 'Вопрос {n}. Не торопитесь. Хотя нет, торопитесь.'],
  allRight: ['Все ответили верно. Как скучно.', 'Здоровы. Пока.', 'Сегодня без процедур. Сестра, уберите шприцы.'],
  wrong: ['Неверно. Пройдёмте в процедурную.', 'Ошибочка. Сестра, готовьте каталку.', 'Диагноз ясен. На процедуру.', 'Не расстраивайтесь. Вам недолго осталось расстраиваться.'],
  died: ['Тихий час продлится вечно.', 'Ещё одна душа в коридоре.', 'Выписан. В другом смысле.', 'Время смерти — сейчас.'],
  survived: ['Повезло. В этот раз.', 'Живучие попались.', 'Процедура прошла успешно. Для вас.'],
  last: 'Девять вопросов позади, а живых больше одного. Непорядок. Добро пожаловать в Последнюю палату. Ключ от выхода — только в одной двери.',
  escape: 'Двери открыты. Бегите по коридору к выходу. Отмечайте всё, что подходит под категорию. Призраки бегут быстрее и могут вселиться в живых. И не оглядывайтесь — за вами идёт тьма.',
  dark: 'Тьма приближается.',
  barrier: 'У самого выхода — барьер. Чтобы пройти, нужно ответить без единой ошибки.',
};
const line = (arr, n) => pick(arr).replace('{n}', n);

export default {
  id: 'sanatoriy',
  title: 'Палата №6',
  tagline: 'Смертельная викторина в больнице, откуда не выписывают',
  minPlayers: 2,
  maxPlayers: 8,
  tags: ['Викторина', 'Ужасы'],
  minutes: 25,
  chars: ['bessonnica', 'ikota', 'migren', 'allergia', 'radikulit', 'skleroz', 'ipohondria', 'lunatizm'],
  intro: 'Палата номер шесть. Отсюда ещё никого не выписывали.',
  rules: [
    'Верный ответ — 1000 ₽',
    'Ошибся — на процедуру: таблетки, анализы, лифт, рентген и другие',
    'Здоровые помогают процедурам — и зарабатывают',
    'Погиб — играешь призраком',
    'Финал — побег: сзади тьма, у выхода барьер',
  ],

  init(room) {
    room.state = {
      deck: new Deck(PACK.questions),
      escDeck: new Deck(PACK.escape),
      consDeck: new Deck(PACK.consilium),
      drawDeck: new Deck(PACK.rentgen),
      zapDeck: new Deck(PACK.zapiska),
      qn: 0, cur: null, answers: {}, gains: {},
      dead: {}, patients: [], safe: [],
      proc: null, used: [], procs: 0,
      verdict: null, esc: null, winner: null, nobody: false,
    };
  },

  start(room) {
    room.phase = 'intro';
    room.sound('creak');
    for (const l of DOC.intro) room.say(l);
    room.setTimer(T.intro, () => nextQuestion(room));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    const pr = s.proc;
    const isPatient = s.patients.includes(p.id);
    const isSafe = s.safe.includes(p.id);
    switch (msg.a) {
      case 'answer': {
        if (room.phase !== 'question' || p.audience || s.answers[p.id] != null) return;
        const i = Number(msg.i);
        if (!(i >= 0 && i < 4)) return;
        s.answers[p.id] = i;
        room.sound('tick');
        if (playing(room).every((x) => !x.connected || s.answers[x.id] != null)) { room.clearTimer(); qReveal(room); }
        return;
      }
      /* --- процедуры --- */
      case 'poison':
        if (room.phase !== 'proc' || pr.kind !== 'pills' || pr.step !== 'poison' || !isSafe || pr.poison[p.id] != null) return;
        if (!(Number(msg.g) >= 0 && Number(msg.g) < pr.n)) return;
        pr.poison[p.id] = Number(msg.g);
        room.sound('drip');
        if (s.safe.filter(on(room)).every((id) => pr.poison[id] != null)) { room.clearTimer(); pillsPick(room); }
        return;
      case 'pill':
        if (room.phase !== 'proc' || pr.kind !== 'pills' || pr.step !== 'pick' || !isPatient || pr.pick[p.id] != null) return;
        if (!(Number(msg.g) >= 0 && Number(msg.g) < pr.n)) return;
        pr.pick[p.id] = Number(msg.g);
        room.sound('pop');
        if (s.patients.filter(on(room)).every((id) => pr.pick[id] != null)) { room.clearTimer(); resolve(room); }
        return;
      case 'scratch': {
        if (room.phase !== 'proc' || pr.kind !== 'analiz' || !isPatient) return;
        const c = pr.cards[p.id], k = Number(msg.c);
        if (!c || c.done || !(k >= 0 && k < 9) || c.opened.includes(k)) return;
        c.opened.push(k);
        if (k === c.skull) { c.done = true; c.dead = true; room.sound('flatline'); }
        else { award(room, p.id, 100); room.sound('coin'); if (c.opened.length >= 3) c.done = true; }
        if (s.patients.every((id) => pr.cards[id].done || !room.byId(id)?.connected)) { room.clearTimer(); resolve(room); }
        return;
      }
      case 'math': {
        if (room.phase !== 'proc' || pr.kind !== 'schet') return;
        const m = pr.math[p.id];
        if (!m || Number(msg.i) !== m.i) return;
        const ok = Number(msg.v) === m.list[m.i].ans;
        if (ok) { m.right++; award(room, p.id, 25); }
        m.i++;
        if (m.i >= m.list.length) m.list.push(...problems(10));
        room.sound(ok ? 'right' : 'wrong');
        return;
      }
      case 'lift':
        if (room.phase !== 'proc' || pr.kind !== 'lift' || !isPatient || pr.lift[p.id]) return;
        if (!['L', 'R'].includes(msg.s)) return;
        pr.lift[p.id] = msg.s;
        room.sound('clack');
        if (s.patients.filter(on(room)).every((id) => pr.lift[id])) { room.clearTimer(); resolve(room); }
        return;
      case 'cons': {
        if (room.phase !== 'proc' || pr.kind !== 'consilium' || !(isPatient || isSafe) || pr.words[p.id]) return;
        const w = clean(msg.text, 30);
        if (!w) return;
        pr.words[p.id] = w;
        room.sound('type');
        if ([...s.patients, ...s.safe].filter(on(room)).every((id) => pr.words[id])) { room.clearTimer(); resolve(room); }
        return;
      }
      case 'draw': {
        if (room.phase !== 'proc' || pr.kind !== 'rentgen' || pr.step !== 'draw' || !isPatient || pr.art[p.id]) return;
        const strokes = sanitizeStrokes(msg.strokes);
        pr.art[p.id] = strokes;
        room.sound('pop');
        if (s.patients.filter(on(room)).every((id) => pr.art[id])) { room.clearTimer(); voteStep(room); }
        return;
      }
      case 'write': {
        if (room.phase !== 'proc' || pr.kind !== 'zapiska' || pr.step !== 'write' || !isPatient || pr.notes[p.id]) return;
        const t = clean(msg.text, 90);
        if (!t) return;
        pr.notes[p.id] = t;
        room.sound('type');
        if (s.patients.filter(on(room)).every((id) => pr.notes[id])) { room.clearTimer(); voteStep(room); }
        return;
      }
      case 'vote': {
        if (room.phase !== 'proc' || pr.step !== 'vote' || pr.votes[p.id] || msg.for === p.id || !s.patients.includes(msg.for)) return;
        if (!voters(room).includes(p.id)) return;
        pr.votes[p.id] = msg.for;
        room.sound('vote');
        if (voters(room).every((id) => pr.votes[id])) { room.clearTimer(); resolve(room); }
        return;
      }
      case 'hide':
        if (room.phase !== 'proc' || pr.kind !== 'kapel' || pr.step !== 'hide' || !isPatient || pr.hide[p.id] != null) return;
        if (!(Number(msg.b) >= 0 && Number(msg.b) < 9)) return;
        pr.hide[p.id] = Number(msg.b);
        room.sound('creak');
        if (s.patients.filter(on(room)).every((id) => pr.hide[id] != null)) { room.clearTimer(); kapelStab(room); }
        return;
      case 'stab':
        if (room.phase !== 'proc' || pr.kind !== 'kapel' || pr.step !== 'stab' || !isSafe || pr.stab[p.id] != null) return;
        if (!(Number(msg.b) >= 0 && Number(msg.b) < 9)) return;
        pr.stab[p.id] = Number(msg.b);
        room.sound('drip');
        if (s.safe.filter(on(room)).every((id) => pr.stab[id] != null)) { room.clearTimer(); resolve(room); }
        return;
      case 'give':
        if (room.phase !== 'proc' || pr.kind !== 'tonometr' || !isSafe || pr.give[p.id] || !s.patients.includes(msg.to)) return;
        pr.give[p.id] = msg.to;
        room.sound('clack');
        if (s.safe.filter(on(room)).every((id) => pr.give[id])) { room.clearTimer(); resolve(room); }
        return;
      case 'door':
        if (room.phase !== 'proc' || pr.kind !== 'lastroom' || !isPatient || pr.doors[p.id] != null) return;
        if (!(Number(msg.d) >= 0 && Number(msg.d) < pr.n) || Object.values(pr.doors).includes(Number(msg.d))) return;
        pr.doors[p.id] = Number(msg.d);
        room.sound('creak');
        if (s.patients.filter(on(room)).every((id) => pr.doors[id] != null)) { room.clearTimer(); resolve(room); }
        return;
      /* --- побег --- */
      case 'esc':
        if (room.phase !== 'escape' || p.audience || s.esc.sub[p.id] || s.esc.out[p.id]) return;
        s.esc.sub[p.id] = (msg.picks || []).slice(0, 3).map(Boolean).concat([false, false, false]).slice(0, 3);
        room.sound('tick');
        if (escapers(room).filter((x) => x.connected).every((x) => s.esc.sub[x.id])) { room.clearTimer(); escReveal(room); }
        return;
    }
  },

  /* ---------- виды ---------- */
  viewTV(room) {
    const s = room.state;
    const base = { qn: s.qn, total: TOTAL_Q, dead: s.dead, money: MONEY };
    if (room.phase === 'question') return { ...base, q: s.cur.q, options: s.cur.options, answered: Object.keys(s.answers) };
    if (room.phase === 'qreveal') {
      const picks = {};
      for (const [pid, i] of Object.entries(s.answers)) (picks[i] = picks[i] || []).push(pid);
      return { ...base, q: s.cur.q, options: s.cur.options, correct: s.cur.correct, picks, patients: s.patients, gains: s.gains };
    }
    if (room.phase === 'procIntro' || room.phase === 'proc') return { ...base, proc: procView(room, null), patients: s.patients, safe: s.safe };
    if (room.phase === 'verdict') return { ...base, proc: { kind: s.proc.kind, title: PROCS[s.proc.kind]?.title || 'Последняя палата' }, verdict: s.verdict, patients: s.patients };
    if (room.phase === 'escIntro' || room.phase === 'escape' || room.phase === 'escReveal') {
      const e = s.esc;
      return { ...base, track: TRACK, pos: e.pos, out: e.out, wall: e.wall, cat: e.q?.cat, n: e.n,
        items: e.q?.items.map((it) => ({ t: it.t, ok: room.phase === 'escReveal' ? it.ok : null })),
        submitted: Object.keys(e.sub), moves: room.phase === 'escReveal' ? e.moves : null, swaps: room.phase === 'escReveal' ? e.swaps : null,
        bounced: room.phase === 'escReveal' ? e.bounced : null, swallowed: room.phase === 'escReveal' ? e.swallowed : null };
    }
    if (room.phase === 'winner') return { ...base, winner: s.winner, nobody: s.nobody, pos: s.esc?.pos, track: TRACK };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    const my = { ghost: !!s.dead[p.id], money: p.score };
    if (room.phase === 'intro') return { ...my, wait: 'Вас оформляют в палату…' };
    if (room.phase === 'question') {
      if (p.audience) return { ...my, wait: 'Пациенты отвечают' };
      if (s.answers[p.id] != null) return { ...my, wait: 'Ответ записан в карту' };
      return { ...my, question: { q: s.cur.q, options: s.cur.options, n: s.qn, of: TOTAL_Q } };
    }
    if (room.phase === 'qreveal') {
      const a = s.answers[p.id];
      const ok = a === s.cur.correct;
      return { ...my, wait: a == null ? 'Ты промолчал' : ok ? `Верно! +${MONEY} ₽` : 'Неверно…', mood: s.patients.includes(p.id) ? 'bad' : ok ? 'ok' : null };
    }
    if (room.phase === 'procIntro') return { ...my, wait: s.patients.includes(p.id) ? `Тебя везут на процедуру «${PROCS[s.proc.kind]?.title || 'Последняя палата'}»` : `Процедура «${PROCS[s.proc.kind]?.title || 'Последняя палата'}»`, mood: s.patients.includes(p.id) ? 'bad' : null };
    if (room.phase === 'proc') return { ...my, proc: procView(room, p) };
    if (room.phase === 'verdict') {
      const died = s.verdict?.died?.includes(p.id);
      return { ...my, wait: died ? 'Ты стал призраком. Но игра продолжается' : s.patients.includes(p.id) ? 'Выжил!' : 'Смотри на экран', mood: died ? 'bad' : null };
    }
    if (room.phase === 'escIntro') return { ...my, wait: 'Двери открываются…' };
    if (room.phase === 'escape') {
      if (p.audience) return { ...my, wait: 'Пациенты бегут к выходу' };
      if (s.esc.out[p.id]) return { ...my, wait: 'Тебя поглотила тьма', mood: 'bad' };
      if (s.esc.sub[p.id]) return { ...my, wait: 'Бежим!' };
      return { ...my, escape: { cat: s.esc.q.cat, items: s.esc.q.items.map((it) => it.t), pos: s.esc.pos[p.id], track: TRACK, wall: s.esc.wall } };
    }
    if (room.phase === 'escReveal') return { ...my, wait: s.esc.out[p.id] ? 'Тьма тебя догнала' : `+${s.esc.moves[p.id] || 0} · ты на клетке ${s.esc.pos[p.id]} из ${TRACK}` };
    if (room.phase === 'winner') return { ...my, winner: s.winner, nobody: s.nobody, mine: s.winner === p.id };
    return my;
  },

  stepKey: (room) => `${room.phase}:${room.state.qn}:${room.state.proc?.kind || ''}:${room.state.proc?.step || ''}:${room.state.esc?.n || 0}`,

  botMoves(room, b) {
    const s = room.state;
    const pr = s.proc;
    const P = s.patients.includes(b.id), Sf = s.safe.includes(b.id);
    const m = [];
    const go = (delay, msg) => m.push({ delay, msg });
    if (room.phase === 'question' && !b.audience && s.answers[b.id] == null) go(rnd(2, 9), { a: 'answer', i: Math.random() < 0.6 ? s.cur.correct : Math.floor(Math.random() * 4) });
    if (room.phase === 'proc' && pr) {
      if (pr.kind === 'pills' && pr.step === 'poison' && Sf) go(rnd(2, 6), { a: 'poison', g: Math.floor(Math.random() * pr.n) });
      if (pr.kind === 'pills' && pr.step === 'pick' && P) go(rnd(2, 6), { a: 'pill', g: Math.floor(Math.random() * pr.n) });
      if (pr.kind === 'analiz' && P) shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3).forEach((c, i) => go(2 + i * rnd(1.5, 3), { a: 'scratch', c }));
      if (pr.kind === 'schet' && pr.math[b.id]) for (let i = 0; i < 8; i++) go(2 + i * rnd(1.4, 2.6), { a: 'math', i, v: null, bot: true });
      if (pr.kind === 'lift' && P) go(rnd(2, 6), { a: 'lift', s: Math.random() < 0.5 ? 'L' : 'R' });
      if (pr.kind === 'consilium' && (P || Sf)) go(rnd(3, 9), { a: 'cons', text: pick(['нос', 'рука', 'морковь', 'бинт', 'йод', 'хирург', 'яблоко', 'кошка', 'синий', 'вода']) });
      if (pr.kind === 'rentgen' && pr.step === 'draw' && P) go(rnd(4, 10), { a: 'draw', strokes: botScribble() });
      if (pr.kind === 'zapiska' && pr.step === 'write' && P) go(rnd(4, 10), { a: 'write', text: pick(['Верните мне тапочки', 'Каша была живая', 'Я просто зашёл спросить', 'Передайте маме: я в шоке']) });
      if (pr.step === 'vote' && voters(room).includes(b.id)) go(rnd(2, 6), { a: 'vote', for: pick(s.patients.filter((x) => x !== b.id)) });
      if (pr.kind === 'kapel' && pr.step === 'hide' && P) go(rnd(2, 5), { a: 'hide', b: Math.floor(Math.random() * 9) });
      if (pr.kind === 'kapel' && pr.step === 'stab' && Sf) go(rnd(2, 5), { a: 'stab', b: Math.floor(Math.random() * 9) });
      if (pr.kind === 'tonometr' && Sf) go(rnd(2, 6), { a: 'give', to: pick(s.patients) });
      if (pr.kind === 'lastroom' && P) go(rnd(2, 6), { a: 'door', d: pick([...Array(pr.n).keys()].filter((d) => !Object.values(pr.doors).includes(d))) });
    }
    if (room.phase === 'escape' && !b.audience && !s.esc.sub[b.id] && !s.esc.out[b.id]) go(rnd(3, 9), { a: 'esc', picks: s.esc.q.items.map((it) => (Math.random() < 0.7 ? it.ok : !it.ok)) });
    // боты считают правильно в 75% случаев — ответ подставляем в момент хода
    for (const x of m) if (x.msg.bot && x.msg.a === 'math') {
      const mm = pr.math[b.id];
      x.msg = { a: 'math', i: x.msg.i, get v() { const pb = mm.list[this.i]; return pb ? (Math.random() < 0.75 ? pb.ans : pb.ans + 1) : 0; } };
    }
    return m;
  },
};

/* =================== механика =================== */

const alive = (room) => playing(room).filter((p) => !room.state.dead[p.id]);
const on = (room) => (id) => room.byId(id)?.connected;
/* голосуют здоровые, призраки и зал; если все игроки — пациенты, голосуют они сами, но не за себя */
const voters = (room) => {
  const s = room.state;
  const outside = online(room.players).filter((p) => !s.patients.includes(p.id)).map((p) => p.id);
  return outside.length ? outside : s.patients.filter(on(room));
};

function award(room, id, pts) {
  const p = room.byId(id);
  if (!p || !pts) return;
  p.score += pts;
  room.state.gains[id] = (room.state.gains[id] || 0) + pts;
}

function nextQuestion(room) {
  const s = room.state;
  // финал: после 9 вопросов, или когда остался один живой и процедур было не меньше трёх
  if (s.qn >= TOTAL_Q) return alive(room).length > 1 ? lastRoom(room) : startEscape(room);
  if (alive(room).length <= 1 && s.procs >= 3 && playing(room).length > 1) return startEscape(room);
  s.qn++;
  const raw = s.deck.draw();
  const order = shuffle([0, 1, 2, 3]);
  s.cur = { q: raw.q, options: order.map((i) => raw.options[i]), correct: order.indexOf(raw.answer) };
  s.answers = {};
  s.gains = {};
  s.patients = [];
  s.safe = [];
  room.phase = 'question';
  room.sound('open');
  room.say(`${line(DOC.question, s.qn)} ${raw.q}`);
  room.setTimer(T.q, () => qReveal(room));
  room.push();
}

function qReveal(room) {
  const s = room.state;
  for (const p of playing(room)) if (s.answers[p.id] === s.cur.correct) award(room, p.id, MONEY);
  s.patients = alive(room).filter((p) => s.answers[p.id] !== s.cur.correct).map((p) => p.id);
  s.safe = online(room.players).filter((p) => !p.audience && !s.patients.includes(p.id)).map((p) => p.id);
  room.phase = 'qreveal';
  room.sound('drumroll');
  room.say(`Правильный ответ: ${s.cur.options[s.cur.correct]}. ${s.patients.length ? pick(DOC.wrong) : pick(DOC.allRight)}`);
  room.setTimer(T.qreveal, () => (s.patients.length ? procIntro(room) : nextQuestion(room)));
  room.push();
}

function procIntro(room, forced) {
  const s = room.state;
  const P = s.patients.length, Sf = s.safe.length;
  let kind = forced;
  // для проверки: BALAGAN_SAN_FORCE=pills — всегда одна и та же процедура, если подходит по составу
  const force = process.env.BALAGAN_SAN_FORCE;
  if (!kind && force && PROCS[force]?.need(P, Sf)) kind = force;
  if (!kind) {
    const ok = Object.keys(PROCS).filter((k) => PROCS[k].need(P, Sf));
    const fresh = ok.filter((k) => !s.used.includes(k));
    kind = pick(fresh.length ? fresh : ok.filter((k) => k !== s.used.at(-1))) || 'analiz';
  }
  s.used.push(kind);
  s.proc = { kind, step: 'intro' };
  room.phase = 'procIntro';
  room.sound('slam');
  room.say(kind === 'lastroom' ? DOC.last : PROCS[kind].say);
  room.setTimer(T.procIntro, () => beginProc(room));
  room.push();
}

function beginProc(room) {
  const s = room.state;
  const pr = s.proc;
  const P = s.patients;
  room.phase = 'proc';
  room.sound('heartbeat');
  switch (pr.kind) {
    case 'pills':
      Object.assign(pr, { step: 'poison', n: Math.max(4, Math.min(9, P.length + 3)), poison: {}, pick: {} });
      room.setTimer(T.poison, () => pillsPick(room));
      break;
    case 'analiz':
      Object.assign(pr, { step: 'play', cards: Object.fromEntries(P.map((id) => [id, { skull: Math.floor(Math.random() * 9), opened: [], done: false, dead: false }])) });
      room.setTimer(T.analiz, () => resolve(room));
      break;
    case 'schet': {
      // при одном-двух пациентах считают и здоровые: пациенту нужно обогнать лучшего из них
      const players = P.length <= 2 ? [...P, ...s.safe.filter(on(room)).slice(0, 4)] : P;
      Object.assign(pr, { step: 'play', math: Object.fromEntries(players.map((id) => [id, { list: problems(12), i: 0, right: 0 }])) });
      room.setTimer(T.schet, () => resolve(room));
      break;
    }
    case 'lift':
      Object.assign(pr, { step: 'play', lift: {}, dummy: P.length % 2 === 0 });
      room.setTimer(T.lift, () => resolve(room));
      break;
    case 'consilium':
      Object.assign(pr, { step: 'play', topic: s.consDeck.draw(), words: {} });
      room.say(`Тема: ${pr.topic}.`);
      room.setTimer(T.consilium, () => resolve(room));
      break;
    case 'rentgen':
      Object.assign(pr, { step: 'draw', topic: s.drawDeck.draw(), art: {}, votes: {} });
      room.say(`${pr.topic}.`);
      room.setTimer(T.draw, () => voteStep(room));
      break;
    case 'kapel':
      Object.assign(pr, { step: 'hide', hide: {}, stab: {} });
      room.setTimer(T.hide, () => kapelStab(room));
      break;
    case 'tonometr':
      Object.assign(pr, { step: 'give', give: {} });
      room.setTimer(T.give, () => resolve(room));
      break;
    case 'zapiska':
      Object.assign(pr, { step: 'write', topic: s.zapDeck.draw(), notes: {}, votes: {} });
      room.say(pr.topic.replace('___', ''));
      room.setTimer(T.write, () => voteStep(room));
      break;
    case 'lastroom':
      Object.assign(pr, { step: 'play', n: P.length, doors: {}, exit: Math.floor(Math.random() * P.length) });
      room.setTimer(T.lastroom, () => resolve(room));
      break;
  }
  room.push();
}

function pillsPick(room) {
  const pr = room.state.proc;
  pr.step = 'pick';
  room.say('Яд в таблетках. Пациенты, выбирайте.');
  room.setTimer(T.pills, () => resolve(room));
  room.push();
}

function kapelStab(room) {
  const s = room.state;
  const pr = s.proc;
  for (const id of s.patients) if (pr.hide[id] == null) pr.hide[id] = Math.floor(Math.random() * 9);
  pr.step = 'stab';
  room.say('Пациенты спрятались. Здоровые, ставьте капельницы.');
  room.setTimer(T.stab, () => resolve(room));
  room.push();
}

function voteStep(room) {
  const s = room.state;
  const pr = s.proc;
  const subs = pr.kind === 'rentgen' ? pr.art : pr.notes;
  // кто ничего не сдал — умирает сразу; если сдал один — голосовать не о чем
  if (Object.keys(subs).length <= 1) return resolve(room);
  pr.step = 'vote';
  room.say(pr.kind === 'rentgen' ? 'Голосуйте за лучший рисунок. Худший отправится в морг.' : 'Голосуйте за лучшую записку.');
  room.setTimer(T.vote, () => resolve(room));
  room.push();
}

/* ---------- итог процедуры ---------- */
function resolve(room) {
  const s = room.state;
  const pr = s.proc;
  const P = s.patients;
  room.clearTimer();
  let died = [];
  let details = {};

  switch (pr.kind) {
    case 'pills': {
      let poisoned = [...new Set(Object.values(pr.poison))];
      if (!poisoned.length) poisoned = shuffle([...Array(pr.n).keys()]).slice(0, Math.max(1, Math.ceil(P.length / 2)));
      for (const id of P) if (pr.pick[id] == null) pr.pick[id] = Math.floor(Math.random() * pr.n);
      died = P.filter((id) => poisoned.includes(pr.pick[id]));
      for (const id of died) for (const [who, g] of Object.entries(pr.poison)) if (g === pr.pick[id]) award(room, who, 500);
      details = { n: pr.n, poisoned, pick: pr.pick, poison: pr.poison };
      break;
    }
    case 'analiz': {
      for (const id of P) {
        const c = pr.cards[id];
        while (!c.done) {
          const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => !c.opened.includes(x));
          const x = pick(free);
          c.opened.push(x);
          if (x === c.skull) { c.done = true; c.dead = true; } else if (c.opened.length >= 3) c.done = true;
        }
      }
      died = P.filter((id) => pr.cards[id].dead);
      details = { cards: pr.cards };
      break;
    }
    case 'schet': {
      const score = (id) => pr.math[id]?.right || 0;
      if (P.length >= 3) {
        const low = Math.min(...P.map(score));
        died = P.filter((id) => score(id) === low);
        if (died.length === P.length) died = []; // все одинаковые — пощада
      } else {
        const safeBest = Math.max(-1, ...Object.keys(pr.math).filter((id) => !P.includes(id)).map(score));
        died = safeBest >= 0 ? P.filter((id) => score(id) <= safeBest) : P.filter((id) => score(id) < 5);
      }
      details = { math: Object.fromEntries(Object.keys(pr.math).map((id) => [id, { right: score(id), patient: P.includes(id) }])) };
      break;
    }
    case 'lift': {
      for (const id of P) if (!pr.lift[id]) pr.lift[id] = Math.random() < 0.5 ? 'L' : 'R';
      const L = P.filter((id) => pr.lift[id] === 'L'), R = P.filter((id) => pr.lift[id] === 'R');
      const wL = L.length + (pr.dummy ? 1 : 0), wR = R.length;
      let fell = null;
      if (L.length && R.length) fell = wL > wR ? 'L' : wR > wL ? 'R' : Math.random() < 0.5 ? 'L' : 'R';
      died = fell === 'L' ? L : fell === 'R' ? R : [];
      details = { lift: pr.lift, fell, dummy: pr.dummy };
      break;
    }
    case 'consilium': {
      const words = pr.words;
      for (const id of P) if (!words[id]) words[id] = '—';
      for (const id of P) {
        if (words[id] === '—') { died.push(id); continue; }
        const twins = Object.entries(words).filter(([o, w]) => o !== id && w !== '—' && close(w, words[id]));
        if (twins.length) {
          died.push(id);
          for (const [o] of twins) if (s.safe.includes(o)) award(room, o, 500);
        }
      }
      details = { topic: pr.topic, words };
      break;
    }
    case 'rentgen':
    case 'zapiska': {
      const subs = pr.kind === 'rentgen' ? pr.art : pr.notes;
      const silent = P.filter((id) => !subs[id]);
      const tally = Object.fromEntries(P.filter((id) => subs[id]).map((id) => [id, 0]));
      for (const to of Object.values(pr.votes)) if (to in tally) tally[to]++;
      const ids = Object.keys(tally);
      died = [...silent];
      if (ids.length >= 2) {
        const low = Math.min(...ids.map((id) => tally[id]));
        const losers = ids.filter((id) => tally[id] === low);
        died.push(pick(losers));
      }
      details = { topic: pr.topic, tally, art: pr.kind === 'rentgen' ? pr.art : null, notes: pr.kind === 'zapiska' ? pr.notes : null };
      break;
    }
    case 'kapel': {
      let needles = Object.entries(pr.stab);
      if (!needles.length) needles = shuffle([...Array(9).keys()]).slice(0, 2).map((b) => ['главврач', b]);
      const hit = new Set(needles.map(([, b]) => b));
      died = P.filter((id) => hit.has(pr.hide[id]));
      const paid = new Set();
      for (const id of died) for (const [who, b] of needles) if (b === pr.hide[id] && !paid.has(who)) { award(room, who, 500); paid.add(who); }
      details = { hide: pr.hide, needles: needles.map(([who, b]) => ({ who, b })) };
      break;
    }
    case 'tonometr': {
      const dice = Object.fromEntries(P.map((id) => [id, [d6(), d6(), d6()]]));
      for (const [who, to] of Object.entries(pr.give)) dice[to]?.push(d6());
      const sum = (id) => dice[id].reduce((a, b) => a + b, 0);
      const high = Math.max(...P.map(sum));
      died = P.filter((id) => sum(id) === high);
      if (died.length === P.length) died = [pick(died)];
      for (const id of died) for (const [who, to] of Object.entries(pr.give)) if (to === id) award(room, who, 500);
      details = { dice, give: pr.give };
      break;
    }
    case 'lastroom': {
      const free = [...Array(pr.n).keys()].filter((d) => !Object.values(pr.doors).includes(d));
      for (const id of P) if (pr.doors[id] == null) pr.doors[id] = free.shift();
      const lucky = P.find((id) => pr.doors[id] === pr.exit) || pick(P);
      died = P.filter((id) => id !== lucky);
      details = { doors: pr.doors, exit: pr.doors[lucky], n: pr.n };
      break;
    }
  }

  for (const id of died) s.dead[id] = true;
  s.procs++;
  s.verdict = { died, survived: P.filter((id) => !died.includes(id)), details, gains: s.gains };
  room.phase = 'verdict';
  room.sound(died.length ? 'flatline' : 'right');
  const names = died.map((id) => room.byId(id)?.name).filter(Boolean).join(', ');
  room.say(died.length ? `${names}. ${pick(DOC.died)}` : pick(DOC.survived));
  room.setTimer(T.verdict, () => (pr.kind === 'lastroom' ? startEscape(room) : nextQuestion(room)));
  room.push();
}

function lastRoom(room) {
  const s = room.state;
  s.patients = alive(room).map((p) => p.id);
  s.safe = [];
  procIntro(room, 'lastroom');
}

/* ---------- побег ---------- */
const escapers = (room) => playing(room).filter((p) => !room.state.esc.out[p.id]);

function startEscape(room) {
  const s = room.state;
  s.esc = { pos: {}, out: {}, wall: -3, n: 0, sub: {}, q: null, moves: {}, swaps: [], bounced: [], swallowed: [] };
  for (const p of playing(room)) s.esc.pos[p.id] = s.dead[p.id] ? 0 : 3;
  s.patients = [];
  s.safe = [];
  room.phase = 'escIntro';
  room.sound('creak');
  room.say(DOC.escape);
  room.setTimer(T.escIntro, () => nextEscape(room));
  room.push();
}

function nextEscape(room) {
  const s = room.state;
  const e = s.esc;
  e.n++;
  const c = s.escDeck.draw();
  const yes = 1 + Math.floor(Math.random() * 2);
  e.q = { cat: c.cat, items: shuffle([...shuffle(c.yes).slice(0, yes).map((t) => ({ t, ok: true })), ...shuffle(c.no).slice(0, 3 - yes).map((t) => ({ t, ok: false }))]) };
  e.sub = {}; e.moves = {}; e.swaps = []; e.bounced = []; e.swallowed = [];
  room.phase = 'escape';
  room.sound('heartbeat');
  room.say(c.cat);
  room.setTimer(T.escape, () => escReveal(room));
  room.push();
}

function escReveal(room) {
  const s = room.state;
  const e = s.esc;
  const exited = [];
  for (const p of escapers(room)) {
    const sub = e.sub[p.id];
    let c = 0;
    if (sub) e.q.items.forEach((it, i) => { if (sub[i] === it.ok) c++; });
    let step = c + (s.dead[p.id] && c >= 2 ? 1 : 0);
    let to = e.pos[p.id] + step;
    // барьер: выйти можно только без единой ошибки
    if (to >= TRACK && c < 3) { to = TRACK - 1; e.bounced.push(p.id); }
    e.moves[p.id] = to - e.pos[p.id];
    e.pos[p.id] = to;
    if (to >= TRACK) exited.push(p.id);
  }
  // призраки вселяются в живых, которых догнали
  for (const g of escapers(room).filter((p) => s.dead[p.id])) {
    const victim = escapers(room).filter((a) => !s.dead[a.id] && e.pos[g.id] >= e.pos[a.id] && !e.swaps.some((x) => x.victim === a.id))
      .sort((a, b) => e.pos[b.id] - e.pos[a.id])[0];
    if (victim) { delete s.dead[g.id]; s.dead[victim.id] = true; e.swaps.push({ ghost: g.id, victim: victim.id }); }
  }
  // тьма: с третьего вопроса ползёт по две клетки
  if (e.n >= 3) e.wall += 2;
  for (const p of escapers(room)) if (e.pos[p.id] <= e.wall && !exited.includes(p.id)) { e.out[p.id] = true; e.swallowed.push(p.id); }

  room.phase = 'escReveal';
  room.sound(e.swaps.length ? 'ghost' : e.swallowed.length ? 'flatline' : 'reveal');
  const parts = [`${e.q.items.filter((it) => it.ok).map((it) => it.t).join(', ')} — подходят.`];
  for (const x of e.swaps) parts.push(`${room.byId(x.ghost)?.name} вселяется в ${room.byId(x.victim)?.name}!`);
  if (e.bounced.length) parts.push(DOC.barrier);
  if (e.swallowed.length) parts.push(`${e.swallowed.map((id) => room.byId(id)?.name).join(', ')} — во тьме.`);
  else if (e.n >= 2) parts.push(DOC.dark);
  room.say(parts.join(' '));

  room.setTimer(T.escReveal, () => {
    if (exited.length) return finish(room, exited);
    if (!escapers(room).length) return finish(room, []);
    if (e.n >= MAX_ESC) return finish(room, null);
    nextEscape(room);
  });
  room.push();
}

function finish(room, exited) {
  const s = room.state;
  const e = s.esc;
  let w = null;
  if (exited?.length) w = exited.map((id) => room.byId(id)).filter(Boolean).sort((a, b) => (e.pos[b.id] - e.pos[a.id]) || (b.score - a.score))[0];
  else if (exited === null) w = escapers(room).sort((a, b) => (e.pos[b.id] - e.pos[a.id]) || (b.score - a.score))[0];
  s.winner = w?.id || null;
  s.nobody = !w;
  room.phase = 'winner';
  room.clearTimer();
  room.sound(w ? 'win' : 'flatline');
  room.say(w ? `${w.name} выписан из Палаты номер шесть. Остальные остаются. Навсегда.` : 'Тьма забрала всех. Сегодня никого не выписали.');
  room.push();
}

/* ---------- мелочи ---------- */
const d6 = () => 1 + Math.floor(Math.random() * 6);

function problems(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * 3);
    if (k === 0) { const a = 11 + Math.floor(Math.random() * 60), b = 11 + Math.floor(Math.random() * 40); out.push({ text: `${a} + ${b}`, ans: a + b }); }
    if (k === 1) { const a = 40 + Math.floor(Math.random() * 59), b = 11 + Math.floor(Math.random() * 29); out.push({ text: `${a} − ${b}`, ans: a - b }); }
    if (k === 2) { const a = 3 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 9); out.push({ text: `${a} × ${b}`, ans: a * b }); }
  }
  return out;
}

/* рисунок: [{ c, w, p: [x, y, x, y…] }], координаты 0…1000 */
function sanitizeStrokes(raw) {
  const out = [];
  let budget = 3000;
  for (const st of Array.isArray(raw) ? raw.slice(0, 120) : []) {
    const pts = (Array.isArray(st?.p) ? st.p : []).slice(0, budget).map((v) => Math.max(0, Math.min(1000, Math.round(Number(v) || 0))));
    if (pts.length < 2) continue;
    budget -= pts.length;
    out.push({ c: Math.max(0, Math.min(5, Number(st.c) | 0)), w: Math.max(0, Math.min(2, Number(st.w) | 0)), p: pts.length % 2 ? pts.slice(0, -1) : pts });
    if (budget <= 0) break;
  }
  return out;
}

function botScribble() {
  const strokes = [];
  for (let s = 0; s < 4; s++) {
    let x = 200 + Math.random() * 600, y = 200 + Math.random() * 600;
    const p = [];
    for (let i = 0; i < 12; i++) { x += (Math.random() - 0.5) * 160; y += (Math.random() - 0.5) * 160; p.push(Math.round(Math.max(0, Math.min(1000, x))), Math.round(Math.max(0, Math.min(1000, y)))); }
    strokes.push({ c: s % 3, w: 1, p });
  }
  return strokes;
}

/* что видит экран или конкретный игрок на процедуре */
function procView(room, p) {
  const s = room.state;
  const pr = s.proc;
  const me = p?.id;
  const isP = me && s.patients.includes(me);
  const isS = me && s.safe.includes(me);
  const v = { kind: pr.kind, step: pr.step, title: PROCS[pr.kind]?.title || 'Последняя палата', topic: pr.topic || null };
  if (pr.step === 'intro') return v;   // на заставке данных процедуры ещё нет
  switch (pr.kind) {
    case 'pills':
      v.n = pr.n;
      v.done = pr.step === 'poison' ? s.safe.filter((id) => pr.poison[id] != null) : s.patients.filter((id) => pr.pick[id] != null);
      if (me) v.role = pr.step === 'poison' ? (isS && pr.poison[me] == null ? 'poison' : 'wait') : (isP && pr.pick[me] == null ? 'pick' : 'wait');
      break;
    case 'analiz':
      v.cards = Object.fromEntries(Object.entries(pr.cards).map(([id, c]) => [id, { opened: c.opened, skull: c.opened.includes(c.skull) ? c.skull : null, done: c.done, dead: c.dead }]));
      if (me) v.role = isP && !pr.cards[me]?.done ? 'scratch' : 'wait';
      break;
    case 'schet':
      v.math = Object.fromEntries(Object.entries(pr.math).map(([id, m]) => [id, { right: m.right, patient: s.patients.includes(id) }]));
      if (me && pr.math[me]) { v.role = 'math'; v.task = { i: pr.math[me].i, text: pr.math[me].list[pr.math[me].i].text, right: pr.math[me].right }; }
      else if (me) v.role = 'wait';
      break;
    case 'lift':
      v.done = s.patients.filter((id) => pr.lift[id]);
      v.dummy = pr.dummy;
      if (me) v.role = isP && !pr.lift[me] ? 'lift' : 'wait';
      break;
    case 'consilium':
      v.done = Object.keys(pr.words);
      if (me) v.role = (isP || isS) && !pr.words[me] ? 'cons' : 'wait';
      break;
    case 'rentgen':
    case 'zapiska': {
      const subs = pr.kind === 'rentgen' ? pr.art : pr.notes;
      v.done = Object.keys(subs);
      if (pr.step === 'vote') {
        v.entries = Object.entries(subs).map(([id, x]) => ({ id, art: pr.kind === 'rentgen' ? x : null, text: pr.kind === 'zapiska' ? x : null }));
        v.voted = Object.keys(pr.votes).length;
        if (me) v.role = voters(room).includes(me) && !pr.votes[me] ? 'vote' : 'wait';
      } else if (me) v.role = isP && !subs[me] ? (pr.kind === 'rentgen' ? 'draw' : 'write') : 'wait';
      break;
    }
    case 'kapel':
      v.done = pr.step === 'hide' ? s.patients.filter((id) => pr.hide[id] != null) : Object.keys(pr.stab);
      if (me) v.role = pr.step === 'hide' ? (isP && pr.hide[me] == null ? 'hide' : 'wait') : (isS && pr.stab[me] == null ? 'stab' : 'wait');
      if (me && isP && pr.hide[me] != null) v.myBed = pr.hide[me];
      break;
    case 'tonometr':
      v.done = Object.keys(pr.give);
      if (me) v.role = isS && !pr.give[me] ? 'give' : 'wait';
      v.patients = s.patients;
      break;
    case 'lastroom':
      v.n = pr.n;
      v.taken = Object.values(pr.doors);
      v.done = Object.keys(pr.doors);
      if (me) v.role = isP && pr.doors[me] == null ? 'door' : 'wait';
      break;
  }
  return v;
}
