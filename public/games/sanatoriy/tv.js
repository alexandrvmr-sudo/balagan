/* Палата №6 — экран */

const L = ['А', 'Б', 'В', 'Г'];
const INK = '#2a211c';
const COLORS = ['#1b1b1b', '#d7263d', '#2b6cb0', '#2f855a', '#f1e6c8', '#8a5a2b'];
const WIDTH = [5, 11, 22];

/* главврач — тоже вязаный: шапочка, налобное зеркало, очки, маска шевелится, когда он говорит */
function doctor(cls = '') {
  return `<div class="doc ${cls}"><svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dk1" width="7" height="6" patternUnits="userSpaceOnUse"><rect width="7" height="6" fill="#e8e6df"/><path d="M0 0l3.5 4 3.5-4" stroke="#b9b6aa" stroke-width="1.1" fill="none"/></pattern>
      <pattern id="dk2" width="7" height="6" patternUnits="userSpaceOnUse"><rect width="7" height="6" fill="#d9b8a0"/><path d="M0 0l3.5 4 3.5-4" stroke="#b08a70" stroke-width="1.1" fill="none"/></pattern>
      <pattern id="dk3" width="7" height="6" patternUnits="userSpaceOnUse"><rect width="7" height="6" fill="#9fc9d6"/><path d="M0 0l3.5 4 3.5-4" stroke="#76a4b2" stroke-width="1.1" fill="none"/></pattern>
    </defs>
    <path d="M40 160Q40 132 70 126H130Q160 132 160 160V258H40Z" fill="url(#dk1)" stroke="#8d8a80" stroke-width="2.5"/>
    <path d="M100 128V258" stroke="#8d8a80" stroke-width="2" stroke-dasharray="3 4"/>
    <circle cx="100" cy="176" r="3" fill="#8d8a80"/><circle cx="100" cy="200" r="3" fill="#8d8a80"/><circle cx="100" cy="224" r="3" fill="#8d8a80"/>
    <path d="M120 150h18v8h-18z" fill="#d7263d"/><path d="M127 144h4v20h-4z" fill="#d7263d"/>
    <ellipse cx="34" cy="196" rx="14" ry="36" fill="url(#dk1)" stroke="#8d8a80" stroke-width="2.5" transform="rotate(16 34 196)"/>
    <g transform="rotate(-24 172 186)"><ellipse cx="166" cy="186" rx="14" ry="34" fill="url(#dk1)" stroke="#8d8a80" stroke-width="2.5"/>
      <rect x="160" y="132" width="12" height="44" rx="3" fill="#e8f4f8" stroke="${INK}" stroke-width="2"/><rect x="161" y="150" width="10" height="24" fill="#7ee0c3" opacity=".7"/>
      <path d="M166 132V112" stroke="#c9ced1" stroke-width="2.5"/><path d="M158 176h16" stroke="${INK}" stroke-width="3"/></g>
    <circle cx="100" cy="78" r="56" fill="url(#dk2)" stroke="#9c7a62" stroke-width="2.5"/>
    <path d="M44 66Q48 16 100 14Q152 16 156 66Q100 50 44 66Z" fill="url(#dk3)" stroke="#5f8794" stroke-width="2.5"/>
    <circle cx="100" cy="42" r="15" fill="#d9e4ea" stroke="#5f8794" stroke-width="3"/><circle cx="100" cy="42" r="9" fill="#f6fbff"/><path class="glint" d="M93 37l6 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="78" cy="78" r="13" fill="rgba(20,20,20,.85)" stroke="#555" stroke-width="3"/><circle cx="122" cy="78" r="13" fill="rgba(20,20,20,.85)" stroke="#555" stroke-width="3"/><path d="M91 78h18" stroke="#555" stroke-width="3"/>
    <circle cx="80" cy="80" r="3.5" fill="#ff3b3b"><animate attributeName="opacity" values="1;.3;1" dur="2.6s" repeatCount="indefinite"/></circle>
    <circle cx="124" cy="80" r="3.5" fill="#ff3b3b"><animate attributeName="opacity" values="1;.3;1" dur="2.6s" repeatCount="indefinite"/></circle>
    <path class="glint" d="M70 72l5-4M114 72l5-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M60 96Q100 88 140 96V108Q100 102 60 108Z" fill="url(#dk3)" stroke="#5f8794" stroke-width="2"/>
    <g class="mask-low" id="docMask"><path d="M62 106Q100 100 138 106Q132 132 100 136Q68 132 62 106Z" fill="url(#dk3)" stroke="#5f8794" stroke-width="2.5"/>
      <path d="M72 114Q100 110 128 114M74 122Q100 118 126 122" stroke="#76a4b2" stroke-width="1.6" fill="none"/></g>
    <path d="M62 100L44 92M138 100L156 92" stroke="#e8f4f8" stroke-width="2.5"/>
  </svg></div>`;
}

const ward = (S, ui, cls = (id) => '') => `<div class="pn-ward">${S.players.filter((p) => !p.audience).map((p) => {
  const dead = S.dead?.[p.id];
  return `<div class="pn-pt ${cls(p.id)}" data-p="${p.id}">${ui.avatar(p, '', { mood: dead ? 'ghost' : 'happy' })}<b>${ui.esc(p.name)}</b><small>${ui.fmt(p.score)} ₽</small></div>`;
}).join('')}</div>`;

const av = (ui, S, id, mood) => ui.avatar(ui.p(id), '', { mood: mood || (S.dead?.[id] ? 'ghost' : 'happy') });

function drawing(strokes) {
  return `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">${(strokes || []).map((s) => {
    const pts = []; for (let i = 0; i < s.p.length; i += 2) pts.push(`${s.p[i]},${s.p[i + 1]}`);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLORS[s.c] || INK}" stroke-width="${WIDTH[s.w] || 8}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('')}</svg>`;
}

export default {
  key(S) {
    if (S.phase === 'proc') return `${S.qn}:${S.proc.kind}:${S.proc.step}`;
    if (S.phase === 'procIntro' || S.phase === 'verdict') return `${S.qn}:${S.proc?.kind}`;
    if (S.phase === 'escape' || S.phase === 'escReveal') return `${S.n}`;
    return `${S.qn}`;
  },
  wipe(prev, S) { return !(prev?.phase === 'escape' && S.phase === 'escReveal') && !(prev?.phase === 'question' && S.phase === 'qreveal'); },
  mood(S) {
    return { intro: 'calm', question: 'think', qreveal: 'reveal', procIntro: 'tense', proc: 'tense', verdict: 'reveal', escIntro: 'calm', escape: 'tense', escReveal: 'reveal', winner: 'win' }[S.phase];
  },

  render(S, ui, prev) {
    const t = S.phase === 'escape' || S.phase === 'escReveal' || S.phase === 'escIntro' ? 'Побег из больницы'
      : S.qn ? `Вопрос № ${S.qn} из ${S.total}` : '';
    ui.tag(t);
    DRAW[S.phase]?.(S, ui, prev);
  },

  update(S, ui, prev) {
    if (S.phase === 'question') {
      for (const id of S.answered || []) {
        const el = ui.app.querySelector(`.pn-pt[data-p="${id}"]`);
        if (el && !el.classList.contains('ans')) { el.classList.add('ans'); ui.sfx('ecg'); }
      }
    }
    if (S.phase === 'proc') {
      const done = new Set(S.proc.done || []);
      for (const el of ui.app.querySelectorAll('.pn-pt[data-p]')) el.classList.toggle('ans', done.has(el.dataset.p));
      if (S.proc.kind === 'analiz') { const box = ui.app.querySelector('.cards'); if (box) box.innerHTML = cards(S, ui); }
      if (S.proc.kind === 'schet') { const box = ui.app.querySelector('.cards'); if (box) box.innerHTML = mathCards(S, ui); }
      if (S.proc.step === 'vote') { const v = ui.app.querySelector('#voted'); if (v) v.textContent = `проголосовали: ${S.proc.voted}`; }
    }
    if (S.phase === 'escape') for (const id of S.submitted || []) ui.app.querySelector(`.lane[data-p="${id}"] .cav`)?.classList.add('bob');
  },

  /* губы главврача — по громкости его голоса */
  frame(S, ui) {
    const m = document.getElementById('docMask');
    if (m) m.style.transform = `scaleY(${1 + ui.mouth() * 0.35})`;
  },
};

function cards(S, ui) {
  return Object.entries(S.proc.cards || {}).map(([id, c]) => `
    <div class="card9 ${c.dead ? 'dies' : ''}">${av(ui, S, id, c.dead ? 'dead' : 'happy')}<b>${ui.esc(ui.p(id)?.name)}</b>
      <div class="grid9">${Array.from({ length: 9 }, (_, k) => { const open = c.opened.includes(k); const sk = c.skull === k; return `<i class="${open ? (sk ? 'skull' : 'ok') : ''}">${open ? (sk ? '☠' : '₽') : '🧪'}</i>`; }).join('')}</div></div>`).join('');
}

function mathCards(S, ui) {
  return Object.entries(S.proc.math || {}).map(([id, m]) => `
    <div class="card9">${av(ui, S, id)}<b>${ui.esc(ui.p(id)?.name)}${m.patient ? '' : ' (здоров)'}</b><div class="pn-hand" style="font-size:4vmin">${m.right}</div></div>`).join('');
}

const DRAW = {
  intro(S, ui) {
    ui.app.innerHTML = `
      <div class="pn-center">
        <div class="pn-sign">ПАЛАТА № 6</div>
        ${doctor()}
        <div class="pn-hand">Поступило пациентов: ${S.players.filter((p) => !p.audience).length}. Выписано: 0.</div>
        ${ward(S, ui)}
      </div>`;
    ui.sfx('tray');
  },

  question(S, ui) {
    ui.app.innerHTML = `
      <div class="pn">
        <div class="pn-chart"><div class="no">История болезни · вопрос № ${S.qn}</div><div class="q">${ui.esc(S.q)}</div></div>
        <div class="pn-opts">${S.options.map((o, i) => `<div class="pn-opt"><b>${L[i]}</b>${ui.esc(o)}</div>`).join('')}</div>
        <div style="flex:1"></div>
        ${ward(S, ui, (id) => ((S.answered || []).includes(id) ? 'ans' : ''))}
      </div>`;
  },

  qreveal(S, ui) {
    ui.app.innerHTML = `
      <div class="pn">
        <div class="pn-chart"><div class="no">Правильный ответ</div><div class="q" style="font-size:3.4vmin">${ui.esc(S.q)}</div></div>
        <div class="pn-opts" style="row-gap:5vmin">${S.options.map((o, i) => `<div class="pn-opt" data-i="${i}"><b>${L[i]}</b>${ui.esc(o)}<div class="who">${(S.picks?.[i] || []).map((id) => av(ui, S, id)).join('')}</div></div>`).join('')}</div>
        <div style="flex:1"></div>
        ${S.patients?.length ? `<div class="pn-center" style="flex:0;gap:1vmin"><div class="pn-hand">На процедуру:</div><div class="pn-ward">${S.patients.map((id) => `<div class="pn-pt bad">${av(ui, S, id, 'sad')}<b>${ui.esc(ui.p(id)?.name)}</b></div>`).join('')}</div></div>` : '<div class="pn-center" style="flex:0"><div class="pn-hand">Все здоровы. Пока.</div></div>'}
      </div>`;
    // драматичный разбор: неверные зачёркиваются по одной, потом загорается верный
    const wrong = [0, 1, 2, 3].filter((i) => i !== S.correct);
    wrong.forEach((i, k) => setTimeout(() => { ui.app.querySelector(`.pn-opt[data-i="${i}"]`)?.classList.add('wrong'); ui.sfx('stamp'); }, 900 + k * 650));
    setTimeout(() => {
      const ok = ui.app.querySelector(`.pn-opt[data-i="${S.correct}"]`);
      ok?.classList.add('right');
      ui.sfx('cash');
      ui.fx.burstAt(ok, '#8ff0b6', 30);
      if (S.patients?.length) setTimeout(() => { ui.sfx('gurney'); ui.fx.shake(ui.app); }, 900);
    }, 900 + wrong.length * 650 + 300);
  },

  procIntro(S, ui) {
    ui.app.innerHTML = `
      <div class="pn-center">
        <div class="pn-doors"><div class="lamp">ПРОЦЕДУРНАЯ</div><div class="inside"><div class="pn-title">${ui.esc(S.proc.title)}</div></div><div class="door"></div><div class="door r"></div></div>
        <div class="pn-ward">${S.patients.map((id) => `<div class="pn-pt bad">${av(ui, S, id, 'sad')}<b>${ui.esc(ui.p(id)?.name)}</b></div>`).join('')}</div>
      </div>`;
    setTimeout(() => ui.sfx('slam'), 400);
    setTimeout(() => ui.sfx('heartbeat'), 1400);
  },

  proc(S, ui) {
    const pr = S.proc;
    const pts = (ids) => `<div class="pn-ward">${ids.map((id) => `<div class="pn-pt ${(pr.done || []).includes(id) ? 'ans' : ''}" data-p="${id}">${av(ui, S, id)}<b>${ui.esc(ui.p(id)?.name)}</b></div>`).join('')}</div>`;
    const head = (sub) => `<div class="pn-center" style="flex:0;gap:1vmin"><div class="pn-title" style="font-size:6vmin;animation-delay:0s">${ui.esc(pr.title)}</div><div class="pn-hand">${sub}</div></div>`;
    let body = '';
    switch (pr.kind) {
      case 'pills':
        body = head(pr.step === 'poison' ? 'Здоровые тайно подсыпают яд…' : 'Пациенты выбирают таблетку')
          + `<div class="pn-center"><div class="pills">${Array.from({ length: pr.n }, (_, i) => `<div class="pill" style="animation-delay:${i * 0.07}s"><div class="n">${i + 1}</div></div>`).join('')}</div></div>`
          + pts(pr.step === 'poison' ? S.safe : S.patients);
        break;
      case 'analiz':
        body = head('Вскройте три пробирки. В одной — смертельный диагноз') + `<div class="pn-center"><div class="cards">${cards(S, ui)}</div></div>`;
        break;
      case 'schet':
        body = head('Решайте примеры! Меньше всех — на тихий час') + `<div class="pn-center"><div class="cards">${mathCards(S, ui)}</div></div>`;
        break;
      case 'lift':
        body = head('Выберите лифт. Разделитесь — тяжёлый оборвётся')
          + `<div class="pn-center"><div class="lifts"><div class="liftbox"><div class="lbl">ГРУЗОВОЙ</div>${pr.dummy ? '<div class="who"><span style="font-size:4vmin">🧸</span></div>' : ''}</div><div class="liftbox"><div class="lbl">ПАССАЖИРСКИЙ</div></div></div></div>` + pts(S.patients);
        break;
      case 'consilium':
        body = head(`Тема: <b style="color:var(--a1)">${ui.esc(pr.topic)}</b> · совпадёшь — умрёшь`) + `<div style="flex:1"></div>` + pts([...S.patients, ...S.safe]);
        break;
      case 'rentgen':
      case 'zapiska':
        if (pr.step === 'vote') {
          body = head(`${ui.esc(pr.topic)} · голосуйте`) + `<div class="vote-grid stagger">${pr.entries.map((e, i) => `<div class="entry">${e.art ? `<div class="art">${drawing(e.art)}</div>` : `<div class="note">${ui.esc(e.text)}</div>`}<div class="who">№ ${i + 1}</div></div>`).join('')}</div><div class="pn-hand" id="voted" style="text-align:center">проголосовали: ${pr.voted}</div>`;
        } else body = head(`${ui.esc(pr.topic)}`) + `<div class="pn-center"><div class="pn-hand">${pr.kind === 'rentgen' ? 'Пациенты рисуют на телефонах…' : 'Пациенты пишут записки…'}</div></div>` + pts(S.patients);
        break;
      case 'kapel':
        body = head(pr.step === 'hide' ? 'Пациенты прячутся на койках' : 'Здоровые ставят капельницы вслепую')
          + `<div class="pn-center"><div class="beds">${Array.from({ length: 9 }, (_, i) => `<div class="bed"><span class="n">${i + 1}</span></div>`).join('')}</div></div>` + pts(pr.step === 'hide' ? S.patients : S.safe);
        break;
      case 'tonometr':
        body = head('Здоровые подкидывают лишние кубики. Самое высокое давление — смерть') + `<div style="flex:1"></div>` + pts(S.patients) + pts(S.safe);
        break;
      case 'lastroom':
        body = head('Ключ от выхода — только за одной дверью')
          + `<div class="pn-center"><div class="beds" style="grid-template-columns:repeat(${Math.min(pr.n, 4)},22vmin)">${Array.from({ length: pr.n }, (_, i) => `<div class="bed" style="height:22vmin"><span class="n">${i + 1}</span></div>`).join('')}</div></div>` + pts(S.patients);
        break;
    }
    ui.app.innerHTML = `<div class="pn">${body}</div>`;
    if (pr.kind === 'pills' && pr.step === 'pick') ui.sfx('whisper');
  },

  verdict(S, ui) {
    const v = S.verdict || {};
    const d = v.details || {};
    const died = new Set(v.died || []);
    const mood = (id) => (died.has(id) ? 'dead' : 'happy');
    const tag = (id) => `<div class="pn-pt ${died.has(id) ? 'dies' : ''}">${av(ui, S, id, mood(id))}<b>${ui.esc(ui.p(id)?.name)}</b></div>`;
    let scene = '';
    switch (S.proc.kind) {
      case 'pills':
        scene = `<div class="pills">${Array.from({ length: d.n }, (_, i) => `<div class="pill ${d.poisoned.includes(i) ? 'poison' : ''}"><div class="n">${i + 1}</div><div class="who">${Object.entries(d.pick || {}).filter(([, g]) => g === i).map(([id]) => av(ui, S, id, mood(id))).join('')}</div></div>`).join('')}</div>`;
        break;
      case 'analiz':
        scene = `<div class="cards">${Object.entries(d.cards || {}).map(([id, c]) => `<div class="card9">${av(ui, S, id, mood(id))}<div class="grid9">${Array.from({ length: 9 }, (_, k) => { const open = c.opened.includes(k); const sk = c.skull === k; return `<i class="${sk ? 'skull' : open ? 'ok' : ''}">${sk ? '☠' : open ? '₽' : ''}</i>`; }).join('')}</div></div>`).join('')}</div>`;
        break;
      case 'schet':
        scene = `<div class="cards">${Object.entries(d.math || {}).map(([id, m]) => `<div class="card9">${av(ui, S, id, mood(id))}<b>${ui.esc(ui.p(id)?.name)}${m.patient ? '' : ' (здоров)'}</b><div class="pn-hand" style="font-size:4vmin">${m.right}</div></div>`).join('')}</div>`;
        break;
      case 'lift': {
        const L = Object.entries(d.lift || {}).filter(([, s]) => s === 'L').map(([id]) => id), R = Object.entries(d.lift || {}).filter(([, s]) => s === 'R').map(([id]) => id);
        scene = `<div class="lifts"><div class="liftbox ${d.fell === 'L' ? 'fell' : ''}"><div class="lbl">ГРУЗОВОЙ</div><div class="who">${d.dummy ? '<span style="font-size:4vmin">🧸</span>' : ''}${L.map((id) => av(ui, S, id, mood(id))).join('')}</div></div><div class="liftbox ${d.fell === 'R' ? 'fell' : ''}"><div class="lbl">ПАССАЖИРСКИЙ</div><div class="who">${R.map((id) => av(ui, S, id, mood(id))).join('')}</div></div></div>`;
        if (d.fell) setTimeout(() => ui.sfx('rumble'), 400);
        break;
      }
      case 'consilium':
        scene = `<div class="pn-hand">Тема: ${ui.esc(d.topic)}</div><div class="words">${Object.entries(d.words || {}).map(([id, w]) => `<div class="word ${died.has(id) ? 'twin' : ''}">${av(ui, S, id, mood(id))}${ui.esc(w)}</div>`).join('')}</div>`;
        break;
      case 'rentgen':
      case 'zapiska':
        scene = `<div class="vote-grid">${Object.keys(d.tally || {}).map((id) => `<div class="entry ${died.has(id) ? 'low' : ''}">${d.art ? `<div class="art">${drawing(d.art[id])}</div>` : `<div class="note">${ui.esc(d.notes[id])}</div>`}<div class="who">${av(ui, S, id, mood(id))}${ui.esc(ui.p(id)?.name)} · голосов: ${d.tally[id]}</div></div>`).join('')}</div>`;
        break;
      case 'kapel':
        scene = `<div class="beds">${Array.from({ length: 9 }, (_, i) => { const hit = (d.needles || []).some((n) => n.b === i); const who = Object.entries(d.hide || {}).filter(([, b]) => b === i).map(([id]) => av(ui, S, id, mood(id))).join(''); return `<div class="bed ${hit && who ? 'hit' : ''}"><span class="n">${i + 1}</span>${hit ? '<span class="needle">💉</span>' : ''}${who}</div>`; }).join('')}</div>`;
        break;
      case 'tonometr':
        scene = `<div class="cards">${Object.entries(d.dice || {}).map(([id, dice]) => `<div class="card9">${av(ui, S, id, mood(id))}<b>${ui.esc(ui.p(id)?.name)}</b><div class="dice">${dice.map((x, k) => `<span class="die ${k >= 3 ? 'gift' : ''}" style="animation-delay:${k * 0.15}s">${x}</span>`).join('')}</div><div class="pn-hand">${dice.reduce((a, b) => a + b, 0)}</div></div>`).join('')}</div>`;
        break;
      case 'lastroom':
        scene = `<div class="beds" style="grid-template-columns:repeat(${Math.min(d.n, 4)},22vmin)">${Array.from({ length: d.n }, (_, i) => { const who = Object.entries(d.doors || {}).filter(([, x]) => x === i).map(([id]) => av(ui, S, id, mood(id))).join(''); return `<div class="bed ${i === d.exit ? '' : 'hit'}" style="height:22vmin"><span class="n">${i === d.exit ? '🗝️' : '☠'}</span>${who}</div>`; }).join('')}</div>`;
        break;
    }
    ui.app.innerHTML = `
      <div class="pn">
        <div class="pn-center" style="flex:0;gap:1vmin"><div class="pn-title" style="font-size:5vmin;animation-delay:0s">${ui.esc(S.proc.title)} · итог</div></div>
        <div class="pn-center">${scene}</div>
        <div class="pn-center" style="flex:0;gap:1vmin">${died.size ? `<div class="pn-hand">Перешли на вечный тихий час:</div><div class="pn-ward">${[...died].map(tag).join('')}</div>` : '<div class="pn-hand">Все пережили процедуру.</div>'}</div>
      </div>`;
    if (died.size) setTimeout(() => ui.fx.shake(ui.app), 800);
  },

  escIntro(S, ui) {
    ui.app.innerHTML = `<div class="pn-center"><div class="pn-sign">ВЫХОД</div>${doctor('small')}<div class="pn-hand">Бегите. За вами идёт тьма.</div>${ward(S, ui)}</div>`;
    ui.sfx('creak');
  },

  escape(S, ui, prev) { corridor(S, ui, false, prev); },
  escReveal(S, ui, prev) { corridor(S, ui, true, prev); },

  winner(S, ui) {
    const w = ui.p(S.winner);
    if (S.nobody) {
      ui.app.innerHTML = `<div class="pn-center"><div class="pn-sign" style="font-size:9vmin">НИКТО</div><div class="pn-hand">Тьма забрала всех.</div>${ward(S, ui)}</div>`;
      return;
    }
    ui.app.innerHTML = `
      <div class="pn-center">
        <div class="light"></div>
        <div class="stampbig">ВЫПИСАН</div>
        <div class="pn-pt rises" style="font-size:3vmin">${ui.avatar(w, '', { mood: 'wow' })}</div>
        <div class="huge slam" style="font-family:var(--display);color:${w?.color}">${ui.esc(w?.name || '—')}</div>
        <div class="pn-hand">Остальные остаются на тихий час.</div>
        ${ward(S, ui)}
      </div>`;
    ui.fx.confetti(['#7ee0c3', '#f1e6c8', '#d7263d', '#ffffff']);
    ui.sfx('stamp');
  },
};

function corridor(S, ui, reveal) {
  const ids = S.players.filter((p) => !p.audience).map((p) => p.id).sort((a, b) => (S.pos?.[b] || 0) - (S.pos?.[a] || 0));
  const pct = (x) => Math.max(0, Math.min(100, (x / S.track) * 100));
  const lanes = ids.map((id) => {
    const p = ui.p(id);
    const out = S.out?.[id];
    const mv = reveal ? S.moves?.[id] : null;
    return `<div class="lane ${out ? 'out' : ''}" data-p="${id}" style="--n:${S.track}">
      <span class="nm">${ui.esc(p?.name)}${S.dead?.[id] ? ' 👻' : ''}${out ? ' · во тьме' : ''}</span>${mv ? `<span class="mv">+${mv}</span>` : ''}
      <span style="position:absolute;left:${pct(S.pos?.[id] || 0)}%;top:50%;transform:translate(-50%,-55%);transition:left 1.2s var(--spring)">${av(ui, S, id, out ? 'dead' : undefined)}</span></div>`;
  }).join('');
  const notes = [];
  if (reveal) {
    for (const x of S.swaps || []) notes.push(`${ui.esc(ui.p(x.ghost)?.name)} вселяется в ${ui.esc(ui.p(x.victim)?.name)}!`);
    if (S.bounced?.length) notes.push(`Барьер отбросил: ${S.bounced.map((id) => ui.esc(ui.p(id)?.name)).join(', ')}`);
    if (S.swallowed?.length) notes.push(`Тьма поглотила: ${S.swallowed.map((id) => ui.esc(ui.p(id)?.name)).join(', ')}`);
  }
  ui.app.innerHTML = `
    <div class="pn" style="justify-content:center">
      <div class="pn-sign" style="font-size:5vmin;text-align:center">${ui.esc(S.cat || '')}</div>
      <div class="items">${(S.items || []).map((it) => `<div class="item ${reveal ? (it.ok ? 'yes' : 'no') : ''}">${ui.esc(it.t)}</div>`).join('')}</div>
      ${notes.length ? `<div class="pn-hand" style="text-align:center">${notes.join(' · ')}</div>` : ''}
      <div class="corr" style="padding-right:6vmin"><div class="exitdoor"></div><div class="dark" style="width:${pct(Math.max(0, S.wall + 0.5))}%"></div>${lanes}</div>
    </div>`;
  if (reveal && (S.swaps?.length || S.swallowed?.length)) setTimeout(() => ui.fx.shake(ui.app), 600);
}
