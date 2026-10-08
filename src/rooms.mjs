/* Менеджер комнат: код, игроки, переподключение, таймеры фаз.
   Движок ничего не знает о правилах — это дело модулей в src/games. */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // без I и O — путают с 1 и 0
const PALETTE = [
  '#ff5d73', '#4dd4ac', '#ffb703', '#6c8cff', '#c77dff',
  '#ff8fab', '#56cfe1', '#f9844a', '#9bf6a9', '#e0aaff',
];
const EMOJI = ['🦊', '🐸', '🦉', '🐙', '🦄', '🐝', '🦝', '🐬', '🐲', '🦩'];

const ROOM_TTL = 1000 * 60 * 60 * 4;   // комната живёт 4 часа без активности
const GRACE = 1000 * 60 * 10;          // столько ждём вернувшийся телефон

const rid = (n = 8) => Math.random().toString(36).slice(2, 2 + n);

export class Room {
  constructor(game) {
    this.code = '';
    this.game = game;
    this.phase = 'lobby';
    this.players = [];
    this.state = {};               // приватное состояние игры
    this.deadline = null;          // ms epoch или null
    this.timer = null;             // серверный setTimeout
    this.sockets = new Set();      // все tv-сокеты
    this.touched = Date.now();
    this.flash = null;             // короткое событие для экрана
  }

  /* --- игроки --- */
  addPlayer(name) {
    const taken = new Set(this.players.map((p) => p.name.toLowerCase()));
    let base = (name || '').trim().slice(0, 14) || 'Игрок';
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
      isHost: this.players.length === 0,
      connected: true,
      socket: null,
      goneAt: null,
    };
    this.players.push(p);
    return p;
  }

  byToken(token) { return this.players.find((p) => p.token === token); }
  byId(id) { return this.players.find((p) => p.id === id); }
  get host() { return this.players.find((p) => p.isHost); }
  get live() { return this.players.filter((p) => p.connected); }

  dropPlayer(id) {
    const wasHost = this.byId(id)?.isHost;
    this.players = this.players.filter((p) => p.id !== id);
    if (wasHost && this.players.length) this.players[0].isHost = true;
  }

  /* --- таймер фазы --- */
  setTimer(seconds, onEnd) {
    this.clearTimer();
    if (!seconds) return;
    this.deadline = Date.now() + seconds * 1000;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.deadline = null;
      onEnd?.();
    }, seconds * 1000);
  }

  addTime(seconds) {
    if (!this.deadline || !this.timer) return;
    const left = this.deadline - Date.now() + seconds * 1000;
    const cb = this.timer._onTimeout;
    this.clearTimer();
    if (left > 0) this.setTimer(left / 1000, cb);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
  }

  /* --- связь --- */
  send(socket, msg) {
    if (!socket || socket.readyState !== 1) return;
    try { socket.send(JSON.stringify(msg)); } catch {}
  }

  sound(name) {
    for (const s of this.sockets) this.send(s, { t: 'sound', name });
  }

  /* Отправляет каждому его персональный вид. Экран получает viewTV. */
  push() {
    this.touched = Date.now();
    const base = {
      code: this.code,
      gameId: this.game.id,
      gameTitle: this.game.title,
      phase: this.phase,
      deadline: this.deadline,
      flash: this.flash,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, color: p.color, emoji: p.emoji,
        score: p.score, isHost: p.isHost, connected: p.connected,
      })),
    };
    const tv = { t: 'state', view: 'tv', ...base, ...(this.game.viewTV?.(this) || {}) };
    for (const s of this.sockets) this.send(s, tv);
    for (const p of this.players) {
      if (!p.socket) continue;
      this.send(p.socket, {
        t: 'state', view: 'player', ...base,
        you: { id: p.id, name: p.name, color: p.color, emoji: p.emoji, score: p.score, isHost: p.isHost },
        ...(this.game.viewPlayer?.(this, p) || {}),
      });
    }
  }

  /* Короткая вспышка на экране (попадание, «шутка!» и т.п.) */
  setFlash(data, ms = 2600) {
    this.flash = data ? { ...data, at: Date.now() } : null;
    if (data) setTimeout(() => {
      if (this.flash?.at === data.at) { this.flash = null; this.push(); }
    }, ms);
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

  create(game) {
    const room = new Room(game);
    room.code = this.freshCode();
    game.init?.(room);
    this.map.set(room.code, room);
    return room;
  }

  get(code) { return this.map.get(String(code || '').toUpperCase().trim()); }

  close(code) {
    const room = this.map.get(code);
    if (!room) return;
    room.clearTimer();
    this.map.delete(code);
  }

  /* Чистим мёртвые комнаты и игроков, которые не вернулись */
  sweep() {
    const now = Date.now();
    for (const [code, room] of this.map) {
      let changed = false;
      for (const p of [...room.players]) {
        if (!p.connected && p.goneAt && now - p.goneAt > GRACE && room.phase === 'lobby') {
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
