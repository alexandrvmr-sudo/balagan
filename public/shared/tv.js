/* Оболочка экрана: связь, тема игры, музыка, голос, меню, лобби, загрузка игровых модулей */

import { connect } from './net.js';
import { esc, $, avatar, byId, plural, fmt, ring, updateRing, store } from './core.js';
import { unlock, setMusicLevel, getMusicLevel } from './audio.js';
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
  app, esc, avatar, plural, fmt, sfx, fx, voice,
  p: (id) => byId(S, id),
  theme: () => theme(S?.gameId),
  tag: (t) => { tagEl.textContent = t || ''; },
  podium, board, qr, joinBox,
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
let soundMode = Number(store.get('balagan.sound') ?? 0); // 0 всё, 1 без музыки, 2 тишина
function applyAudioPrefs() {
  setMusicLevel(soundMode === 0 ? 0.55 : 0);
  voice.enabled = soundMode < 2;
  muteBtn.textContent = ['🔊', '🎙️', '🔇'][soundMode];
  muteBtn.title = ['звук и голос', 'только голос', 'тишина'][soundMode];
}
muteBtn.onclick = (e) => { e.stopPropagation(); soundMode = (soundMode + 1) % 3; store.set('balagan.sound', soundMode); applyAudioPrefs(); };
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
    if (m.t === 'say') { caption(m.text, theme(m.who || S?.gameId).host); return voice.say(m.text, theme(m.who || S?.gameId).voice); }
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
function drawMenu() {
  ui.tag('');
  const title = 'БАЛАГАН'.split('').map((c) => `<i>${c}</i>`).join('');
  app.innerHTML = `
    <div class="screen menu">
      <div class="head rise">
        <div class="logo">${title}</div>
        <div class="sub">${S.players.some((p) => p.isHost) ? 'Игрок со звёздочкой ★ выбирает игру на телефоне' : 'Заходите с телефона — первый станет ведущим и выберет игру'}</div>
      </div>
      <div class="games stagger">${(S.games || []).map((g) => `
        <div class="gcard ${S.hover === g.id ? 'on' : ''}" data-g="${g.id}">
          <div class="em">${THEMES[g.id]?.emblem || ''}</div>
          <div>
            <h3>${esc(g.title)}</h3>
            <p>${esc(g.tagline)}</p>
            <div class="meta"><span>${g.min}–${g.max} игроков</span><span>~${g.minutes} мин</span>${g.ai ? '<span>ИИ</span>' : ''}</div>
          </div>
        </div>`).join('')}</div>
      <div class="joinbar rise">
        <div class="url">заходите на<b>${esc(joinUrl.replace(/^https?:\/\//, '').replace(/\/j\/.*/, '/join'))}</b></div>
        <div class="people" id="people">${people(S.players) || '<span class="hint">пока никого…</span>'}</div>
        <div class="code">${S.code}</div>
        <div class="qr" id="qr"></div>
      </div>
    </div>`;
  qr($('#qr'));
}

function liveMenu() {
  const box = $('#people');
  if (box) {
    const sig = S.players.map((p) => p.id + p.connected + p.isHost).join();
    if (box.dataset.sig !== sig) { box.dataset.sig = sig; box.innerHTML = people(S.players) || '<span class="hint">пока никого…</span>'; }
  }
  for (const c of app.querySelectorAll('.gcard')) {
    const on = c.dataset.g === S.hover;
    if (on && !c.classList.contains('on')) sfx('clack');
    c.classList.toggle('on', on);
  }
}

/* ---------- лобби игры ---------- */
function drawLobby() {
  const m = S.meta;
  ui.tag('');
  app.innerHTML = `
    <div class="screen lobby">
      <div class="rise">
        <div class="em">${THEMES[m.id]?.emblem || ''}</div>
        <h1>${esc(m.title)}</h1>
        <div class="tagline">${esc(m.tagline)}</div>
        <ol class="stagger">${(m.rules || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      </div>
      <div class="side rise">
        <div class="hint">${esc(theme(m.id).host)} ждёт гостей</div>
        <div class="code">${S.code}</div>
        <div class="qr" id="qr"></div>
        <div class="people" id="people">${people(S.players)}</div>
        <div class="need" id="need"></div>
      </div>
    </div>`;
  qr($('#qr'));
  liveLobby();
}

function liveLobby() {
  const m = S.meta;
  const box = $('#people');
  if (box) {
    const sig = S.players.map((p) => p.id + p.connected + p.isHost).join();
    if (box.dataset.sig !== sig) { box.dataset.sig = sig; box.innerHTML = people(S.players); }
  }
  const n = S.players.filter((p) => p.connected).length;
  const need = Math.max(0, m.min - n);
  const el = $('#need');
  if (el) el.textContent = need
    ? `нужно ещё ${need} ${plural(need, 'игрок', 'игрока', 'игроков')}`
    : n > m.max ? `играют ${m.max}, остальные — в зале · ★ жмёт «Начать»` : '★ жмёт «Начать» на телефоне';
}
