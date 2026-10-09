/* Процедурная музыка: секвенсор с синтезом, у каждой игры свой стиль, у каждой фазы — своё настроение.
   Настроения: lobby (всё), calm (без барабанов), think (тихо, тикает), tense (быстрее, нервно),
   reveal (только подклад), win (громко), silence. */

import { audio, bus, noise, mtof, running } from './audio.js';

/* ---------- инструменты ---------- */
function env(g, t, a, peak, d, sus, r, dur) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
  g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + Math.max(a + d, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
  return t + Math.max(a + d, dur) + r;
}

function osc(type, f, t, end, dest, detune = 0) {
  const a = audio();
  const o = a.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end + 0.05);
  return o;
}

function filt(type, f, q = 0.7) {
  const a = audio();
  const b = a.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  return b;
}

const INST = {
  bass(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 520);
    g.connect(lp).connect(out);
    const end = env(g, t, 0.005, 0.5 * v, 0.12, 0.6, 0.08, dur);
    osc('triangle', mtof(m), t, end, g); osc('sine', mtof(m - 12), t, end, g);
  },
  synthbass(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 300, 6);
    lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    g.connect(lp).connect(out);
    const end = env(g, t, 0.004, 0.42 * v, 0.1, 0.5, 0.06, dur);
    osc('sawtooth', mtof(m), t, end, g); osc('square', mtof(m - 12), t, end, g, 4);
  },
  pad(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 1300);
    g.connect(lp).connect(out);
    const end = env(g, t, 0.35, 0.09 * v, 0.3, 0.85, 0.6, dur);
    osc('sawtooth', mtof(m), t, end, g, -9); osc('sawtooth', mtof(m), t, end, g, 9);
  },
  organ(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const end = env(g, t, 0.03, 0.06 * v, 0.1, 0.9, 0.25, dur);
    [1, 2, 3, 4].forEach((h, i) => { const gg = a.createGain(); gg.gain.value = [1, 0.5, 0.3, 0.18][i]; gg.connect(g); osc('sine', mtof(m) * h, t, end, gg, (Math.random() - 0.5) * 8); });
  },
  pluck(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 3200);
    g.connect(lp).connect(out);
    const end = env(g, t, 0.002, 0.22 * v, 0.35, 0.001, 0.05, 0.02);
    osc('triangle', mtof(m), t, end, g); osc('sawtooth', mtof(m + 12), t, end, g, 3).frequency.exponentialRampToValueAtTime(mtof(m + 12) * 0.995, t + 0.3);
  },
  bell(t, m, dur, v, out, detune = 0) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const end = env(g, t, 0.002, 0.16 * v, 0.6, 0.001, 0.1, 0.02);
    osc('sine', mtof(m), t, end, g, detune);
    const g2 = a.createGain(); g2.gain.value = 0.35; g2.connect(g); osc('sine', mtof(m) * 3.5, t, t + 0.25, g2, detune);
  },
  brass(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 500, 2);
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.06); lp.frequency.exponentialRampToValueAtTime(1100, t + 0.3);
    g.connect(lp).connect(out);
    const end = env(g, t, 0.02, 0.13 * v, 0.15, 0.7, 0.12, dur);
    osc('sawtooth', mtof(m), t, end, g, -5); osc('sawtooth', mtof(m), t, end, g, 6);
  },
  accordion(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 2400);
    const trem = a.createGain(); trem.gain.value = 0.8;
    const lfo = a.createOscillator(); const lg = a.createGain(); lfo.frequency.value = 6.5; lg.gain.value = 0.2; lfo.connect(lg).connect(trem.gain);
    g.connect(trem).connect(lp).connect(out);
    const end = env(g, t, 0.03, 0.07 * v, 0.1, 0.85, 0.08, dur);
    lfo.start(t); lfo.stop(end);
    osc('square', mtof(m), t, end, g, -7); osc('sawtooth', mtof(m), t, end, g, 7); osc('square', mtof(m + 12), t, end, g, 2);
  },
  vibes(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const trem = a.createGain(); const lfo = a.createOscillator(); const lg = a.createGain();
    lfo.frequency.value = 5; lg.gain.value = 0.25; lfo.connect(lg).connect(trem.gain); trem.connect(g);
    const end = env(g, t, 0.004, 0.17 * v, 0.9, 0.001, 0.2, 0.02);
    lfo.start(t); lfo.stop(end);
    osc('sine', mtof(m), t, end, trem); const g2 = a.createGain(); g2.gain.value = 0.15; g2.connect(trem); osc('sine', mtof(m) * 4, t, t + 0.2, g2);
  },
  clav(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const hp = filt('bandpass', 1400, 1.4);
    g.connect(hp).connect(out);
    const end = env(g, t, 0.002, 0.1 * v, 0.08, 0.001, 0.02, 0.01);
    osc('square', mtof(m), t, end, g); osc('square', mtof(m + 7), t, end, g, 4);
  },
  flute(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 2500); g.connect(lp).connect(out);
    const end = env(g, t, 0.06, 0.12 * v, 0.1, 0.8, 0.12, dur);
    const o = osc('sine', mtof(m), t, end, g);
    const lfo = a.createOscillator(); const lg = a.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 5; lfo.connect(lg).connect(o.detune); lfo.start(t + 0.12); lfo.stop(end);
    const n = noise(); const ng = a.createGain(); const bp = filt('bandpass', mtof(m) * 2, 3); ng.gain.value = 0.015 * v; n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(end);
  },
  lead(t, m, dur, v, out) {
    const a = audio(); const g = a.createGain(); const lp = filt('lowpass', 3000, 1); g.connect(lp).connect(out);
    const end = env(g, t, 0.01, 0.09 * v, 0.12, 0.6, 0.1, dur);
    osc('square', mtof(m), t, end, g, -4); osc('sawtooth', mtof(m), t, end, g, 5);
  },
};

/* ---------- ударные ---------- */
const DRUM = {
  kick(t, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g); o.start(t); o.stop(t + 0.35);
  },
  snare(t, v, out) {
    const a = audio(); const n = noise(); const g = a.createGain(); const bp = filt('highpass', 1500);
    n.connect(bp).connect(g).connect(out);
    g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.start(t); n.stop(t + 0.18);
    const og = a.createGain(); og.connect(out); og.gain.setValueAtTime(0.25 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc('triangle', 190, t, t + 0.09, og);
  },
  clap(t, v, out) {
    const a = audio(); [0, 0.012, 0.024].forEach((d) => {
      const n = noise(); const g = a.createGain(); const bp = filt('bandpass', 1200, 1.2);
      n.connect(bp).connect(g).connect(out);
      g.gain.setValueAtTime(0.3 * v, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.1);
      n.start(t + d); n.stop(t + d + 0.12);
    });
  },
  hat(t, v, out) {
    const a = audio(); const n = noise(); const g = a.createGain(); const hp = filt('highpass', 7500);
    n.connect(hp).connect(g).connect(out);
    g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    n.start(t); n.stop(t + 0.06);
  },
  open(t, v, out) {
    const a = audio(); const n = noise(); const g = a.createGain(); const hp = filt('highpass', 6500);
    n.connect(hp).connect(g).connect(out);
    g.gain.setValueAtTime(0.1 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    n.start(t); n.stop(t + 0.27);
  },
  shaker(t, v, out) {
    const a = audio(); const n = noise(); const g = a.createGain(); const bp = filt('bandpass', 5500, 2);
    n.connect(bp).connect(g).connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.start(t); n.stop(t + 0.09);
  },
  rim(t, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    g.gain.setValueAtTime(0.18 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc('square', 1700, t, t + 0.05, g);
  },
  tick(t, v, out) {
    const a = audio(); const g = a.createGain(); const bp = filt('bandpass', 2600, 8); g.connect(bp).connect(out);
    g.gain.setValueAtTime(0.4 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc('square', 1200, t, t + 0.04, g);
  },
  frame(t, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); o.start(t); o.stop(t + 0.4);
    const n = noise(); const ng = a.createGain(); const lp = filt('lowpass', 900); n.connect(lp).connect(ng).connect(out);
    ng.gain.setValueAtTime(0.12 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12); n.start(t); n.stop(t + 0.14);
  },
  beat(t, v, out) { DRUM.kick(t, 0.55 * v, out); DRUM.kick(t + 0.16, 0.4 * v, out); },
  tom(t, v, out) {
    const a = audio(); const g = a.createGain(); g.connect(out);
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.2);
    g.gain.setValueAtTime(0.4 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); o.start(t); o.stop(t + 0.32);
  },
};

/* ---------- гармония ---------- */
const QUAL = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], dim: [0, 3, 6], m6: [0, 3, 7, 9], 6: [0, 4, 7, 9], sus: [0, 5, 7] };
const chordNotes = (key, c) => QUAL[c[1]].map((x) => key + c[0] + x);

/* ---------- стили ---------- */
const S = {
  menu: {
    bpm: 118, bar: 16, key: 48, scale: [0, 2, 4, 5, 7, 9, 11], swing: 0.06,
    prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, '7']],
    drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'x.xxx.xxx.xxx.xx' },
    bass: { inst: 'synthbass', pat: 'R..R..O...R.F..O' },
    chords: { inst: 'clav', pat: '..x...x...x...x.', oct: 12 },
    pad: { inst: 'pad', oct: 0 },
    lead: { inst: 'lead', oct: 24, density: 0.5 },
  },
  shutka: {
    bpm: 112, bar: 16, key: 50, scale: [0, 2, 3, 5, 7, 9, 10], swing: 0.1,
    prog: [[0, 'm7'], [5, '7'], [2, 'm7'], [7, '7']],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', open: '..x...x...x...x.' },
    bass: { inst: 'synthbass', pat: 'R..R..O.R..F..O.' },
    chords: { inst: 'clav', pat: '..x..x.x..x.x..x', oct: 12 },
    pad: null,
    lead: { inst: 'brass', oct: 24, density: 0.45 },
  },
  sanatoriy: {
    bpm: 84, bar: 12, key: 45, scale: [0, 2, 3, 5, 7, 8, 11], swing: 0,
    prog: [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm'], [8, 'M'], [5, 'm'], [11, 'dim'], [7, '7']],
    drums: { tick: 'x...x...x...' },
    bass: { inst: 'bass', pat: 'R...........' },
    chords: { inst: 'organ', pat: '....x...x...', oct: 12, len: 3 },
    pad: null,
    lead: { inst: 'bell', oct: 24, density: 0.55, detune: 18 },
    tenseDrums: { beat: 'x...........', tick: 'x.x.x.x.x.x.' },
  },
  sobes: {
    bpm: 96, bar: 16, key: 53, scale: [0, 2, 4, 5, 7, 9, 11], swing: 0.08,
    prog: [[0, 'M7'], [9, 'm7'], [2, 'm7'], [7, '7']],
    drums: { rim: 'x..x..x...x..x..', shaker: 'xxxxxxxxxxxxxxxx', kick: 'x.....x.x.......' },
    bass: { inst: 'bass', pat: 'R..F..R.R..F..R.' },
    chords: { inst: 'vibes', pat: '..x...x..x...x..', oct: 12 },
    pad: { inst: 'pad', oct: 0 },
    lead: { inst: 'vibes', oct: 24, density: 0.4 },
  },
  teplohod: {
    bpm: 132, bar: 16, key: 55, scale: [0, 2, 4, 5, 7, 9, 11], swing: 0.04,
    prog: [[0, 'M'], [7, '7'], [7, '7'], [0, 'M'], [5, 'M'], [0, 'M'], [7, '7'], [0, 'M']],
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    bass: { inst: 'bass', pat: 'R.......F.......' },
    chords: { inst: 'accordion', pat: '....x.x.....x.x.', oct: 12, len: 1.5 },
    pad: null,
    lead: { inst: 'accordion', oct: 24, density: 0.55 },
  },
  baraban: {
    bpm: 120, bar: 16, key: 46, scale: [0, 2, 4, 5, 7, 9, 11], swing: 0.03,
    prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, '7']],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.', tom: '..............x.' },
    bass: { inst: 'synthbass', pat: 'R.R.F.R.R.R.F.O.' },
    chords: { inst: 'brass', pat: 'x......x..x.....', oct: 12, len: 1.5 },
    pad: null,
    lead: { inst: 'brass', oct: 24, density: 0.5 },
    tenseDrums: { snare: 'xxxxxxxxxxxxxxxx', kick: 'x.......x.......' },
  },
  gora: {
    bpm: 92, bar: 16, key: 52, scale: [0, 1, 3, 5, 7, 8, 10], swing: 0,
    prog: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'M']],
    drums: { frame: 'x.....x...x.....', shaker: '..x...x...x...x.' },
    bass: { inst: 'bass', pat: 'R...............', len: 15 },
    arp: { inst: 'pluck', pat: '0.1.2.1.0.2.1.3.', oct: 12 },
    chords: null,
    pad: { inst: 'pad', oct: -12 },
    lead: { inst: 'flute', oct: 24, density: 0.4 },
  },
};

/* что звучит в каком настроении */
const MOOD = {
  lobby:  { drums: 1, bass: 1, chords: 1, pad: 1, arp: 1, lead: 1, gain: 1, tempo: 1 },
  calm:   { drums: 0, bass: 0.7, chords: 0.8, pad: 1, arp: 0.8, lead: 0, gain: 0.7, tempo: 1 },
  think:  { drums: 0.5, bass: 0.8, chords: 0.6, pad: 0.6, arp: 1, lead: 0, gain: 0.6, tempo: 1, light: 1 },
  tense:  { drums: 1, bass: 1, chords: 0.6, pad: 0, arp: 1, lead: 0, gain: 0.8, tempo: 1.12, tense: 1 },
  reveal: { drums: 0, bass: 0.6, chords: 0, pad: 1, arp: 0.5, lead: 0, gain: 0.55, tempo: 1 },
  win:    { drums: 1, bass: 1, chords: 1, pad: 1, arp: 1, lead: 1, gain: 1.15, tempo: 1.04 },
  silence:{ drums: 0, bass: 0, chords: 0, pad: 0, arp: 0, lead: 0, gain: 0, tempo: 1 },
};

/* мелодия: генерируется один раз на стиль и повторяется — так она запоминается */
function seeded(str) {
  let h = 2166136261;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

function motif(name, st) {
  const r = seeded(name);
  const notes = [];
  const strong = st.bar === 12 ? [0, 4, 8] : [0, 4, 8, 12];
  st.prog.forEach((c, bi) => {
    const tones = chordNotes(0, c).map((x) => ((x % 12) + 12) % 12);
    for (let s = 0; s < st.bar; s += 2) {
      const onBeat = strong.includes(s);
      if (r() > (onBeat ? st.lead.density + 0.3 : st.lead.density - 0.15)) continue;
      let pc;
      if (onBeat || r() < 0.6) pc = tones[Math.floor(r() * tones.length)];
      else pc = st.scale[Math.floor(r() * st.scale.length)];
      const len = r() < 0.3 ? 4 : 2;
      notes.push({ bar: bi, step: s, pc, len });
    }
  });
  // последняя нота петли — тоника, чтобы фраза закрывалась
  notes.push({ bar: st.prog.length - 1, step: st.bar - 4, pc: 0, len: 4 });
  return notes;
}

/* ---------- плеер ---------- */
class Player {
  constructor() {
    this.styleName = null; this.style = null; this.mood = 'silence'; this.pendingMood = null;
    this.step = 0; this.nextTime = 0; this.timer = null; this.out = null; this.melody = [];
  }

  play(styleName, mood = 'lobby') {
    const a = audio(); if (!a) return;
    if (styleName !== this.styleName) {
      this.fadeOut();
      this.styleName = styleName;
      this.style = S[styleName] || S.menu;
      this.melody = motif(styleName, this.style);
      this.out = a.createGain();
      this.out.gain.value = 0.0001;
      this.out.connect(bus.music);
      this.step = 0;
      this.nextTime = a.currentTime + 0.08;
      this.mood = mood;
      this.applyGain(0.8);
      if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    } else if (mood !== this.mood) {
      this.pendingMood = mood;     // сменим на границе такта
    }
  }

  setMood(mood) { if (this.styleName) this.play(this.styleName, mood); }

  applyGain(sec = 0.5) {
    const a = audio();
    const g = Math.max(0.0001, MOOD[this.mood]?.gain ?? 1);
    this.out.gain.setTargetAtTime(g, a.currentTime, sec / 3);
  }

  fadeOut() {
    if (!this.out) return;
    const a = audio(); const old = this.out;
    old.gain.setTargetAtTime(0.0001, a.currentTime, 0.25);
    setTimeout(() => { try { old.disconnect(); } catch {} }, 1500);
    this.out = null;
  }

  stop() { this.fadeOut(); this.styleName = null; clearInterval(this.timer); this.timer = null; }

  tick() {
    const a = audio();
    if (!a || !this.out || !running()) return;
    const st = this.style;
    const m = MOOD[this.mood] || MOOD.lobby;
    const sixteenth = 60 / (st.bpm * m.tempo) / 4;
    while (this.nextTime < a.currentTime + 0.15) {
      const s = this.step % st.bar;
      if (s === 0 && this.pendingMood) { this.mood = this.pendingMood; this.pendingMood = null; this.applyGain(0.6); }
      const swing = (s % 2 === 1) ? st.swing * sixteenth : 0;
      this.playStep(this.step, this.nextTime + swing, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  playStep(step, t, sixteenth) {
    const st = this.style;
    const m = MOOD[this.mood] || MOOD.lobby;
    const s = step % st.bar;
    const barIdx = Math.floor(step / st.bar) % st.prog.length;
    const chord = st.prog[barIdx];
    const tones = chordNotes(st.key, chord);
    const out = this.out;

    // ударные
    if (m.drums) {
      const kit = (m.tense && st.tenseDrums) ? st.tenseDrums : st.drums;
      for (const [name, pat] of Object.entries(kit || {})) {
        if (pat[s] !== 'x') continue;
        if (m.light && (name === 'kick' || name === 'snare' || name === 'clap')) continue;
        let v = m.drums * (name === 'hat' && s % 4 !== 2 ? 0.6 : 1);
        if (name === 'snare' && m.tense && st.tenseDrums) v *= 0.4 + 0.6 * (s / st.bar);
        DRUM[name]?.(t, v, out);
      }
      if (m.light && st.bar === 16 && s % 4 === 0) DRUM.tick(t, 0.5, out);
    }

    // бас
    if (m.bass && st.bass) {
      const c = st.bass.pat[s];
      const map = { R: 0, F: 7, O: 12, T: 4 };
      if (c in map) {
        const root = st.key - 12 + chord[0];
        INST[st.bass.inst](t, root + map[c] + (c === 'T' && chord[1].startsWith('m') ? -1 : 0), sixteenth * (st.bass.len || 1.6), m.bass, out);
      }
    }

    // подклад: держим аккорд весь такт
    if (m.pad && st.pad && s === 0) {
      for (const n of tones) INST[st.pad.inst](t, n + st.pad.oct, sixteenth * st.bar * 0.95, m.pad, out);
    }

    // аккорды-удары
    if (m.chords && st.chords && st.chords.pat[s] === 'x') {
      for (const n of tones) INST[st.chords.inst](t, n + st.chords.oct, sixteenth * (st.chords.len || 1), m.chords, out);
    }

    // арпеджио
    if (m.arp && st.arp) {
      const c = st.arp.pat[s];
      if (c !== '.' && c !== undefined) {
        const n = tones[Number(c) % tones.length] + (Number(c) >= tones.length ? 12 : 0);
        INST[st.arp.inst](t, n + st.arp.oct, sixteenth * 2, m.arp, out);
      }
    }

    // мелодия
    if (m.lead && st.lead) {
      for (const n of this.melody) {
        if (n.bar !== barIdx || n.step !== s) continue;
        const pitch = st.key + st.lead.oct + n.pc;
        INST[st.lead.inst](t, pitch, sixteenth * n.len * 0.9, m.lead, out, st.lead.detune || 0);
      }
    }
  }
}

export const music = new Player();
export const STYLES = Object.keys(S);
