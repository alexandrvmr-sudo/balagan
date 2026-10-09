/* «Теплоход» — конкурс начинающих комиков на волжском теплоходе.
   Посадка: коронная фраза и слова для тем. Потом заготовки шуток: выбираешь тему, дописываешь панчлайн.
   Выступление: ведущий читает завязку, комик сам жмёт «Добить!» — звучит панчлайн и коронная фраза.
   Дуэли, голосование, а в финале теплоход тонет — все переписывают последнюю шутку. */

import { data, Deck, shuffle, pick, rnd, secs, clean, tally, playing, online } from '../lib.mjs';

const PACK = data('teplohod.json');
const CATS = Object.keys(PACK.categories);
const JOKES = 3;

const T = {
  board: secs('BALAGAN_TP_BOARD', 60, 30),
  write: secs('BALAGAN_TP_WRITE', 120, 50),
  pick: secs('BALAGAN_TP_PICK', 20, 10),
  setup: secs('BALAGAN_TP_SETUP', 14, 7),
  punch: secs('BALAGAN_TP_PUNCH', 6, 4),
  vote: secs('BALAGAN_TP_VOTE', 15, 10),
  reveal: secs('BALAGAN_TP_REVEAL', 6, 4),
  final: secs('BALAGAN_TP_FINAL', 50, 25),
  fvote: secs('BALAGAN_TP_FVOTE', 25, 12),
  freveal: secs('BALAGAN_TP_FREVEAL', 9, 6),
};

const CAP = 'Капитан Михалыч';

const fill = (setup, topic) => {
  const t = setup.text.replace(`{${setup.cat}}`, topic);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const blank = (setup) => {
  const t = setup.text.replace(`{${setup.cat}}`, '____');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default {
  id: 'teplohod',
  title: 'Теплоход',
  tagline: 'Стендап на волжском теплоходе: собери шутку и добей её сам',
  minPlayers: 3,
  maxPlayers: 8,
  tags: ['Стендап', 'Шутки'],
  minutes: 20,
  intro: 'Внимание, говорит капитан. На борту теплохода конкурс начинающих комиков. Спасательные жилеты под креслами.',
  rules: [
    'Посадка: придумай коронную фразу и слова для тем',
    'Получи заготовки шуток — выбери тему и допиши панчлайн',
    'Выступай: капитан читает завязку, ты жмёшь «Добить!»',
    'Зал выбирает, кто смешнее в каждой дуэли',
    'Финал: теплоход тонет — все дописывают последнюю шутку',
  ],

  init(room) {
    room.state = {
      deck: new Deck(PACK.setups),
      finalDeck: new Deck(PACK.final),
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
    for (const p of playing(room)) s.cats[p.id] = shuffle(CATS).slice(0, 3);
    room.phase = 'board';
    room.say(this.intro + ' Для начала — коронная фраза и три слова.', { who: 'teplohod' });
    room.sound('horn');
    room.setTimer(T.board, () => startWrite(room));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'board': {
        if (room.phase !== 'board' || p.audience || s.catch[p.id]) return;
        s.catch[p.id] = clean(msg.catch, 50) || pick(PACK.catchphrases);
        (s.cats[p.id] || []).forEach((cat, i) => {
          const t = clean(msg.topics?.[i], 30);
          if (t) s.topics.push({ cat, text: t, by: p.id });
        });
        room.sound('pop');
        if (playing(room).every((x) => !x.connected || s.catch[x.id])) { room.clearTimer(); startWrite(room); }
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
        room.sound('splash');
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
    const base = { gains: s.gains };
    if (room.phase === 'board') return { ...base, progress: playing(room).map((p) => ({ id: p.id, done: !!s.catch[p.id] })) };
    if (room.phase === 'write') return { ...base, progress: playing(room).map((p) => ({ id: p.id, n: (s.jokes[p.id] || []).filter((j) => j.punch).length, done: !!s.done[p.id] })) };
    if (room.phase === 'pick') return { ...base, progress: performers(room).map((id) => ({ id, done: s.chosen[id] != null })) };
    if (room.phase === 'perform') {
      const m = s.matches[s.idx];
      const id = m[s.stage.perf];
      const j = jokeOf(s, id);
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, lineup: m, performer: id, part: s.stage.part, setup: j ? fill(j.setup, j.topic) : '', punch: s.stage.part === 'punch' ? j?.punch : null, catch: s.stage.part === 'punch' ? s.catch[id] : null };
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, options: m.map((id) => { const j = jokeOf(s, id); return { id, setup: fill(j.setup, j.topic), punch: j.punch }; }), voted: Object.keys(s.votes).length, voters: voterIds(room, m).length };
    }
    if (room.phase === 'reveal') return { ...base, matchNo: s.idx + 1, matchTotal: s.matches.length, result: s.result };
    if (room.phase === 'final') return { ...base, setup: s.final.setup, progress: playing(room).map((p) => ({ id: p.id, done: !!s.final.answers[p.id] })) };
    if (room.phase === 'fvote') return { ...base, setup: s.final.setup, options: Object.entries(s.final.answers).map(([id, text]) => ({ id, text })), voted: Object.keys(s.final.votes).length };
    if (room.phase === 'freveal' || room.phase === 'winner') return { ...base, setup: s.final?.setup, result: s.final?.result };
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    if (room.phase === 'board') {
      if (p.audience) return { wait: 'Пассажиры поднимаются на борт' };
      if (s.catch[p.id]) return { wait: 'Ты на борту! Ждём остальных' };
      return { board: { cats: (s.cats[p.id] || []).map((c) => ({ cat: c, ask: PACK.categories[c].ask, hint: PACK.categories[c].hint })), examples: shuffle(PACK.catchphrases).slice(0, 3) } };
    }
    if (room.phase === 'write') {
      if (p.audience || !s.jokes[p.id]) return { wait: 'Комики пишут шутки' };
      if (s.done[p.id]) return { wait: 'Шутки готовы. Ждём остальных' };
      const list = s.jokes[p.id];
      const j = list.findIndex((x) => !x.punch);
      return { write: { j, of: list.length, written: list.filter((x) => x.punch).length, blank: blank(list[j].setup), options: list[j].options, setup: list[j].setup.text, cat: list[j].setup.cat } };
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
      return { wait: me ? 'Ловите овации!' : m.includes(p.id) ? 'Скоро твой выход' : 'Тишина в зале — идёт выступление' };
    }
    if (room.phase === 'voting') {
      const m = s.matches[s.idx];
      if (!voterIds(room, m).includes(p.id)) return { wait: 'Зал решает твою судьбу' };
      return { vote: { options: m.filter((id) => id !== p.id).map((id) => { const j = jokeOf(s, id); return { id, name: room.byId(id)?.name, text: `${fill(j.setup, j.topic)} ${j.punch}` }; }) }, votedFor: s.votes[p.id] || null };
    }
    if (room.phase === 'final') {
      if (p.audience) return { wait: 'Комики спасаются как могут' };
      if (s.final.answers[p.id]) return { wait: 'Записано. Держись за поручень' };
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
      moves.push({ delay: rnd(2, 6), msg: { a: 'board', catch: pick(PACK.catchphrases), topics: (s.cats[b.id] || []).map((c) => pick(PACK.categories[c].fallback)) } });
    }
    if (room.phase === 'write' && s.jokes[b.id] && !s.done[b.id]) {
      s.jokes[b.id].forEach((j, i) => { if (!j.punch) moves.push({ delay: rnd(3, 6) + i * 3, msg: { a: 'joke', j: i, topic: Math.floor(Math.random() * j.options.length), punch: pick(PACK.botPunch) } }); });
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
    if (room.phase === 'final' && !b.audience && !s.final.answers[b.id]) moves.push({ delay: rnd(3, 9), msg: { a: 'fpunch', text: pick(PACK.botPunch) } });
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

function startWrite(room) {
  const s = room.state;
  for (const p of playing(room)) {
    if (!s.catch[p.id]) s.catch[p.id] = pick(PACK.catchphrases);
    s.jokes[p.id] = Array.from({ length: JOKES }, () => {
      const setup = s.deck.draw();
      return { setup, options: optionsFor(s, p.id, setup.cat), topic: null, punch: null };
    });
  }
  room.phase = 'write';
  room.sound('round');
  room.say('Все на борту. Пишем шутки! Выбираете тему — дописываете панчлайн.', { who: 'teplohod' });
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
  if (list.length < 2) return startFinal(room);
  // у кого одна шутка — выбирать нечего
  for (const id of list) {
    const ok = s.jokes[id].map((j, i) => (j.punch ? i : -1)).filter((i) => i >= 0);
    if (ok.length === 1) s.chosen[id] = ok[0];
  }
  if (list.every((id) => s.chosen[id] != null)) return startShow(room);
  room.phase = 'pick';
  room.say('Выберите лучшую шутку. Остальные утонут вместе с теплоходом.', { who: 'teplohod' });
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
  room.say(`На сцене — ${p?.name}! ${fill(j.setup, j.topic)}`, { who: 'teplohod' });
  room.setTimer(T.setup, () => punch(room));
  room.push();
}

function punch(room) {
  const s = room.state;
  const id = s.matches[s.idx][s.stage.perf];
  const j = jokeOf(s, id);
  s.stage.part = 'punch';
  room.sound('rimshot');
  room.say(`${j.punch}. ${s.catch[id]}`, { who: 'teplohod' });
  room.setTimer(T.punch, () => {
    if (s.stage.perf + 1 < s.matches[s.idx].length) { s.stage = { perf: s.stage.perf + 1, part: 'setup' }; return perform(room); }
    room.phase = 'voting';
    room.sound('open');
    room.say('Зал, кто смешнее?', { who: 'teplohod' });
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
  room.say(rows[0].ovation ? `Овация! ${room.byId(rows[0].id)?.name} забирает весь зал.` : s.result.tie ? 'Ничья. Зал не определился.' : `Побеждает ${room.byId(rows[0].id)?.name}!`, { who: 'teplohod' });
  room.setTimer(T.reveal, () => {
    if (s.idx + 1 < s.matches.length) { s.idx++; return openMatch(room); }
    startFinal(room);
  });
  room.push();
}

function award(room, id, pts) {
  const p = room.byId(id);
  if (!p || !pts) return;
  p.score += pts;
  room.state.gains[id] = (room.state.gains[id] || 0) + pts;
}

function startFinal(room) {
  const s = room.state;
  // берём неисполненную заготовку, если есть, иначе финальную из пака
  const spare = shuffle(Object.entries(s.jokes).flatMap(([id, list]) => list.filter((j, i) => j.topic && i !== s.chosen[id]).map((j) => fill(j.setup, j.topic))));
  s.final = { setup: spare[0] && Math.random() < 0.5 ? spare[0] : s.finalDeck.draw(), answers: {}, votes: {}, result: null };
  room.phase = 'final';
  room.sound('horn');
  room.say('Пробоина! Мы тонем! Последняя шутка — у всех одна завязка. Допишите, пока есть воздух.', { who: 'teplohod' });
  room.setTimer(T.final, () => finalVote(room));
  room.push();
}

function finalVote(room) {
  const s = room.state;
  if (Object.keys(s.final.answers).length < 2) return finish(room);
  room.phase = 'fvote';
  room.sound('open');
  room.say(`${s.final.setup} ${Object.values(s.final.answers).join('. Или: ')}.`, { who: 'teplohod' });
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
  room.sound('splash');
  room.say(`Последнее слово за ${room.byId(rows[0].id)?.name}.`, { who: 'teplohod' });
  room.setTimer(T.freveal, () => finish(room));
  room.push();
}

function finish(room) {
  room.phase = 'winner';
  room.clearTimer();
  room.sound('win');
  const top = [...playing(room)].sort((a, b) => b.score - a.score)[0];
  if (top) room.say(`Лучший комик рейса — ${top.name}! Капитан аплодирует стоя. Хотя мы и тонем.`, { who: 'teplohod' });
  room.push();
}
