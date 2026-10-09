/* Голос ведущего. Основной путь — готовый mp3 с сервера: играет через Web Audio,
   приглушает музыку и отдаёт громкость для анимации губ. Запасной — синтез речи браузера. */

import { audio, bus, duck, running } from './audio.js';
import { speakable } from './speak.js';

let enabled = true;
const queue = [];
let busy = false;
let analyser = null;
let buf = null;
let current = null;
let bvoices = [];

function load() { try { bvoices = speechSynthesis.getVoices().filter((v) => /^ru/i.test(v.lang)); } catch { bvoices = []; } }
if ('speechSynthesis' in window) { load(); speechSynthesis.onvoiceschanged = load; }

function ensureAnalyser() {
  const a = audio();
  if (!a || analyser) return;
  analyser = a.createAnalyser();
  analyser.fftSize = 512;
  buf = new Uint8Array(analyser.fftSize);
  analyser.connect(bus.voice);
}

async function next() {
  if (busy) return;
  const item = queue.shift();
  if (!item) return;
  busy = true;
  item.onStart?.();
  try {
    if (!enabled) await new Promise((r) => setTimeout(r, 1200 + item.text.length * 45));
    else if (item.audio && running()) await playFile(item);
    else await speakBrowser(item);
  } catch { /* проиграть не вышло — просто идём дальше */ }
  item.onEnd?.();
  busy = false;
  next();
}

function playFile(item) {
  return new Promise((resolve) => {
    ensureAnalyser();
    const el = new Audio(item.audio);
    el.crossOrigin = 'anonymous';
    const src = audio().createMediaElementSource(el);
    src.connect(analyser);
    current = el;
    duck(true);
    const done = () => { duck(false); current = null; try { src.disconnect(); } catch {} resolve(); };
    el.onended = done;
    el.onerror = done;
    el.play().catch(done);
  });
}

function speakBrowser(item) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !bvoices.length) return setTimeout(resolve, 1000 + item.text.length * 45);
    const u = new SpeechSynthesisUtterance(speakable(item.text));
    const v = bvoices[0];
    u.voice = v; u.lang = v.lang; u.rate = item.rate || 1; u.pitch = item.pitch || 1;
    duck(true);
    u.onend = u.onerror = () => { duck(false); resolve(); };
    speechSynthesis.speak(u);
  });
}

export const voice = {
  get enabled() { return enabled; },
  set enabled(v) { enabled = v; if (!v) this.stop(); },
  get speaking() { return busy; },

  /* { text, audio, rate, pitch, onStart, onEnd } */
  say(item) { queue.push(item); next(); },

  /* громкость речи 0..1 — для губ ведущего */
  level() {
    if (!analyser || !current) return 0;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const x of buf) { const d = (x - 128) / 128; sum += d * d; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 4);
  },

  stop() {
    queue.length = 0;
    try { current?.pause(); } catch {}
    try { speechSynthesis.cancel(); } catch {}
    duck(false);
  },
};
