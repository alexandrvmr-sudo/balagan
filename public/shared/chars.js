/* Загрузка персонажей текущей игры и отрисовка аватара игрока */

import { esc, avatar as dot } from './core.js';
import { BLOBS } from './chars-blob.js';

const cache = {};
let current = BLOBS;

export async function useChars(gameId) {
  if (!gameId) { current = BLOBS; return current; }
  if (!(gameId in cache)) {
    try { cache[gameId] = (await import(`/games/${gameId}/chars.js`)).CHARS || BLOBS; }
    catch { cache[gameId] = BLOBS; }
  }
  current = cache[gameId];
  return current;
}

export const chars = () => current;

/* аватар: персонаж игры, если выбран, иначе цветной кружок с эмодзи */
export function avatar(p, cls = '', opts = {}) {
  const c = p?.char && current[p.char];
  if (!c) return dot(p, cls);
  return `<span class="cav ${cls}" style="--pc:${c.color}" title="${esc(c.name)}">${c.draw(opts)}</span>`;
}

export function charSvg(id, opts = {}) {
  const c = current[id];
  return c ? c.draw(opts) : '';
}
