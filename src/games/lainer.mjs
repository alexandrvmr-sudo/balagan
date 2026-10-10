/* «Лайнер» — стендап на борту рейса БГ-404. Сюжет — один полёт:
   регистрация (коронная фраза и слова для тем) → взлёт → набор высоты (пишем шутки, каждая поднимает самолёт выше) →
   стендап в проходе салона (командир читает завязку, комик сам жмёт «Добить!») → дуэли, пассажиры голосуют →
   турбулентность: все дописывают одну последнюю шутку → посадка под аплодисменты, лучший комик рейса. */

import { data, Deck, shuffle, pick, rnd, secs, clean, tally, playing, online } from '../lib.mjs';

const PACK = data('lainer.json');
const CATS = Object.keys(PACK.categories);
const JOKES = 3;

const T = {
  board: secs('BALAGAN_TP_BOARD', 60, 30),
  takeoff: secs('BALAGAN_TP_TAKEOFF', 8, 3),
  write: secs('BALAGAN_TP_WRITE', 120, 50),
  pick: secs('BALAGAN_TP_PICK', 20, 10),
  setup: secs('BALAGAN_TP_SETUP', 15, 7),
  punch: secs('BALAGAN_TP_PUNCH', 7, 4),
  vote: secs('BALAGAN_TP_VOTE', 18, 10),
  reveal: secs('BALAGAN_TP_REVEAL', 8, 4),
  turb: secs('BALAGAN_TP_TURB', 7, 3),
  final: secs('BALAGAN_TP_FINAL', 55, 25),
  fvote: secs('BALAGAN_TP_FVOTE', 25, 12),
  freveal: secs('BALAGAN_TP_FREVEAL', 10, 6),
  landing: secs('BALAGAN_TP_LANDING', 9, 3),
};

const FLIGHT = 'БГ-404';
const ALT_STEP = 1300;   // метров за каждую написанную шутку

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fill = (setup, topic) => cap(setup.text.split(`{${setup.cat}}`).join(topic));
const blank = (setup) => cap(setup.text.split(`{${setup.cat}}`).join('____'));

/* колоды по уровню: своё + немного обычного */
function bank(level) {
  const take = (list, n) => shuffle(list).slice(0, n);
  if (level === 'adult') return { setups: [...PACK.adult.setups, ...take(PACK.setups, 25)], final: [...PACK.adult.final, ...take(PACK.final, 4)], catchphrases: [...PACK.adult.catchphrases, ...PACK.catchphrases], botPunch: [...PACK.adult.botPunch, ...take(PACK.botPunch, 6)] };
  if (level === 'hard') return { setups: [...PACK.hard.setups, ...take(PACK.adult.setups, 14), ...take(PACK.setups, 10)], final: [...PACK.hard.final, ...take(PACK.adult.final, 3)], catchphrases: [...PACK.hard.catchphrases, ...take(PACK.adult.catchphrases, 2), ...PACK.catchphrases], botPunch: [...PACK.hard.botPunch, ...take(PACK.adult.botPunch, 4)] };
  return { setups: PACK.setups, final: PACK.final, catchphrases: PACK.catchphrases, botPunch: PACK.botPunch };
}

/* объявление командира: сначала «дин-дон», потом голос из громкоговорителя */
function announce(room, text) {
  room.sound('chime');
  room.say(text, { who: 'lainer' });
}

export default {
  id: 'lainer',
  title: 'Лайнер',
  tagline: 'Шутки в полёте: стендап в проходе салона, панчлайн добиваешь сам',
  minPlayers: 3,
  maxPlayers: 8,
  tags: ['Стендап', 'Шутки'],
  ratings: ['family', 'adult', 'hard'],
  minutes: 25,
  intro: `Добрый вечер, дамы и господа. Говорит командир корабля. Рейс ${FLIGHT} — стендап на высоте десять тысяч метров. Спасательные жилеты под креслами, шутки — в телефонах.`,
  rules: [
    'Регистрация: придумай коронную фразу и слова для тем',
    'Набор высоты: выбери тему и допиши панчлайн к заготовке',
    'Стендап в проходе: командир читает завязку, ты жмёшь «Добить!»',
    'Пассажиры жмут кнопку вызова за того, кто смешнее',
    'Турбулентность: все дописывают одну последнюю шутку',
  ],

  init(room) {
    room.state = {
      level: 'family',
      pack: null,
      deck: null,
      finalDeck: null,
      cats: {},           // pid → [cat, cat, cat]
      catch: {},          // pid → коронная фраза
      topics: [],         // { cat, text, by }
      jokes: {},          // pid → [{ setup, options, topic, punch }]
      done: {},           // pid → закончил писать
      chosen: {},         // pid → номер шутки
      matches: [],        // [[id, id(, id)]]
      idx: 0,
      stage: { perf: 0, part: 'setup' },
      votes: {},
      result: null,
      final: null,
      gains: {},
    };
  },

  start(room) {
    const s = room.state;
    s.level = room.level;
    s.pack = bank(s.level);
    s.deck = new Deck(s.pack.setups);
    s.finalDeck = new Deck(s.pack.final);
    for (const p of playing(room)) s.cats[p.id] = shuffle(CATS).slice(0, 3);
    room.phase = 'board';
    announce(room, `${this.intro} Регистрация открыта: коронная фраза и три слова для багажа.`);
    room.setTimer(T.board, () => takeoff(room));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'board': {
        if (room.phase !== 'board' || p.audience || s.catch[p.id]) return;
        s.catch[p.id] = clean(msg.catch, 50) || pick(s.pack.catchphrases);
        (s.cats[p.id] || []).forEach((cat, i) => {
          const t = clean(msg.topics?.[i], 30);
          if (t) s.topics.push({ cat, text: t, by: p.id });
        });
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.catch[x.id])) { room.clearTimer(); takeoff(room); }
        return;
      }

      case 'joke': {
        if (room.phase !== 'write' || p.audience) return;
        const j = s.jokes[p.id]?.[msg.j];
        if (!j || j.punch) return;
        const punch = clean(msg.punch, 110);
        const topic = j.options[Number(msg.topic)];
        if (!punch || !topic) return;
        j.topic = topic; j.punch = punch;
        room.sound('type');
        if (s.jokes[p.id].every((x) => x.punch)) s.done[p.id] = true;
        checkWrite(room);
        return;
      }

      case 'enough': {
        if (room.phase !== 'write' || !s.jokes[p.id]?.some((x) => x.punch)) return;
        s.done[p.id] = true;
        checkWrite(room);
        return;
      }

      case 'pick': {
        if (room.phase !== 'pick' || s.chosen[p.id] != null) return;
        const j = s.jokes[p.id]?.[msg.j];
        if (!j?.punch) return;
        s.chosen[p.id] = Number(msg.j);
        if (performers(room).every((id) => s.chosen[id] != null)) { room.clearTimer(); startShow(room); }
        return;
      }

      case 'punch': {
        if (room.phase !== 'perform' || s.stage.part !== 'setup') return;
        if (s.matches[s.idx][s.stage.perf] !== p.id) return;
        punch(room);
        return;
      }

      case 'vote': {
        if (room.phase !== 'voting' || s.votes[p.id]) return;
        const m = s.matches[s.idx];
        if (!m.includes(msg.for) || msg.for === p.id) return;
        if (!voterIds(room, m).includes(p.id)) return;
        s.votes[p.id] = msg.for;
        room.sound('vote');
        if (voterIds(room, m).every((id) => s.votes[id])) { room.clearTimer(); reveal(room); }
        return;
      }

      case 'fpunch': {
        if (room.phase !== 'final' || p.audience || s.final.answers[p.id]) return;
        const t = clean(msg.text, 110);
        if (!t) return;
        s.final.answers[p.id] = t;
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.final.answers[x.id])) { room.clearTimer(); finalVote(room); }
        return;
      }

      case 'fvote': {
        if (room.phase !== 'fvote' || s.final.votes[p.id]) return;
        if (!s.final.answers[msg.for] || msg.for === p.id) return;
        s.final.votes[p.id] = msg.for;
        room.sound('vote');
        const need = online(room.players).filter((x) => Object.keys(s.final.answers).some((id) => id !== x.id)).map((x) => x.id);
        if (need.every((id) => s.final.votes[id])) { room.clearTimer(); finalReveal(room); }
        return;
      }
    }
  },

  viewTV(room) {
    const s = room.state;
    const written = Object.values(s.jokes).flat().filter((j) => j.punch).length;
    const base = { gains: s.gains, level: s.level, flight: FLIGHT, alt: written * ALT_STEP };
    if (room.phase === 'board') return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: !!s.catch[p.id] })) };
    if (room.phase === 'write') return { ...base, progress: playing(room).map((p) => ({ id: p.id, n: (s.jokes[p.id] || []).filter((j) => j.punch).length, done: !!s.done[p.id] })), altMax: playing(room).length * JOKES * ALT_STEP };
    if (room.phase === 'pick') return { ...base, progress: performers(room).map((id) => ({ id, done: s.chosen[id] != null })) };
    if (room.phase === 'perform') {
      const m = s.matches[s.idx];
      const id = m[s.stage.perf];
      const j = jokeOf(s, id);
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, lineup: m, perfNo: s.stage.perf, performer: id, part: s.stage.part, setup: j ? fill(j.setup, j.topic) : '', punch: s.stage.part === 'punch' ? j?.punch : null, catch: s.stage.part === 'punch' ? s.catch[id] : null };
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, options: m.map((id) => { const j = jokeOf(s, id); return { id, setup: fill(j.setup, j.topic), punch: j.punch }; }), voted: Object.keys(s.votes).length, voters: voterIds(room, m).length };
    }
    if (room.phase === 'reveal') return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, result: s.result };
    if (room.phase === 'final') return { ...base, setup: s.final.setup, progress: playing(room).map((p) => ({ id: p.id, done: !!s.final.answers[p.id] })) };
    if (room.phase === 'fvote') return { ...base, setup: s.final.setup, options: Object.entries(s.final.answers).map(([id, text]) => ({ id, text })), voted: Object.keys(s.final.votes).length };
    if (room.phase === 'freveal' || room.phase === 'winner' || room.phase === 'landing') return { ...base, setup: s.final?.setup, result: s.final?.result };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    if (room.phase === 'board') {
      if (p.audience) return { wait: 'Пассажиры проходят регистрацию' };
      if (s.catch[p.id]) return { wait: 'Посадочный талон получен! Ждём остальных', seat: seatOf(room, p.id) };
      return { board: { flight: FLIGHT, seat: seatOf(room, p.id), cats: (s.cats[p.id] || []).map((c) => ({ cat: c, ask: PACK.categories[c].ask, hint: PACK.categories[c].hint })), examples: shuffle(s.pack.catchphrases).slice(0, 3) } };
    }
    if (room.phase === 'takeoff') return { wait: 'Пристегните ремни! Взлетаем', seat: seatOf(room, p.id) };
    if (room.phase === 'turbulence') return { wait: 'Турбулентность! Держитесь крепче' };
    if (room.phase === 'landing') return { wait: 'Посадка! Аплодисменты пилоту!' };
    if (room.phase === 'write') {
      if (p.audience || !s.jokes[p.id]) return { wait: 'Комики пишут шутки' };
      if (s.done[p.id]) return { wait: 'Шутки готовы. Ждём остальных' };
      const list = s.jokes[p.id];
      const j = list.findIndex((x) => !x.punch);
      return { write: { j, of: list.length, written: list.filter((x) => x.punch).length, blank: blank(list[j].setup), options: list[j].options, setup: list[j].setup.text, cat: list[j].setup.cat, ask: PACK.categories[list[j].setup.cat].ask } };
    }
    if (room.phase === 'pick') {
      if (!performers(room).includes(p.id)) return { wait: 'Комики выбирают лучшие шутки' };
      if (s.chosen[p.id] != null) return { wait: 'Готовься к выходу на сцену' };
      return { pick: s.jokes[p.id].map((j, i) => ({ j: i, setup: j.punch ? fill(j.setup, j.topic) : null, punch: j.punch })).filter((x) => x.punch) };
    }
    if (room.phase === 'perform') {
      const m = s.matches[s.idx];
      const me = m[s.stage.perf] === p.id;
      if (me && s.stage.part === 'setup') { const j = jokeOf(s, p.id); return { perform: { setup: fill(j.setup, j.topic), punch: j.punch } }; }
      return { wait: me ? 'Лови аплодисменты!' : m.includes(p.id) ? 'Скоро твой выход в проход' : 'Тишина в салоне — идёт выступление' };
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (!voterIds(room, m).includes(p.id)) return { wait: 'Салон решает твою судьбу' };
      return { vote: { options: m.filter((id) => id !== p.id).map((id) => { const j = jokeOf(s, id); return { id, name: room.byId(id)?.name, text: `${fill(j.setup, j.topic)} ${j.punch}` }; }) }, votedFor: s.votes[p.id] || null };
    }
    if (room.phase === 'final') {
      if (p.audience) return { wait: 'Комики спасаются как могут' };
      if (s.final.answers[p.id]) return { wait: 'Записано. Держись за подлокотник' };
      return { final: { setup: s.final.setup } };
    }
    if (room.phase === 'fvote') {
      const opts = Object.entries(s.final.answers).filter(([id]) => id !== p.id).map(([id, text]) => ({ id, text }));
      if (!opts.length) return { wait: 'Голосовать не за что' };
      return { fvote: { setup: s.final.setup, options: opts }, votedFor: s.final.votes[p.id] || null };
    }
    if (room.phase === 'winner') {
      const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
      return { winner: top ? { id: top.id, name: top.name, score: top.score } : null };
    }
    return { wait: 'Смотри на сцену' };
  },

  stepKey: (room) => `${room.phase}:${room.state.idx}:${room.state.stage.perf}:${room.state.stage.part}`,

  botMoves(room, b) {
    const s = room.state;
    const moves = [];
    if (room.phase === 'board' && !s.catch[b.id] && !b.audience) {
      moves.push({ delay: rnd(2, 6), msg: { a: 'board', catch: pick(s.pack.catchphrases), topics: (s.cats[b.id] || []).map((c) => pick(PACK.categories[c].fallback)) } });
    }
    if (room.phase === 'write' && s.jokes[b.id] && !s.done[b.id]) {
      s.jokes[b.id].forEach((j, i) => { if (!j.punch) moves.push({ delay: rnd(3, 6) + i * 3, msg: { a: 'joke', j: i, topic: Math.floor(Math.random() * j.options.length), punch: pick(s.pack.botPunch) } }); });
    }
    if (room.phase === 'pick' && performers(room).includes(b.id) && s.chosen[b.id] == null) {
      const ok = s.jokes[b.id].map((j, i) => (j.punch ? i : -1)).filter((i) => i >= 0);
      moves.push({ delay: rnd(1, 4), msg: { a: 'pick', j: pick(ok) } });
    }
    if (room.phase === 'perform' && s.stage.part === 'setup' && s.matches[s.idx][s.stage.perf] === b.id) {
      moves.push({ delay: rnd(3, 5), msg: { a: 'punch' } });
    }
    if (room.phase === 'voting' && voterIds(room, s.matches[s.idx]).includes(b.id)) {
      moves.push({ delay: rnd(1.5, 5), msg: { a: 'vote', for: pick(s.matches[s.idx].filter((id) => id !== b.id)) } });
    }
    if (room.phase === 'final' && !b.audience && !s.final.answers[b.id]) moves.push({ delay: rnd(3, 9), msg: { a: 'fpunch', text: pick(s.pack.botPunch) } });
    if (room.phase === 'fvote') {
      const opts = Object.keys(s.final.answers).filter((id) => id !== b.id);
      if (opts.length) moves.push({ delay: rnd(2, 6), msg: { a: 'fvote', for: pick(opts) } });
    }
    return moves;
  },
};

/* =================== механика =================== */

const jokeOf = (s, id) => s.jokes[id]?.[s.chosen[id] ?? 0];
const performers = (room) => playing(room).map((p) => p.id).filter((id) => room.state.jokes[id]?.some((j) => j.punch));

/* голосуют те, кто не на сцене; если таких нет — выступающие, но не за себя */
function voterIds(room, m) {
  const outside = online(room.players).filter((p) => !m.includes(p.id)).map((p) => p.id);
  return outside.length ? outside : online(room.players).filter((p) => m.includes(p.id)).map((p) => p.id);
}

/* темы для заготовки: слова других игроков нужной категории, добиваем запасом */
function optionsFor(s, pid, cat) {
  const theirs = shuffle(s.topics.filter((t) => t.cat === cat && t.by !== pid).map((t) => t.text));
  const own = s.topics.filter((t) => t.cat === cat && t.by === pid).map((t) => t.text);
  const pool = [...new Set([...theirs, ...shuffle(PACK.categories[cat].fallback), ...own])];
  return pool.slice(0, 3);
}

/* место в салоне: ряд и буква, как в посадочном */
function seatOf(room, id) {
  const i = Math.max(0, room.players.findIndex((p) => p.id === id));
  return `${12 + Math.floor(i / 2)}${'АВ'[i % 2]}`;
}

function takeoff(room) {
  room.phase = 'takeoff';
  room.sound('jet');
  announce(room, 'Экипаж, приготовиться к взлёту. Пристегните ремни — и шутки.');
  room.setTimer(T.takeoff, () => startWrite(room));
  room.push();
}

function startWrite(room) {
  const s = room.state;
  for (const p of playing(room)) {
    if (!s.catch[p.id]) s.catch[p.id] = pick(s.pack.catchphrases);
    s.jokes[p.id] = Array.from({ length: JOKES }, () => {
      const setup = s.deck.draw();
      return { setup, options: optionsFor(s, p.id, setup.cat), topic: null, punch: null };
    });
  }
  room.phase = 'write';
  announce(room, 'Набираем высоту. Каждая шутка поднимает нас выше. Выбираете тему — дописываете панчлайн.');
  room.setTimer(T.write, () => toPick(room));
  room.push();
}

function checkWrite(room) {
  const s = room.state;
  if (playing(room).every((x) => !x.connected || s.done[x.id])) { room.clearTimer(); toPick(room); }
}

function toPick(room) {
  const s = room.state;
  const list = performers(room);
  if (list.length < 2) return turbulence(room);
  // у кого одна шутка — выбирать нечего
  for (const id of list) {
    const ok = s.jokes[id].map((j, i) => (j.punch ? i : -1)).filter((i) => i >= 0);
    if (ok.length === 1) s.chosen[id] = ok[0];
  }
  if (list.every((id) => s.chosen[id] != null)) return startShow(room);
  room.phase = 'pick';
  announce(room, 'Выберите лучшую шутку. Остальные сдадим в багаж.');
  room.setTimer(T.pick, () => startShow(room));
  room.push();
}

function startShow(room) {
  const s = room.state;
  const list = shuffle(performers(room));
  for (const id of list) if (s.chosen[id] == null) s.chosen[id] = s.jokes[id].findIndex((j) => j.punch);
  s.matches = [];
  for (let i = 0; i < list.length; i += 2) s.matches.push(list.slice(i, i + 2));
  // если остался один — встаёт в последнюю дуэль третьим
  if (s.matches.length > 1 && s.matches.at(-1).length === 1) s.matches.at(-2).push(...s.matches.pop());
  s.idx = 0;
  openMatch(room);
}

function openMatch(room) {
  const s = room.state;
  s.stage = { perf: 0, part: 'setup' };
  s.votes = {};
  perform(room);
}

function perform(room) {
  const s = room.state;
  const id = s.matches[s.idx][s.stage.perf];
  const p = room.byId(id);
  const j = jokeOf(s, id);
  room.phase = 'perform';
  room.sound('applause');
  room.say(`В проходе — ${p?.name}! ${fill(j.setup, j.topic)}`, { who: 'lainer' });
  room.setTimer(T.setup, () => punch(room));
  room.push();
}

function punch(room) {
  const s = room.state;
  const id = s.matches[s.idx][s.stage.perf];
  const j = jokeOf(s, id);
  s.stage.part = 'punch';
  room.sound('rimshot');
  room.say(`${j.punch}. ${s.catch[id]}`, { who: 'lainer2' });
  room.setTimer(T.punch, () => {
    if (s.stage.perf + 1 < s.matches[s.idx].length) { s.stage = { perf: s.stage.perf + 1, part: 'setup' }; return perform(room); }
    room.phase = 'voting';
    announce(room, 'Пассажиры, жмите кнопку вызова. Кто смешнее?');
    room.setTimer(T.vote, () => reveal(room));
    room.push();
  });
  room.push();
}

function reveal(room) {
  const s = room.state;
  const m = s.matches[s.idx];
  const t = tally(s.votes, m);
  const total = Object.values(t).reduce((a, b) => a + b, 0);
  const rows = m.map((id) => {
    const j = jokeOf(s, id);
    let pts = total ? Math.round((t[id] / total) * 1000 / 10) * 10 : 0;
    const ovation = total > 1 && t[id] === total;
    if (ovation) pts += 250;
    award(room, id, pts);
    return { id, setup: fill(j.setup, j.topic), punch: j.punch, votes: t[id], pts, ovation, voters: Object.entries(s.votes).filter(([, to]) => to === id).map(([v]) => v) };
  }).sort((a, b) => b.votes - a.votes);
  s.result = { rows, tie: total > 0 && rows[0].votes === rows[1]?.votes };
  room.phase = 'reveal';
  room.sound(rows[0].ovation ? 'applause' : 'reveal');
  room.say(rows[0].ovation ? `Овация! ${room.byId(rows[0].id)?.name} забирает весь салон.` : s.result.tie ? 'Ничья. Салон не определился.' : `Побеждает ${room.byId(rows[0].id)?.name}!`, { who: 'lainer' });
  room.setTimer(T.reveal, () => {
    if (s.idx + 1 < s.matches.length) { s.idx++; return openMatch(room); }
    turbulence(room);
  });
  room.push();
}

function award(room, id, pts) {
  const p = room.byId(id);
  if (!p || !pts) return;
  p.score += pts;
  room.state.gains[id] = (room.state.gains[id] || 0) + pts;
}

function turbulence(room) {
  room.phase = 'turbulence';
  room.sound('thunder');
  announce(room, 'Говорит командир. Мы попали в зону турбулентности. Без паники! Кислородные маски — сначала на себя.');
  room.setTimer(T.turb, () => startFinal(room));
  room.push();
}

function startFinal(room) {
  const s = room.state;
  // берём неисполненную заготовку, если есть, иначе финальную из пака
  const spare = shuffle(Object.entries(s.jokes).flatMap(([id, list]) => list.filter((j, i) => j.topic && i !== s.chosen[id]).map((j) => fill(j.setup, j.topic))));
  s.final = { setup: spare[0] && Math.random() < 0.5 ? spare[0] : s.finalDeck.draw(), answers: {}, votes: {}, result: null };
  room.phase = 'final';
  room.sound('thunder');
  announce(room, 'Последняя шутка перед посадкой! У всех одна завязка. Допишите, пока трясёт.');
  room.setTimer(T.final, () => finalVote(room));
  room.push();
}

function finalVote(room) {
  const s = room.state;
  if (Object.keys(s.final.answers).length < 2) return landing(room);
  room.phase = 'fvote';
  room.sound('open');
  room.say(`${s.final.setup} ${Object.values(s.final.answers).join('. Или: ')}.`, { who: 'lainer' });
  room.setTimer(T.fvote, () => finalReveal(room));
  room.push();
}

function finalReveal(room) {
  const s = room.state;
  const ids = Object.keys(s.final.answers);
  const t = tally(s.final.votes, ids);
  const total = Object.values(t).reduce((a, b) => a + b, 0) || 1;
  const rows = ids.map((id) => {
    const pts = Math.round((t[id] / total) * 2000 / 10) * 10;
    award(room, id, pts);
    return { id, text: s.final.answers[id], votes: t[id], pts };
  }).sort((a, b) => b.votes - a.votes);
  s.final.result = rows;
  room.phase = 'freveal';
  room.sound('reveal');
  room.say(`Последнее слово за ${room.byId(rows[0].id)?.name}.`, { who: 'lainer' });
  room.setTimer(T.freveal, () => landing(room));
  room.push();
}

/* посадка: по традиции — аплодисменты пилоту */
function landing(room) {
  room.phase = 'landing';
  room.sound('jet');
  announce(room, `Дамы и господа, наш самолёт совершил посадку. Температура за бортом — плюс двадцать, настроение — плюс сто.`);
  room.setTimer(T.landing, () => finish(room));
  room.push();
}

function finish(room) {
  room.phase = 'winner';
  room.clearTimer();
  room.sound('win');
  const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
  if (top) room.say(`Лучший комик рейса — ${top.name}! Экипаж аплодирует стоя.`, { who: 'lainer' });
  room.push();
}
