/* БАЛАГАН — сервер вечериночных игр.
   Телевизор открывает /, телефоны заходят по QR или коду комнаты. */

import http from 'node:http';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import './src/env.mjs';               // должен идти до модулей, читающих process.env
import { Rooms } from './src/rooms.mjs';
import shutka, { TEST_MODE } from './src/games/shutka.mjs';
import { aiEnabled } from './src/ai.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 7700);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');  // если нужно задать домен вручную
const MAX_ROOMS = Number(process.env.BALAGAN_MAX_ROOMS || 200);

const GAMES = { shutka };
const rooms = new Rooms();

/* ---------------- HTTP ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  if (p === '/health') {
    return json(res, { ok: true, ai: aiEnabled, test: TEST_MODE, ...rooms.stats });
  }

  // песочница: одна команда — готовая комната со всеми окнами на одном экране
  if (p === '/api/test/room' && TEST_MODE) {
    const room = rooms.create(shutka);
    console.log(`  + тестовая комната ${room.code}`);
    return json(res, { code: room.code });
  }

  if (p === '/qr') {
    const data = url.searchParams.get('d') || '';
    if (!data || data.length > 300) return send(res, 400, 'text/plain', 'bad qr');
    try {
      const svg = await QRCode.toString(data, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0b0b12', light: '#ffffff' } });
      return send(res, 200, 'image/svg+xml', svg, 'public, max-age=3600');
    } catch { return send(res, 500, 'text/plain', 'qr failed'); }
  }

  // /j/ABCD — короткая ссылка из QR
  const short = p.match(/^\/j\/([A-Za-z]{4})\/?$/);
  let file = p;
  if (short) file = '/join.html';
  else if (p === '/' || p === '/tv') file = '/tv.html';
  else if (p === '/join') file = '/join.html';
  else if (p === '/test') {
    if (!TEST_MODE) return send(res, 404, 'text/plain; charset=utf-8', 'Тестовый режим выключен: запусти npm run test-party');
    file = '/test.html';
  }

  const fp = path.join(PUBLIC, file);
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
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });

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
      const game = GAMES[msg.game] || shutka;
      room = rooms.create(game);
      console.log(`  + комната ${room.code} · ${game.title}`);
    }
    ws.meta = { role: 'tv', room, playerId: null };
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
    if (p) {                                    // вернулся
      if (p.socket && p.socket !== ws) { try { p.socket.close(); } catch {} }
      p.socket = ws; p.connected = true; p.goneAt = null;
    } else {
      if (room.players.length >= 60) return say({ t: 'error', msg: 'Комната переполнена' });
      p = room.addPlayer(msg.name);
      p.socket = ws;
      room.game.onPlayerJoin?.(room, p);
      room.sound('join');
    }
    ws.meta = { role: 'player', room, playerId: p.id };
    say({ t: 'welcome', role: 'player', code: room.code, token: p.token, id: p.id, name: p.name });
    room.push();
    return;
  }

  /* --- игровое действие --- */
  if (msg.t === 'act') {
    const { room, playerId } = ws.meta;
    if (!room) return;
    const p = room.byId(playerId);
    if (!p) return;
    await room.game.onAction?.(room, p, msg);
    room.push();
    return;
  }

  if (msg.t === 'ping') return say({ t: 'pong' });
}

/* Публичный адрес: из PUBLIC_URL, иначе из заголовков соединения (работает за прокси),
   иначе — локальный IP, чтобы телефоны в той же Wi-Fi нашли сервер. */
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

/* чистим подвисшие соединения */
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
  console.log(`\n  🎪  БАЛАГАН\n`);
  console.log(`  Экран (телевизор):   http://localhost:${PORT}/`);
  console.log(`  Телефоны:            ${phones}`);
  if (PUBLIC_URL) console.log(`  Публичный адрес:     ${PUBLIC_URL}`);
  console.log(`  ИИ-задания:          ${aiEnabled ? 'включены' : 'выключены (нет ANTHROPIC_API_KEY)'}`);
  if (TEST_MODE) console.log(`  🧪 Песочница:        http://localhost:${PORT}/test  — экран и телефоны в одном окне, боты играют сами`);

  // QR прямо в терминале — можно сканировать, не дожидаясь телевизора
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
