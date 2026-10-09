/* Палата №6 — телефон */

const L = ['А', 'Б', 'В', 'Г'];
const COLORS = ['#1b1b1b', '#d7263d', '#2b6cb0', '#2f855a', '#f1e6c8', '#8a5a2b'];
let picks = [false, false, false];

export default {
  key(S) {
    if (S.question) return `q:${S.question.n}`;
    if (S.proc) {
      const p = S.proc;
      const extra = p.kind === 'analiz' ? (p.cards?.[S.you?.id]?.opened.length ?? '') : p.kind === 'schet' ? (p.task?.i ?? '') : '';
      return `p:${p.kind}:${p.step}:${p.role}:${extra}`;
    }
    if (S.escape) return `e:${S.escape.cat}`;
    return `w:${S.phase}:${S.wait || ''}:${S.ghost}`;
  },

  render(S, ui) {
    document.body.classList.toggle('bad', S.mood === 'bad');
    if (S.question) return question(S, ui);
    if (S.proc) return proc(S, ui);
    if (S.escape) return escape(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait(S.mood === 'bad' ? '💉' : S.ghost ? '👻' : '🏥', S.wait || 'Смотри на экран', `${ui.fmt(S.money || 0)} ₽${S.ghost ? ' · ты призрак — отвечай дальше' : ''}`);
  },

  update(S, ui) {
    if (S.proc?.kind === 'schet' && S.proc.task) {
      const r = ui.main.querySelector('#right');
      if (r) r.textContent = `верно: ${S.proc.task.right}`;
    }
  },
};

function question(S, ui) {
  const q = S.question;
  ui.main.innerHTML = `
    <div class="pn-ppaper"><small>вопрос № ${q.n} из ${q.of}${S.ghost ? ' · ты призрак' : ''}</small>${ui.esc(q.q)}</div>
    <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><small>${L[i]}</small>${ui.esc(o)}</button>`).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'answer', i: Number(b.dataset.i) }); ui.wait('📋', 'Ответ записан в карту'); };
}

const title = (S, sub) => `<div class="tagline">процедура «${S.proc.title}»</div><h2>${sub}</h2>`;

function grid(n, cls, onPick, opts = {}) {
  return (ui) => {
    const box = ui.main.querySelector('.pn-grid');
    box.innerHTML = Array.from({ length: n }, (_, i) => `<button class="pn-b ${(opts.taken || []).includes(i) ? 'dis' : ''}" data-i="${i}" ${(opts.taken || []).includes(i) ? 'disabled' : ''}>${opts.label ? opts.label(i) : i + 1}</button>`).join('');
    for (const b of box.querySelectorAll('.pn-b:not([disabled])')) b.onclick = () => { ui.buzz(40); onPick(Number(b.dataset.i)); };
  };
}

function proc(S, ui) {
  const p = S.proc;
  const role = p.role;
  if (role === 'wait' || !role) {
    const msg = { pills: p.step === 'poison' ? 'Здоровые подсыпают яд…' : 'Пациенты выбирают таблетку', analiz: 'Пациенты вскрывают пробирки', schet: 'Пациенты считают', lift: 'Пациенты выбирают лифт', consilium: 'Идёт консилиум', rentgen: p.step === 'vote' ? 'Голосование' : 'Пациенты рисуют', zapiska: p.step === 'vote' ? 'Голосование' : 'Пациенты пишут', kapel: p.step === 'hide' ? 'Пациенты прячутся' : 'Здоровые ставят капельницы', tonometr: 'Здоровые раздают кубики', lastroom: 'Пациенты выбирают двери' }[p.kind] || 'Смотри на экран';
    return ui.wait(p.myBed != null ? '🛏️' : '⏳', p.myBed != null ? `Ты на койке № ${p.myBed + 1}. Тихо…` : msg, `${ui.fmt(S.money || 0)} ₽`);
  }
  switch (role) {
    case 'poison':
      ui.main.innerHTML = `${title(S, 'Подсыпь яд в одну таблетку')}<div class="sub">Отравишь пациента — +500 ₽</div><div class="pn-grid"></div>`;
      return grid(p.n, '', (g) => { ui.act({ a: 'poison', g }); ui.wait('☠️', 'Яд подсыпан. Хи-хи'); }, { label: (i) => `💊 ${i + 1}` })(ui);
    case 'pick':
      ui.main.innerHTML = `${title(S, 'Выбери таблетку')}<div class="sub">В некоторых яд. Удачи.</div><div class="pn-grid"></div>`;
      return grid(p.n, '', (g) => { ui.act({ a: 'pill', g }); ui.wait('💊', 'Проглотил. Ждём…'); }, { label: (i) => `💊 ${i + 1}` })(ui);
    case 'scratch': {
      const c = p.cards[S.you.id];
      ui.main.innerHTML = `${title(S, `Вскрой ещё ${3 - c.opened.length}`)}<div class="sub">Каждая чистая пробирка — +100 ₽. В одной — смерть.</div><div class="pn-grid"></div>`;
      const box = ui.main.querySelector('.pn-grid');
      box.innerHTML = Array.from({ length: 9 }, (_, k) => { const open = c.opened.includes(k); return `<button class="pn-b ${open ? 'on' : ''}" data-i="${k}" ${open ? 'disabled' : ''}>${open ? '₽' : '🧪'}</button>`; }).join('');
      for (const b of box.querySelectorAll('.pn-b:not([disabled])')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'scratch', c: Number(b.dataset.i) }); };
      return;
    }
    case 'math': {
      const t = p.task;
      ui.main.innerHTML = `${title(S, 'Решай быстрее!')}<div class="sub" id="right">верно: ${t.right}</div><div class="pn-ppaper" style="font-size:40px;text-align:center">${t.text} = ?</div>
        <input id="v" type="number" inputmode="numeric" pattern="[0-9]*" placeholder="ответ" autocomplete="off" style="font-size:30px;text-align:center">`;
      ui.foot.innerHTML = `<button class="btn" id="go">Ответить</button>`;
      const v = ui.main.querySelector('#v');
      setTimeout(() => v.focus(), 60);
      const go = () => { if (v.value === '') return; ui.act({ a: 'math', i: t.i, v: Number(v.value) }); v.value = ''; };
      ui.foot.querySelector('#go').onclick = go;
      v.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      return;
    }
    case 'lift':
      ui.main.innerHTML = `${title(S, 'В какой лифт?')}<div class="sub">Если все в одном — спуститесь. Разделитесь — тяжёлый оборвётся.${p.dummy ? ' В грузовом уже сидит манекен.' : ''}</div>
        <div class="row"><button class="pn-b" data-s="L" style="min-height:140px">🛗<br>Грузовой</button><button class="pn-b" data-s="R" style="min-height:140px">🛗<br>Пассажирский</button></div>`;
      for (const b of ui.main.querySelectorAll('[data-s]')) b.onclick = () => { ui.buzz(40); ui.act({ a: 'lift', s: b.dataset.s }); ui.wait('🛗', 'Двери закрываются…'); };
      return;
    case 'cons':
      ui.main.innerHTML = `${title(S, p.topic)}<div class="sub">Напиши ответ, который больше никому не придёт в голову.</div><input id="t" maxlength="30" autocomplete="off" placeholder="одно слово">`;
      ui.foot.innerHTML = `<button class="btn" id="go">Отправить</button>`;
      setTimeout(() => ui.main.querySelector('#t').focus(), 80);
      ui.foot.querySelector('#go').onclick = () => { const t = ui.main.querySelector('#t').value.trim(); if (!t) return; ui.act({ a: 'cons', text: t }); ui.wait('🩺', 'Консилиум думает'); };
      return;
    case 'draw':
      return draw(S, ui);
    case 'write':
      ui.main.innerHTML = `${title(S, p.topic.replace('___', '…'))}<textarea id="t" maxlength="90" placeholder="напиши что-нибудь смешное"></textarea>`;
      ui.foot.innerHTML = `<button class="btn" id="go">Отправить</button>`;
      setTimeout(() => ui.main.querySelector('#t').focus(), 80);
      ui.foot.querySelector('#go').onclick = () => { const t = ui.main.querySelector('#t').value.trim(); if (!t) return; ui.act({ a: 'write', text: t }); ui.wait('📝', 'Записка у главврача'); };
      return;
    case 'vote':
      ui.main.innerHTML = `${title(S, 'Кто лучше?')}<div class="sub">Худший отправится в морг.</div><div class="opts">${(p.entries || []).filter((e) => e.id !== S.you?.id).map((e, i) => `<button class="opt" data-o="${e.id}">${e.text ? ui.esc(e.text) : `<span style="display:block;width:100%">${art(e.art)}</span>`}</button>`).join('')}</div>`;
      for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(40); ui.act({ a: 'vote', for: b.dataset.o }); ui.wait('🗳️', 'Голос принят'); };
      return;
    case 'hide':
      ui.main.innerHTML = `${title(S, 'Спрячься на койке')}<div class="sub">Здоровые будут ставить капельницы вслепую.</div><div class="pn-grid"></div>`;
      return grid(9, '', (b) => { ui.act({ a: 'hide', b }); ui.wait('🛏️', `Ты на койке № ${b + 1}. Тихо…`); }, { label: (i) => `🛏️ ${i + 1}` })(ui);
    case 'stab':
      ui.main.innerHTML = `${title(S, 'Поставь капельницу')}<div class="sub">Найдёшь пациента — +500 ₽</div><div class="pn-grid"></div>`;
      return grid(9, '', (b) => { ui.act({ a: 'stab', b }); ui.wait('💉', 'Капельница поставлена'); }, { label: (i) => `🛏️ ${i + 1}` })(ui);
    case 'give':
      ui.main.innerHTML = `${title(S, 'Кому поднять давление?')}<div class="sub">Отдай лишний кубик. Если он умрёт — +500 ₽</div><div class="opts">${(p.patients || []).map((id) => `<button class="opt" data-o="${id}">${ui.avatar(ui.p(id))} ${ui.esc(ui.p(id)?.name)}</button>`).join('')}</div>`;
      for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(40); ui.act({ a: 'give', to: b.dataset.o }); ui.wait('🎲', 'Кубик отдан'); };
      return;
    case 'door':
      ui.main.innerHTML = `${title(S, 'Выбери дверь')}<div class="sub">За одной — выход. За остальными — конец.</div><div class="pn-grid"></div>`;
      return grid(p.n, '', (d) => { ui.act({ a: 'door', d }); ui.wait('🚪', 'Дверь выбрана'); }, { label: (i) => `🚪 ${i + 1}`, taken: p.taken })(ui);
  }
  ui.wait('⏳', 'Смотри на экран');
}

function art(strokes) {
  return `<svg viewBox="0 0 1000 1000" style="width:100%;background:#f1e6c8;border-radius:10px">${(strokes || []).map((s) => {
    const pts = []; for (let i = 0; i < s.p.length; i += 2) pts.push(`${s.p[i]},${s.p[i + 1]}`);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLORS[s.c]}" stroke-width="${[5, 11, 22][s.w]}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('')}</svg>`;
}

/* рисовалка: штрихи в координатах 0…1000 */
function draw(S, ui) {
  const strokes = [];
  let color = 0, width = 1, cur = null;
  ui.main.innerHTML = `${title(S, S.proc.topic)}<canvas class="draw" width="600" height="600"></canvas>
    <div class="tools">${COLORS.map((c, i) => `<button data-c="${i}" class="${i === 0 ? 'on' : ''}" style="background:${c}"></button>`).join('')}
      <span style="flex:1"></span><button data-w="0" style="background:#555;width:22px;height:22px"></button><button data-w="1" class="on" style="background:#555"></button><button data-w="2" style="background:#555;width:46px;height:46px"></button></div>`;
  ui.foot.innerHTML = `<div class="row"><button class="btn ghost small" id="undo">Отменить</button><button class="btn" id="go">Готово</button></div>`;
  const cv = ui.main.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const redraw = () => {
    ctx.clearRect(0, 0, 600, 600);
    for (const s of strokes) {
      ctx.strokeStyle = COLORS[s.c]; ctx.lineWidth = [5, 11, 22][s.w] * 0.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < s.p.length; i += 2) { const x = s.p[i] * 0.6, y = s.p[i + 1] * 0.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
  };
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)]; };
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); cur = { c: color, w: width, p: pt(e) }; strokes.push(cur); redraw(); };
  cv.onpointermove = (e) => {
    if (!cur) return;
    const [x, y] = pt(e);
    const lx = cur.p[cur.p.length - 2], ly = cur.p[cur.p.length - 1];
    if (Math.hypot(x - lx, y - ly) < 8) return;
    cur.p.push(x, y); redraw();
  };
  cv.onpointerup = cv.onpointercancel = () => { cur = null; };
  for (const b of ui.main.querySelectorAll('[data-c]')) b.onclick = () => { color = Number(b.dataset.c); ui.main.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b)); };
  for (const b of ui.main.querySelectorAll('[data-w]')) b.onclick = () => { width = Number(b.dataset.w); ui.main.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', x === b)); };
  ui.foot.querySelector('#undo').onclick = () => { strokes.pop(); redraw(); };
  ui.foot.querySelector('#go').onclick = () => { if (!strokes.length) return; ui.act({ a: 'draw', strokes }); ui.wait('🩻', 'Снимок у рентгенолога'); };
}

function escape(S, ui) {
  const e = S.escape;
  picks = [false, false, false];
  const go = () => {
    ui.main.innerHTML = `
      <div class="tagline">побег · клетка ${e.pos} из ${e.track}${S.ghost ? ' · призраки быстрее' : ''}</div>
      <div class="pn-ppaper">${ui.esc(e.cat)}<small>отметь всё, что подходит</small></div>
      <div class="opts">${e.items.map((t, i) => `<button class="pn-b ${picks[i] ? 'on' : ''}" data-i="${i}">${picks[i] ? '✅' : '⬜'} ${ui.esc(t)}</button>`).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="go">Бежать!</button>`;
    for (const b of ui.main.querySelectorAll('.pn-b')) b.onclick = () => { picks[Number(b.dataset.i)] = !picks[Number(b.dataset.i)]; ui.buzz(15); go(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'esc', picks }); ui.wait('🏃', 'Бежим!'); };
  };
  go();
}

function winner(S, ui) {
  ui.main.innerHTML = `<div class="wait"><div class="em">${S.nobody ? '🌑' : S.mine ? '🚪' : '👻'}</div><h1>${S.nobody ? 'Никого не выписали' : S.mine ? 'Тебя выписали!' : 'Ты остаёшься'}</h1><div class="sub">${ui.fmt(S.money || 0)} ₽</div></div>`;
}
