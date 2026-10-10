/* Голос ведущих на сервере. Два движка:
   — Silero (нейросеть, звучит живо): если в .tts/ лежат окружение Python и модель — см. README;
   — macOS `say` (голос Milena) — запасной, работает из коробки.
   Поверх обоих ffmpeg делает характер: тон, эхо больничного коридора, «громкоговоритель» самолёта.
   Нет ни того, ни другого (Linux, хостинг) — возвращаем null, и экран читает текст сам. */

import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

export const TTS_DIR = path.join(os.tmpdir(), 'balagan-tts');
fs.mkdirSync(TTS_DIR, { recursive: true });

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOICE = process.env.BALAGAN_VOICE || 'Milena';

function has(bin) {
  try { execFileSync('/usr/bin/which', [bin], { stdio: 'ignore' }); return true; } catch { return false; }
}

/* Silero: python из .tts/venv и первая модель из .tts/models */
const SILERO_PY = path.join(ROOT, '.tts', 'venv', 'bin', 'python');
const SILERO_MODEL = (() => {
  try { return fs.readdirSync(path.join(ROOT, '.tts', 'models')).filter((f) => f.endsWith('.pt')).sort().reverse().map((f) => path.join(ROOT, '.tts', 'models', f))[0] || null; } catch { return null; }
})();
const wantSilero = process.env.BALAGAN_VOICE_ENGINE !== 'say' && fs.existsSync(SILERO_PY) && SILERO_MODEL;
const hasFfmpeg = has('ffmpeg');
const hasSay = process.platform === 'darwin' && has('say');

export const ttsEnabled = process.env.BALAGAN_TTS !== '0' && hasFfmpeg && Boolean(wantSilero || hasSay);
export const ttsEngine = () => (ttsEnabled ? (silero.ok !== false && wantSilero ? 'silero' : 'say') : null);

/* Голоса Silero для ведущих: aidar, eugene — мужские; baya, kseniya, xenia — женские.
   pitch < 1 — ниже, fx — фильтры ffmpeg поверх. Нейросетевой голос сам по себе живой, поэтому эффекты мягче */
const NEURAL = {
  menu:      { speaker: 'eugene',  pitch: 1.0,  fx: 'aecho=0.8:0.6:25:0.1' },
  shutka:    { speaker: 'baya',    pitch: 1.03, fx: 'aecho=0.8:0.6:20:0.08,treble=g=2' },
  sanatoriy: { speaker: 'aidar',   pitch: 0.84, fx: 'aecho=0.8:0.8:90|170:0.3|0.18,lowpass=f=6000' },
  sobes:     { speaker: 'kseniya', pitch: 1.0,  fx: 'flanger=delay=1:depth=1:speed=0.3,aecho=0.6:0.4:12:0.15' },
  lainer:    { speaker: 'eugene',  pitch: 0.94, fx: 'highpass=f=280,lowpass=f=3600,acompressor=threshold=-20dB:ratio=4,volume=1.5' },
  lainer2:   { speaker: 'xenia',   pitch: 1.04, fx: 'aecho=0.8:0.5:18:0.08' },
  baraban:   { speaker: 'aidar',   pitch: 0.86, fx: 'aecho=0.8:0.85:240|400:0.28|0.16,bass=g=4' },
  gora:      { speaker: 'xenia',   pitch: 0.93, fx: 'aecho=0.8:0.85:110|220:0.35|0.22' },
};

/* Характер ведущих для `say`. pitch < 1 — ниже, rate — слов в минуту, fx — фильтры ffmpeg */
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
    .replace(/[·•]/g, ', ')
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

/* ---------- текст для нейросети: она не читает цифры и латиницу, переводим в слова ---------- */
const U = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const UF = ['ноль', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEEN = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUND = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const form = (n, one, few, many) => { const a = n % 100, b = n % 10; if (a > 10 && a < 20) return many; if (b === 1) return one; if (b >= 2 && b <= 4) return few; return many; };

function triple(n, fem) {
  const out = [];
  if (n >= 100) out.push(HUND[Math.floor(n / 100)]);
  const r = n % 100;
  if (r >= 10 && r < 20) out.push(TEEN[r - 10]);
  else {
    if (r >= 20) out.push(TENS[Math.floor(r / 10)]);
    if (r % 10) out.push((fem ? UF : U)[r % 10]);
  }
  return out.join(' ');
}

export function numberWords(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'ноль';
  if (n >= 1e12) return String(n).split('').map((d) => U[d]).join(' ');
  const parts = [];
  const groups = [[1e9, 'миллиард', 'миллиарда', 'миллиардов', false], [1e6, 'миллион', 'миллиона', 'миллионов', false], [1e3, 'тысяча', 'тысячи', 'тысяч', true]];
  for (const [base, one, few, many, fem] of groups) {
    const k = Math.floor(n / base) % 1000;
    // «тысяча очков», а не «одна тысяча»
    if (k === 1 && !parts.length) parts.push(one);
    else if (k) parts.push(`${triple(k, fem)} ${form(k, one, few, many)}`);
  }
  if (n % 1000) parts.push(triple(n % 1000, false));
  return parts.join(' ');
}

/* порядковые: 1-й — первый, 1-е — первое, 1-я — первая */
const ORD = {
  1: ['первый', 'первое', 'первая'], 2: ['второй', 'второе', 'вторая'], 3: ['третий', 'третье', 'третья'], 4: ['четвёртый', 'четвёртое', 'четвёртая'],
  5: ['пятый', 'пятое', 'пятая'], 6: ['шестой', 'шестое', 'шестая'], 7: ['седьмой', 'седьмое', 'седьмая'], 8: ['восьмой', 'восьмое', 'восьмая'],
  9: ['девятый', 'девятое', 'девятая'], 10: ['десятый', 'десятое', 'десятая'],
};
const ordinal = (d, suf) => { const o = ORD[d]; if (!o) return numberWords(Number(d)); return /^(е|ое|ее)$/.test(suf) ? o[1] : /^(я|ая)$/.test(suf) ? o[2] : o[0]; };
/* «из трёх», «из пяти» */
const GEN = { 1: 'одного', 2: 'двух', 3: 'трёх', 4: 'четырёх', 5: 'пяти', 6: 'шести', 7: 'семи', 8: 'восьми', 9: 'девяти', 10: 'десяти', 12: 'двенадцати', 15: 'пятнадцати', 20: 'двадцати' };
const LATIN_WORDS = { onlyfans: 'онлифанс', iphone: 'айфон', tinder: 'тиндер', hr: 'эйч ар', kpi: 'кей пи ай', lol: 'лол', vip: 'вип', ok: 'окей', dj: 'диджей', tv: 'ти ви', it: 'ай ти', ai: 'эй ай', pure: 'пьюр', badoo: 'баду', bumble: 'бамбл', mamba: 'мамба', hinge: 'хинж', twinby: 'твинби' };
const LAT = [['sh', 'ш'], ['ch', 'ч'], ['th', 'т'], ['ph', 'ф'], ['oo', 'у'], ['ee', 'и'], ['ck', 'к'], ['ya', 'я'], ['yu', 'ю'], ['zh', 'ж'], ['kh', 'х'],
  ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'], ['i', 'и'], ['j', 'дж'], ['k', 'к'], ['l', 'л'], ['m', 'м'],
  ['n', 'н'], ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['w', 'в'], ['x', 'кс'], ['y', 'и'], ['z', 'з']];

function latin(word) {
  const w = word.toLowerCase();
  if (LATIN_WORDS[w]) return LATIN_WORDS[w];
  let out = '', i = 0;
  while (i < w.length) {
    const hit = LAT.find(([l]) => w.startsWith(l, i));
    if (hit) { out += hit[1]; i += hit[0].length; } else i++;
  }
  return out;
}

/* аббревиатуры читаем по буквам: БГ — бэ гэ, МФЦ — эм эф цэ */
const LETTER = { А: 'а', Б: 'бэ', В: 'вэ', Г: 'гэ', Д: 'дэ', Е: 'е', Ё: 'ё', Ж: 'жэ', З: 'зэ', И: 'и', Й: 'й', К: 'ка', Л: 'эл', М: 'эм', Н: 'эн', О: 'о', П: 'пэ', Р: 'эр', С: 'эс', Т: 'тэ', У: 'у', Ф: 'эф', Х: 'ха', Ц: 'цэ', Ч: 'чэ', Ш: 'ша', Щ: 'ща', Э: 'э', Ю: 'ю', Я: 'я' };
const ABBR = new Set(['ИИ', 'СССР', 'США', 'ЗОЖ', 'ЖКХ', 'ОАЭ', 'ЕГЭ']);
function abbr(word) {
  if (!(ABBR.has(word) || (word.length <= 5 && !/[АЕЁИОУЫЭЮЯ]/.test(word)))) return word;
  return [...word].map((c) => LETTER[c] || c).join(' ');
}

export function neuralText(text) {
  return speakable(text)
    .replace(/(?<![\p{L}])[А-ЯЁ]{2,5}(?![\p{L}])/gu, abbr)
    .replace(/(\p{L})-(\d)/gu, '$1 $2')
    .replace(/(\d+)-(ый|ий|ой|й|ое|ее|е|ая|я)(?=[\s,.!?…:;]|$)/gu, (m, d, suf) => ordinal(d, suf))
    .replace(/(^|[\s(])из (\d+)(?=[\s,.!?…:;]|$)/gu, (m, pre, d) => `${pre}из ${GEN[d] || numberWords(Number(d))}`)
    .replace(/(\d+)[,.](\d+)/g, (m, a, b) => `${numberWords(Number(a))} и ${numberWords(Number(b))}`)
    .replace(/\d+/g, (d) => ` ${numberWords(Number(d))} `)
    .replace(/[A-Za-z]+/g, (w) => latin(w))
    .replace(/\s+([,.!?…:;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- процесс Silero: запускаем один раз и держим ---------- */
const silero = { proc: null, ok: null, ready: null, jobs: new Map(), seq: 0 };

function startSilero() {
  if (silero.ready) return silero.ready;
  silero.ready = new Promise((resolve) => {
    const p = spawn(SILERO_PY, ['-I', path.join(ROOT, 'scripts', 'silero_tts.py'), SILERO_MODEL], { stdio: ['pipe', 'pipe', 'pipe'] });
    silero.proc = p;
    const fail = (why) => {
      if (silero.ok !== false) console.warn(`[tts] нейросетевой голос недоступен (${why}) — говорит Milena`);
      silero.ok = false;
      for (const j of silero.jobs.values()) j.reject(new Error('silero down'));
      silero.jobs.clear();
      resolve(false);
    };
    readline.createInterface({ input: p.stdout }).on('line', (line) => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.ready) { silero.ok = true; resolve(true); return; }
      const j = silero.jobs.get(m.id);
      if (!j) return;
      silero.jobs.delete(m.id);
      m.ok ? j.resolve() : j.reject(new Error(m.error || 'silero'));
    });
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-400); });
    p.on('error', (e) => fail(e.message));
    p.on('exit', (code) => fail(`процесс завершился с кодом ${code}: ${err.split('\n').filter(Boolean).pop() || ''}`));
    setTimeout(() => { if (silero.ok == null) fail('не загрузился за 60 секунд'); }, 60000);
  });
  return silero.ready;
}

function sileroWav(text, speaker, out) {
  return new Promise((resolve, reject) => {
    const id = String(++silero.seq);
    const t = setTimeout(() => { silero.jobs.delete(id); reject(new Error('silero: timeout')); }, 30000);
    silero.jobs.set(id, { resolve: () => { clearTimeout(t); resolve(); }, reject: (e) => { clearTimeout(t); reject(e); } });
    silero.proc.stdin.write(JSON.stringify({ id, text, speaker, out }) + '\n');
  });
}

/* прогреваем модель заранее, чтобы первая реплика не ждала */
if (ttsEnabled && wantSilero) startSilero();
process.on('exit', () => { try { silero.proc?.kill(); } catch {} });

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
  const neural = wantSilero && silero.ok !== false && (await startSilero());
  const clean = neural ? neuralText(text) : speakable(text);
  if (!clean) return null;
  const prof = neural ? NEURAL[who] || NEURAL.menu : PROFILES[who] || PROFILES.menu;
  const engine = neural ? `silero:${path.basename(SILERO_MODEL)}` : `say:${VOICE}`;
  const id = crypto.createHash('sha1').update(`${engine}|${who}|${JSON.stringify(prof)}|${clean}`).digest('hex').slice(0, 20);
  const file = path.join(TTS_DIR, `${id}.mp3`);
  const url = `/tts/${id}.mp3`;
  if (fs.existsSync(file)) return url;
  if (pending.has(id)) return pending.get(id);

  const job = (async () => {
    await slot();
    const raw = path.join(TTS_DIR, `${id}.${neural ? 'wav' : 'aiff'}`);
    try {
      let rate = 22050;
      if (neural) { await sileroWav(clean, prof.speaker, raw); rate = 48000; }
      else await run('say', ['-v', VOICE, '-r', String(prof.rate), '-o', raw, '--', clean]);
      const p = prof.pitch;
      const chain = [p !== 1 && `asetrate=${rate}*${p}`, p !== 1 && `aresample=${rate}`, p !== 1 && `atempo=${(1 / p).toFixed(4)}`, prof.fx].filter(Boolean).join(',');
      await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, ...(chain ? ['-af', chain] : []), '-ac', '1', '-b:a', '80k', file]);
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
