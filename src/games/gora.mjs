/* «Медная гора» — две команды в шахте Хозяйки угадывают, как ответила вся комната.
   Каждый тайно выбирает свой топ-3, из этого складывается общий рейтинг.
   Команды по очереди открывают двери: угадал — самоцвет и факел, ошибся — чудище гасит факел. */

import { data, Deck, shuffle, pick, rnd, secs, playing, online } from '../lib.mjs';

const PACK = data('gora.json');

const T = {
  teams: secs('BALAGAN_GORA_TEAMS', 8, 5),
  survey: secs('BALAGAN_GORA_SURVEY', 40, 20),
  turn: secs('BALAGAN_GORA_TURN', 25, 10),
  reveal: secs('BALAGAN_GORA_REVEAL', 3, 2),
  end: secs('BALAGAN_GORA_END', 12, 7),
};

const ROUNDS = [
  { goal: 'top', n: 3, title: 'Найдите три самых популярных ответа', value: 500 },
  { goal: 'bottom', n: 3, title: 'Найдите три самых непопулярных ответа', value: 700 },
  { goal: 'top', n: 4, title: 'Найдите четвёрку лидеров — самоцветы дороже вдвое', value: 1000 },
];
const TORCHES = 3;
const TEAMS = [
  { id: 'A', name: 'Малахитовые', color: '#18c88a' },
  { id: 'B', name: 'Медные', color: '#e2803a' },
];

const say = {
  start: 'Добро пожаловать в мою гору. Выход найдёт тот, кто знает, что думают люди.',
  survey: 'Каждый тихо выбирает свои три любимых ответа. Не подглядывать.',
  gem: ['Самоцвет!', 'Угадали.', 'Камень ваш.', 'Блестит!'],
  monster: ['Чудище!', 'Мимо. Гаснет факел.', 'Не та дверь.', 'Темнее стало.'],
  dark: 'Команда осталась без факелов.',
};

export default {
  id: 'gora',
  title: 'Медная гора',
  tagline: 'Две команды в шахте угадывают, что думает большинство',
  minPlayers: 3,
  maxPlayers: 12,
  tags: ['Команды', 'Опросы'],
  minutes: 15,
  intro: 'Медная гора. Две команды, одна шахта и Хозяйка, которая знает, что думают люди.',
  rules: [
    'Вас делят на две команды — Малахитовые и Медные',
    'Каждый тайно выбирает свой топ-3 в опросе',
    'Команды по очереди открывают двери: какие ответы в топе у всей комнаты?',
    'Угадал — самоцвет и факел. Ошибся — чудище гасит факел',
    'Капитан хода жмёт дверь, команда подсказывает. Соперники всё слышат',
  ],

  init(room) {
    room.state = {
      deck: new Deck(PACK.surveys),
      round: 0,
      teams: { A: [], B: [] },
      teamScore: { A: 0, B: 0 },
      survey: null,
      picks: {},          // playerId → [i, i, i]
      doors: [],          // { i, text, pts, rank, open, gem }
      target: [],
      turn: 'A',
      turnNo: 0,
      captainIdx: { A: 0, B: 0 },
      torches: { A: TORCHES, B: TORCHES },
      gems: { A: 0, B: 0 },
      hints: {},          // playerId → door
      last: null,         // последняя открытая дверь
      conform: {},
      conformTotal: {},
    };
  },

  start(room) {
    const s = room.state;
    const ids = shuffle(playing(room).map((p) => p.id));
    s.teams = { A: ids.filter((_, i) => i % 2 === 0), B: ids.filter((_, i) => i % 2 === 1) };
    room.phase = 'teams';
    room.say(say.start);
    room.sound('round');
    room.setTimer(T.teams, () => startRound(room, 1));
  },

  onPlayerJoin(room, p) { p.audience = true; },

  onAction(room, p, msg) {
    const s = room.state;
    switch (msg.a) {
      case 'rank': {
        if (room.phase !== 'survey' || s.picks[p.id]) return;
        const list = (msg.order || []).map(Number).filter((i) => i >= 0 && i < 8);
        const uniq = [...new Set(list)].slice(0, 3);
        if (uniq.length < 3) return;
        s.picks[p.id] = uniq;
        room.sound('pop');
        const everyone = online(room.players).every((x) => s.picks[x.id]);
        if (everyone) { room.clearTimer(); startGuess(room); }
        return;
      }

      case 'hint': {
        if (room.phase !== 'guess') return;
        if (teamOf(s, p.id) !== s.turn) return;
        const d = s.doors[msg.door];
        if (!d || d.open) return;
        s.hints[p.id] = msg.door;
        return;
      }

      case 'open': {
        if (room.phase !== 'guess') return;
        if (captain(s, s.turn) !== p.id) return;
        openDoor(room, Number(msg.door));
        return;
      }
    }
  },

  viewTV(room) {
    const s = room.state;
    const base = {
      round: s.round, rounds: ROUNDS.length, teams: teamsView(room), teamScore: s.teamScore,
      torches: s.torches, gems: s.gems,
    };
    if (room.phase === 'survey') {
      return { ...base, question: s.survey.q, options: s.survey.options, done: online(room.players).map((p) => ({ id: p.id, done: !!s.picks[p.id] })) };
    }
    if (room.phase === 'guess' || room.phase === 'opened') {
      const r = ROUNDS[s.round - 1];
      return {
        ...base, question: s.survey.q, goal: r.title, need: s.target.length, found: s.gems.A + s.gems.B,
        doors: s.doors.map((d) => ({ i: d.i, text: d.text, open: d.open, gem: d.gem, rank: d.open ? d.rank : null, by: d.by || null })),
        turn: s.turn, captain: captain(s, s.turn), hints: hintsByDoor(s), last: s.last, value: r.value,
      };
    }
    if (room.phase === 'roundEnd' || room.phase === 'winner') {
      return {
        ...base, question: s.survey?.q, ranking: s.doors.slice().sort((a, b) => a.rank - b.rank).map((d) => ({ text: d.text, pts: d.pts, rank: d.rank, target: s.target.includes(d.i) })),
        conform: s.conform, lastRound: s.round,
        titles: room.phase === 'winner' ? titles(room) : null,
      };
    }
    return base;
  },

  viewPlayer(room, p) {
    const s = room.state;
    const team = teamOf(s, p.id);
    const my = { team, teamName: TEAMS.find((t) => t.id === team)?.name || null, teamColor: TEAMS.find((t) => t.id === team)?.color };
    if (room.phase === 'teams') return { ...my, wait: team ? `Ты в команде «${my.teamName}»` : 'Ты в зале — смотри и болей' };
    if (room.phase === 'survey') {
      if (s.picks[p.id]) return { ...my, wait: 'Принято. Ждём остальных' };
      return { ...my, survey: { q: s.survey.q, options: s.survey.options } };
    }
    if (room.phase === 'guess' || room.phase === 'opened') {
      const mine = team === s.turn;
      return {
        ...my,
        guess: {
          q: s.survey.q, goal: ROUNDS[s.round - 1].title,
          doors: s.doors.map((d) => ({ i: d.i, text: d.text, open: d.open, gem: d.gem })),
          mine, captain: captain(s, s.turn) === p.id, captainName: room.byId(captain(s, s.turn))?.name,
          hint: s.hints[p.id] ?? null, hints: mine ? hintsByDoor(s) : {}, phase: room.phase,
        },
      };
    }
    if (room.phase === 'roundEnd') {
      const c = s.conform[p.id];
      return { ...my, wait: c == null ? 'Смотри на экран' : `Совпал с большинством: ${c} из 3` };
    }
    if (room.phase === 'winner') {
      const win = s.teamScore.A === s.teamScore.B ? null : s.teamScore.A > s.teamScore.B ? 'A' : 'B';
      return { ...my, winTeam: win, winName: TEAMS.find((t) => t.id === win)?.name || null };
    }
    return my;
  },

  stepKey: (room) => `${room.phase}:${room.state.round}:${room.state.turnNo}`,

  botMoves(room, b) {
    const s = room.state;
    if (room.phase === 'survey' && !s.picks[b.id]) {
      return [{ delay: rnd(2, 8), msg: { a: 'rank', order: shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3) } }];
    }
    if (room.phase === 'guess' && teamOf(s, b.id) === s.turn) {
      const closed = s.doors.filter((d) => !d.open).map((d) => d.i);
      if (!closed.length) return [];
      // бот угадывает чуть лучше случайного: смотрит на свой выбор
      const own = (s.picks[b.id] || []).filter((i) => closed.includes(i));
      const guess = ROUNDS[s.round - 1].goal === 'top' && own.length && Math.random() < 0.6 ? own[0] : pick(closed);
      if (captain(s, s.turn) === b.id) return [{ delay: rnd(3, 7), msg: { a: 'open', door: guess } }];
      return [{ delay: rnd(1, 3), msg: { a: 'hint', door: guess } }];
    }
    return [];
  },
};

/* =================== механика =================== */

const teamOf = (s, id) => (s.teams.A.includes(id) ? 'A' : s.teams.B.includes(id) ? 'B' : null);
const other = (t) => (t === 'A' ? 'B' : 'A');

function captain(s, t) {
  const list = s.teams[t];
  if (!list.length) return null;
  return list[s.captainIdx[t] % list.length];
}

function teamsView(room) {
  const s = room.state;
  return TEAMS.map((t) => ({ ...t, members: s.teams[t.id].filter((id) => room.byId(id)) }));
}

function hintsByDoor(s) {
  const out = {};
  for (const [pid, door] of Object.entries(s.hints)) {
    if (teamOf(s, pid) !== s.turn) continue;
    (out[door] = out[door] || []).push(pid);
  }
  return out;
}

function startRound(room, n) {
  const s = room.state;
  s.round = n;
  s.survey = s.deck.draw();
  s.picks = {};
  s.hints = {};
  s.last = null;
  s.torches = { A: TORCHES, B: TORCHES };
  s.gems = { A: 0, B: 0 };
  room.phase = 'survey';
  room.sound('open');
  room.say(n === 1 ? say.survey : `Раунд ${n}. ${ROUNDS[n - 1].title}.`);
  room.setTimer(T.survey, () => startGuess(room));
  room.push();
}

function startGuess(room) {
  const s = room.state;
  const r = ROUNDS[s.round - 1];
  // кто не ответил — за него случайный выбор, чтобы рейтинг не перекосило пустыми голосами
  const pts = Array(8).fill(0);
  const firsts = Array(8).fill(0);
  for (const order of Object.values(s.picks)) {
    order.forEach((i, k) => { pts[i] += 3 - k; if (k === 0) firsts[i]++; });
  }
  const tiebreak = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => pts[b] - pts[a] || firsts[b] - firsts[a] || tiebreak.indexOf(a) - tiebreak.indexOf(b));
  s.doors = s.survey.options.map((text, i) => ({ i, text, pts: pts[i], rank: order.indexOf(i) + 1, open: false, gem: false }));
  s.target = r.goal === 'top' ? order.slice(0, r.n) : order.slice(-r.n);

  // насколько каждый совпал с большинством (по топ-3)
  const top3 = order.slice(0, 3);
  s.conform = Object.fromEntries(Object.entries(s.picks).map(([pid, o]) => [pid, o.filter((i) => top3.includes(i)).length]));
  for (const [pid, c] of Object.entries(s.conform)) s.conformTotal[pid] = (s.conformTotal[pid] || 0) + c;

  // раунд начинает отстающая команда
  s.turn = s.teamScore.A === s.teamScore.B ? (s.round % 2 ? 'A' : 'B') : s.teamScore.A < s.teamScore.B ? 'A' : 'B';
  if (!s.teams[s.turn].length) s.turn = other(s.turn);
  room.phase = 'guess';
  room.sound('round');
  nextTurn(room, true);
}

function nextTurn(room, first = false) {
  const s = room.state;
  s.hints = {};
  s.turnNo++;
  if (!first) {
    const o = other(s.turn);
    if (s.torches[o] > 0 && s.teams[o].length) s.turn = o;
    else if (!(s.torches[s.turn] > 0)) return endRound(room);
  }
  if (!(s.torches[s.turn] > 0)) return endRound(room);
  room.phase = 'guess';
  const cap = room.byId(captain(s, s.turn));
  room.say(`Ход команды «${TEAMS.find((t) => t.id === s.turn).name}». Решает ${cap?.name || 'капитан'}.`);
  room.setTimer(T.turn, () => {
    // капитан не решился — дверь выбирает гора
    const hinted = Object.values(hintsByDoor(s)).length ? Number(Object.entries(hintsByDoor(s)).sort((a, b) => b[1].length - a[1].length)[0][0]) : null;
    const closed = s.doors.filter((d) => !d.open).map((d) => d.i);
    openDoor(room, hinted ?? pick(closed));
  });
  room.push();
}

function openDoor(room, i) {
  const s = room.state;
  const d = s.doors[i];
  if (!d || d.open || room.phase !== 'guess') return;
  const r = ROUNDS[s.round - 1];
  room.clearTimer();
  d.open = true;
  d.by = s.turn;
  d.gem = s.target.includes(i);
  s.last = { i, gem: d.gem, team: s.turn };
  s.captainIdx[s.turn]++;
  if (d.gem) {
    s.gems[s.turn]++;
    s.teamScore[s.turn] += r.value;
    s.torches[s.turn] = Math.min(5, s.torches[s.turn] + 1);
    room.sound('coin');
    room.say(`${pick(say.gem)} ${d.text} — место ${d.rank}.`);
  } else {
    s.torches[s.turn]--;
    room.sound('monster');
    room.say(`${pick(say.monster)} ${d.text} — место ${d.rank}.${s.torches[s.turn] <= 0 ? ' ' + say.dark : ''}`);
  }
  room.phase = 'opened';
  room.push();
  const found = s.gems.A + s.gems.B;
  room.setTimer(T.reveal, () => {
    if (found >= s.target.length) return endRound(room);
    if (s.torches.A <= 0 && s.torches.B <= 0) return endRound(room);
    nextTurn(room);
  });
}

function endRound(room) {
  const s = room.state;
  room.clearTimer();
  // личные очки: команда делится добытым, знатоки большинства получают бонус
  const r = ROUNDS[s.round - 1];
  for (const t of ['A', 'B']) {
    for (const id of s.teams[t]) {
      const p = room.byId(id);
      if (p) p.score += s.gems[t] * r.value;
    }
  }
  for (const [pid, c] of Object.entries(s.conform)) {
    const p = room.byId(pid);
    if (p && !p.audience) p.score += c * 100;
  }
  if (s.round >= ROUNDS.length) {
    room.phase = 'winner';
    room.sound('win');
    const win = s.teamScore.A === s.teamScore.B ? null : s.teamScore.A > s.teamScore.B ? 'A' : 'B';
    room.say(win ? `Из горы выходит команда «${TEAMS.find((t) => t.id === win).name}»!` : 'Ничья. Гора отпускает всех.');
    return room.push();
  }
  room.phase = 'roundEnd';
  room.sound('reveal');
  room.say('Вот что на самом деле думает комната.');
  room.setTimer(T.end, () => startRound(room, s.round + 1));
  room.push();
}

/* знаток народа и белая ворона — по сумме совпадений за игру */
function titles(room) {
  const s = room.state;
  const list = playing(room).map((p) => ({ id: p.id, c: s.conformTotal[p.id] ?? 0 }));
  if (!list.length) return null;
  const sorted = list.sort((a, b) => b.c - a.c);
  return { sage: sorted[0].id, crow: sorted[sorted.length - 1].id };
}
