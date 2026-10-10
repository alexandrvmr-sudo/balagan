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

/* голос толпы: пила через полосовой фильтр, тянется и плывёт */
function crowd(n, dur, { at = 0, from = 180, to = 320, slide = 0.85, gain = 0.02, band = 700, attack = 0.2 } = {}) {
  const a = audio(); if (!running()) return;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 1.6;
  const g = a.createGain(); g.gain.value = 1;
  f.connect(g).connect(bus.sfx);
  for (let i = 0; i < n; i++) {
    const t = a.currentTime + at + Math.random() * 0.15;
    const o = a.createOscillator(); const e = a.createGain();
    o.type = 'sawtooth';
    const f0 = from + Math.random() * (to - from);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * slide, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(gain, t + attack); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(f); o.start(t); o.stop(t + dur + 0.05);
  }
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
  ecg: () => tone(1046, 0.08, { type: 'sine', gain: 0.1 }),
  flatline: () => { tone(1046, 2.4, { type: 'sine', gain: 0.12, attack: 0.02 }); },
  heartbeat: () => { [0, 0.22, 0.9, 1.12, 1.8, 2.02].forEach((t, i) => tone(i % 2 ? 48 : 58, 0.18, { type: 'sine', gain: 0.5, at: t, slide: 0.6 })); },
  tray: () => { [1890, 2770, 3510, 4820].forEach((f, i) => tone(f, 1.4 - i * 0.2, { type: 'sine', gain: 0.05, attack: 0.001 })); hiss(0.08, { from: 3000, to: 6000, gain: 0.1 }); },
  gurney: () => { for (let i = 0; i < 6; i++) tone(1300 + Math.random() * 400, 0.12, { type: 'sawtooth', gain: 0.015, at: i * 0.22, slide: 1.2 }); },
  whisper: () => { for (let i = 0; i < 8; i++) hiss(0.18, { at: i * 0.14, from: 2000 + Math.random() * 2000, to: 3000 + Math.random() * 3000, gain: 0.03, q: 3 }); },
  stamp: () => { tone(90, 0.25, { type: 'sine', gain: 0.5, slide: 0.5 }); hiss(0.12, { from: 1200, to: 300, gain: 0.18, type: 'lowpass' }); },
  ding: () => { tone(1320, 1.2, { type: 'sine', gain: 0.12 }); tone(990, 1.4, { type: 'sine', gain: 0.12, at: 0.35 }); },
  rumble: () => { hiss(2.2, { from: 160, to: 60, gain: 0.2, type: 'lowpass' }); tone(42, 2, { type: 'sine', gain: 0.15, attack: 0.4 }); },
  cash: () => { tone(2093, 0.08, { type: 'square', gain: 0.05 }); tone(2637, 0.3, { type: 'square', gain: 0.05, at: 0.08 }); hiss(0.25, { at: 0.05, from: 6000, to: 9000, type: 'highpass', gain: 0.06 }); },
  laugh: () => {
    // смех зала: много коротких «ха» с разной высотой
    for (let i = 0; i < 26; i++) {
      const at = Math.random() * 1.6, f = 160 + Math.random() * 220;
      for (let k = 0; k < 3; k++) tone(f * (1 + k * 0.02), 0.09, { type: 'sawtooth', gain: 0.012, at: at + k * 0.13, slide: 0.85 });
    }
    for (let i = 0; i < 20; i++) hiss(0.08, { at: Math.random() * 1.6, from: 900, to: 1500, gain: 0.025, q: 2 });
  },
  boo: () => { for (let i = 0; i < 10; i++) tone(110 + Math.random() * 40, 1.2, { type: 'sawtooth', gain: 0.02, at: Math.random() * 0.3, attack: 0.2, slide: 0.85 }); },
  whoosh2: () => hiss(0.45, { from: 200, to: 6000, gain: 0.18, q: 0.6 }),
  drip: () => { tone(1400, 0.12, { type: 'sine', gain: 0.12, slide: 0.45 }); tone(900, 0.1, { type: 'sine', gain: 0.06, at: 0.09, slide: 0.6 }); },
  /* телешоу */
  sting: () => {
    chord([55, 62, 67, 71, 74], 0.7, { type: 'sawtooth', gain: 0.06, attack: 0.005 });
    tone(55, 0.4, { type: 'sine', gain: 0.4, slide: 0.5 });
    hiss(1.4, { type: 'highpass', from: 5000, to: 8000, gain: 0.12, at: 0.02 });
  },
  cymbal: () => hiss(1.6, { type: 'highpass', from: 6000, to: 9000, gain: 0.14 }),
  boing: () => { tone(160, 0.35, { type: 'sine', gain: 0.25, slide: 3.2 }); tone(500, 0.35, { type: 'sine', gain: 0.12, at: 0.18, slide: 0.35 }); },
  airhorn: () => { for (let k = 0; k < 3; k++) { const at = k * 0.28; [440, 554, 659].forEach((f) => tone(f, k === 2 ? 0.6 : 0.2, { type: 'sawtooth', gain: 0.045, at, attack: 0.01 })); } },
  ooh: () => crowd(16, 1.4, { from: 200, to: 340, slide: 0.8, gain: 0.03, band: 650, attack: 0.25 }),
  aww: () => crowd(16, 1.3, { from: 260, to: 360, slide: 0.65, gain: 0.03, band: 900, attack: 0.15 }),
  cheer: () => {
    crowd(18, 1.6, { from: 300, to: 520, slide: 1.5, gain: 0.025, band: 1200, attack: 0.1 });
    for (let i = 0; i < 50; i++) hiss(0.06, { at: Math.random() * 1.8, from: 1200 + Math.random() * 800, to: 2400, gain: 0.04 + Math.random() * 0.05, q: 0.8 });
  },
  scribble: () => { for (let i = 0; i < 5; i++) hiss(0.07, { at: i * 0.08, from: 2500 + Math.random() * 2000, to: 4000, gain: 0.05, q: 4 }); },
  swish: () => hiss(0.22, { from: 900, to: 7000, gain: 0.16, q: 1.4 }),
  tada: () => { chord([60, 64, 67], 0.15, { type: 'square', gain: 0.06 }); chord([72, 76, 79, 84], 0.9, { at: 0.16, type: 'sawtooth', gain: 0.07, roll: 0.02 }); },
  peg: () => { tone(2300, 0.016, { type: 'square', gain: 0.045 }); tone(760, 0.03, { type: 'triangle', gain: 0.07, slide: 0.7 }); },
  thud: () => { tone(70, 0.3, { type: 'sine', gain: 0.45, slide: 0.6 }); hiss(0.1, { from: 600, to: 200, gain: 0.12, type: 'lowpass' }); },
  buzz: () => { tone(120, 0.5, { type: 'sawtooth', gain: 0.05 }); tone(240, 0.5, { type: 'square', gain: 0.02 }); },
};

export function sfx(name) { try { FX[name]?.(); } catch {} }
export const SFX_NAMES = Object.keys(FX);
