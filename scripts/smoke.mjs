/* Дымовой прогон: каждая игра целиком, одни боты, время ускорено в 50 раз.
   Ловит падения сервера на всех ветках — разное число игроков, отвалившиеся телефоны.
   Запуск: npm run smoke */

process.env.BALAGAN_TEST = '1';
delete process.env.ANTHROPIC_API_KEY;

const SPEED = 50;
const realTimeout = global.setTimeout;
global.setTimeout = (fn, ms = 0, ...args) => realTimeout(fn, Math.max(1, ms / SPEED), ...args);

const { Room } = await import('../src/rooms.mjs');
const { GAMES } = await import('../src/games/index.mjs');
const { assignRoles } = await import('../src/lib.mjs');

const errors = [];
process.on('uncaughtException', (e) => errors.push(e));
process.on('unhandledRejection', (e) => errors.push(e));
const origError = console.error;
console.error = (...a) => { errors.push(new Error(a.map(String).join(' '))); };

function play(game, n, { drop = false } = {}) {
  return new Promise((resolve) => {
    const room = new Room();
    room.code = 'TEST';
    for (let i = 0; i < n; i++) room.addPlayer(`Бот ${i + 1}`, { bot: true });
    room.setGame(game);
    assignRoles(room, game.maxPlayers);
    const phases = new Set();
    const started = Date.now();
    const push = room.push.bind(room);
    room.push = () => {
      phases.add(room.phase);
      // проверяем, что виды собираются без ошибок
      try { game.viewTV(room); for (const p of room.players) game.viewPlayer(room, p); } catch (e) { errors.push(e); }
      push();
      if (drop && phases.size === 3 && room.players[1]?.connected) { room.players[1].connected = false; }
      if (room.phase === 'winner') finish('winner');
    };
    let done = false;
    const finish = (how) => {
      if (done) return;
      done = true;
      room.clearTimer(); room.clearBots();
      resolve({ how, phases: [...phases], ms: Date.now() - started, scores: room.players.map((p) => p.score) });
    };
    realTimeout(() => finish('timeout'), 20000);
    Promise.resolve(game.start(room)).then(() => room.push()).catch((e) => { errors.push(e); finish('error'); });
  });
}

let fail = 0;
for (const g of GAMES) {
  const counts = [...new Set([g.minPlayers, Math.min(g.maxPlayers, 5), g.maxPlayers])];
  for (const n of counts) {
    for (const drop of [false, true]) {
      if (drop && n < 3) continue;
      const before = errors.length;
      const r = await play(g, n, { drop });
      const bad = r.how !== 'winner' || errors.length > before;
      if (bad) fail++;
      console.log(`${bad ? '✗' : '✓'} ${g.title.padEnd(16)} ${String(n).padStart(2)} игроков${drop ? ' + отвал' : '        '}  ${r.how.padEnd(7)} ${String(r.ms).padStart(5)} мс  фаз: ${r.phases.length}`);
      for (const e of errors.slice(before)) console.log('    ', String(e?.stack || e).split('\n').slice(0, 3).join('\n     '));
    }
  }
}
console.log(fail ? `\n${fail} прогонов с ошибками` : '\nвсе игры доигрываются без ошибок');
process.exit(fail ? 1 : 0);
