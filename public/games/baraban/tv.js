/* Барабан — экран */

const COLORS = ['#8b1e3f', '#ffd23f', '#2ec4b6', '#3d5afe'];
const INK = ['#fff4e0', '#3a1d00', '#00201c', '#fff4e0'];
const KIND = { multi: 'выберите все верные', number: 'угадайте число', list: 'назовите как можно больше' };
let lastAngle = 0;
let lastSpin = 0;

/* барабан: 16 секторов, огни по ободу, глазки на ступице, сектора игроков крутятся вместе с ним */
function wheel(S, ui, { slices = null, eyes = true } = {}) {
  const n = S.sectors.length, R = 180, cx = 200, cy = 200;
  const step = (Math.PI * 2) / n;
  let segs = '', labels = '', marks = '';
  S.sectors.forEach((v, i) => {
    const a1 = -Math.PI / 2 + i * step, a2 = a1 + step;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    segs += `<path d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}z" fill="${COLORS[i % 4]}" stroke="#1c0610" stroke-width="2"/>`;
    const am = a1 + step / 2, deg = (am * 180) / Math.PI;
    labels += `<text x="${cx + 128 * Math.cos(am)}" y="${cy + 128 * Math.sin(am)}" transform="rotate(${deg + 90} ${cx + 128 * Math.cos(am)} ${cy + 128 * Math.sin(am)})" text-anchor="middle" dominant-baseline="middle" font-family="Oswald" font-weight="700" font-size="17" fill="${INK[i % 4]}">${v}</text>`;
  });
  if (slices) {
    for (const [pid, m] of Object.entries(slices)) {
      const p = ui.p(pid);
      if (!p) continue;
      for (const [c, cnt] of Object.entries(m)) {
        const am = -Math.PI / 2 + (Number(c) + 0.5) * step;
        const off = Object.keys(slices).indexOf(pid) * 13;
        const r = 160 - off;
        marks += `<g><circle cx="${cx + r * Math.cos(am)}" cy="${cy + r * Math.sin(am)}" r="9" fill="${p.color}" stroke="#fff" stroke-width="2"/>${cnt > 1 ? `<text x="${cx + r * Math.cos(am)}" y="${cy + r * Math.sin(am) + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#000">${cnt}</text>` : ''}</g>`;
      }
    }
  }
  const lights = Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return `<circle cx="${cx + 192 * Math.cos(a)}" cy="${cy + 192 * Math.sin(a)}" r="4.5"/>`; }).join('');
  return `<svg class="br-wheel" viewBox="-10 -14 420 424">
    <circle cx="200" cy="200" r="198" fill="#5a2a00"/>
    <g class="br-lights">${lights}</g>
    <g class="br-rot" id="rot">${segs}${labels}${marks}</g>
    <circle cx="200" cy="200" r="36" fill="#ffd23f" stroke="#5a2a00" stroke-width="6"/>
    ${eyes ? '<ellipse class="br-eye" cx="188" cy="196" rx="5" ry="8" fill="#1c0610"/><ellipse class="br-eye" cx="212" cy="196" rx="5" ry="8" fill="#1c0610"/><path d="M188 212q12 8 24 0" stroke="#1c0610" stroke-width="3" fill="none" stroke-linecap="round"/>' : ''}
    <path class="br-pointer" d="M200 30 L186 -8 L214 -8 z" fill="#fff4e0" stroke="#1c0610" stroke-width="3"/>
  </svg>`;
}

export default {
  key(S) {
    if (S.phase === 'question' || S.phase === 'qresult') return `${S.set}:${S.qn}`;
    if (S.phase === 'spin') return `${S.set}`;
    return `${S.set}`;
  },
  wipe(prev, S) { return !(prev?.phase === 'spin' && S.phase === 'spin'); },
  mood(S) { return { ask: 'calm', question: 'think', qresult: 'reveal', place: 'calm', spin: 'tense', winspin: 'tense', winner: 'win' }[S.phase]; },

  render(S, ui) {
    ui.tag(S.set ? `заход ${S.set} из ${S.sets} · цель ${ui.fmt(S.goal)}` : '');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    if (S.phase === 'ask' || S.phase === 'question' || S.phase === 'place') {
      const list = S.progress || (S.earned ? Object.keys(S.earned).filter((id) => S.earned[id]).map((id) => ({ id, done: !!S.placed?.[id] })) : []);
      for (const w of list) {
        const el = ui.app.querySelector(`.person[data-p="${w.id}"]`);
        if (!el) continue;
        if (w.done && !el.classList.contains('done')) ui.sfx('pop');
        el.classList.toggle('done', !!w.done);
        if (w.n != null) { const b = el.querySelector('b'); if (b) b.textContent = w.n; }
      }
    }
    if (S.phase === 'spin' && S.spinNo !== lastSpin) spinTo(S, ui);
  },
};

function people(S, ui, list, extra = () => '') {
  return `<div class="br-prog">${list.map((w) => { const p = ui.p(w.id) || {}; return `<span class="person ${w.done ? 'done' : ''}" data-p="${w.id}">${ui.avatar(p)}${ui.esc(p.name)}${extra(w)}</span>`; }).join('')}</div>`;
}

function spinTo(S, ui) {
  lastSpin = S.spinNo;
  const rot = ui.app.querySelector('#rot');
  const res = ui.app.querySelector('#res');
  if (res) res.innerHTML = `<div class="br-result"><small>оборот ${S.spinNo} из 3</small>…</div>`;
  if (!rot) return;
  setTimeout(() => { rot.style.transform = `rotate(${S.angle}deg)`; }, 30);
  lastAngle = S.angle;
  let ticks = 0;
  const t = setInterval(() => { ui.sfx('clack'); if (++ticks > 26) clearInterval(t); }, 90 + ticks * 8);
  setTimeout(() => {
    if (lastSpin !== S.spinNo) return;
    const sp = S.spin;
    const pays = Object.entries(sp.payouts || {});
    if (res) res.innerHTML = `<div class="br-result"><small>оборот ${S.spinNo} из 3 · сектор</small>${ui.fmt(sp.value)}</div>
      <div class="br-pay">${sp.empty ? '<div class="r">Пусто! Сюда никто не поставил</div>' : pays.map(([id, pts]) => { const p = ui.p(id) || {}; return `<div class="r">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><b>+${ui.fmt(pts)}</b></div>`; }).join('')}</div>`;
    ui.sfx(sp.empty ? 'sad' : 'coin');
    if (!sp.empty) ui.fx.burstAt(ui.app.querySelector('.br-pointer'), '#ffd23f', 40);
  }, 5500);
}

const DRAW = {
  ask(S, ui) {
    ui.app.innerHTML = `
      <div class="br-spin">
        <div class="br-wheelbox">${wheel(S, ui)}</div>
        <div class="br-side">
          <div class="big" style="font-family:var(--display);font-size:5vmin">Спросите Барабан</div>
          <div class="lead dim">о чём угодно — победитель получит ответ</div>
          ${people(S, ui, S.progress || [])}
        </div>
      </div>`;
  },

  question(S, ui) {
    ui.app.innerHTML = `
      <div class="br-q">
        <div class="br-wheelbox">${wheel(S, ui)}</div>
        <div class="main">
          <div class="br-kind">вопрос ${S.qn} из ${S.per} · ${KIND[S.type]}</div>
          <div class="qq">${ui.esc(S.q)}</div>
          ${S.type === 'multi' ? `<div class="br-opts stagger">${S.options.map((o) => `<div class="br-opt">${ui.esc(o)}</div>`).join('')}</div>` : ''}
          ${S.type === 'number' ? '<div class="huge" style="font-family:var(--display);color:var(--a2)">?</div>' : ''}
          ${S.type === 'list' ? `<div class="lead dim">всего правильных ответов: ${S.need}</div>` : ''}
          ${people(S, ui, S.progress || [], (w) => (w.n != null ? ` · <b>${w.n}</b>` : ''))}
        </div>
      </div>`;
  },

  qresult(S, ui) {
    ui.app.innerHTML = `
      <div class="br-q">
        <div class="br-wheelbox">${wheel(S, ui)}</div>
        <div class="main">
          <div class="br-kind">${S.type === 'number' ? 'правильный ответ' : 'правильные ответы'}</div>
          <div class="qq" style="font-size:3.4vmin">${ui.esc(S.q)}</div>
          <div class="br-opts">${S.correct.map((c) => `<div class="br-opt ok">${ui.esc(c)}</div>`).join('')}</div>
          <div class="br-res stagger">${S.rows.map((r) => { const p = ui.p(r.id) || {}; return `<div class="r">${ui.avatar(p)}<span><b style="color:${p.color}">${ui.esc(p.name)}</b> <span class="dim">${ui.esc(r.detail || '')}</span></span><span class="sl">${'<i class="wedge"></i>'.repeat(r.slices)}</span><span class="pt">+${ui.fmt(r.pts)}</span></div>`; }).join('')}</div>
        </div>
      </div>`;
  },

  place(S, ui) {
    const list = Object.entries(S.earned || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, done: !!S.placed?.[id] }));
    ui.app.innerHTML = `
      <div class="br-spin">
        <div class="br-wheelbox">${wheel(S, ui)}</div>
        <div class="br-side">
          <div class="big" style="font-family:var(--display);font-size:5vmin">Ставьте сектора</div>
          <div class="lead dim">тайно, на телефонах. Совпали — делите выигрыш</div>
          ${people(S, ui, list, (w) => ` <span style="color:var(--a2)">${'<i class="wedge"></i>'.repeat(w.n)}</span>`)}
        </div>
      </div>`;
  },

  spin(S, ui) {
    ui.app.innerHTML = `
      <div class="br-spin">
        <div class="br-wheelbox">${wheel(S, ui, { slices: S.slices })}</div>
        <div class="br-side" id="res"></div>
      </div>`;
    const rot = ui.app.querySelector('#rot');
    rot.style.transition = 'none';
    rot.style.transform = `rotate(${lastAngle}deg)`;
    void rot.getBoundingClientRect();
    rot.style.transition = '';
    lastSpin = 0;
    spinTo(S, ui);
  },

  winspin(S, ui) {
    const p = ui.p(S.win?.pid) || {};
    const segs = [['ПОБЕДА', '#ffd23f', '#3a1d00'], ['ЕЩЁ КРУГ', '#8b1e3f', '#fff4e0']];
    const parts = Array.from({ length: 8 }, (_, i) => {
      const a1 = -Math.PI / 2 + (i * Math.PI) / 4, a2 = a1 + Math.PI / 4;
      const [t, c, ink] = segs[i % 2];
      const am = a1 + Math.PI / 8;
      return `<path d="M200 200L${200 + 180 * Math.cos(a1)} ${200 + 180 * Math.sin(a1)}A180 180 0 0 1 ${200 + 180 * Math.cos(a2)} ${200 + 180 * Math.sin(a2)}z" fill="${c}" stroke="#1c0610" stroke-width="3"/><text x="${200 + 115 * Math.cos(am)}" y="${200 + 115 * Math.sin(am)}" transform="rotate(${(am * 180) / Math.PI + 90} ${200 + 115 * Math.cos(am)} ${200 + 115 * Math.sin(am)})" text-anchor="middle" dominant-baseline="middle" font-family="Oswald" font-weight="700" font-size="20" fill="${ink}">${t}</text>`;
    }).join('');
    // ПОБЕДА — чётные сектора; выбираем угол, при котором под стрелкой нужный
    const target = S.win?.won ? 0 : 1;
    const angle = 360 * 5 - (target * 45 + 22.5);
    ui.app.innerHTML = `
      <div class="br-spin">
        <div class="br-wheelbox"><svg class="br-wheel" viewBox="-10 -14 420 424"><circle cx="200" cy="200" r="198" fill="#5a2a00"/><g class="br-rot" id="win">${parts}</g><circle cx="200" cy="200" r="30" fill="#ffd23f"/><path d="M200 30 L186 -8 L214 -8 z" fill="#fff4e0" stroke="#1c0610" stroke-width="3"/></svg></div>
        <div class="br-side"><div class="big" style="font-family:var(--display);font-size:5vmin">Победный оборот</div><div class="lead">${ui.avatar(p)} <b style="color:${p.color}">${ui.esc(p.name)}</b></div><div id="wres"></div></div>
      </div>`;
    const g = ui.app.querySelector('#win');
    setTimeout(() => { g.style.transform = `rotate(${angle}deg)`; }, 50);
    setTimeout(() => {
      ui.app.querySelector('#wres').innerHTML = `<div class="br-result">${S.win?.won ? 'ПОБЕДА!' : 'ЕЩЁ КРУГ'}</div>`;
      ui.sfx(S.win?.won ? 'shutout' : 'sad');
    }, 5500);
  },

  winner(S, ui) {
    const p = ui.p(S.winner) || {};
    ui.app.innerHTML = `
      <div class="center">
        <div class="caps dim" style="font-size:2vmin">победитель</div>
        <div class="huge slam" style="font-family:var(--display);color:${p.color}">${ui.esc(p.name || '—')}</div>
        <div class="br-oracle">
          <div class="q">«${ui.esc(S.oracle?.q || '')}»</div>
          <div class="a" id="oa"></div>
        </div>
      </div>`;
    ui.fx.typewriter(ui.app.querySelector('#oa'), S.oracle?.a || '', 28, () => ui.sfx('type'));
    ui.fx.confetti(['#ffd23f', '#e0245e', '#2ec4b6', '#5a7dff', '#fff4e0']);
  },
};
