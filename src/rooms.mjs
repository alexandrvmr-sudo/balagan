/* Комнаты: код, игроки, переподключение, таймер фазы, голос ведущего, боты.
   Правила игр живут в src/games — комната о них ничего не знает. */

import { TEST_MODE } from './lib.mjs';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // без I и O — путают с 1 и 0
const PALETTE = [
  '#ff5d73', '#4dd4ac', '#ffb703', '#6c8cff', '#c77dff',
  '#ff8fab', '#56cfe1', '#f9844a', '#9bf6a9', '#e0aaff',
  '#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f4a261',
];
const EMOJI = ['🦊', '🐸', '🦉', '🐙', '🦄', '🐝', '🦝', '🐬', '🐲', '🦩', '🐻', '🦔', '🐧', '🦦', '🐌'];

const ROOM_TTL = 1000 * 60 * 60 * 4;   // комната живёт 4 часа без активности
const GRACE = 1000 * 60 * 10;          // столько ждём вернувшийся телефон в лобби

const rid = (n = 8) => Math.random().toString(36).slice(2, 2 + n);

/* Карточка игры для меню и лобби */
export const metaOf = (g) => ({
  id: g.id, title: g.title, tagline: g.tagline, rules: g.rules,
  min: g.minPlayers, max: g.maxPlayers, minutes: g.minutes, ai: !!g.usesAI,
});

export class Room {
  constructor() {
    this.code = '';
    this.game = null;            // null — меню выбора игры
    this.phase = 'menu';
    this.players = [];
    this.state = {};
    this.deadline = null;
    this.timerTotal = null;
    this.timer = null;
    this.timerCb = null;
    this.sockets = new Set();    // экраны
    this.touched = Date.now();
    this.flash = null;
    this.hover = null;           // какую игру хост разглядывает в меню
    this.botTimers = [];
    this.botKey = '';
    this.catalog = [];           // список игр для меню, задаёт сервер
  }

  /* --- игра --- */
  setGame(game) {
    this.clearTimer();
    this.clearBots();
    this.botKey = '';
    this.game = game;
    this.state = {};
    this.flash = null;
    this.hover = null;
    for (const p of this.players) { p.score = 0; p.audience = false; }
    if (game) { this.phase = 'lobby'; game.init(this); }
    else this.phase = 'menu';
  }

  /* --- игроки --- */
  addPlayer(name, { bot = false } = {}) {
    const taken = new Set(this.players.map((p) => p.name.toLowerCase()));
    const base = (name || '').trim().slice(0, 14) || 'Игрок';
    let n = base;
    let i = 2;
    while (taken.has(n.toLowerCase())) n = `${base} ${i++}`;
    const idx = this.players.length;
    const p = {
      id: 'p' + rid(6),
      token: rid(16),
      name: n,
      color: PALETTE[idx % PALETTE.length],
      emoji: EMOJI[idx % EMOJI.length],
      score: 0,
      isHost: !bot && !this.players.some((x) => x.isHost),
      connected: true,
      audience: false,
      bot,
      socket: null,
      goneAt: null,
    };
    this.players.push(p);
    return p;
  }

  byToken(token) { return this.players.find((p) => p.token === token); }
  byId(id) { return this.players.find((p) => p.id === id); }

  dropPlayer(id) {
    const wasHost = this.byId(id)?.isHost;
    this.players = this.players.filter((p) => p.id !== id);
    if (wasHost) {
      const next = this.players.find((p) => !p.bot);
      if (next) next.isHost = true;
    }
  }

  /* --- таймер фазы --- */
  setTimer(seconds, onEnd) {
    this.clearTimer();
    if (!seconds) return;
    this.deadline = Date.now() + seconds * 1000;
    this.timerTotal = seconds * 1000;
    this.timerCb = onEnd;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.deadline = null;
      this.timerTotal = null;
      onEnd?.();
    }, seconds * 1000);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
    this.timerTotal = null;
    this.timerCb = null;
  }

  /* --- связь --- */
  send(socket, msg) {
    if (!socket || socket.readyState !== 1) return;
    try { socket.send(JSON.stringify(msg)); } catch {}
  }

  toScreens(msg) { for (const s of this.sockets) this.send(s, msg); }

  sound(name) { this.toScreens({ t: 'sound', name }); }

  /* Ведущий говорит вслух — экран озвучит синтезом речи */
  say(text, opts = {}) { if (text) this.toScreens({ t: 'say', text, ...opts }); }

  /* Каждому — свой вид. Экран получает viewTV, телефоны — viewPlayer. */
  push() {
    this.touched = Date.now();
    const base = {
      code: this.code,
      gameId: this.game?.id || null,
      gameTitle: this.game?.title || null,
      phase: this.phase,
      deadline: this.deadline,
      timerTotal: this.timerTotal,
      flash: this.flash,
      hover: this.hover,
      test: TEST_MODE,
      games: this.game ? null : this.catalog,
      meta: this.game ? metaOf(this.game) : null,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, emoji: p.emoji, score: p.score,
        isHost: p.isHost, connected: p.connected, audience: p.audience, bot: p.bot,
      })),
    };
    const g = this.game;
    const tv = { t: 'state', view: 'tv', ...base, ...(g?.viewTV?.(this) || {}) };
    for (const s of this.sockets) this.send(s, tv);
    for (const p of this.players) {
      if (!p.socket) continue;
      this.send(p.socket, {
        t: 'state', view: 'player', ...base,
        you: { id: p.id, name: p.name, color: p.color, emoji: p.emoji, score: p.score, isHost: p.isHost, audience: p.audience },
        ...(g?.viewPlayer?.(this, p) || {}),
      });
    }
    this.scheduleBots();
  }

  setFlash(data, ms = 2600) {
    const at = Date.now();
    this.flash = data ? { ...data, at } : null;
    if (data) setTimeout(() => {
      if (this.flash?.at === at) { this.flash = null; this.push(); }
    }, ms);
  }

  /* --- боты: ходят теми же действиями, что и люди --- */
  clearBots() {
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers = [];
  }

  scheduleBots() {
    const g = this.game;
    if (!g?.botMoves) return;
    const bots = this.players.filter((p) => p.bot);
    if (!bots.length) return;
    const key = g.stepKey ? g.stepKey(this) : this.phase;
    if (key === this.botKey) return;
    this.botKey = key;
    this.clearBots();
    for (const b of bots) {
      for (const m of g.botMoves(this, b) || []) {
        this.botTimers.push(setTimeout(async () => {
          if (this.botKey !== key || this.game !== g || !this.players.includes(b)) return;
          try { await g.onAction(this, b, m.msg); } catch (e) { console.error('[bot]', e); }
          this.push();
        }, m.delay * 1000));
      }
    }
  }
}

export class Rooms {
  constructor() {
    this.map = new Map();
    setInterval(() => this.sweep(), 60_000).unref?.();
  }

  freshCode() {
    for (let i = 0; i < 500; i++) {
      const code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
      if (!this.map.has(code)) return code;
    }
    throw new Error('не нашлось свободного кода');
  }

  create() {
    const room = new Room();
    room.code = this.freshCode();
    this.map.set(room.code, room);
    return room;
  }

  get(code) { return this.map.get(String(code || '').toUpperCase().trim()); }

  close(code) {
    const room = this.map.get(code);
    if (!room) return;
    room.clearTimer();
    room.clearBots();
    this.map.delete(code);
  }

  sweep() {
    const now = Date.now();
    for (const [code, room] of this.map) {
      let changed = false;
      const idle = room.phase === 'menu' || room.phase === 'lobby';
      for (const p of [...room.players]) {
        if (!p.bot && !p.connected && p.goneAt && now - p.goneAt > GRACE && idle) {
          room.dropPlayer(p.id);
          changed = true;
        }
      }
      if (now - room.touched > ROOM_TTL) { this.close(code); continue; }
      if (changed) room.push();
    }
  }

  get stats() {
    return { rooms: this.map.size, players: [...this.map.values()].reduce((n, r) => n + r.players.length, 0) };
  }
}
