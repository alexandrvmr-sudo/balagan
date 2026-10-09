/* Звуковые эффекты — синтез, без файлов */

import { audio, bus, noise, mtof, running } from './audio.js';

function tone(f, dur, { type = 'triangle', gain = 0.2, at = 0, slide = 0, attack = 0.01 } = {}) {
  const a = audio(); if (!running()) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus.sfx); o.start(t); o.stop(t + dur + 0.05);
}

function hiss(dur, { at = 0, gain = 0.2, type = 'bandpass', from = 800, to = 4000, q = 1 } = {}) {
  const a = audio(); if (!running()) return;
  const t = a.currentTime + at;
  const n = noise(); const f = a.createBiquadFilter(); const g = a.createGain();
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(bus.sfx); n.start(t); n.stop(t + dur + 0.05);
}

const chord = (notes, dur, opts = {}) => notes.forEach((m, i) => tone(mtof(m), dur, { ...opts, at: (opts.at || 0) + i * (opts.roll || 0) }));

const FX = {
  join: () => { tone(660, 0.12, { type: 'sine', gain: 0.14 }); tone(990, 0.16, { type: 'sine', gain: 0.12, at: 0.08 }); },
  pick: () => { hiss(0.35, { from: 400, to: 5000, gain: 0.12 }); chord([60, 64, 67, 72], 0.5, { roll: 0.05, at: 0.2, gain: 0.12 }); },
  menu: () => hiss(0.3, { from: 5000, to: 400, gain: 0.1 }),
  whoosh: () => hiss(0.32, { from: 300, to: 3500, gain: 0.14 }),
  tick: () => tone(1500, 0.04, { type: 'square', gain: 0.06 }),
  tock: () => tone(1000, 0.05, { type: 'square', gain: 0.05 }),
  vote: () => tone(520, 0.08, { type: 'square', gain: 0.07, slide: 1.5 }),
  pop: () => tone(300, 0.1, { type: 'sine', gain: 0.18, slide: 3 }),
  open: () => { tone(300, 0.14); tone(450, 0.18, { at: 0.09, gain: 0.15 }); },
  round: () => chord([67, 72, 76, 79], 0.3, { roll: 0.09, gain: 0.15 }),
  reveal: () => { chord([62, 66, 69], 0.4, { gain: 0.1, type: 'sawtooth' }); tone(1175, 0.3, { type: 'sine', gain: 0.1, at: 0.05 }); },
  shutout: () => chord([60, 64, 67, 72, 76, 79], 0.5, { roll: 0.06, type: 'sawtooth', gain: 0.09 }),
  scores: () => { tone(880, 0.15, { type: 'sine', gain: 0.14 }); tone(1320, 0.2, { type: 'sine', gain: 0.12, at: 0.12 }); },
  win: () => { chord([60, 64, 67, 72], 0.25, { roll: 0.12, type: 'square', gain: 0.07 }); chord([72, 76, 79, 84], 0.9, { at: 0.55, type: 'sawtooth', gain: 0.08 }); },
  right: () => { tone(988, 0.12, { type: 'sine', gain: 0.18 }); tone(1319, 0.3, { type: 'sine', gain: 0.16, at: 0.1 }); },
  wrong: () => { tone(150, 0.45, { type: 'sawtooth', gain: 0.12 }); tone(156, 0.45, { type: 'square', gain: 0.06 }); },
  sad: () => [67, 66, 65, 64].forEach((m, i) => tone(mtof(m - 12), i === 3 ? 0.8 : 0.32, { type: 'sawtooth', gain: 0.09, at: i * 0.32, slide: i === 3 ? 0.94 : 1 })),
  rimshot: () => {
    const a = audio(); if (!running()) return;
    tone(220, 0.12, { type: 'sine', gain: 0.3, slide: 0.5 });
    tone(160, 0.14, { type: 'sine', gain: 0.3, at: 0.16, slide: 0.5 });
    hiss(0.5, { at: 0.34, type: 'highpass', from: 6000, to: 9000, gain: 0.16 });
  },
  applause: () => {
    for (let i = 0; i < 40; i++) hiss(0.06, { at: Math.random() * 1.6, from: 1200 + Math.random() * 800, to: 2400, gain: 0.05 + Math.random() * 0.05, q: 0.8 });
  },
  death: () => { tone(110, 1.1, { type: 'sawtooth', gain: 0.16, slide: 0.4 }); hiss(0.9, { from: 2000, to: 120, gain: 0.12, type: 'lowpass' }); },
  ghost: () => { tone(520, 1.2, { type: 'sine', gain: 0.08, slide: 1.5, attack: 0.3 }); tone(530, 1.2, { type: 'sine', gain: 0.08, slide: 0.7, attack: 0.3 }); },
  creak: () => { tone(140, 0.6, { type: 'sawtooth', gain: 0.05, slide: 1.8, attack: 0.1 }); },
  spin: () => { for (let i = 0; i < 24; i++) tone(1800, 0.02, { type: 'square', gain: 0.05, at: i * (0.04 + i * 0.006) }); },
  clack: () => tone(1700, 0.025, { type: 'square', gain: 0.06 }),
  coin: () => { tone(988, 0.08, { type: 'square', gain: 0.07 }); tone(1319, 0.25, { type: 'square', gain: 0.07, at: 0.07 }); },
  splash: () => { hiss(0.6, { from: 3000, to: 300, gain: 0.18, type: 'lowpass' }); hiss(0.3, { at: 0.05, from: 5000, to: 2000, gain: 0.08 }); },
  horn: () => { tone(98, 1.4, { type: 'sawtooth', gain: 0.12, attack: 0.15 }); tone(147, 1.4, { type: 'sawtooth', gain: 0.08, attack: 0.15 }); },
  torch: () => hiss(0.5, { from: 300, to: 1200, gain: 0.14, type: 'bandpass' }),
  monster: () => { tone(70, 0.9, { type: 'sawtooth', gain: 0.18, slide: 0.7, attack: 0.05 }); hiss(0.8, { from: 300, to: 150, gain: 0.2, type: 'lowpass' }); },
  drumroll: () => { for (let i = 0; i < 28; i++) hiss(0.05, { at: i * 0.05, type: 'highpass', from: 1500, to: 1600, gain: 0.04 + i * 0.004 }); },
  slam: () => { tone(80, 0.4, { type: 'sine', gain: 0.4, slide: 0.5 }); hiss(0.2, { from: 800, to: 200, gain: 0.15, type: 'lowpass' }); },
  type: () => tone(2400 + Math.random() * 600, 0.015, { type: 'square', gain: 0.03 }),
  bell: () => { tone(1568, 1, { type: 'sine', gain: 0.12 }); tone(1568 * 2.7, 0.5, { type: 'sine', gain: 0.04 }); },
};

export function sfx(name) { try { FX[name]?.(); } catch {} }
export const SFX_NAMES = Object.keys(FX);
