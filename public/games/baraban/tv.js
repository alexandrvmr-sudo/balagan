/* Барабан — экран. Великий Барабан с лицом на ступице, лампочки по ободу, колышки щёлкают,
   язычок подпрыгивает. Вращение считается здесь же по кадрам: откуда, куда и сколько миллисекунд — скажет сервер. */

const PAL = [['#c81d4e', '#fff4e0'], ['#ffc93c', '#3a1d00'], ['#18b5a4', '#00201c'], ['#4361ee', '#fff4e0']];
const KIND = {
  multi: ['☑', 'выберите все верные'],
  number: ['#', 'угадайте число'],
  list: ['✎', 'назовите как можно больше'],
  match: ['⇄', 'соедините пары'],
  poll: ['☝', 'кто из нас?'],
};
const LOSE = ['ЕЩЁ КРУГ', 'НЕ СЕГОДНЯ', 'ПОЧТИ', 'МИМО', 'ХА-ХА', 'РАНО'];
const LEVEL = { adult: '18+', hard: 'ЖЕСТЬ' };

/* ---------- состояние вращения ---------- */
const W = { angle: 0, step: 22.5, peg: 0, raf: 0, played: null };
let lastPeg = 0;
let timers = [];
const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(W.raf); };

function apply() {
  const g = document.getElementById('brRot');
  if (g) g.setAttribute('transform', `rotate(${W.angle.toFixed(2)} 200 200)`);
}
function mount(angle, n) {
  W.angle = angle; W.step = 360 / n; W.peg = Math.floor(angle / W.step);
  apply();
}
function tick(ui) {
  const k = Math.floor(W.angle / W.step);
  if (k === W.peg) return;
  W.peg = k;
  const now = performance.now();
  if (now - lastPeg > 30) { ui.sfx('peg'); lastPeg = now; }
  const p = document.getElementById('brPtr');
  if (p) { p.classList.remove('flap'); void p.getBoundingClientRect(); p.classList.add('flap'); }
}
/* кубическое замедление: быстро стартует, долго ползёт к последнему колышку */
function play(ui, spin, skew, onDone) {
  cancelAnimationFrame(W.raf);
  const start = spin.at + skew;
  const face = document.querySelector('.br-face');
  face?.classList.add('dizzy');
  const frame = () => {
    const t = Math.min(1, Math.max(0, (Date.now() - start) / spin.dur));
    const e = 1 - Math.pow(1 - t, 3);
    W.angle = spin.from + (spin.to - spin.from) * e;
    apply();
    tick(ui);
    if (t < 1) W.raf = requestAnimationFrame(frame);
    else { face?.classList.remove('dizzy'); onDone?.(); }
  };
  frame();
}

/* ---------- барабан ---------- */
function cellsOf(S, ui) {
  return (S.wheel || []).map((c, i) => {
    if (c.k === 'num') return { label: ui.fmt(c.v), fill: PAL[i % 4][0], ink: PAL[i % 4][1] };
    if (c.k === 'bank') return { label: 'БАНКРОТ', fill: '#121212', ink: '#ff4d6d', fs: 12.5 };
    if (c.k === 'prize') return { label: 'ПРИЗ', fill: '#8e2de2', ink: '#ffe066', icon: '🎁' };
    return { label: '×2', fill: '#b8f400', ink: '#1a2b00', fs: 26 };
  });
}

function wheelSVG(cells, { slices = null, ui = null, face = true, hit = null } = {}) {
  const n = cells.length, cx = 200, cy = 200, R = 182, step = 360 / n;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (r, d) => [cx + r * Math.cos(rad(d - 90)), cy + r * Math.sin(rad(d - 90))];
  let segs = '', labels = '', pegs = '', chips = '';
  cells.forEach((c, i) => {
    const a1 = i * step, a2 = a1 + step, am = a1 + step / 2;
    const [x1, y1] = pt(R, a1), [x2, y2] = pt(R, a2);
    segs += `<path data-i="${i}" class="${hit === i ? 'hit' : ''}" d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z" fill="${c.fill}" stroke="#2a0a14" stroke-width="2.5"/>`;
    const [lx, ly] = pt(c.icon ? 142 : 149, am);
    labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" transform="rotate(${(am - 90).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-family="Oswald, sans-serif" font-weight="700" font-size="${c.fs || 17}" fill="${c.ink}" letter-spacing=".5">${c.label}</text>`;
    if (c.icon) { const [ix, iy] = pt(96, am); labels += `<text x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="18">${c.icon}</text>`; }
    const [px, py] = pt(176, a1);
    pegs += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.6" fill="#ffe8a3" stroke="#5a2a00" stroke-width="1.4"/>`;
  });
  // сектора игроков: кружки цвета игрока, по два в ряд, от обода к центру
  if (slices && ui) {
    const per = {};
    for (const [pid, m] of Object.entries(slices)) for (const [c, cnt] of Object.entries(m)) (per[c] = per[c] || []).push({ pid, cnt });
    for (const [c, list] of Object.entries(per)) {
      const am = (Number(c) + 0.5) * step;
      list.slice(0, 6).forEach((it, k) => {
        const p = ui.p(it.pid);
        if (!p) return;
        const ring = Math.floor(k / 2), side = k % 2 ? 1 : -1;
        const [x, y] = pt(106 - ring * 19, am + (list.length > 1 || k > 0 ? side * 5.6 : 0));
        const more = k === 5 && list.length > 6 ? `+${list.length - 5}` : it.cnt > 1 ? it.cnt : '';
        chips += `<g class="chip" data-c="${c}" style="--d:${(k * 0.07 + Number(c) * 0.02).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.5" fill="${p.color}" stroke="#fff" stroke-width="2.2"/>${more ? `<text x="${x.toFixed(1)}" y="${(y + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Oswald" font-weight="700" font-size="10" fill="#1a0a10">${more}</text>` : ''}</g>`;
      });
    }
  }
  const bulbs = Array.from({ length: 32 }, (_, i) => { const [x, y] = pt(192, (i / 32) * 360); return `<circle class="bulb b${i % 2}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.6"/>`; }).join('');
  return `<svg class="br-wheel" viewBox="-14 -42 428 456" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="brRim" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffe08a"/><stop offset=".6" stop-color="#d89b22"/><stop offset="1" stop-color="#7a4a08"/></radialGradient>
      <radialGradient id="brHub" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc93c"/><stop offset="1" stop-color="#c47f0a"/></radialGradient>
      <radialGradient id="brShade" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
    </defs>
    <ellipse cx="200" cy="404" rx="150" ry="14" fill="#000" opacity=".35"/>
    <circle cx="200" cy="200" r="204" fill="url(#brRim)" stroke="#3a1d00" stroke-width="4"/>
    <g class="br-bulbs">${bulbs}</g>
    <g id="brRot">${segs}<circle cx="200" cy="200" r="${R}" fill="url(#brShade)"/>${labels}${pegs}${chips}</g>
    ${face ? faceSVG() : '<circle cx="200" cy="200" r="34" fill="url(#brHub)" stroke="#5a2a00" stroke-width="5"/>'}
    <g id="brPtr"><path d="M200 34L182 -14Q200 -34 218 -14Z" fill="#ff2e63" stroke="#fff4e0" stroke-width="4" stroke-linejoin="round"/><circle cx="200" cy="-16" r="7" fill="#ffd23f" stroke="#5a2a00" stroke-width="3"/></g>
  </svg>`;
}

/* лицо Великого Барабана: корона, усы, глаза бегают, рот — по голосу */
function faceSVG() {
  return `<g class="br-face">
    <path d="M168 150l8-24 14 14 10-20 10 20 14-14 8 24z" fill="#ffd23f" stroke="#5a2a00" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="190" cy="134" r="3" fill="#ff2e63"/><circle cx="200" cy="124" r="3.5" fill="#18b5a4"/><circle cx="210" cy="134" r="3" fill="#ff2e63"/>
    <circle cx="200" cy="200" r="52" fill="url(#brHub)" stroke="#5a2a00" stroke-width="5"/>
    <path class="br-brow" d="M172 178q10-8 20-2M208 176q10-6 20 2" stroke="#3a1d00" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g class="br-eyes"><ellipse cx="183" cy="192" rx="9" ry="11" fill="#fff" stroke="#3a1d00" stroke-width="2.5"/><ellipse cx="217" cy="192" rx="9" ry="11" fill="#fff" stroke="#3a1d00" stroke-width="2.5"/>
      <g class="br-pupils"><circle cx="184" cy="194" r="4.6" fill="#1a0a10"/><circle cx="218" cy="194" r="4.6" fill="#1a0a10"/></g></g>
    <g id="brMouth"><ellipse cx="200" cy="224" rx="11" ry="6" fill="#4a0018" stroke="#3a1d00" stroke-width="2.5"/><ellipse cx="200" cy="227" rx="6" ry="2.5" fill="#ff6b8b"/></g>
    <path d="M200 212c-6-6-18-8-26-2 6 0 10 6 18 6 4 0 6-2 8-4zM200 212c6-6 18-8 26-2-6 0-10 6-18 6-4 0-6-2-8-4z" fill="#3a1d00"/>
  </g>`;
}

function winCells(win) {
  let k = 0;
  return (win?.slots || []).map((ok, i) => (ok ? { label: 'ПОБЕДА', fill: '#ffd23f', ink: '#3a1d00', fs: 14 } : { label: LOSE[k++ % LOSE.length], fill: i % 2 ? '#2b2d42' : '#3d405b', ink: '#cfd3ff', fs: 11.5 }));
}

/* ---------- мелочи ---------- */
const letters = (t, d0 = 0) => [...t].map((c, i) => (c === ' ' ? '<i class="sp"> </i>' : `<i style="animation-delay:${(d0 + i * 0.05).toFixed(2)}s">${c}</i>`)).join('');
const wedges = (n, d0 = 0) => Array.from({ length: n }, (_, i) => `<i class="wedge" style="animation-delay:${(d0 + i * 0.12).toFixed(2)}s"></i>`).join('');
const lvl = (S) => (LEVEL[S.level] ? `<span class="br-lvl l-${S.level}">${LEVEL[S.level]}</span>` : '');
function chipsRow(S, ui, list, extra = () => '') {
  return `<div class="br-row">${list.map((w) => { const p = ui.p(w.id) || {}; return `<span class="br-pp ${w.done ? 'done' : ''}" data-p="${w.id}">${ui.avatar(p, w.done ? 'hop' : '')}<b style="color:${p.color}">${ui.esc(p.name)}</b>${extra(w)}</span>`; }).join('')}</div>`;
}
const skewOf = (S) => (S.now ? Date.now() - S.now : 0);

export default {
  key(S) {
    if (S.phase === 'question' || S.phase === 'qresult') return `${S.set}:${S.qn}`;
    if (S.phase === 'spinWait' || S.phase === 'spinning') return `${S.set}:${S.spinNo}`;
    return `${S.set}`;
  },
  wipe(prev, S) {
    const calm = ['place', 'spinWait', 'spinning'];
    if (calm.includes(prev?.phase) && calm.includes(S.phase)) return false;
    if (['winIntro', 'winWait', 'winSpin'].includes(prev?.phase) && ['winWait', 'winSpin'].includes(S.phase)) return false;
    return !(prev?.phase === 'question' && S.phase === 'qresult') && !(prev?.phase === 'intro' && S.phase === 'ask');
  },
  mood(S) {
    return { intro: 'reveal', ask: 'calm', roundIntro: 'reveal', question: 'think', qresult: 'reveal', place: 'calm', spinWait: 'tense', spinning: 'tense', roundEnd: 'win', winIntro: 'tense', winWait: 'tense', winSpin: 'tense', winner: 'win' }[S.phase];
  },

  render(S, ui) {
    clearTimers();
    ui.tag(S.set && !['winner', 'roundIntro'].includes(S.phase) ? `раунд ${S.set} · цель ${ui.fmt(S.goal)}` : '');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    if (['ask', 'question', 'place'].includes(S.phase)) {
      const list = S.progress || Object.entries(S.earned || {}).filter(([, n]) => n > 0).map(([id]) => ({ id, done: !!S.placed?.[id] }));
      for (const w of list) {
        const el = ui.app.querySelector(`.br-pp[data-p="${w.id}"]`);
        if (!el) continue;
        if (w.done && !el.classList.contains('done')) { ui.sfx(S.phase === 'place' ? 'clack' : 'pop'); el.querySelector('.cav')?.classList.add('hop'); }
        el.classList.toggle('done', !!w.done);
        const b = el.querySelector('.n');
        if (b && w.n != null && b.textContent !== String(w.n)) { b.textContent = w.n; ui.sfx('coin'); }
      }
    }
  },

  frame(S, ui) {
    const m = document.getElementById('brMouth');
    if (m) m.style.transform = `scaleY(${(0.7 + ui.mouth() * 1.9).toFixed(3)})`;
  },
};

/* ---------- экраны ---------- */
const DRAW = {
  intro(S, ui) {
    ui.app.innerHTML = `
      <div class="br-intro">
        <div class="br-title">${letters('ВЕЛИКИЙ БАРАБАН')}</div>
        <div class="br-big spinidle">${wheelSVG(cellsOf({ wheel: S.wheel?.length ? S.wheel : demoWheel() }, ui))}</div>
        <div class="br-subt">знает ответы на все вопросы · почти</div>
      </div>`;
    mount(0, 16);
    ui.sfx('sting');
    later(900, () => ui.sfx('drumroll'));
  },

  ask(S, ui) {
    ui.app.innerHTML = `
      <div class="br-split">
        <div class="br-wbox">${wheelSVG(cellsOf({ wheel: demoWheel() }, ui))}</div>
        <div class="br-panel">
          <div class="br-h">Спросите Барабан</div>
          <div class="br-lead">о чём угодно. Победитель получит ответ — честный, наверное</div>
          ${chipsRow(S, ui, S.progress || [], (w) => `<span class="env">${w.done ? '✉️' : '…'}</span>`)}
        </div>
      </div>`;
    mount(0, 16);
  },

  roundIntro(S, ui) {
    ui.app.innerHTML = `
      <div class="br-rintro">
        <div class="br-rays"></div>
        <div class="br-ghost spinidle">${wheelSVG(cellsOf(S, ui), { face: false })}</div>
        <div class="br-rcard">
          <div class="kick">раунд</div>
          <div class="num">${letters(String(S.set), 0.2)}</div>
          <div class="grow">${S.grow > 1 ? `сектора дороже ×${String(S.grow).replace('.', ',')}` : 'сектора от 500 до 5 000'}</div>
          <div class="types">${(S.types || []).map((t, i) => `<span style="animation-delay:${(0.9 + i * 0.2).toFixed(2)}s"><i>${KIND[t][0]}</i>${KIND[t][1]}</span>`).join('')}</div>
          ${lvl(S)}
        </div>
      </div>`;
    mount(0, 16);
    ui.sfx('drumroll');
    later(1200, () => { ui.sfx('cymbal'); ui.fx.shake(ui.app.querySelector('.br-rcard')); });
  },

  question(S, ui) {
    const [ic, kind] = KIND[S.type];
    let body = '';
    if (S.type === 'multi') body = `<div class="br-opts">${S.options.map((o, i) => `<div class="br-opt" style="animation-delay:${(0.3 + i * 0.07).toFixed(2)}s">${ui.esc(o)}</div>`).join('')}</div>`;
    if (S.type === 'number') body = '<div class="br-guess"><span>?</span></div>';
    if (S.type === 'list') body = `<div class="br-slots">${Array.from({ length: S.need }, (_, i) => `<i style="animation-delay:${(0.2 + i * 0.04).toFixed(2)}s"></i>`).join('')}</div><div class="br-lead">правильных ответов: ${S.need}</div>`;
    if (S.type === 'match') body = `<div class="br-match"><div>${S.left.map((x, i) => `<span><b>${i + 1}</b>${ui.esc(x)}</span>`).join('')}</div><div>${S.right.map((x, i) => `<span><b>${'АБВГДЕ'[i]}</b>${ui.esc(x)}</span>`).join('')}</div></div>`;
    if (S.type === 'poll') body = `<div class="br-pollg">${S.players.filter((p) => !p.audience).map((p, i) => `<span style="animation-delay:${(0.2 + i * 0.08).toFixed(2)}s">${ui.avatar(p, 'bob')}<b style="color:${p.color}">${ui.esc(p.name)}</b></span>`).join('')}</div>`;
    ui.app.innerHTML = `
      <div class="br-qwrap">
        <div class="br-mini">${wheelSVG(cellsOf(S, ui))}</div>
        <div class="br-qmain">
          <div class="br-kind"><i>${ic}</i>вопрос ${S.qn} из ${S.per} · ${kind}</div>
          <div class="br-qq">${ui.esc(S.q)}</div>
          ${body}
          ${chipsRow(S, ui, S.progress || [], (w) => (w.n != null ? ` <b class="n">${w.n}</b>` : ''))}
        </div>
      </div>`;
    mount(S.angle || 0, (S.wheel || []).length || 16);
    ui.sfx('whoosh');
  },

  qresult(S, ui) {
    const rows = S.rows || [];
    let answer = '';
    if (S.type === 'number') answer = numberLine(S, ui);
    else if (S.type === 'poll') answer = `<div class="br-stars">${(S.stars || []).map((id) => { const p = ui.p(id) || {}; return `<span>${ui.avatar(p, 'bob', { mood: 'wow' })}<b style="color:${p.color}">${ui.esc(p.name)}</b><small>звезда опроса</small></span>`; }).join('') || '<span>никто не голосовал</span>'}</div>`;
    else answer = `<div class="br-answers ${S.type}">${S.correct.map((c, i) => `<span style="animation-delay:${(0.2 + i * 0.08).toFixed(2)}s">${ui.esc(c)}</span>`).join('')}</div>`;
    ui.app.innerHTML = `
      <div class="br-qwrap">
        <div class="br-mini">${wheelSVG(cellsOf(S, ui))}</div>
        <div class="br-qmain">
          <div class="br-kind"><i>✓</i>${S.type === 'poll' ? 'зал решил' : S.type === 'number' ? 'правильный ответ' : 'правильные ответы'}</div>
          <div class="br-qq small">${ui.esc(S.q)}</div>
          ${answer}
          <div class="br-res">${rows.map((r, i) => { const p = ui.p(r.id) || {}; return `<div class="r" style="animation-delay:${(0.6 + i * 0.12).toFixed(2)}s">${ui.avatar(p)}<span class="nm"><b style="color:${p.color}">${ui.esc(p.name)}</b><small>${ui.esc(r.detail || '')}</small></span><span class="sl">${r.slices ? `${wedges(r.slices, 1 + i * 0.12)}<b>+${r.slices}</b>` : '<em>—</em>'}</span></div>`; }).join('')}</div>
        </div>
      </div>`;
    mount(S.angle || 0, (S.wheel || []).length || 16);
    later(1000, () => ui.sfx('coin'));
    later(1400, () => ui.sfx(rows.some((r) => r.slices) ? 'cash' : 'aww'));
  },

  place(S, ui) {
    const list = Object.entries(S.earned || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, done: !!S.placed?.[id] }));
    ui.app.innerHTML = `
      <div class="br-split">
        <div class="br-wbox">${wheelSVG(cellsOf(S, ui))}</div>
        <div class="br-panel">
          <div class="br-h">Ставьте сектора</div>
          <div class="br-lead">тайно, на телефонах. Совпали — делите выигрыш. Мимо «Банкрота»!</div>
          ${chipsRow(S, ui, list, (w) => ` <span class="wd">${wedges(w.n)}</span>`)}
          <div class="br-legend"><span><i style="background:#121212"></i>Банкрот — минус очки</span><span><i style="background:#8e2de2"></i>Приз — сюрприз</span><span><i style="background:#b8f400"></i>×2 — следующий вдвое</span></div>
        </div>
      </div>`;
    mount(S.angle || 0, S.wheel.length);
  },

  spinWait(S, ui) {
    const p = ui.p(S.spinner) || {};
    ui.app.innerHTML = `
      <div class="br-split">
        <div class="br-wbox wob">${wheelSVG(cellsOf(S, ui), { slices: S.slices, ui })}</div>
        <div class="br-panel">
          <div class="br-kick">оборот ${S.spinNo} из ${S.spinsTotal}</div>
          ${S.double ? '<div class="br-x2">×2 на этот оборот!</div>' : ''}
          <div class="br-spinner">${ui.avatar(p, 'bob')}<div><small>крутит</small><b style="color:${p.color}">${ui.esc(p.name || '')}</b></div></div>
          <div class="br-swipe"><span class="hand">👆</span><span>свайпни на телефоне!</span></div>
        </div>
      </div>`;
    mount(S.angle || 0, S.wheel.length);
    if (S.spinNo === 1) for (const el of ui.app.querySelectorAll('.chip')) el.classList.add('drop');
    ui.sfx(S.spinNo === 1 ? 'pop' : 'whoosh');
  },

  spinning(S, ui) {
    const sp = S.spin;
    if (!sp) return;
    const p = ui.p(S.spinner) || {};
    ui.app.innerHTML = `
      <div class="br-split">
        <div class="br-wbox">${wheelSVG(cellsOf(S, ui), { slices: S.slices, ui })}</div>
        <div class="br-panel" id="brRes">
          <div class="br-kick">оборот ${S.spinNo} из ${S.spinsTotal}</div>
          <div class="br-spinner small">${ui.avatar(p)}<div><small>крутит</small><b style="color:${p.color}">${ui.esc(p.name || '')}</b></div></div>
          <div class="br-power"><i style="--w:${Math.round(sp.power * 100)}%"></i><span>сила: ${Math.round(sp.power * 100)}%</span></div>
        </div>
      </div>`;
    mount(sp.from, S.wheel.length);
    const skew = skewOf(S);
    if (Date.now() - skew - sp.at < 400) ui.sfx('whoosh2');
    later(Math.max(0, sp.at + skew + sp.dur * 0.6 - Date.now()), () => ui.sfx('drumroll'));
    play(ui, sp, skew, () => result(S, ui));
  },

  roundEnd(S, ui) {
    const w = S.roundWin;
    const wps = (w?.ids || []).map((id) => ui.p(id)).filter(Boolean);
    const wp = wps[0];
    const list = S.players.filter((p) => !p.audience).sort((a, b) => b.score - a.score);
    ui.app.innerHTML = `
      <div class="br-rend">
        <div class="br-rhead">
          <div class="kick">${wps.length > 1 ? `раунд ${S.set} делят` : `победитель раунда ${S.set}`}</div>
          ${wps.length ? `<div class="hero ${wps.length > 1 ? 'many' : ''}">${wps.map((x) => `<span class="one">${ui.avatar(x, 'bob', { mood: 'wow' })}<span class="crown">👑</span><b style="color:${x.color}">${ui.esc(x.name)}</b></span>`).join('')}<em>+${ui.fmt(w.pts)}</em></div>` : '<div class="hero none">Барабан забрал всё себе</div>'}
        </div>
        <div class="br-race">
          <div class="goal" style="--g:92%"><span>цель ${ui.fmt(S.goal)}</span></div>
          ${list.map((p, i) => { const g = S.roundGain?.[p.id] || 0; const pct = (v) => Math.max(0, Math.min(100, (v / S.goal) * 92)); return `
            <div class="lane" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s">${ui.avatar(p)}<div class="track"><i style="--from:${pct(p.score - g)}%;--to:${pct(p.score)}%;background:${p.color}"></i><span>${ui.esc(p.name)}</span></div><b data-sc="${p.id}">${ui.fmt(p.score - g)}</b><small class="${g < 0 ? 'neg' : ''}">${g ? (g > 0 ? '+' : '') + ui.fmt(g) : ''}</small></div>`; }).join('')}
        </div>
      </div>`;
    ui.sfx('drumroll');
    later(1300, () => {
      ui.sfx(wp ? 'tada' : 'aww');
      if (wp) { ui.sfx('cheer'); ui.fx.confetti(undefined, 90); }
      ui.app.querySelector('.br-race')?.classList.add('go');
      for (const el of ui.app.querySelectorAll('[data-sc]')) { const p = ui.p(el.dataset.sc); const g = S.roundGain?.[p.id] || 0; ui.fx.countUp(el, p.score - g, p.score, 1400); }
    });
  },

  winIntro(S, ui) { winWheel(S, ui, 'intro'); },
  winWait(S, ui) { winWheel(S, ui, 'wait'); },
  winSpin(S, ui) { winWheel(S, ui, 'spin'); },

  winner(S, ui) {
    const p = ui.p(S.winner) || {};
    const list = S.players.filter((x) => !x.audience);
    ui.app.innerHTML = `
      <div class="br-final">
        <div class="br-rays gold"></div>
        <div class="br-orc">${wheelSVG(cellsOf({ wheel: demoWheel() }, ui))}</div>
        <div class="br-ocol">
          <div class="kick">победитель</div>
          <div class="who">${ui.avatar(p, 'bob', { mood: 'wow' })}<b style="color:${p.color}">${ui.esc(p.name || '—')}</b></div>
          <div class="br-scroll"><div class="q">«${ui.esc(S.oracle?.q || '')}»</div><div class="a" id="oa"></div></div>
          ${ui.podium(list)}
        </div>
      </div>`;
    mount(0, 16);
    ui.sfx('drumroll');
    later(1500, () => {
      ui.fx.typewriter(ui.app.querySelector('#oa'), S.oracle?.a || '', 26, () => ui.sfx('type'));
      ui.sfx('tada'); ui.sfx('cheer');
      ui.fx.confetti(['#ffd23f', '#c81d4e', '#18b5a4', '#4361ee', '#fff4e0']);
    });
  },
};

/* что выпало: крупно сектор, ниже — кому сколько */
function result(S, ui) {
  const sp = S.spin;
  const box = document.getElementById('brRes');
  if (!box) return;
  document.querySelector(`#brRot path[data-i="${sp.sector}"]`)?.classList.add('hit');
  for (const el of document.querySelectorAll(`#brRot .chip[data-c="${sp.sector}"]`)) el.classList.add('win');
  const pays = Object.entries(sp.pay || {});
  const title = sp.kind === 'bank' ? 'БАНКРОТ' : sp.kind === 'x2' ? '×2' : sp.kind === 'prize' ? `ПРИЗ · ${ui.fmt(sp.value)}` : ui.fmt(sp.value);
  const note = sp.kind === 'x2' ? (sp.extra ? 'и бонусный оборот!' : 'следующий оборот платит вдвое')
    : sp.empty ? 'сюда никто не поставил' : sp.kind === 'bank' ? 'минус очки тем, кто здесь стоял' : sp.mult > 1 ? 'вдвойне!' : 'делят те, кто здесь стоял';
  box.insertAdjacentHTML('beforeend', `
    <div class="br-hit k-${sp.kind} ${sp.empty ? 'empty' : ''}"><b>${title}</b><small>${note}</small></div>
    <div class="br-pay">${pays.map(([id, pts], i) => { const p = ui.p(id) || {}; return `<div class="r ${pts < 0 ? 'neg' : ''}" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><b>${pts > 0 ? '+' : ''}${ui.fmt(pts)}</b></div>`; }).join('')}</div>`);
  ui.sfx('ding');
  ui.fx.burstAt(document.getElementById('brPtr'), sp.kind === 'bank' ? '#ff4d6d' : '#ffd23f', 40);
  if (sp.kind === 'bank') later(300, () => { ui.sfx(pays.length ? 'sad' : 'ooh'); if (pays.length) ui.sfx('laugh'); ui.fx.shake(ui.app); });
  else if (sp.kind === 'x2') later(300, () => ui.sfx('airhorn'));
  else if (sp.empty) later(300, () => ui.sfx('aww'));
  else later(300, () => { ui.sfx('cash'); ui.sfx(sp.kind === 'prize' ? 'tada' : 'applause'); if (sp.kind === 'prize') ui.fx.confetti(undefined, 80); });
}

/* колесо победы: золото — победа, остальное — «ещё круг» */
function winWheel(S, ui, step) {
  const w = S.win || {};
  const p = ui.p(w.pid) || {};
  const wins = (w.slots || []).filter(Boolean).length;
  ui.app.innerHTML = `
    <div class="br-split win">
      <div class="br-wbox ${step === 'wait' ? 'wob' : ''}">${wheelSVG(winCells(w))}</div>
      <div class="br-panel" id="brRes">
        <div class="br-h gold">Колесо победы</div>
        <div class="br-spinner">${ui.avatar(p, 'bob')}<div><small>${w.tries > 1 ? `попытка ${w.tries}` : 'первая попытка'}</small><b style="color:${p.color}">${ui.esc(p.name || '')}</b></div></div>
        <div class="br-lead">победных секторов: <b class="gold">${wins} из ${(w.slots || []).length}</b></div>
        ${step === 'wait' ? '<div class="br-swipe"><span class="hand">👆</span><span>свайпни на телефоне!</span></div>' : ''}
      </div>
    </div>`;
  mount(w.spin && step === 'spin' ? w.spin.from : w.angle || 0, (w.slots || []).length || 12);
  if (step === 'intro') { ui.sfx('drumroll'); later(1200, () => ui.sfx('cymbal')); }
  if (step === 'spin' && w.spin) {
    const skew = skewOf(S);
    later(Math.max(0, w.spin.at + skew + w.spin.dur * 0.55 - Date.now()), () => ui.sfx('drumroll'));
    play(ui, w.spin, skew, () => {
      document.querySelector(`#brRot path[data-i="${w.spin.sector}"]`)?.classList.add('hit');
      document.getElementById('brRes')?.insertAdjacentHTML('beforeend', `<div class="br-hit ${w.won ? 'k-win' : 'k-bank'}"><b>${w.won ? 'ПОБЕДА!' : 'ЕЩЁ КРУГ'}</b><small>${w.won ? 'Барабан склоняет обод' : 'в следующий раз победных секторов станет больше'}</small></div>`);
      if (w.won) { ui.sfx('tada'); ui.sfx('cheer'); ui.fx.confetti(); ui.fx.shake(ui.app); }
      else { ui.sfx('sad'); ui.sfx('aww'); }
    });
  }
}

/* числовая прямая: куда целились игроки и где правда */
function numberLine(S, ui) {
  const ans = Number(S.correct?.[0]);
  const guesses = (S.rows || []).filter((r) => Number.isFinite(r.guess)).map((r) => ({ id: r.id, v: r.guess }));
  const all = [ans, ...guesses.map((g) => g.v)];
  let lo = Math.min(...all), hi = Math.max(...all);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08;
  const x = (v) => (((v - lo + pad) / (hi - lo + 2 * pad)) * 100).toFixed(2);
  return `<div class="br-nl">
    <div class="ans" style="left:${x(ans)}%"><b>${Number.isInteger(ans) ? ui.fmt(ans) : String(ans).replace('.', ',')}</b></div>
    <div class="axis"></div>
    ${guesses.map((g, i) => `<div class="g" style="left:${x(g.v)}%;animation-delay:${(0.4 + i * 0.12).toFixed(2)}s;--row:${i % 3}">${ui.avatar(ui.p(g.id))}</div>`).join('')}
  </div>`;
}

/* барабан до первого раунда — чтобы было на что смотреть */
function demoWheel() {
  return [1000, 2500, 'bank', 1500, 5000, 750, 3000, 'x2', 2000, 1250, 4000, 'prize', 1750, 500, 3500, 2250].map((v) => (typeof v === 'number' ? { k: 'num', v } : { k: v }));
}
