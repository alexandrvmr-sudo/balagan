/* Свои звуки вместо синтеза. Положите файл в public/assets/sfx/<имя>.mp3 (или .ogg, .wav) —
   и эффект с этим именем зазвучит файлом. Музыка игры: public/assets/music/<игра>.mp3,
   для отдельного настроения — <игра>-<настроение>.mp3 (think, tense, reveal, win, lobby, calm).
   Фон экрана: public/assets/bg/<игра>.webp (или .png, .jpg) — ляжет поверх нарисованного кодом.
   Список файлов сервер отдаёт по адресу /assets/manifest.json. */

import { audio, bus } from './audio.js';

let manifest = { sfx: {}, music: {}, bg: {} };
const ready = fetch('/assets/manifest.json').then((r) => r.json()).then((m) => { manifest = m; }).catch(() => {});
const buffers = {};

export const assetsReady = () => ready;
export const sfxFile = (name) => manifest.sfx?.[name] || null;
export const musicFile = (style, mood) => manifest.music?.[`${style}-${mood}`] || manifest.music?.[style] || null;
export const bgFile = (game) => manifest.bg?.[game] || null;

export function buffer(url) {
  if (!buffers[url]) {
    buffers[url] = fetch(url).then((r) => r.arrayBuffer()).then((b) => audio().decodeAudioData(b)).catch(() => null);
  }
  return buffers[url];
}

/* короткий звук из файла — в общую шину эффектов */
export async function playFile(url) {
  const a = audio(); if (!a) return;
  const buf = await buffer(url);
  if (!buf) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.connect(bus.sfx);
  src.start();
}
