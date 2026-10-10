/* Оболочка экрана: связь, тема игры, музыка, голос, меню, лобби, загрузка игровых модулей */

import { connect } from './net.js';
import { esc, $, byId, plural, fmt, ring, updateRing, store } from './core.js';
import { avatar, useChars, charSvg, chars } from './chars.js';
import { unlock, setMusicLevel, getMusicLevel, setReverb, setMaster } from './audio.js';
import { ambience } from './ambience.js';
import { music } from './music.js';
import { sfx } from './sfx.js';
import { voice } from './voice.js';
import * as fx from './fx.js';
import { THEMES, theme, DEFAULT_MOOD } from './themes.js';

const app = $('#app');
const tagEl = $('#tag');
const gnameEl = $('#gname');
const roomEl = $('#room');
const ringBox = $('#ring');
const muteBtn = $('#mute');
ringBox.innerHTML = ring();

const params = new URLSearchParams(location.search);
let S = null;
let prev = null;
let joinUrl = '';
let key = '';
let mod = null;
let modId = null;
let started = false;
const mods = {};

/* то, что получают игровые модули */
const ui = {
  app, esc, avatar, plural, fmt, sfx, fx, voice, mouth: () => voice.level(),
  p: (id) => byId(S, id),
  theme: () => theme(S?.gameId),
  tag: (t) => { tagEl.textContent = t || ''; },
  podium, board, qr, joinBox, charSvg, chars,
  get S() { return S; },
};

/* ---------- заставка: браузеру нужен клик, чтобы зазвучать ---------- */
const splash = $('#splash');
async function start() {
  if (started) return;
  started = true;
  splash.remove();
  await unlock();
  applyAudioPrefs();
  sound();
}
if (params.has('nosplash')) { splash.remove(); started = true; addEventListener('pointerdown', () => unlock().then(sound), { once: true }); }
else splash.addEventListener('click', start);

/* ---------- звук: M — музыка, V — голос, F — полный экран ---------- */
// 0 всё, 1 без музыки, 2 тишина; ?mute=1 — тишина без запоминания (для проверок)
let soundMode = params.has('mute') ? 2 : Number(store.get('balagan.sound') ?? 0);
function applyAudioPrefs() {
  setMusicLevel(soundMode === 0 ? 0.55 : 0);
  setMaster(soundMode === 2 ? 0 : 0.9);
  voice.enabled = soundMode < 2;
  muteBtn.textContent = ['🔊', '🎙️', '🔇'][soundMode];
  muteBtn.title = ['звук и голос', 'только голос', 'тишина'][soundMode];
}
muteBtn.onclick = (e) => { e.stopPropagation(); soundMode = (soundMode + 1) % 3; if (!params.has('mute')) store.set('balagan.sound', soundMode); applyAudioPrefs(); };
addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') document.documentElement.requestFullscreen?.();
  if (e.key === 'm' || e.key === 'M' || e.key === 'ь') muteBtn.click();
});
applyAudioPrefs();

/* ---------- связь ---------- */
const askedCode = params.get('code')?.toUpperCase();
connect({
  hello: () => ({ t: 'tv', code: askedCode || store.get('balagan.tv.code', sessionStorage) || undefined }),
  onMessage(m) {
    if (m.t === 'welcome') { joinUrl = m.joinUrl; store.set('balagan.tv.code', m.code, sessionStorage); roomEl.innerHTML = `${esc(joinUrl.replace(/^https?:\/\//, '').replace(/\/j\/.*/, ''))} <b>${m.code}</b>`; return; }
    if (m.t === 'error') { store.del('balagan.tv.code', sessionStorage); if (!askedCode) location.reload(); return; }
    if (m.t === 'sound') return sfx(m.name);
    if (m.t === 'say') {
      const t = theme(m.who || S?.gameId);
      return voice.say({ text: m.text, audio: m.audio, rate: t.voice?.rate, pitch: t.voice?.pitch, onStart: () => { caption(m.text, t.host); mod?.speak?.(true, m); }, onEnd: () => mod?.speak?.(false, m) });
    }
    if (m.t === 'state') { prev = S; S = m; render(); }
  },
});

/* ---------- таймер ---------- */
let lastSec = null;
(function tick() {
  updateRing(ringBox.firstElementChild, S);
  if (S?.deadline) {
    const sec = Math.ceil((S.deadline - Date.now()) / 1000);
    if (sec !== lastSec && sec <= 5 && sec > 0) sfx('tick');
    lastSec = sec;
  }
  mod?.frame?.(S, ui);
  requestAnimationFrame(tick);
})();

/* ---------- отрисовка ---------- */
async function render() {
  const id = S.gameId;
  setTheme(id);
  await useChars(id);
  gnameEl.textContent = S.gameTitle ? `· ${S.gameTitle}` : '';

  if (id && S.phase !== 'lobby') {
    if (modId !== id) { mod = await load(id); modId = id; }
  } else { mod = null; modId = null; }

  let k;
  if (!id) k = 'menu';
  else if (S.phase === 'lobby') k = `lobby:${id}`;
  else k = `${id}:${S.phase}:${mod?.key?.(S) ?? ''}`;

  if (k !== key) {
    const big = !prev || prev.phase !== S.phase || prev.gameId !== S.gameId;
    const wipe = big && (mod?.wipe ? mod.wipe(prev, S) : true) && prev;
    key = k;
    if (wipe) { await fx.wipe(getComputedStyle(document.body).getPropertyValue('--a1').trim() || '#ff2e63'); }
    if (!id) drawMenu();
    else if (S.phase === 'lobby') drawLobby();
    else { ui.tag(''); mod?.render?.(S, ui, prev); }
  } else {
    if (!id) liveMenu();
    else if (S.phase === 'lobby') liveLobby();
    else mod?.update?.(S, ui, prev);
  }

  flash();
  sound();
}

async function load(id) {
  if (!mods[id]) {
    try { mods[id] = (await import(`/games/${id}/tv.js`)).default; }
    catch (e) { console.error(e); mods[id] = { render: (s, u) => { u.app.innerHTML = `<div class="center"><div class="big">Игра «${esc(id)}» не загрузилась</div></div>`; } }; }
  }
  return mods[id];
}

function setTheme(id) {
  const g = id || 'menu';
  if (document.body.dataset.game === g) return;
  // следы прошлой игры: классы на body и временные слои
  document.body.className = '';
  for (const el of document.querySelectorAll('[data-transient]')) el.remove();
  document.body.dataset.game = g;
  let link = $('#gamecss');
  if (id) {
    if (!link) { link = document.createElement('link'); link.id = 'gamecss'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    link.href = `/games/${id}/style.css`;
  } else link?.remove();
}

function sound() {
  if (!started || !S) return;
  const t = theme(S.gameId);
  const mood = mod?.mood?.(S) || DEFAULT_MOOD[S.phase] || 'lobby';
  music.play(t.music, mood);
  ambience(soundMode === 2 ? null : (S.gameId ? t.ambience || null : null));
  setReverb(S.gameId ? t.reverb ?? 0.12 : 0.1);
}

let flashAt = 0;
function flash() {
  if (!S.flash || S.flash.at === flashAt) return;
  flashAt = S.flash.at;
  if (mod?.flash?.(S.flash, ui)) return;
  if (!S.flash.text) return;
  const el = document.createElement('div');
  el.className = 'flash';
  el.textContent = S.flash.text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* ---------- субтитры ведущего ---------- */
let capEl = null, capTimer = 0;
function caption(text, host) {
  if (!capEl) { capEl = document.createElement('div'); capEl.className = 'caption'; document.body.appendChild(capEl); }
  capEl.innerHTML = `<b>${esc(host)}</b>${esc(text)}`;
  capEl.classList.remove('on'); void capEl.offsetWidth; capEl.classList.add('on');
  clearTimeout(capTimer);
  capTimer = setTimeout(() => capEl.classList.remove('on'), 1800 + text.length * 65);
}

/* ---------- общие кусочки разметки ---------- */
const qrCache = {};
function qr(box) {
  if (!box || !joinUrl) return;
  if (qrCache[joinUrl]) { box.innerHTML = qrCache[joinUrl]; return; }
  fetch(`/qr?d=${encodeURIComponent(joinUrl)}`).then((r) => r.text()).then((svg) => { qrCache[joinUrl] = svg; box.innerHTML = svg; }).catch(() => {});
}

function people(list) {
  return list.map((p) => `<span class="person ${p.connected ? '' : 'off'} ${p.isHost ? 'host' : ''}" data-p="${p.id}">${avatar(p)}${esc(p.name)}</span>`).join('');
}

function joinBox() {
  return `<div class="side"><div class="hint">${esc(joinUrl.replace(/^https?:\/\//, '').replace(/\/j\/.*/, '/join'))}</div><div class="code">${S.code}</div><div class="qr" id="qr"></div></div>`;
}

function board(list, gains = {}, title = '') {
  const sorted = [...list].sort((a, b) => b.score - a.score);
  return `<div class="board stagger">${title ? `<div class="caps dim" style="text-align:center;font-size:1.8vmin;margin-bottom:.6vmin">${esc(title)}</div>` : ''}${sorted.map((p, i) => `
    <div class="brow ${i === 0 ? 'first' : ''}">
      <div class="pos">${i + 1}</div>${avatar(p)}
      <div class="nm" style="color:${p.color}">${esc(p.name)}</div>
      <div class="gain">${gains[p.id] ? `+${fmt(gains[p.id])}` : ''}</div>
      <div class="sc" data-sc="${p.id}">${fmt(p.score)}</div>
    </div>`).join('')}</div>`;
}

function podium(list) {
  const top = [...list].sort((a, b) => b.score - a.score).slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const cls = ['p2', 'p1', 'p3'];
  return `<div class="podium">${order.map((p, i) => p ? `
    <div class="col ${cls[i]}">
      ${avatar(p, cls[i] === 'p1' ? 'bob' : '')}
      <div class="nm" style="color:${p.color}">${esc(p.name)}</div>
      <div class="sc">${fmt(p.score)}</div>
      <div class="stand">${cls[i][1]}</div>
    </div>` : '<div class="col"></div>').join('')}</div>`;
}

/* ---------- меню ---------- */
const TAG_ICON = { 'Шутки': '😂', 'Викторина': '🧠', 'Команды': '⚔️', 'Везение': '🎲', 'Рисование': '🎨', 'Слова': '🧲', 'Ужасы': '💀', 'Стендап': '🎤' };
let attract = 0, attractTimer = 0;

function previewHTML(g) {
  if (!g) return '';
  const tags = (g.tags || []).map((t) => `<span class="mtag"><i>${TAG_ICON[t] || '★'}</i>${esc(t)}</span>`).join('');
  const adult = g.ratings?.length > 1 ? `<span class="mtag ${S.family ? 'off' : 'hot'}"><i>🔞</i>${S.family ? 'семейный фильтр' : 'есть 18+'}</span>` : '';
  return `<div class="mprev pop" data-g="${g.id}">
    <div class="memb">${THEMES[g.id]?.emblem || ''}</div>
    <h2>${esc(g.title)}</h2>
    <p>${esc(g.tagline)}</p>
    <div class="mtags">${tags}${adult}<span class="mtag"><i>📱</i>${g.min}–${g.max} игроков</span><span class="mtag"><i>⏱</i>~${g.minutes} мин</span></div>
  </div>`;
}

function drawMenu() {
  ui.tag('');
  const games = S.games || [];
  const title = 'БАЛАГАН'.split('').map((c) => `<i>${c}</i>`).join('');
  app.innerHTML = `
    <div class="screen menu2">
      <div class="mleft">
        <div class="logo rise">${title}</div>
        <div class="mlist stagger">${games.map((g) => `<div class="mitem" data-g="${g.id}"><span class="mi">${THEMES[g.id]?.emblem || ''}</span>${esc(g.title)}</div>`).join('')}</div>
        <div class="mfam" id="fam"></div>
      </div>
      <div class="mright" id="prev"></div>
      <div class="joinbar rise">
        <div class="url">заходите на<b>${esc(joinUrl.replace(/^https?:\/\//, '').replace(/\/j\/.*/, '/join'))}</b></div>
        <div class="people" id="people">${people(S.players) || '<span class="hint">пока никого… первый станет ведущим ★</span>'}</div>
        <div class="code">${S.code}</div>
        <div class="qr" id="qr"></div>
      </div>
    </div>`;
  qr($('#qr'));
  clearInterval(attractTimer);
  attractTimer = setInterval(() => { if (!S.gameId && !S.hover) { attract = (attract + 1) % Math.max(1, games.length); liveMenu(true); } }, 5000);
  liveMenu(true);
}

let shown = null;
function liveMenu(force = false) {
  const games = S.games || [];
  const box = $('#people');
  if (box) {
    const sig = S.players.map((p) => p.id + p.connected + p.isHost).join();
    if (box.dataset.sig !== sig) { box.dataset.sig = sig; box.innerHTML = people(S.players) || '<span class="hint">пока никого… первый станет ведущим ★</span>'; }
  }
  const focus = S.hover || games[attract % Math.max(1, games.length)]?.id;
  for (const el of app.querySelectorAll('.mitem')) el.classList.toggle('on', el.dataset.g === focus);
  if (focus !== shown || force) {
    if (S.hover && focus !== shown) sfx('clack');
    shown = focus;
    const prev = $('#prev');
    if (prev) prev.innerHTML = previewHTML(games.find((g) => g.id === focus));
  }
  const fam = $('#fam');
  if (fam) fam.innerHTML = `<span class="${S.family ? 'on' : ''}">👨‍👩‍👧 Семейный фильтр: <b>${S.family ? 'включён' : 'выключен'}</b></span>`;
}

/* ---------- лобби игры ---------- */
const RATING = { family: 'Обычный', adult: '18+', hard: 'Жесть' };

function lineup() {
  const m = S.meta;
  const list = S.players.filter((p) => p.connected || p.bot);
  const empty = Math.max(0, m.min - list.length);
  return list.map((p, i) => `<div class="lu ${p.isHost ? 'host' : ''}" data-p="${p.id}" style="animation-delay:${i * 0.06}s">
      ${avatar(p, 'bob')}<b style="color:${p.color}">${esc(p.name)}</b><small>${esc(chars()[p.char]?.name || '')}</small></div>`).join('')
    + Array.from({ length: empty }, () => '<div class="lu empty"><span class="ghostslot">?</span><b>ждём</b></div>').join('');
}

function drawLobby() {
  const m = S.meta;
  ui.tag('');
  app.innerHTML = `
    <div class="screen lobby2">
      <div class="lhead rise">
        <div class="em">${THEMES[m.id]?.emblem || ''}</div>
        <div><h1>${esc(m.title)}</h1><div class="tagline">${esc(m.tagline)}</div></div>
        <div class="lrate" id="rate"></div>
      </div>
      <div class="lmid">
        <div class="lineup" id="lineup">${lineup()}</div>
        <div class="side">
          <div class="code">${S.code}</div>
          <div class="qr" id="qr"></div>
          <div class="hint">${esc(theme(m.id).host)} ждёт гостей</div>
        </div>
      </div>
      <ol class="lrules stagger">${(m.rules || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <div class="need" id="need"></div>
    </div>`;
  qr($('#qr'));
  liveLobby();
}

function liveLobby() {
  const m = S.meta;
  const box = $('#lineup');
  if (box) {
    const sig = S.players.map((p) => p.id + p.connected + p.isHost + p.char).join();
    if (box.dataset.sig !== sig) {
      const before = box.dataset.sig;
      box.dataset.sig = sig;
      box.innerHTML = lineup();
      if (before) sfx('pop');
    }
  }
  const n = S.players.filter((p) => p.connected).length;
  const need = Math.max(0, m.min - n);
  const el = $('#need');
  if (el) el.textContent = need
    ? `нужно ещё ${need} ${plural(need, 'игрок', 'игрока', 'игроков')}`
    : n > m.max ? `играют ${m.max}, остальные — в зале · ★ жмёт «Начать»` : '★ жмёт «Начать» на телефоне';
  const r = $('#rate');
  if (r) r.innerHTML = m.ratings?.length > 1 ? `<span class="rbadge r-${S.rating}">${S.rating === 'family' ? '😇' : S.rating === 'adult' ? '🔞' : '☠️'} ${RATING[S.rating]}</span>` : '';
}
