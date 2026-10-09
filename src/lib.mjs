/* Общие помощники для всех игр */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TEST_MODE = process.env.BALAGAN_TEST === '1';

export const data = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));

export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const rnd = (min, max) => min + Math.random() * (max - min);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Таймер фазы: обычное значение и укороченное для песочницы */
export const secs = (env, normal, test) => Number(process.env[env]) || (TEST_MODE ? test : normal);

/* Колода без повторов: тянем, пока не кончится, потом перетасовываем заново */
export class Deck {
  constructor(items) { this.items = [...items]; this.left = shuffle(this.items); }
  draw() {
    if (!this.left.length) this.left = shuffle(this.items);
    return this.left.pop();
  }
  drawMany(n) { return Array.from({ length: n }, () => this.draw()); }
  /* свежие (например, от ИИ) уходят первыми */
  pushFront(list) { this.items.push(...list); this.left.push(...shuffle(list)); }
}

/* Роли: первые max подключённых — игроки, остальные — зал */
export function assignRoles(room, max) {
  let n = 0;
  for (const p of room.players) {
    p.audience = !(p.connected && n < max);
    if (!p.audience) n++;
  }
}

export const playing = (room) => room.players.filter((p) => !p.audience);
export const watching = (room) => room.players.filter((p) => p.audience);
export const online = (list) => list.filter((p) => p.connected);

/* Подсчёт голосов: { voterId: targetId } → { targetId: n } */
export function tally(votes, ids) {
  const t = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const v of Object.values(votes)) if (v in t) t[v]++;
  return t;
}

/* Чистим ввод игрока */
export const clean = (s, max = 90) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* Для сравнения ответов в викторинах: регистр, ё, пунктуация, лишние пробелы */
export const norm = (s) => String(s ?? '')
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* Похожи ли строки — прощаем одну-две опечатки в длинных словах */
export function close(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return false;
  if (a === b) return true;
  const allow = Math.max(a.length, b.length) >= 7 ? 2 : Math.max(a.length, b.length) >= 4 ? 1 : 0;
  if (Math.abs(a.length - b.length) > allow) return false;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length] <= allow;
}
