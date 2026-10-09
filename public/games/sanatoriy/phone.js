/* Санаторий — телефон */

const L = ['А', 'Б', 'В', 'Г'];
let picks = [false, false, false];

export default {
  key(S) {
    if (S.question) return `q:${S.question.n}`;
    if (S.poison) return 'poison';
    if (S.drink) return 'drink';
    if (S.analiz) return `an:${S.analiz.opened.length}:${S.analiz.done}`;
    if (S.schet) return `sc:${S.schet.i}`;
    if (S.obhod) return 'obhod';
    if (S.escape) return `esc:${S.escape.cat}`;
    return `w:${S.phase}:${S.wait || ''}:${S.ghost}`;
  },

  render(S, ui) {
    document.body.classList.toggle('bad', S.mood === 'bad');
    if (S.question) return question(S, ui);
    if (S.poison) return glasses(S, ui, S.poison.glasses, 'poison', 'Подсыпь снотворное в один стакан', 'Подсыпать');
    if (S.drink) return glasses(S, ui, S.drink.glasses, 'drink', 'Выбери стакан компота', 'Выпить');
    if (S.analiz) return analiz(S, ui);
    if (S.schet) return schet(S, ui);
    if (S.obhod) return obhod(S, ui);
    if (S.escape) return escape(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait(S.mood === 'bad' ? '💉' : S.ghost ? '👻' : '🏥', S.wait || 'Смотри на экран', S.ghost ? 'ты призрак — отвечай дальше, в финале бегаешь быстрее' : '');
  },
};

function question(S, ui) {
  const q = S.question;
  ui.main.innerHTML = `
    <div class="sn-pq"><small>вопрос №${q.n} из ${q.of}${S.ghost ? ' · ты призрак' : ''}</small>${ui.esc(q.q)}</div>
    <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><small>${L[i]}</small>${ui.esc(o)}</button>`).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'answer', i: Number(b.dataset.i) }); ui.wait('🩺', 'Ответ записан в карту'); };
}

function glasses(S, ui, n, action, title, verb) {
  ui.main.innerHTML = `
    <div class="tagline">процедура «Компот»</div>
    <h2>${title}</h2>
    <div class="sn-g3">${Array.from({ length: n }, (_, i) => `<button class="sn-btn" data-g="${i}">🥤 ${i + 1}</button>`).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.sn-btn')) b.onclick = () => { ui.buzz(40); ui.act({ a: action, g: Number(b.dataset.g) }); ui.wait(action === 'poison' ? '🧪' : '🥤', action === 'poison' ? 'Готово. Хи-хи' : 'Выпил. Ждём…'); };
}

function analiz(S, ui) {
  const a = S.analiz;
  ui.main.innerHTML = `
    <div class="tagline">процедура «Анализы»</div>
    <h2>${a.dead ? 'Плохие анализы…' : a.done ? 'Анализы в норме!' : `Вскрой ${2 - a.opened.length} ${a.opened.length ? 'пробирку' : 'пробирки'}`}</h2>
    <div class="sn-g3">${Array.from({ length: 9 }, (_, k) => {
      const open = a.opened.includes(k);
      const sk = a.skulls.includes(k);
      return `<button class="sn-cell ${open ? (sk ? 'skull' : 'ok') : ''}" data-c="${k}" ${open || a.done ? 'disabled' : ''}>${open ? (sk ? '☠' : '✓') : '🧪'}</button>`;
    }).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.sn-cell:not([disabled])')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'scratch', c: Number(b.dataset.c) }); };
}

function schet(S, ui) {
  const m = S.schet;
  ui.main.innerHTML = `
    <div class="tagline">устный счёт · пример ${m.i + 1} из ${m.of} · верно ${m.right}</div>
    <div class="sn-pq" style="font-size:40px;text-align:center">${m.text} = ?</div>
    <input id="v" type="number" inputmode="numeric" pattern="[0-9]*" placeholder="ответ" autocomplete="off" style="font-size:30px;text-align:center">`;
  ui.foot.innerHTML = `<button class="btn" id="go">Ответить</button>`;
  const v = ui.main.querySelector('#v');
  setTimeout(() => v.focus(), 100);
  const go = () => { if (v.value === '') return; ui.act({ a: 'math', i: m.i, v: Number(v.value) }); };
  ui.foot.querySelector('#go').onclick = go;
  v.onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function obhod(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">процедура «Обход»</div>
    <h2>В какой палате спрячешься?</h2>
    <div class="opts">${[1, 2, 3, 4, 5].map((n) => `<button class="sn-btn" data-r="${n - 1}">🚪 Палата №${n}</button>`).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.sn-btn')) b.onclick = () => { ui.buzz(30); ui.act({ a: 'hide', r: Number(b.dataset.r) }); };
}

function escape(S, ui) {
  const e = S.escape;
  picks = [false, false, false];
  const draw = () => {
    ui.main.innerHTML = `
      <div class="tagline">побег · ты на клетке ${e.pos} из ${e.track}${S.ghost ? ' · призраки быстрее' : ''}</div>
      <div class="sn-pq">${ui.esc(e.cat)}<small>отметь всё, что подходит</small></div>
      <div class="opts">${e.items.map((t, i) => `<button class="sn-btn ${picks[i] ? 'on' : ''}" data-i="${i}">${picks[i] ? '✅' : '⬜'} ${ui.esc(t)}</button>`).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="go">Бежать!</button>`;
    for (const b of ui.main.querySelectorAll('.sn-btn')) b.onclick = () => { picks[Number(b.dataset.i)] = !picks[Number(b.dataset.i)]; ui.buzz(15); draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'esc', picks }); ui.wait('🏃', 'Бежим!'); };
  };
  draw();
}

function winner(S, ui) {
  ui.main.innerHTML = `<div class="wait"><div class="em">${S.mine ? '🏆' : '👻'}</div><h1>${S.mine ? 'Тебя выписали!' : 'Ты остаёшься'}</h1><div class="sub">${S.mine ? 'свобода' : 'на тихий час'}</div></div>`;
}
