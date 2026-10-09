/* Общий аудиоконтекст и шины: музыка, эффекты, голос приглушает музыку */

let ctx = null;
export const bus = { master: null, music: null, sfx: null, voice: null, amb: null };
let musicLevel = 0.55;
let ducked = false;

export function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    bus.master = ctx.createGain(); bus.master.gain.value = 0.9;
    bus.music = ctx.createGain(); bus.music.gain.value = musicLevel;
    bus.sfx = ctx.createGain(); bus.sfx.gain.value = 0.8;
    bus.voice = ctx.createGain(); bus.voice.gain.value = 1.15;
    bus.amb = ctx.createGain(); bus.amb.gain.value = 0.5;
    bus.music.connect(bus.master); bus.sfx.connect(bus.master); bus.voice.connect(bus.master); bus.amb.connect(bus.master);
    bus.master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

export const running = () => ctx && ctx.state === 'running';
export async function unlock() { const a = audio(); if (a && a.state !== 'running') { try { await a.resume(); } catch {} } return running(); }

export function setMusicLevel(v) {
  musicLevel = v;
  if (bus.music) bus.music.gain.setTargetAtTime(ducked ? v * 0.3 : v, ctx.currentTime, 0.15);
}
export const getMusicLevel = () => musicLevel;

/* пока ведущий говорит — музыка тише */
export function duck(on) {
  ducked = on;
  if (bus.music) bus.music.gain.setTargetAtTime(on ? musicLevel * 0.3 : musicLevel, ctx.currentTime, on ? 0.08 : 0.4);
}

/* общий шум для барабанов и эффектов */
let noiseBuf = null;
export function noise() {
  const a = audio();
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
