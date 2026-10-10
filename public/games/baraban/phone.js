/* Барабан — телефон: ответы, расстановка секторов на круге, свайп, которым крутят Барабан */

const PAL = ['#c81d4e', '#ffc93c', '#18b5a4', '#4361ee'];
const TAGS = ['#ff2e63', '#ffd23f', '#2ec4b6', '#7b8cff', '#ff9f1c', '#c77dff'];
let picks = new Set();
let cells = [];

export default {
  key(S) {
    if (S.ask) return 'ask';
    if (S.multi) return `m:${S.multi.q}`;
    if (S.number) return `n:${S.number.q}`;
    if (S.list) return `l:${S.list.q}`;
    if (S.match) return `x:${S.match.q}`;
    if (S.poll) return `p:${S.poll.q}`;
    if (S.place) return 'place';
    if (S.swipe) return `s:${S.swipe.what}:${S.swipe.no || 0}`;
    return `w:${S.phase}:${S.wait || ''}:${S.sub || ''}:${S.after || ''}`;
  },

  render(S, ui) {
    if (S.ask) return ask(S, ui);
    if (S.multi) return multi(S, ui);
    if (S.number) return number(S, ui);
    if (S.list) return list(S, ui);
    if (S.match) return match(S, ui);
    if (S.poll) return poll(S, ui);
    if (S.place) return place(S, ui);
    if (S.swipe) return swipe(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    const em = { intro: '🎡', roundIntro: '🥁', question: '🤔', qresult: '📊', spinWait: '👀', spinning: '🎡', roundEnd: '👑', winIntro: '🏆', winWait: '🏆', winSpin: '🎡' }[S.phase] || '🎡';
    ui.wait(S.after ? (S.after.startsWith('-') ? '💸' : '💰') : em, S.after ? `${S.after} очков!` : S.wait || 'Смотри на экран', S.sub || '');
  },

  update(S, ui) {
    if (S.list) {
      const box = ui.main.querySelector('#chips');
      if (box) box.innerHTML = chips(S, ui);
      const c = ui.main.querySelector('#cnt');
      if (c) c.textContent = `засчитано: ${S.list.mine.filter((x) => x.ok).length}`;
    }
  },
};

const head = (S, ui) => `<div class="tagline">вопрос ${S.qn} из ${S.per}</div>`;
const chips = (S, ui) => S.list.mine.map((x) => `<span class="br-chip ${x.ok ? 'ok' : 'no'}">${ui.esc(x.text)}</span>`).join('');

function ask(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">личный вопрос Великому Барабану</div>
    <h2>Что тебя мучает?</h2>
    <input id="q" maxlength="120" placeholder="${ui.esc(S.examples[0])}" autocomplete="off" enterkeyhint="send">
    <div class="sub">Победитель получит ответ в конце игры. Например: «${ui.esc(S.examples[1] || S.examples[0])}»</div>`;
  ui.foot.innerHTML = `<button class="btn" id="go">Спросить Барабан</button>`;
  const q = ui.main.querySelector('#q');
  const go = () => { ui.act({ a: 'ask', q: q.value.trim() || S.examples[0] }); ui.wait('✉️', 'Барабан запомнил'); };
  ui.foot.querySelector('#go').onclick = go;
  q.onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function multi(S, ui) {
  picks = new Set();
  const draw = () => {
    ui.main.innerHTML = `
      ${head(S, ui)}<div class="tagline" style="color:var(--a2)">выбери все верные · ошибки отнимают</div>
      <div class="br-q">${ui.esc(S.multi.q)}</div>
      <div class="opts">${S.multi.options.map((o, i) => `<button class="opt ${picks.has(i) ? 'on' : ''}" data-i="${i}">${picks.has(i) ? '✅' : '⬜'} ${ui.esc(o)}</button>`).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="go">Ответить (${picks.size})</button>`;
    for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { const i = Number(b.dataset.i); picks.has(i) ? picks.delete(i) : picks.add(i); ui.buzz(10); draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'multi', picks: [...picks] }); ui.wait('✅', 'Ответ принят'); };
  };
  draw();
}

function number(S, ui) {
  ui.main.innerHTML = `
    ${head(S, ui)}<div class="tagline" style="color:var(--a2)">угадай число · ближе всех — больше секторов</div>
    <div class="br-q">${ui.esc(S.number.q)}</div>
    <input id="v" type="text" inputmode="decimal" placeholder="твой ответ" autocomplete="off" style="font-size:30px;text-align:center" enterkeyhint="send">`;
  ui.foot.innerHTML = `<button class="btn" id="go">Ответить</button>`;
  const v = ui.main.querySelector('#v');
  setTimeout(() => v.focus(), 120);
  const go = () => { if (v.value.trim() === '') return; ui.act({ a: 'num', v: v.value }); };
  ui.foot.querySelector('#go').onclick = go;
  v.onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function list(S, ui) {
  ui.main.innerHTML = `
    ${head(S, ui)}<div class="tagline" style="color:var(--a2)">называй по одному · чем больше, тем лучше</div>
    <div class="br-q">${ui.esc(S.list.q)}</div>
    <div class="row"><input id="t" maxlength="40" placeholder="пиши и жми ввод" autocomplete="off" enterkeyhint="send"><button class="btn small" id="add" style="flex:0 0 72px">+</button></div>
    <div class="sub" id="cnt">засчитано: ${S.list.mine.filter((x) => x.ok).length}</div>
    <div id="chips">${chips(S, ui)}</div>`;
  ui.foot.innerHTML = `<button class="btn ghost small" id="done">Больше не помню</button>`;
  const t = ui.main.querySelector('#t');
  setTimeout(() => t.focus(), 120);
  const add = () => { const v = t.value.trim(); if (!v) return; ui.act({ a: 'item', text: v }); t.value = ''; t.focus(); ui.buzz(10); };
  ui.main.querySelector('#add').onclick = add;
  t.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  ui.foot.querySelector('#done').onclick = () => { ui.act({ a: 'listDone' }); ui.wait('📝', 'Список сдан'); };
}

/* пары: тапни слева, потом справа — они окрасятся одним цветом */
function match(S, ui) {
  const n = S.match.left.length;
  const link = Array(n).fill(-1);
  let sel = -1;
  const draw = () => {
    const owner = (j) => link.indexOf(j);
    ui.main.innerHTML = `
      ${head(S, ui)}<div class="tagline" style="color:var(--a2)">тапни слева, потом справа</div>
      <div class="br-q">${ui.esc(S.match.q)}</div>
      <div class="br-mrow">
        <div class="br-mcol">${S.match.left.map((x, i) => `<button class="br-mi ${sel === i ? 'sel' : ''}" data-l="${i}" ${link[i] >= 0 ? `style="border-color:${TAGS[i]}"` : ''}><span class="tagn" style="background:${TAGS[i]}">${i + 1}</span>${ui.esc(x)}</button>`).join('')}</div>
        <div class="br-mcol">${S.match.right.map((x, j) => { const o = owner(j); return `<button class="br-mi" data-r="${j}" ${o >= 0 ? `style="border-color:${TAGS[o]}"` : ''}>${o >= 0 ? `<span class="tagn" style="background:${TAGS[o]}">${o + 1}</span>` : ''}${ui.esc(x)}</button>`; }).join('')}</div>
      </div>`;
    const full = link.every((x) => x >= 0);
    ui.foot.innerHTML = `<button class="btn" id="go" ${full ? '' : 'disabled'}>Сдать пары</button>`;
    for (const b of ui.main.querySelectorAll('[data-l]')) b.onclick = () => { sel = Number(b.dataset.l); ui.buzz(10); draw(); };
    for (const b of ui.main.querySelectorAll('[data-r]')) b.onclick = () => {
      const j = Number(b.dataset.r);
      if (sel < 0) { sel = link.findIndex((x) => x < 0); if (sel < 0) return; }
      const prev = link.indexOf(j);
      if (prev >= 0) link[prev] = -1;
      link[sel] = j;
      sel = link.findIndex((x) => x < 0);
      ui.buzz(15);
      draw();
    };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'match', pairs: link }); ui.wait('⇄', 'Пары сданы'); };
  };
  draw();
}

function poll(S, ui) {
  ui.main.innerHTML = `
    ${head(S, ui)}<div class="tagline" style="color:var(--a2)">голосуй честно · угадай с залом</div>
    <div class="br-q">${ui.esc(S.poll.q)}</div>
    <div class="br-pollb">${S.poll.options.map((o) => { const p = ui.p(o.id) || {}; return `<button data-id="${o.id}">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span></button>`; }).join('')}</div>`;
  ui.foot.innerHTML = '';
  for (const b of ui.main.querySelectorAll('[data-id]')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'poll', for: b.dataset.id }); ui.wait('☝', 'Голос принят'); };
}

/* круг из секторов: тап — поставить сектор, на секторе видно, сколько твоих */
function place(S, ui) {
  cells = [];
  const wheel = S.place.wheel;
  const n = wheel.length, step = 360 / n, R = 150, cx = 160, cy = 160;
  const pt = (r, d) => [cx + r * Math.cos(((d - 90) * Math.PI) / 180), cy + r * Math.sin(((d - 90) * Math.PI) / 180)];
  const label = (c) => (c.k === 'num' ? (c.v >= 10000 ? `${+(c.v / 1000).toFixed(1)}K` : String(c.v)) : c.k === 'bank' ? 'БАНК' : c.k === 'prize' ? '🎁' : '×2');
  const fill = (c, i) => (c.k === 'num' ? PAL[i % 4] : c.k === 'bank' ? '#121212' : c.k === 'prize' ? '#8e2de2' : '#b8f400');
  const ink = (c, i) => (c.k === 'num' ? (i % 4 === 1 ? '#3a1d00' : '#fff') : c.k === 'bank' ? '#ff4d6d' : c.k === 'x2' ? '#1a2b00' : '#ffe066');
  const draw = () => {
    const left = S.place.n - cells.length;
    const segs = wheel.map((c, i) => {
      const a1 = i * step, a2 = a1 + step, am = a1 + step / 2;
      const [x1, y1] = pt(R, a1), [x2, y2] = pt(R, a2), [lx, ly] = pt(118, am), [mx, my] = pt(78, am);
      const mine = cells.filter((x) => x === i).length;
      return `<path data-c="${i}" d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z" fill="${fill(c, i)}" stroke="#2a0a14" stroke-width="2"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" transform="rotate(${(am - 90).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-family="Oswald,sans-serif" font-weight="700" font-size="13" fill="${ink(c, i)}" pointer-events="none">${label(c)}</text>
        ${mine ? `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="13" fill="${ui.S?.you?.color || '#fff'}" stroke="#fff" stroke-width="3" pointer-events="none"/><text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-weight="900" font-size="13" fill="#000" pointer-events="none">${mine}</text>` : ''}`;
    }).join('');
    ui.main.innerHTML = `
      <div class="tagline">поставь сектора на Барабан</div>
      <div class="br-left">осталось: <b>${left}</b> из ${S.place.n}</div>
      <svg class="br-ring" viewBox="0 0 320 320">${segs}<circle cx="${cx}" cy="${cy}" r="34" fill="#ffc93c" stroke="#5a2a00" stroke-width="5"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="26">🎡</text></svg>
      <div class="sub" style="text-align:center">чёрный — «Банкрот», фиолетовый — «Приз», зелёный — «×2»</div>`;
    ui.foot.innerHTML = `<div class="row"><button class="btn ghost small" id="clr">Сбросить</button><button class="btn" id="go" ${left ? 'disabled' : ''}>На Барабан!</button></div>`;
    for (const p of ui.main.querySelectorAll('path[data-c]')) p.onclick = () => { if (cells.length < S.place.n) { cells.push(Number(p.dataset.c)); ui.buzz(15); draw(); } };
    ui.foot.querySelector('#clr').onclick = () => { cells = []; draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'place', cells }); ui.wait('🎡', 'Сектора на Барабане'); };
  };
  draw();
}

/* свайп: сила — по скорости пальца за последние ~120 мс */
function swipe(S, ui) {
  const win = S.swipe.what === 'win';
  ui.main.innerHTML = `
    <div class="tagline" style="color:var(--a2)">${win ? 'Колесо победы!' : `твой оборот${S.swipe.double ? ' · ×2!' : ''}`}</div>
    <h2 style="text-align:center">Свайпни, чтобы крутить!</h2>
    <div class="br-pad ${win ? 'win' : ''}" id="pad"><div class="wh" id="wh"></div><span class="hand">👆</span><div class="tip" id="tip">резко и сильно</div></div>
    <div class="br-meter"><i id="m"></i></div>`;
  ui.foot.innerHTML = '';
  const pad = ui.main.querySelector('#pad'), wh = ui.main.querySelector('#wh'), meter = ui.main.querySelector('#m'), tip = ui.main.querySelector('#tip');
  let pts = [], rot = 0, sent = false;
  const pos = (e) => ({ x: e.clientX, y: e.clientY, t: performance.now() });
  pad.onpointerdown = (e) => { pad.setPointerCapture?.(e.pointerId); pts = [pos(e)]; pad.querySelector('.hand')?.remove(); };
  pad.onpointermove = (e) => {
    if (!pts.length || sent) return;
    const p = pos(e), q = pts[pts.length - 1];
    pts.push(p);
    while (pts.length > 2 && p.t - pts[0].t > 120) pts.shift();
    rot += (p.x - q.x) * 0.6 + (p.y - q.y) * 0.3;
    wh.style.transform = `rotate(${rot}deg)`;
    meter.style.width = `${Math.round(power() * 100)}%`;
  };
  const power = () => {
    if (pts.length < 2) return 0;
    const a = pts[0], b = pts[pts.length - 1];
    const v = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(16, b.t - a.t);   // пикселей за мс
    return Math.max(0, Math.min(1, v / 2.6));
  };
  pad.onpointerup = pad.onpointercancel = () => {
    if (sent || !pts.length) return;
    const pw = power();
    pts = [];
    if (pw < 0.12) { tip.textContent = 'слабовато! ещё раз, резче'; ui.buzz(20); return; }
    sent = true;
    meter.style.width = `${Math.round(pw * 100)}%`;
    wh.style.transition = `transform ${1 + pw * 2}s cubic-bezier(.1,.7,.2,1)`;
    wh.style.transform = `rotate(${rot + 720 + pw * 1440}deg)`;
    ui.buzz([30, 40, 30]);
    ui.act({ a: 'spin', power: pw });
    tip.textContent = pw > 0.8 ? 'ВОТ ЭТО СИЛА!' : pw > 0.45 ? 'Хорошо пошёл!' : 'Крутится…';
  };
}

function winner(S, ui) {
  ui.main.innerHTML = `<div class="wait"><div class="em">${S.mine ? '🏆' : '🎡'}</div><h1>${S.mine ? 'Ты победил!' : 'Барабан выбрал победителя'}</h1>
    <div class="sub">«${ui.esc(S.oracle?.q || '')}»</div><h2 style="color:var(--a2)">${ui.esc(S.oracle?.a || '')}</h2></div>`;
}
