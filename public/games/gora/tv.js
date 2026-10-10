/* Медная гора — экран. Шахта Хозяйки: сталактиты, кристаллы, пыль в луче света.
   Двери — каменные плиты в крепи; за верной — самоцвет, за неверной — чудище, и гаснет факел.
   Между ярусами вагонетка уходит глубже в гору. */

let timers = [];
const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };
const GEMS = ['#18c88a', '#e2803a', '#7ff6ff', '#ff6b8b', '#f2c14e'];

/* ---------- Хозяйка Медной горы: кокошник с камнями, коса, малахитовое платье ---------- */
function hostess(cls = '') {
  return `<div class="gr-host ${cls}"><svg viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <pattern id="grMal" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#0b6e4f"/>
        <path d="M0 20q10-14 20 0t20 0M0 30q10-14 20 0t20 0M0 10q10-14 20 0t20 0" stroke="#18a777" stroke-width="3" fill="none"/><path d="M0 25q10-10 20 0t20 0" stroke="#05432f" stroke-width="2" fill="none"/></pattern>
      <radialGradient id="grAura" cx="50%" cy="40%" r="55%"><stop offset="0" stop-color="#2ee59d" stop-opacity=".35"/><stop offset="1" stop-color="#2ee59d" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="110" cy="140" rx="110" ry="140" fill="url(#grAura)"/>
    <path d="M150 90q34 40 20 120q-6 30 4 60" stroke="#1e140c" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M150 90q34 40 20 120q-6 30 4 60" stroke="#2b1d12" stroke-width="16" fill="none" stroke-linecap="round"/>
    ${[120, 150, 180, 210, 240].map((y) => `<path d="M${160 + (y - 120) * 0.08} ${y}l14 8" stroke="#1e140c" stroke-width="2"/>`).join('')}
    <path d="M40 300Q34 190 110 176Q186 190 180 300Z" fill="url(#grMal)" stroke="#1e140c" stroke-width="5"/>
    <path d="M84 182L110 222L136 182" fill="none" stroke="#e2803a" stroke-width="5"/>
    <circle cx="110" cy="224" r="8" fill="#e2803a" stroke="#1e140c" stroke-width="3"/><circle cx="110" cy="224" r="3.5" fill="#7ff6ff"/>
    <rect x="96" y="150" width="28" height="30" fill="#e8d7c3" stroke="#1e140c" stroke-width="4"/>
    <g class="gr-hhead">
      <ellipse cx="110" cy="112" rx="46" ry="52" fill="#efe0cf" stroke="#1e140c" stroke-width="5"/>
      <path d="M64 108Q60 66 110 62Q160 66 156 108Q148 82 110 80Q72 82 64 108Z" fill="#2b1d12" stroke="#1e140c" stroke-width="4"/>
      <path d="M58 74Q110 6 162 74L154 82Q110 34 66 82Z" fill="#0b6e4f" stroke="#1e140c" stroke-width="5" stroke-linejoin="round"/>
      <path d="M66 74Q110 22 154 74" stroke="#e2803a" stroke-width="5" fill="none"/>
      <circle cx="110" cy="40" r="9" fill="#7ff6ff" stroke="#1e140c" stroke-width="3"/>
      ${[[84, 56], [136, 56], [74, 70], [146, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#e2803a" stroke="#1e140c" stroke-width="2.4"/>`).join('')}
      <g class="gr-heyes"><ellipse cx="92" cy="112" rx="7" ry="8" fill="#0b8a5e"/><ellipse cx="128" cy="112" rx="7" ry="8" fill="#0b8a5e"/><circle cx="94" cy="109" r="2.4" fill="#fff"/><circle cx="130" cy="109" r="2.4" fill="#fff"/></g>
      <path d="M80 98q12-6 22-2M118 96q10-4 22 2" stroke="#2b1d12" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M110 116q-3 10 2 12" stroke="#1e140c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="84" cy="130" r="7" fill="#ff8a7a" opacity=".3"/><circle cx="136" cy="130" r="7" fill="#ff8a7a" opacity=".3"/>
      <g id="grMouth"><path d="M98 138Q110 134 122 138Q118 150 110 150Q102 150 98 138Z" fill="#b83a4b" stroke="#1e140c" stroke-width="2.6"/></g>
    </g>
  </svg></div>`;
}

/* ---------- шахта в подложке ---------- */
function cave(depth) {
  const bd = document.getElementById('backdrop');
  if (!bd) return;
  let el = bd.querySelector('.gr-cave');
  if (!el) {
    el = document.createElement('div');
    el.className = 'gr-cave';
    el.dataset.transient = '1';
    const tites = Array.from({ length: 16 }, (_, i) => { const x = i * 6.6 + ((i * 37) % 5); const h = 6 + ((i * 53) % 14); return `<path d="M${x} 0L${x + 2.4} ${h}L${x + 4.8} 0Z"/>`; }).join('');
    const crystals = (side) => Array.from({ length: 5 }, (_, i) => `<i style="${side}:${(i * 4.2).toFixed(1)}vmin;height:${8 + ((i * 29) % 12)}vmin;--rot:${((i * 23) % 40) - 20}deg;--c:${GEMS[i % 3]}"></i>`).join('');
    el.innerHTML = `<div class="rock"></div>
      <svg class="tites" viewBox="0 0 106 22" preserveAspectRatio="none">${tites}</svg>
      <div class="cry l">${crystals('left')}</div><div class="cry r">${crystals('right')}</div>
      <div class="shaft"></div>
      <div class="dust">${Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 4.6) % 100}%;animation-delay:${-i * 0.9}s;animation-duration:${9 + (i % 5) * 2}s"></i>`).join('')}</div>
      <div class="rails"></div>`;
    bd.appendChild(el);
  }
  el.dataset.depth = String(depth || 1);
}

/* ---------- мелочи ---------- */
const flame = (on) => `<i class="torch ${on ? '' : 'out'}"><b></b></i>`;
const torchesHTML = (n, max = 3) => Array.from({ length: Math.max(max, n) }, (_, i) => flame(i < n)).join('');
const gem = (c = '#18c88a', cls = '') => `<svg class="gr-gem ${cls}" viewBox="0 0 60 60"><path d="M14 8h32l12 16-28 32L2 24z" fill="${c}" stroke="#1e140c" stroke-width="3" stroke-linejoin="round"/><path d="M2 24h56M14 8l8 16 8-16 8 16 8-16M22 24l8 32 8-32" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/><path d="M18 12l-4 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
const monster = () => `<svg class="gr-mon" viewBox="0 0 200 160" aria-hidden="true">
  <path d="M10 160Q0 80 40 50Q60 6 100 10Q140 6 160 50Q200 80 190 160Z" fill="#0d0a08" stroke="#2b1d12" stroke-width="4"/>
  <path d="M40 60l-20-30 32 18zM160 60l20-30-32 18z" fill="#0d0a08" stroke="#2b1d12" stroke-width="3"/>
  <ellipse cx="72" cy="72" rx="16" ry="12" fill="#ffd23f"/><ellipse cx="128" cy="72" rx="16" ry="12" fill="#ffd23f"/><ellipse cx="74" cy="74" rx="4" ry="9" fill="#0d0a08"/><ellipse cx="126" cy="74" rx="4" ry="9" fill="#0d0a08"/>
  <path d="M50 108Q100 140 150 108L140 120 130 108 120 124 110 110 100 128 90 110 80 124 70 108 60 120Z" fill="#fff6e0" stroke="#2b1d12" stroke-width="2"/>
  <path d="M20 140l-14 8M24 130l-16-2M180 140l14 8M176 130l16-2" stroke="#2b1d12" stroke-width="5" stroke-linecap="round"/></svg>`;
const letters = (t, d0 = 0) => [...t].map((c, i) => (c === ' ' ? '<i class="sp"> </i>' : `<i style="animation-delay:${(d0 + i * 0.05).toFixed(2)}s">${c}</i>`)).join('');

function teamPanel(S, ui, t) {
  const active = (S.phase === 'guess' || S.phase === 'opened') && S.turn === t.id;
  return `<div class="gr-team ${active ? 'active' : ''}" style="--tc:${t.color}" data-t="${t.id}">
    <div class="ban">${ui.esc(t.name)}</div>
    <div class="torches">${torchesHTML(S.torches?.[t.id] ?? 3)}</div>
    <div class="score">${ui.fmt(S.teamScore?.[t.id] || 0)}</div>
    <div class="gems">${Array.from({ length: S.gems?.[t.id] || 0 }, (_, i) => gem(GEMS[i % GEMS.length], 'mini')).join('')}</div>
    <div class="mem">${t.members.map((id) => `<span class="${id === S.captain && active ? 'cap' : ''}">${ui.avatar(ui.p(id))}${id === S.captain && active ? '<em>⛏</em>' : ''}</span>`).join('')}</div>
  </div>`;
}

function drawTeams(S, ui) {
  for (const t of S.teams || []) {
    const el = ui.app.querySelector(`.gr-team[data-t="${t.id}"]`);
    if (el) el.outerHTML = teamPanel(S, ui, t);
  }
}

function drawDoors(S, ui) {
  const box = ui.app.querySelector('.gr-doors');
  if (!box) return;
  box.innerHTML = (S.doors || []).map((d, k) => {
    const hints = (S.hints?.[d.i] || []).map((id) => ui.avatar(ui.p(id))).join('');
    const cls = d.open ? (d.gem ? 'gem' : 'mon') : (S.hints?.[d.i]?.length ? 'hot' : '');
    const by = d.by ? (S.teams || []).find((t) => t.id === d.by) : null;
    return `<div class="gr-door ${cls}" data-d="${d.i}" style="--bc:${by?.color || 'transparent'}">
      <div class="beam"></div>
      <div class="inside">${d.open ? (d.gem ? gem(GEMS[k % GEMS.length]) : '<div class="eyes"><i></i><i></i></div>') : ''}</div>
      <div class="slab"><div class="t">${ui.esc(d.text)}</div><div class="hints">${hints}</div></div>
      ${d.open ? `<div class="rk">${d.rank}<small>место</small></div>` : ''}
    </div>`;
  }).join('');
  const tick = ui.app.querySelector('.gr-ticker');
  if (tick) {
    const team = S.teams?.find((t) => t.id === S.turn);
    const cap = ui.p(S.captain);
    tick.innerHTML = S.phase === 'opened'
      ? (S.last?.gem ? '<b class="ok">Самоцвет!</b> факел разгорается' : '<b class="bad">Чудище!</b> факел гаснет')
      : `ход <b style="color:${team?.color}">${ui.esc(team?.name || '')}</b> · дверь выбирает ${ui.avatar(cap)}<b>${ui.esc(cap?.name || '')}</b> · найдено ${S.found} из ${S.need}`;
  }
}

export default {
  key(S) { return `${S.round}`; },
  wipe(prev, S) {
    if (['guess', 'opened'].includes(prev?.phase) && ['guess', 'opened'].includes(S.phase)) return false;
    return !(prev?.phase === 'descend' && S.phase === 'survey');
  },
  mood(S) { return { teams: 'lobby', descend: 'calm', survey: 'think', guess: 'tense', opened: 'tense', roundEnd: 'reveal', winner: 'win' }[S.phase]; },

  render(S, ui) {
    timers.forEach(clearTimeout); timers = [];
    cave(S.round || 1);
    ui.tag(S.round && !['winner', 'descend'].includes(S.phase) ? `ярус ${S.round} из ${S.rounds}` : '');
    DRAW[S.phase === 'opened' ? 'guess' : S.phase]?.(S, ui);
    if (S.phase === 'opened') reveal(S, ui);
  },

  update(S, ui, prev) {
    if (S.phase === 'survey') {
      for (const d of S.done || []) {
        const el = ui.app.querySelector(`[data-p="${d.id}"]`);
        if (el && d.done && !el.classList.contains('lit')) { el.classList.add('lit'); ui.sfx('torch'); }
      }
    }
    if (S.phase === 'guess' || S.phase === 'opened') {
      drawDoors(S, ui);
      drawTeams(S, ui);
      if (S.phase === 'opened' && prev?.phase === 'guess') reveal(S, ui);
      if (S.phase === 'guess' && prev?.phase === 'opened') ui.sfx('whoosh');
    }
  },

  speak(on) { document.querySelector('.gr-host')?.classList.toggle('talk', on); },

  frame(S, ui) {
    const m = document.getElementById('grMouth');
    if (m) m.style.transform = `scaleY(${(0.6 + ui.mouth() * 1.8).toFixed(3)})`;
  },
};

/* открыли дверь: самоцвет вылетает с искрами, или чудище выпрыгивает на весь экран */
function reveal(S, ui) {
  const el = ui.app.querySelector(`.gr-door[data-d="${S.last?.i}"]`);
  if (!S.last || !el) return;
  if (S.last.gem) {
    ui.fx.burstAt(el, '#2ee59d', 50);
    ui.sfx('coin'); later(200, () => ui.sfx('tada'));
  } else {
    const box = document.createElement('div');
    box.className = 'gr-jump';
    box.innerHTML = monster();
    const r = el.getBoundingClientRect();
    box.style.setProperty('--x', `${r.left + r.width / 2}px`);
    box.style.setProperty('--y', `${r.top + r.height / 2}px`);
    ui.app.appendChild(box);
    ui.sfx('monster'); ui.fx.shake(ui.app);
    later(500, () => ui.sfx('aww'));
    later(2200, () => box.remove());
    const torch = ui.app.querySelector(`.gr-team[data-t="${S.last.team}"] .torch:not(.out):last-of-type`);
    torch?.classList.add('dying');
  }
}

const DRAW = {
  teams(S, ui) {
    ui.app.innerHTML = `
      <div class="gr-intro">
        <div class="gr-title">${letters('МЕДНАЯ ГОРА')}</div>
        <div class="gr-carts">${(S.teams || []).map((t, k) => `
          <div class="gr-cart ${k ? 'r' : 'l'}" style="--tc:${t.color}">
            <div class="name">${ui.esc(t.name)}</div>
            <div class="crew">${t.members.map((id) => ui.avatar(ui.p(id), 'bob')).join('')}</div>
            <div class="tub"></div><div class="wh"><i></i><i></i></div>
            <div class="torches">${torchesHTML(3)}</div>
          </div>`).join('')}</div>
        ${hostess('mid')}
      </div>`;
    ui.sfx('rumble');
    later(900, () => ui.sfx('torch'));
  },

  descend(S, ui) {
    ui.app.innerHTML = `
      <div class="gr-desc">
        <div class="gr-depth"><small>спуск на</small><b>${S.round}</b><small>ярус</small></div>
        <div class="gr-track"><div class="gr-cart solo"><div class="tub"></div><div class="wh"><i></i><i></i></div><div class="lamp"></div></div></div>
        <div class="gr-goal">${ui.esc(S.goalText || '')}</div>
        ${hostess('corner')}
      </div>`;
    ui.sfx('gurney');
    later(1200, () => ui.sfx('rumble'));
  },

  survey(S, ui) {
    ui.app.innerHTML = `
      <div class="gr-survey">
        <div class="gr-tablet"><small>каждый тайно выбирает свой топ-3</small><div class="q">${ui.esc(S.question)}</div></div>
        <div class="gr-crys">${(S.options || []).map((o, i) => `<span style="--c:${GEMS[i % GEMS.length]};animation-delay:${(0.3 + i * 0.08).toFixed(2)}s">${ui.esc(o)}</span>`).join('')}</div>
        <div class="gr-lanterns">${(S.done || []).map((d) => `<span class="${d.done ? 'lit' : ''}" data-p="${d.id}">${ui.avatar(ui.p(d.id))}<i></i><b>${ui.esc(ui.p(d.id)?.name || '')}</b></span>`).join('')}</div>
        ${hostess('corner')}
      </div>`;
  },

  guess(S, ui) {
    const [A, B] = S.teams || [];
    ui.tag(`ярус ${S.round} из ${S.rounds} · самоцвет ${ui.fmt(S.value)}`);
    ui.app.innerHTML = `
      <div class="gr-wrap">
        ${A ? teamPanel(S, ui, A) : '<div></div>'}
        <div class="gr-mid">
          <div class="gr-q"><div class="q">${ui.esc(S.question)}</div><div class="goal">${ui.esc(S.goal)}</div></div>
          <div class="gr-doors"></div>
          <div class="gr-ticker"></div>
        </div>
        ${B ? teamPanel(S, ui, B) : '<div></div>'}
      </div>`;
    drawDoors(S, ui);
  },

  roundEnd(S, ui) {
    const max = Math.max(1, ...(S.ranking || []).map((r) => r.pts));
    ui.app.innerHTML = `
      <div class="gr-end">
        <div class="gr-tablet small"><small>вот что на самом деле думает комната</small><div class="q">${ui.esc(S.question)}</div></div>
        <div class="gr-veins">${(S.ranking || []).map((r, i) => `
          <div class="v ${r.target ? 't' : ''}" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s"><b>${r.rank}</b><span>${ui.esc(r.text)}</span>
            <div class="ore"><i style="--w:${(r.pts / max) * 100}%;animation-delay:${(0.6 + i * 0.12).toFixed(2)}s"></i></div><em>${r.pts}</em>${r.target ? gem(GEMS[i % GEMS.length], 'mini') : ''}</div>`).join('')}</div>
        ${hostess('corner')}
      </div>`;
    (S.ranking || []).forEach((r, i) => later(600 + i * 120, () => ui.sfx(r.target ? 'coin' : 'clack')));
  },

  winner(S, ui) {
    const [A, B] = S.teams || [];
    const win = S.teamScore.A === S.teamScore.B ? null : S.teamScore.A > S.teamScore.B ? A : B;
    const sage = ui.p(S.titles?.sage), crow = ui.p(S.titles?.crow);
    ui.app.innerHTML = `
      <div class="gr-win">
        <div class="gr-sun"></div>
        <div class="kick">${win ? 'из горы на свет выходит команда' : 'ничья — гора отпускает всех'}</div>
        ${win ? `<div class="team" style="color:${win.color}">${ui.esc(win.name)}</div>
          <div class="crew">${win.members.map((id) => `<span>${ui.avatar(ui.p(id), 'bob', { mood: 'wow' })}<b>${ui.esc(ui.p(id)?.name || '')}</b></span>`).join('')}</div>` : ''}
        <div class="scores">${A ? `<span style="color:${A.color}">${ui.esc(A.name)}: <b>${ui.fmt(S.teamScore.A)}</b></span>` : ''}${B ? `<span style="color:${B.color}">${ui.esc(B.name)}: <b>${ui.fmt(S.teamScore.B)}</b></span>` : ''}</div>
        <div class="titles">
          ${sage ? `<div class="tt"><i>🧙</i><small>знаток народа</small>${ui.avatar(sage)}<b>${ui.esc(sage.name)}</b></div>` : ''}
          ${crow && crow.id !== sage?.id ? `<div class="tt"><i>🐦‍⬛</i><small>белая ворона</small>${ui.avatar(crow)}<b>${ui.esc(crow.name)}</b></div>` : ''}
        </div>
        ${hostess('corner')}
      </div>`;
    ui.sfx('tada');
    later(500, () => ui.sfx('cheer'));
    if (win) ui.fx.confetti(['#18c88a', '#f2c14e', '#e2803a', '#7ff6ff']);
  },
};
