/* Голос ведущих на сервере: macOS `say` + ffmpeg. Из одного системного голоса
   делаем разных ведущих — понижаем тон, добавляем эхо, «громкоговоритель», металл.
   Нет `say` (Linux, хостинг) — возвращаем null, и экран читает текст сам. */

import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const TTS_DIR = path.join(os.tmpdir(), 'balagan-tts');
fs.mkdirSync(TTS_DIR, { recursive: true });

const VOICE = process.env.BALAGAN_VOICE || 'Milena';

function has(bin) {
  try { execFileSync('/usr/bin/which', [bin], { stdio: 'ignore' }); return true; } catch { return false; }
}
export const ttsEnabled = process.env.BALAGAN_TTS !== '0' && process.platform === 'darwin' && has('say') && has('ffmpeg');

/* Характер ведущих. pitch < 1 — ниже, rate — слов в минуту, fx — фильтры ffmpeg */
const PROFILES = {
  menu:      { rate: 185, pitch: 1.0,  fx: 'aecho=0.8:0.6:25:0.12' },
  shutka:    { rate: 200, pitch: 1.07, fx: 'aecho=0.8:0.6:20:0.12,treble=g=3' },
  sanatoriy: { rate: 150, pitch: 0.7,  fx: 'aecho=0.8:0.85:90|170:0.35|0.22,lowpass=f=5200' },
  sobes:     { rate: 190, pitch: 1.05, fx: 'flanger=delay=1.5:depth=1.5:speed=0.4,aecho=0.6:0.45:12:0.25' },
  lainer:    { rate: 178, pitch: 0.82, fx: 'highpass=f=300,lowpass=f=3400,acompressor=threshold=-20dB:ratio=4,volume=1.6' },
  lainer2:   { rate: 195, pitch: 1.08, fx: 'aecho=0.8:0.5:18:0.1' },
  baraban:   { rate: 165, pitch: 0.72, fx: 'aecho=0.8:0.9:260|430:0.32|0.2,bass=g=4' },
  gora:      { rate: 158, pitch: 0.9,  fx: 'aecho=0.8:0.88:110|220:0.4|0.25' },
};

/* Текст, который синтезатор не испортит: без кавычек, слешей, эмодзи и прочих знаков,
   которые он иначе зачитывает вслух */
export function speakable(text) {
  return String(text ?? '')
    .replace(/_{2,}/g, '… ')
    .replace(/\p{Extended_Pictographic}|️/gu, ' ')
    .replace(/[«»"„“”'`]/g, '')
    .replace(/\s[—–-]\s/g, ', ')
    .replace(/[—–]/g, ', ')
    .replace(/×/g, ' на ')
    .replace(/(\d)\s?°/g, '$1 градусов')
    .replace(/№\s*/g, 'номер ')
    .replace(/(\d)\s?%/g, '$1 процентов')
    .replace(/(\d)\s?₽/g, '$1 рублей')
    .replace(/\+/g, ' плюс ')
    .replace(/−/g, ' минус ')
    .replace(/=/g, ' равно ')
    .replace(/&/g, ' и ')
    .replace(/(\d)[    ](?=\d{3}\b)/g, '$1')
    .replace(/[\/\\|_*#@~^<>\[\]{}]/g, ' ')
    .replace(/\s+([,.!?…:;])/g, '$1')
    .replace(/([,.!?…:;])(?=[^\s\d.])/g, '$1 ')
    .replace(/,\s*,+/g, ',')
    .replace(/^[\s,.]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* очередь: не больше двух синтезов одновременно */
let running = 0;
const waiting = [];
const slot = () => new Promise((r) => { if (running < 2) { running++; r(); } else waiting.push(r); });
const free = () => { const n = waiting.shift(); if (n) n(); else running--; };

function run(cmd, args, ms = 15000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`${cmd}: timeout`)); }, ms);
    p.on('close', (code) => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(`${cmd} ${code}: ${err.slice(0, 200)}`)); });
  });
}

const pending = new Map();

/* Возвращает адрес mp3 или null. Одинаковые фразы берутся из кэша. */
export async function synth(text, who = 'menu') {
  if (!ttsEnabled) return null;
  const clean = speakable(text);
  if (!clean) return null;
  const prof = PROFILES[who] || PROFILES.menu;
  const id = crypto.createHash('sha1').update(`${VOICE}|${who}|${JSON.stringify(prof)}|${clean}`).digest('hex').slice(0, 20);
  const file = path.join(TTS_DIR, `${id}.mp3`);
  const url = `/tts/${id}.mp3`;
  if (fs.existsSync(file)) return url;
  if (pending.has(id)) return pending.get(id);

  const job = (async () => {
    await slot();
    const raw = path.join(TTS_DIR, `${id}.aiff`);
    try {
      await run('say', ['-v', VOICE, '-r', String(prof.rate), '-o', raw, '--', clean]);
      const p = prof.pitch;
      const chain = [`asetrate=22050*${p}`, 'aresample=22050', `atempo=${(1 / p).toFixed(4)}`, prof.fx].filter(Boolean).join(',');
      await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-af', chain, '-ac', '1', '-b:a', '64k', file]);
      return url;
    } catch (e) {
      console.warn('[tts]', String(e.message || e).slice(0, 200));
      return null;
    } finally {
      fs.rm(raw, { force: true }, () => {});
      free();
      pending.delete(id);
    }
  })();
  pending.set(id, job);
  return job;
}
