/* Голос ведущего: синтез речи браузера. На macOS есть русские голоса (Milena, Yuri),
   в Chrome — ещё «Google русский». Нет русского голоса — молчим, игра от этого не ломается. */

import { duck } from './audio.js';

let voices = [];
let enabled = true;
let speaking = 0;

function load() {
  try { voices = speechSynthesis.getVoices().filter((v) => /^ru/i.test(v.lang)); } catch { voices = []; }
}
if ('speechSynthesis' in window) {
  load();
  speechSynthesis.onvoiceschanged = load;
}

const MALE = /yuri|юрий|pavel|dmitr|maxim|алексей|artem|male/i;

function choose(pref = [], gender) {
  for (const p of pref) {
    const v = voices.find((x) => x.name.toLowerCase().includes(p.toLowerCase()));
    if (v) return v;
  }
  if (gender === 'm') return voices.find((v) => MALE.test(v.name)) || voices[0];
  if (gender === 'f') return voices.find((v) => !MALE.test(v.name)) || voices[0];
  return voices[0];
}

/* Делим на фразы: длинные реплики Chrome иногда обрывает */
const chunks = (text) => String(text).replace(/___/g, 'пропуск').split(/(?<=[.!?…])\s+/).filter(Boolean);

export const voice = {
  get available() { return voices.length > 0; },
  get enabled() { return enabled; },
  set enabled(v) { enabled = v; if (!v) this.stop(); },

  say(text, { pref = [], gender, rate = 1, pitch = 1, interrupt = false } = {}) {
    if (!enabled || !text || !('speechSynthesis' in window)) return;
    if (!voices.length) load();
    const v = choose(pref, gender);
    if (!v) return;
    if (interrupt) this.stop();
    for (const part of chunks(text)) {
      const u = new SpeechSynthesisUtterance(part);
      u.voice = v; u.lang = v.lang; u.rate = rate; u.pitch = pitch;
      u.onstart = () => { if (speaking++ === 0) duck(true); };
      u.onend = u.onerror = () => { speaking = Math.max(0, speaking - 1); if (speaking === 0) duck(false); };
      speechSynthesis.speak(u);
    }
  },

  stop() {
    try { speechSynthesis.cancel(); } catch {}
    speaking = 0; duck(false);
  },
};
