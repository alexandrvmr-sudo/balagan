/* Барабан — телефон */

const COLORS = ['#8b1e3f', '#b8860b', '#1f8f85', '#3d5afe'];
let picks = new Set();
let cells = [];

export default {
  key(S) {
    if (S.ask) return 'ask';
    if (S.multi) return `m:${S.multi.q}`;
    if (S.number) return `n:${S.number.q}`;
    if (S.list) return `l:${S.list.q}`;
    if (S.place) return 'place';
    return `w:${S.phase}:${S.wait || ''}`;
  },

  render(S, ui) {
    if (S.ask) return ask(S, ui);
    if (S.multi) return multi(S, ui);
    if (S.number) return number(S, ui);
    if (S.list) return list(S, ui);
    if (S.place) return place(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait({ question: '🤔', qresult: '📊', spin: '🎡', winspin: '🥁' }[S.phase] || '🎡', S.wait || 'Смотри на экран');
  },

  update(S, ui) {
    if (S.list) {
      const box = ui.main.querySelector('#chips');
      if (box) box.innerHTML = S.list.mine.map((x) => `<span class="br-chip ${x.ok ? 'ok' : 'no'}">${ui.esc(x.text)}</span>`).join('');
      const c = ui.main.querySelector('#cnt');
      if (c) c.textContent = `засчитано: ${S.list.mine.filter((x) => x.ok).length}`;
    }
  },
};

function ask(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">личный вопрос Барабану</div>
    <h2>Что тебя мучает?</h2>
    <input id="q" maxlength="120" placeholder="${ui.esc(S.examples[0])}" autocomplete="off">
    <div class="sub">Победитель получит ответ в конце игры.</div>`;
  ui.foot.innerHTML = `<button class="btn" id="go">Спросить</button>`;
  const q = ui.main.querySelector('#q');
  ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'ask', q: q.value || S.examples[0] }); ui.wait('🎡', 'Барабан запомнил'); };
}

function multi(S, ui) {
  picks = new Set();
  const draw = () => {
    ui.main.innerHTML = `
      <div class="tagline">выбери все верные</div>
      <h2>${ui.esc(S.multi.q)}</h2>
      <div class="opts">${S.multi.options.map((o, i) => `<button class="opt ${picks.has(i) ? 'on' : ''}" data-i="${i}">${picks.has(i) ? '✅' : '⬜'} ${ui.esc(o)}</button>`).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="go">Ответить (${picks.size})</button>`;
    for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { const i = Number(b.dataset.i); picks.has(i) ? picks.delete(i) : picks.add(i); ui.buzz(10); draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'multi', picks: [...picks] }); ui.wait('✅', 'Ответ принят'); };
  };
  draw();
}

function number(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">угадай число · ближе всех — больше секторов</div>
    <h2>${ui.esc(S.number.q)}</h2>
    <input id="v" type="number" inputmode="decimal" placeholder="твой ответ" autocomplete="off" style="font-size:30px;text-align:center">`;
  ui.foot.innerHTML = `<button class="btn" id="go">Ответить</button>`;
  const v = ui.main.querySelector('#v');
  setTimeout(() => v.focus(), 120);
  const go = () => { if (v.value === '') return; ui.act({ a: 'num', v: v.value }); };
  ui.foot.querySelector('#go').onclick = go;
  v.onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function list(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">назови как можно больше · по одному</div>
    <h2>${ui.esc(S.list.q)}</h2>
    <div class="row"><input id="t" maxlength="40" placeholder="пиши и жми ввод" autocomplete="off" enterkeyhint="send"><button class="btn small" id="add" style="flex:0 0 72px">+</button></div>
    <div class="sub" id="cnt">засчитано: ${S.list.mine.filter((x) => x.ok).length}</div>
    <div id="chips">${S.list.mine.map((x) => `<span class="br-chip ${x.ok ? 'ok' : 'no'}">${ui.esc(x.text)}</span>`).join('')}</div>`;
  ui.foot.innerHTML = `<button class="btn ghost small" id="done">Больше не помню</button>`;
  const t = ui.main.querySelector('#t');
  setTimeout(() => t.focus(), 120);
  const add = () => { const v = t.value.trim(); if (!v) return; ui.act({ a: 'item', text: v }); t.value = ''; t.focus(); ui.buzz(10); };
  ui.main.querySelector('#add').onclick = add;
  t.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  ui.foot.querySelector('#done').onclick = () => { ui.act({ a: 'listDone' }); ui.wait('📝', 'Список сдан'); };
}

function place(S, ui) {
  cells = [];
  const draw = () => {
    const left = S.place.n - cells.length;
    ui.main.innerHTML = `
      <div class="tagline">ставь сектора · осталось ${left}</div>
      <h2>Где остановится Барабан?</h2>
      <div class="br-cells">${S.place.sectors.map((v, i) => { const n = cells.filter((c) => c === i).length; return `<button class="br-cell" data-c="${i}" style="background:${COLORS[i % 4]}">${v}${n ? `<b>${n}</b>` : ''}</button>`; }).join('')}</div>`;
    ui.foot.innerHTML = `<div class="row"><button class="btn ghost small" id="clr">Сбросить</button><button class="btn" id="go" ${left ? 'disabled' : ''}>На барабан!</button></div>`;
    for (const b of ui.main.querySelectorAll('.br-cell')) b.onclick = () => { if (cells.length < S.place.n) { cells.push(Number(b.dataset.c)); ui.buzz(15); draw(); } };
    ui.foot.querySelector('#clr').onclick = () => { cells = []; draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'place', cells }); ui.wait('🎡', 'Сектора на барабане'); };
  };
  draw();
}

function winner(S, ui) {
  ui.main.innerHTML = `<div class="wait"><div class="em">${S.mine ? '🏆' : '🎡'}</div><h1>${S.mine ? 'Ты победил!' : 'Барабан выбрал'}</h1>
    <div class="sub">«${ui.esc(S.oracle?.q || '')}»</div><h2 style="color:var(--a2)">${ui.esc(S.oracle?.a || '')}</h2></div>`;
}
