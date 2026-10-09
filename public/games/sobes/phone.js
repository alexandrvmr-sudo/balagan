/* Собеседование — телефон */

let line = [];
let order = [];

export default {
  key(S) {
    if (S.ice) return `ice:${S.ice.n}:${S.round}`;
    if (S.compose) return `cmp:${S.round}`;
    if (S.vote) return `v:${S.vote.q}:${!!S.votedFor}`;
    return `w:${S.phase}:${S.wait || ''}`;
  },

  render(S, ui) {
    if (S.ice) return ice(S, ui);
    if (S.compose) return compose(S, ui);
    if (S.vote) return vote(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait({ ice: '💬', compose: '🧲', voting: '👀', reveal: '📋', scores: '📊' }[S.phase] || '💼', S.wait || 'Смотри на экран');
  },
};

const count = (t) => (t.trim().match(/[\p{L}\p{N}-]+/gu) || []).length;

function ice(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">разогрев ${S.ice.no} из ${S.ice.of}</div>
    <div class="sb-pq">${ui.esc(S.ice.q)}</div>
    <textarea id="t" maxlength="140" placeholder="минимум ${S.ice.min} слова — можно не по теме" autocomplete="off" autocapitalize="sentences"></textarea>
    <div class="count" id="c">0 слов</div>`;
  ui.foot.innerHTML = `<button class="btn" id="go" disabled>Ответить</button>`;
  const ta = ui.main.querySelector('#t'), c = ui.main.querySelector('#c'), go = ui.foot.querySelector('#go');
  setTimeout(() => ta.focus(), 150);
  ta.oninput = () => { const n = count(ta.value); c.textContent = `${n} ${ui.plural(n, 'слово', 'слова', 'слов')}${n < S.ice.min ? ` · нужно ${S.ice.min}` : ''}`; go.disabled = n < S.ice.min; };
  go.onclick = () => { ui.act({ a: 'ice', n: S.ice.n, text: ta.value }); ui.wait('💾', 'Записано'); };
}

function compose(S, ui) {
  const bank = S.compose.bank;
  line = [];
  order = bank.map((_, i) => i);
  const tile = (i, inLine) => {
    const t = bank[i];
    const p = t.by ? ui.p(t.by) : null;
    return `<button class="tl ${!inLine && line.includes(i) ? 'used' : ''}" data-i="${i}" style="--oc:${p?.color || '#c3cad8'}">${ui.esc(t.w)}</button>`;
  };
  const draw = () => {
    ui.main.innerHTML = `
      <div class="sb-pq">${ui.esc(S.compose.q)}</div>
      <div class="sb-line" id="line">${line.map((i) => tile(i, true)).join('')}</div>
      <div class="tagline">слова других кандидатов · цвет — чьё слово</div>
      <div class="sb-bank" id="bank">${order.map((i) => tile(i, false)).join('')}</div>`;
    ui.foot.innerHTML = `
      <div class="row"><button class="btn ghost small" id="mix">Перемешать</button><button class="btn ghost small" id="clr">Очистить</button></div>
      <button class="btn" id="go" ${line.length >= 2 ? '' : 'disabled'}>Ответить Анжеле (${line.length}/${S.compose.max})</button>`;
    for (const b of ui.main.querySelectorAll('#bank .tl')) b.onclick = () => { if (line.length < S.compose.max) { line.push(Number(b.dataset.i)); ui.buzz(10); draw(); } };
    for (const b of ui.main.querySelectorAll('#line .tl')) b.onclick = () => { const k = line.indexOf(Number(b.dataset.i)); line.splice(k, 1); draw(); };
    ui.foot.querySelector('#mix').onclick = () => { order.sort(() => Math.random() - 0.5); draw(); };
    ui.foot.querySelector('#clr').onclick = () => { line = []; draw(); };
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'compose', tiles: line }); ui.wait('📨', 'Ответ у Анжелы'); };
  };
  draw();
}

function vote(S, ui) {
  const voted = S.votedFor;
  ui.main.innerHTML = `
    <div class="tagline">кто лучше ответил?</div>
    <div class="sb-pq">${ui.esc(S.vote.q)}</div>
    <div class="opts">${S.vote.options.map((o, i) => `<button class="opt ${voted === o.id ? 'on' : voted ? 'off' : ''}" data-o="${o.id}"><small>кандидат ${i + 1}</small>${ui.esc(o.text || '—')}</button>`).join('')}</div>`;
  ui.foot.innerHTML = voted ? '<div class="sub" style="text-align:center">голос принят</div>' : '';
  if (!voted) for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(40); ui.act({ a: 'vote', for: b.dataset.o }); };
}

function winner(S, ui) {
  const w = S.winner;
  const mine = w && S.you && w.id === S.you.id;
  ui.main.innerHTML = `<div class="wait"><div class="em">${mine ? '🎉' : '💼'}</div><h1>${mine ? 'Вы приняты!' : ui.esc(w?.name || '—')}</h1>
    <div class="sub">${mine ? 'новая должность:' : 'получает должность'}</div><div class="sb-pq">${ui.esc(S.job || '')}</div></div>`;
}
