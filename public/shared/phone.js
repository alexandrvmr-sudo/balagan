/* Оболочка телефона: вход, меню игр, лобби, загрузка игровых модулей */

import { connect } from './net.js';
import { esc, $, byId, plural, fmt, store, buzz } from './core.js';
import { avatar, useChars, chars } from './chars.js';
import { THEMES, theme } from './themes.js';

const main = $('#main');
const foot = $('#foot');
const meBox = $('#me');
const gameName = $('#gname');
const offline = $('#offline');

const q = new URLSearchParams(location.search);
const urlCode = (location.pathname.match(/^\/j\/([A-Za-z]{4})/) || [])[1]?.toUpperCase() || '';
// ?seat=N или ?new — своё хранилище для каждой вкладки (песочница, несколько игроков на одном устройстве)
const box = q.has('new') || q.has('seat') ? sessionStorage : localStorage;
const seat = q.get('seat') ? `.${q.get('seat')}` : '';
const keep = {
  get code() { return urlCode || store.get(`balagan.code${seat}`, box) || ''; },
  get token() { return store.get(`balagan.token.${this.code}${seat}`, box) || ''; },
  get name() { return store.get(`balagan.name${seat}`, box) || ''; },
  save(code, token) { store.set(`balagan.code${seat}`, code, box); if (token) store.set(`balagan.token.${code}${seat}`, token, box); },
  saveName(n) { store.set(`balagan.name${seat}`, n, box); },
};

let S = null, net = null, me = null, key = '', err = '', mod = null, modId = null, detail = null;
const mods = {};

const act = (payload) => { net?.send({ t: 'act', ...payload }); };

/* то, что получают игровые модули */
const ui = {
  main, foot, act, esc, avatar, plural, fmt, buzz,
  p: (id) => byId(S, id),
  theme: () => theme(S?.gameId),
  wait, hostBar,
  get S() { return S; },
  get me() { return S?.you; },
};

/* ---------- вход ---------- */
function drawEntry() {
  meBox.innerHTML = '';
  gameName.textContent = '';
  main.innerHTML = `
    <h1>Заходи в игру</h1>
    <div class="sub">Код комнаты — на большом экране.</div>
    ${urlCode ? '' : '<input class="codein" id="code" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="КОД">'}
    <input id="name" maxlength="14" placeholder="Как тебя звать?" autocomplete="off" enterkeyhint="go">
    <div class="err">${esc(err)}</div>`;
  foot.innerHTML = `<button class="btn" id="go">Поехали</button>`;
  const nameEl = $('#name');
  nameEl.value = keep.name;
  const go = () => {
    const code = (urlCode || $('#code')?.value || '').toUpperCase().trim();
    const name = nameEl.value.trim();
    if (code.length !== 4) { err = 'Код — четыре буквы'; return drawEntry(); }
    if (!name) { err = 'Впиши имя'; return drawEntry(); }
    keep.saveName(name);
    err = '';
    wait('🎪', 'заходим…');
    join(code, name);
  };
  $('#go').onclick = go;
  nameEl.onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function join(code, name) {
  net?.close();
  me = { name };
  net = connect({
    hello: () => ({ t: 'join', code, name, token: keep.token || undefined }),
    onUp: () => { offline.style.display = 'none'; },
    onDown: () => { if (me) offline.style.display = ''; },
    onMessage(m) {
      if (m.t === 'welcome') { me = m; keep.save(m.code, m.token); err = ''; return; }
      if (m.t === 'error') { err = m.msg; me = null; net.close(); key = ''; return drawEntry(); }
      if (m.t === 'state') { S = m; render(); }
    },
  });
}

/* ---------- отрисовка ---------- */
async function render() {
  const id = S.gameId;
  setTheme(id);
  await useChars(id);
  gameName.textContent = S.gameTitle || '';
  meBox.innerHTML = S.you
    ? `${avatar(S.you)}<span style="color:${S.you.color}">${esc(S.you.name)}</span>${S.you.isHost ? '<span style="color:var(--a2)">★</span>' : ''}${id ? `<span class="sc">${fmt(S.you.score)}</span>` : ''}`
    : '';

  if (id && S.phase !== 'lobby') {
    if (modId !== id) { mod = await load(id); modId = id; }
  } else { mod = null; modId = null; }
  if (id) detail = null;

  let k;
  if (!id) k = `menu:${detail || ''}:${S.you?.isHost}`;
  else if (S.phase === 'lobby') k = `lobby:${id}:${S.you?.isHost}:${S.you?.audience}`;
  else k = `${id}:${S.phase}:${mod?.key?.(S) ?? ''}`;

  if (k !== key) {
    key = k;
    buzz(25);
    if (!id) drawMenu();
    else if (S.phase === 'lobby') drawLobby();
    else {
      main.innerHTML = ''; foot.innerHTML = '';
      mod?.render?.(S, ui);
      if (S.phase === 'winner' && !mod?.ownsWinner) hostBar();
    }
  } else {
    if (!id) liveMenu();
    else if (S.phase === 'lobby') liveLobby();
    else mod?.update?.(S, ui);
  }
}

async function load(id) {
  if (!mods[id]) {
    try { mods[id] = (await import(`/games/${id}/phone.js`)).default; }
    catch (e) { console.error(e); mods[id] = { render: () => wait('🛠️', 'Эта игра не загрузилась') }; }
  }
  return mods[id];
}

function setTheme(id) {
  const g = id || 'menu';
  if (document.body.dataset.game === g) return;
  document.body.className = '';
  document.body.dataset.game = g;
  let link = $('#gamecss');
  if (id) {
    if (!link) { link = document.createElement('link'); link.id = 'gamecss'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    link.href = `/games/${id}/style.css`;
  } else link?.remove();
  const tc = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  if (tc) $('meta[name="theme-color"]')?.setAttribute('content', tc);
}

/* ---------- общие экраны ---------- */
function wait(em, text, sub = '') {
  main.innerHTML = `<div class="wait"><div class="em">${em}</div><h2>${esc(text)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;
  foot.innerHTML = S?.you?.audience && S.gameId && S.phase !== 'lobby' ? '<div class="aud">ты в зале — голос считается</div>' : '';
}

/* кнопки хоста в конце игры */
function hostBar() {
  if (!S?.you?.isHost) { if (!foot.innerHTML) foot.innerHTML = '<div class="sub" style="text-align:center">★ решает, что дальше</div>'; return; }
  foot.innerHTML = `<div class="row"><button class="btn alt" id="again">Ещё раз</button><button class="btn ghost" id="other">Другая игра</button></div>`;
  $('#again').onclick = () => act({ a: 'again' });
  $('#other').onclick = () => act({ a: 'menu' });
}

function seats(list) {
  return `<div class="seats">${list.map((p) => `<span class="seat ${p.connected ? '' : 'off'}">${avatar(p)}${esc(p.name)}${p.isHost ? ' ★' : ''}</span>`).join('')}</div>`;
}

function botBar() {
  if (!S.test || !S.you?.isHost) return '';
  const bots = S.players.filter((p) => p.bot).length;
  return `<div class="row"><button class="btn ghost small" id="bot">+ бот</button>${bots ? `<button class="btn ghost small" id="nobots">убрать ботов (${bots})</button>` : ''}</div>`;
}
function bindBots() {
  $('#bot')?.addEventListener('click', () => act({ a: 'addBot' }));
  $('#nobots')?.addEventListener('click', () => act({ a: 'dropBots' }));
}

/* ---------- меню ---------- */
function drawMenu() {
  const host = S.you?.isHost;
  const games = S.games || [];
  if (host && detail) {
    const g = games.find((x) => x.id === detail);
    if (g) {
      main.innerHTML = `
        <div class="gdetail rise" style="display:flex;flex-direction:column;gap:14px">
          ${THEMES[g.id]?.emblem || ''}
          <h1>${esc(g.title)}</h1>
          <div class="sub">${esc(g.tagline)}</div>
          <ol class="rules">${g.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
          <div class="tagline">${g.min}–${g.max} игроков · ~${g.minutes} мин</div>
        </div>`;
      foot.innerHTML = `<button class="btn" id="pick">Играем!</button><button class="btn ghost small" id="back">← к списку</button>`;
      $('#pick').onclick = () => act({ a: 'pick', game: g.id });
      $('#back').onclick = () => { detail = null; act({ a: 'hover', game: null }); key = ''; render(); };
      return;
    }
  }
  main.innerHTML = `
    <div class="tagline">комната ${S.code}</div>
    <h1>${host ? 'Выбирай игру' : 'Ведущий выбирает игру'}</h1>
    <div class="glist">${games.map((g) => `
      <button class="gbtn" data-g="${g.id}" ${host ? '' : 'disabled'}>
        ${THEMES[g.id]?.emblem || ''}
        <div><b>${esc(g.title)}</b><span>${esc(g.tagline)}</span></div>
      </button>`).join('')}</div>
    <div id="seats">${seats(S.players)}</div>`;
  foot.innerHTML = `${host ? `<button class="btn ghost small" id="fam">👨‍👩‍👧 Семейный фильтр: ${S.family ? 'включён' : 'выключен'}</button>` : ''}${botBar()}`;
  bindBots();
  $('#fam')?.addEventListener('click', () => act({ a: 'family' }));
  if (host) for (const b of main.querySelectorAll('.gbtn')) {
    b.onclick = () => { detail = b.dataset.g; act({ a: 'hover', game: detail }); key = ''; render(); };
  }
}

function liveMenu() {
  const s = $('#seats');
  if (s) s.innerHTML = seats(S.players);
  if (!detail) {
    foot.innerHTML = `${S.you?.isHost ? `<button class="btn ghost small" id="fam">👨‍👩‍👧 Семейный фильтр: ${S.family ? 'включён' : 'выключен'}</button>` : ''}${botBar()}`;
    bindBots();
    $('#fam')?.addEventListener('click', () => act({ a: 'family' }));
  }
}

/* ---------- лобби ---------- */
const RATING = {
  family: ['😇 Обычный', 'для всех'],
  adult: ['🔞 18+', 'пошло, с намёками'],
  hard: ['☠️ Жесть', 'чёрный юмор и край'],
};

function drawLobby() {
  const m = S.meta;
  main.innerHTML = `
    <div class="tagline">${esc(theme(m.id).host)}</div>
    <h1>${esc(m.title)}</h1>
    <div class="sub" id="need"></div>
    <div id="pick"></div>
    <div id="rate"></div>
    <div id="extra"></div>`;
  mod = null;
  load(m.id).then((gm) => { if (gm?.lobby && S.phase === 'lobby' && S.gameId === m.id) gm.lobby(S, { ...ui, main: $('#extra') }); });
  liveLobby();
}

function liveLobby() {
  const m = S.meta;
  const host = S.you?.isHost;
  const n = S.players.filter((p) => p.connected).length;
  const need = Math.max(0, m.min - n);
  const el = $('#need');
  if (el) el.textContent = need ? `Нужно ещё ${need} ${plural(need, 'игрок', 'игрока', 'игроков')}.` : host ? 'Все в сборе — можно начинать.' : 'Ждём, пока ★ начнёт.';

  // выбор персонажа
  const pick = $('#pick');
  const list = Object.entries(chars());
  const ids = (m.chars?.length ? m.chars : list.map(([id]) => id));
  if (pick && !S.you?.audience) {
    const owner = (cid) => S.players.find((p) => p.char === cid);
    const sig = ids.map((cid) => cid + (owner(cid)?.id || '')).join();
    if (pick.dataset.sig !== sig) {
      pick.dataset.sig = sig;
      pick.innerHTML = `<div class="tagline" style="margin-bottom:8px">выбери персонажа</div><div class="chargrid">${ids.map((cid) => {
        const c = chars()[cid];
        if (!c) return '';
        const o = owner(cid);
        const mine = o?.id === S.you?.id;
        return `<button class="chr ${mine ? 'mine' : o ? 'taken' : ''}" data-c="${cid}" ${o && !mine ? 'disabled' : ''} style="--pc:${c.color}">
          <span class="cav">${c.draw({ mood: mine ? 'wow' : 'happy' })}</span><b>${esc(c.name)}</b>${o && !mine ? `<small>${esc(o.name)}</small>` : ''}</button>`;
      }).join('')}</div>`;
      for (const b of pick.querySelectorAll('.chr:not([disabled])')) b.onclick = () => { buzz(20); act({ a: 'char', c: b.dataset.c }); };
    }
  }

  // уровень контента — только у хоста и только если игра умеет
  const rate = $('#rate');
  if (rate) {
    const can = (m.ratings || []).length > 1;
    if (host && can && !S.family) {
      rate.innerHTML = `<div class="tagline" style="margin-bottom:8px">уровень контента</div><div class="seg">${m.ratings.map((r) => `<button class="${S.rating === r ? 'on' : ''}" data-r="${r}"><b>${RATING[r][0]}</b><small>${RATING[r][1]}</small></button>`).join('')}</div>`;
      for (const b of rate.querySelectorAll('[data-r]')) b.onclick = () => act({ a: 'rating', r: b.dataset.r });
    } else if (can) rate.innerHTML = `<div class="sub">Уровень: <b>${RATING[S.rating]?.[0] || ''}</b>${S.family ? ' · семейный фильтр' : ''}</div>`;
    else rate.innerHTML = '';
  }

  if (host) {
    foot.innerHTML = `${botBar()}<button class="btn" id="start" ${need ? 'disabled' : ''}>Начать</button><button class="btn ghost small" id="other">← другая игра</button>`;
    bindBots();
    $('#start').onclick = () => { $('#start').disabled = true; act({ a: 'start' }); };
    $('#other').onclick = () => act({ a: 'menu' });
  } else foot.innerHTML = '<div class="sub" style="text-align:center">★ запустит игру, когда все соберутся</div>';
}

/* ---------- старт ---------- */
const autoName = q.get('name');
if (urlCode && autoName && !keep.token) { keep.saveName(autoName); wait('🎪', 'заходим…'); join(urlCode, autoName); }
else if (keep.code && keep.token) {
  wait('🎪', 'возвращаемся в игру…');
  join(keep.code, keep.name);
  setTimeout(() => { if (!S) { me = null; net?.close(); drawEntry(); } }, 3500);
} else drawEntry();
