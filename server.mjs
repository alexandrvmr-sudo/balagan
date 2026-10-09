/* БАЛАГАН — сервер вечериночных игр.
   Телевизор открывает /, телефоны заходят по QR или коду комнаты. */

import './src/env.mjs';               // должен идти до модулей, читающих process.env
import http from 'node:http';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import { Rooms, metaOf } from './src/rooms.mjs';
import { GAMES, byId } from './src/games/index.mjs';
import { aiEnabled } from './src/ai.mjs';
import { TEST_MODE, assignRoles, online, playing } from './src/lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 7700);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');  // если нужно задать домен вручную
const MAX_ROOMS = Number(process.env.BALAGAN_MAX_ROOMS || 200);

const CATALOG = GAMES.map(metaOf);
const rooms = new Rooms();

function newRoom() {
  const room = rooms.create();
  room.catalog = CATALOG;
  return room;
}

/* ---------------- HTTP ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  if (p === '/health') return json(res, { ok: true, ai: aiEnabled, test: TEST_MODE, games: GAMES.map((g) => g.id), ...rooms.stats });

  if (p === '/qr') {
    const d = url.searchParams.get('d') || '';
    if (!d || d.length > 300) return send(res, 400, 'text/plain', 'bad qr');
    try {
      const svg = await QRCode.toString(d, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0b0b12', light: '#ffffff' } });
      return send(res, 200, 'image/svg+xml', svg, 'public, max-age=3600');
    } catch { return send(res, 500, 'text/plain', 'qr failed'); }
  }

  // песочница: комната, переживающая перезагрузку страницы
  if (p === '/api/test/room' && TEST_MODE) {
    const alive = rooms.get(url.searchParams.get('code'));
    if (alive) return json(res, { code: alive.code, reused: true });
    const room = newRoom();
    console.log(`  + тестовая комната ${room.code}`);
    return json(res, { code: room.code, reused: false });
  }

  const short = p.match(/^\/j\/([A-Za-z]{4})\/?$/);
  let file = p;
  if (short) file = '/join.html';
  else if (p === '/' || p === '/tv') file = '/tv.html';
  else if (p === '/join') file = '/join.html';
  else if (p === '/test') {
    if (!TEST_MODE) return send(res, 404, 'text/plain; charset=utf-8', 'Тестовый режим выключен: запусти npm run test-party');
    file = '/test.html';
  }

  const fp = path.join(PUBLIC, decodeURIComponent(file));
  if (!fp.startsWith(PUBLIC)) return send(res, 403, 'text/plain', 'nope');
  try {
    const buf = await fsp.readFile(fp);
    return send(res, 200, MIME[path.extname(fp)] || 'application/octet-stream', buf, 'no-store');
  } catch {
    return send(res, 404, 'text/plain; charset=utf-8', 'Не найдено');
  }
});

const send = (res, code, type, body, cache) => {
  res.writeHead(code, { 'Content-Type': type, ...(cache ? { 'Cache-Control': cache } : {}) });
  res.end(body);
};
const json = (res, obj) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(obj), 'no-store');

/* ---------------- WebSocket ---------------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

wss.on('connection', (ws, req) => {
  ws.meta = { role: null, room: null, playerId: null, origin: originOf(req) };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    try { await handle(ws, msg); } catch (e) { console.error('[ws]', e); }
  });

  ws.on('close', () => {
    const { room, role, playerId } = ws.meta;
    if (!room) return;
    if (role === 'tv') { room.sockets.delete(ws); return; }
    const p = room.byId(playerId);
    if (p && p.socket === ws) {
      p.socket = null;
      p.connected = false;
      p.goneAt = Date.now();
      room.push();
    }
  });
});

async function handle(ws, msg) {
  const say = (m) => { try { ws.send(JSON.stringify(m)); } catch {} };

  /* --- экран --- */
  if (msg.t === 'tv') {
    let room = msg.code ? rooms.get(msg.code) : null;
    if (msg.code && !room) return say({ t: 'error', msg: 'Комната не найдена' });
    if (!room) {
      if (rooms.stats.rooms >= MAX_ROOMS) return say({ t: 'error', msg: 'Сервер занят, попробуйте через пару минут' });
      room = newRoom();
      console.log(`  + комната ${room.code}`);
    }
    ws.meta = { ...ws.meta, role: 'tv', room, playerId: null };
    room.sockets.add(ws);
    say({ t: 'welcome', role: 'tv', code: room.code, joinUrl: joinUrl(room.code, ws.meta.origin), ai: aiEnabled, test: TEST_MODE });
    room.push();
    return;
  }

  /* --- телефон --- */
  if (msg.t === 'join') {
    const room = rooms.get(msg.code);
    if (!room) return say({ t: 'error', msg: 'Нет такой комнаты' });

    let p = msg.token ? room.byToken(msg.token) : null;
    if (p) {
      if (p.socket && p.socket !== ws) { try { p.socket.close(); } catch {} }
      p.socket = ws; p.connected = true; p.goneAt = null;
    } else {
      if (room.players.length >= 60) return say({ t: 'error', msg: 'Комната переполнена' });
      p = room.addPlayer(msg.name);
      p.socket = ws;
      // во время игры новенькие идут в зал
      if (room.game && room.phase !== 'lobby') {
        p.audience = true;
        room.game.onPlayerJoin?.(room, p);
      }
      room.sound('join');
    }
    ws.meta = { ...ws.meta, role: 'player', room, playerId: p.id };
    say({ t: 'welcome', role: 'player', code: room.code, token: p.token, id: p.id, name: p.name });
    room.push();
    return;
  }

  /* --- действие игрока --- */
  if (msg.t === 'act') {
    const { room, playerId } = ws.meta;
    if (!room) return;
    const p = room.byId(playerId);
    if (!p) return;
    if (!(await platformAction(room, p, msg))) await room.game?.onAction?.(room, p, msg);
    room.push();
    return;
  }

  if (msg.t === 'ping') return say({ t: 'pong' });
}

/* Общие для всех игр действия. true — действие обработано здесь. */
async function platformAction(room, p, msg) {
  const host = p.isHost;
  const g = room.game;

  switch (msg.a) {
    case 'hover':
      if (host && !g) room.hover = byId[msg.game] ? msg.game : null;
      return true;

    case 'pick': {
      if (!host || g || !byId[msg.game]) return true;
      const next = byId[msg.game];
      room.setGame(next);
      room.sound('pick');
      room.say(next.intro || next.title, { who: next.id });
      return true;
    }

    case 'menu':
      if (host && g) { room.setGame(null); room.sound('menu'); }
      return true;

    case 'again':
      if (host && g && room.phase === 'winner') { room.setGame(g); room.sound('pick'); }
      return true;

    case 'start': {
      if (!host || !g || room.phase !== 'lobby') return true;
      if (online(room.players).length < g.minPlayers) return true;
      assignRoles(room, g.maxPlayers);
      await g.start(room);
      return true;
    }

    case 'addBot': {
      if (!TEST_MODE || !host) return true;
      if (g && room.phase !== 'lobby') return true;
      const names = ['Бот Сеня', 'Бот Клава', 'Бот Гоша', 'Бот Рита', 'Бот Зина', 'Бот Фёдор', 'Бот Люся', 'Бот Толик'];
      const used = new Set(room.players.map((x) => x.name));
      room.addPlayer(names.find((n) => !used.has(n)) || 'Бот', { bot: true });
      return true;
    }

    case 'dropBots':
      if (TEST_MODE && host && (!g || room.phase === 'lobby')) {
        for (const b of room.players.filter((x) => x.bot)) room.dropPlayer(b.id);
      }
      return true;
  }
  return false;
}

/* Публичный адрес: из PUBLIC_URL, иначе из заголовков соединения, иначе локальный IP */
function originOf(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return '';
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0]
    || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}

function joinUrl(code, origin) {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin || '');
  const base = PUBLIC_URL || (origin && !local ? origin : `http://${localIp()}:${PORT}`);
  return `${base}/j/${code}`;
}

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 25_000).unref();

function localIp() {
  const nets = Object.values(os.networkInterfaces()).flat();
  const n = nets.find((x) => x && x.family === 'IPv4' && !x.internal);
  return n?.address || 'localhost';
}

server.listen(PORT, '0.0.0.0', async () => {
  const ip = localIp();
  const phones = `${PUBLIC_URL || `http://${ip}:${PORT}`}/join`;
  console.log(`\n  🎪  БАЛАГАН · ${GAMES.length} ${GAMES.length === 1 ? 'игра' : GAMES.length < 5 ? 'игры' : 'игр'}\n`);
  console.log(`  Экран (телевизор):   http://localhost:${PORT}/`);
  console.log(`  Телефоны:            ${phones}`);
  if (PUBLIC_URL) console.log(`  Публичный адрес:     ${PUBLIC_URL}`);
  console.log(`  ИИ:                  ${aiEnabled ? 'включён' : 'выключен (нет ANTHROPIC_API_KEY)'}`);
  if (TEST_MODE) console.log(`  🧪 Песочница:        http://localhost:${PORT}/test  — экран и телефоны в одном окне, боты играют сами`);

  if (process.env.BALAGAN_QR !== '0' && !PUBLIC_URL) {
    try {
      const art = await QRCode.toString(phones, { type: 'terminal', small: true, errorCorrectionLevel: 'L' });
      console.log(`\n${art}`);
    } catch {}
  }
  console.log(`  Телефоны должны быть в той же Wi-Fi. Если не открывается — разреши`);
  console.log(`  входящие подключения для node: Системные настройки → Сеть → Файрвол.\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { console.log('\n  пока!'); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1500); });
}

