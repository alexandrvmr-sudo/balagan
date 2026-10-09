/* Фоновая атмосфера: больница, салон самолёта, пещера. Запускается под тему игры и гаснет при смене. */

import { audio, bus, noise, running } from './audio.js';
import { sfx } from './sfx.js';

let current = null;
let nodes = [];
let timers = [];

function stopAll() {
  const a = audio();
  for (const n of nodes) { try { n.gain?.setTargetAtTime?.(0, a.currentTime, 0.4); } catch {} setTimeout(() => { try { n.stop?.(); n.disconnect?.(); } catch {} }, 1500); }
  nodes = [];
  for (const t of timers) clearInterval(t);
  timers = [];
}

function loopNoise(filterType, freq, q, gain) {
  const a = audio();
  const src = noise(); src.loop = true;
  const f = a.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = 0;
  g.gain.setTargetAtTime(gain, a.currentTime, 1);
  src.connect(f).connect(g).connect(bus.amb);
  src.start();
  nodes.push(src, g);
  return { f, g };
}

function hum(freq, gain) {
  const a = audio();
  const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const g = a.createGain(); g.gain.value = 0;
  g.gain.setTargetAtTime(gain, a.currentTime, 1);
  o.connect(g).connect(bus.amb); o.start();
  nodes.push(o, g);
  return g;
}

const every = (minS, maxS, fn) => {
  let t;
  const go = () => { t = setTimeout(() => { if (running()) fn(); go(); }, (minS + Math.random() * (maxS - minS)) * 1000); timers.push(t); };
  go();
};

const PRESETS = {
  hospital() {
    hum(60, 0.05); hum(120, 0.025); hum(180, 0.008);     // лампы дневного света
    loopNoise('bandpass', 2400, 0.8, 0.012);            // вентиляция
    every(4, 9, () => sfx('drip'));
    every(18, 40, () => sfx('creak'));
    every(25, 55, () => sfx('gurney'));
  },
  cabin() {
    const eng = loopNoise('lowpass', 420, 0.7, 0.16);   // гул двигателей
    hum(85, 0.03);
    const a = audio();
    const lfo = a.createOscillator(); lfo.frequency.value = 0.08;
    const lg = a.createGain(); lg.gain.value = 60;
    lfo.connect(lg).connect(eng.f.frequency); lfo.start(); nodes.push(lfo);
    every(30, 70, () => sfx('ding'));
  },
  cave() {
    const w = loopNoise('bandpass', 500, 1.5, 0.05);   // ветер в штольне
    const a = audio();
    const lfo = a.createOscillator(); lfo.frequency.value = 0.12;
    const lg = a.createGain(); lg.gain.value = 260;
    lfo.connect(lg).connect(w.f.frequency); lfo.start(); nodes.push(lfo);
    every(2, 6, () => sfx('drip'));
    every(20, 45, () => sfx('rumble'));
  },
  studio() {
    loopNoise('bandpass', 900, 0.6, 0.006);             // дыхание зала
  },
};

export function ambience(name) {
  if (name === current) return;
  if (!audio() || !running()) return;
  stopAll();
  current = name;
  PRESETS[name]?.();
}
