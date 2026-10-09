/* Санаторий — экран */

const L = ['А', 'Б', 'В', 'Г'];

export default {
  key(S) {
    if (S.phase === 'escape' || S.phase === 'escReveal') return `${S.n}`;
    return `${S.qn}`;
  },
  mood(S) {
    return { intro: 'calm', question: 'think', qreveal: 'reveal', procIntro: 'tense', poison: 'tense', drink: 'tense', analiz: 'tense', schet: 'tense', obhod: 'tense', verdict: 'reveal', escape: 'tense', escReveal: 'reveal', winner: 'win' }[S.phase];
  },

  render(S, ui, prev) {
    ui.tag(S.phase === 'escape' || S.phase === 'escReveal' ? 'побег' : S.qn ? `вопрос ${Math.min(S.qn, S.total)} из ${S.total}` : '');
    DRAW[S.phase]?.(S, ui, prev);
  },

  update(S, ui) {
    if (S.phase === 'question') for (const id of S.answered || []) ui.app.querySelector(`.sn-p[data-p="${id}"]`)?.classList.add('ok');
    if (S.phase === 'poison') for (const d of S.poisonDone || []) ui.app.querySelector(`.sn-p[data-p="${d.id}"]`)?.classList.toggle('ok', d.done);
    if (S.phase === 'drink') for (const d of S.drunk || []) ui.app.querySelector(`.sn-p[data-p="${d.id}"]`)?.classList.toggle('ok', d.done);
    if (S.phase === 'obhod') for (const d of S.hidden || []) ui.app.querySelector(`.sn-p[data-p="${d.id}"]`)?.classList.toggle('ok', d.done);
    if (S.phase === 'analiz') DRAW.analiz(S, ui);
    if (S.phase === 'schet') DRAW.schet(S, ui);
    if (S.phase === 'escape') for (const id of S.submitted || []) ui.app.querySelector(`.sn-lane[data-p="${id}"] .avatar`)?.classList.add('bob');
  },
};

function patient(ui, S, id, cls = '') {
  const p = ui.p(id) || {};
  const ghost = S.dead?.[id];
  return `<span class="sn-p ${ghost ? 'ghost' : ''} ${cls}" data-p="${id}">${ui.avatar(p)}${ui.esc(p.name)}</span>`;
}
const everyone = (S) => S.players.filter((p) => !p.audience).map((p) => p.id);

const DRAW = {
  intro(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-sign">САНАТОРИЙ «ТИХИЙ ЧАС»</div>
        <div class="sn-note">Пациентов поступило: ${everyone(S).length}. Выписанных: 0.</div>
        <div class="sn-patients stagger">${everyone(S).map((id) => patient(ui, S, id)).join('')}</div>
      </div>`;
  },

  question(S, ui) {
    ui.app.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-chart"><div class="no">История болезни · вопрос №${S.qn}</div><div class="q">${ui.esc(S.q)}</div></div>
        <div class="sn-opts stagger">${S.options.map((o, i) => `<div class="sn-opt"><b>${L[i]}</b>${ui.esc(o)}</div>`).join('')}</div>
        <div class="sn-patients">${everyone(S).map((id) => patient(ui, S, id, (S.answered || []).includes(id) ? 'ok' : '')).join('')}</div>
      </div>`;
  },

  qreveal(S, ui) {
    ui.app.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-chart"><div class="no">Правильный ответ</div><div class="q">${ui.esc(S.q)}</div></div>
        <div class="sn-opts">${S.options.map((o, i) => `<div class="sn-opt ${i === S.correct ? 'right' : 'wrong'}"><b>${L[i]}</b>${ui.esc(o)}<div class="who">${(S.picks?.[i] || []).map((id) => ui.avatar(ui.p(id))).join('')}</div></div>`).join('')}</div>
        ${S.patients?.length ? `<div class="center" style="flex:0;gap:1vmin"><div class="sn-note">На процедуру:</div><div class="sn-patients">${S.patients.map((id) => patient(ui, S, id, 'bad')).join('')}</div></div>` : '<div class="center" style="flex:0"><div class="sn-note">Все здоровы. Пока.</div></div>'}
      </div>`;
    if (S.patients?.length) setTimeout(() => ui.fx.shake(ui.app), 300);
  },

  procIntro(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-note">процедура</div>
        <div class="sn-proc">${ui.esc(S.proc.title)}</div>
        <div class="lead" style="max-width:110vmin">${ui.esc(S.proc.desc)}</div>
        <div class="sn-patients">${S.patients.map((id) => patient(ui, S, id, 'bad')).join('')}</div>
      </div>`;
  },

  poison(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-proc" style="font-size:6vmin">Компот</div>
        <div class="lead">Здоровые тайно подсыпают снотворное…</div>
        <div class="sn-glasses stagger">${Array.from({ length: S.glasses }, (_, i) => `<div class="sn-glass"><div class="n">${i + 1}</div></div>`).join('')}</div>
        <div class="sn-patients">${(S.poisonDone || []).map((d) => patient(ui, S, d.id, d.done ? 'ok' : '')).join('')}</div>
      </div>`;
  },

  drink(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-proc" style="font-size:6vmin">Компот</div>
        <div class="lead">Пациенты, выбирайте стакан</div>
        <div class="sn-glasses">${Array.from({ length: S.glasses }, (_, i) => `<div class="sn-glass"><div class="n">${i + 1}</div></div>`).join('')}</div>
        <div class="sn-patients">${(S.drunk || []).map((d) => patient(ui, S, d.id, d.done ? 'ok' : 'bad')).join('')}</div>
      </div>`;
  },

  analiz(S, ui) {
    const cards = Object.entries(S.cards || {}).map(([id, c]) => `
      <div class="sn-card">${patient(ui, S, id, c.dead ? 'bad' : c.done ? 'ok' : '')}
        <div class="sn-grid">${Array.from({ length: 9 }, (_, k) => {
          const open = c.opened.includes(k);
          const sk = c.skulls.includes(k);
          return `<i class="${open ? (sk ? 'skull' : 'ok') : ''}">${open ? (sk ? '☠' : '✓') : '🧪'}</i>`;
        }).join('')}</div></div>`).join('');
    const box = ui.app.querySelector('.sn-cards');
    if (box) { box.innerHTML = cards; return; }
    ui.app.innerHTML = `<div class="center"><div class="sn-proc" style="font-size:6vmin">Анализы</div><div class="lead">Вскройте две пробирки. В двух из девяти — плохие новости.</div><div class="sn-cards">${cards}</div></div>`;
  },

  schet(S, ui) {
    const rows = Object.entries(S.math || {}).map(([id, m]) => `
      <div class="sn-card">${patient(ui, S, id)}<div class="sn-note" style="font-size:2.6vmin">решено ${m.i} из ${m.of} · верно ${m.right}</div></div>`).join('');
    const box = ui.app.querySelector('.sn-cards');
    if (box) { box.innerHTML = rows; return; }
    ui.app.innerHTML = `<div class="center"><div class="sn-proc" style="font-size:6vmin">Устный счёт</div><div class="lead">Четыре примера. Нужно три верных.</div><div class="sn-cards">${rows}</div></div>`;
  },

  obhod(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-proc" style="font-size:6vmin">Обход</div>
        <div class="lead">Прячьтесь. Главврач заглянет в две палаты.</div>
        <div class="sn-rooms">${[1, 2, 3, 4, 5].map((n) => `<div class="sn-room">Палата №${n}</div>`).join('')}</div>
        <div class="sn-patients">${(S.hidden || []).map((d) => patient(ui, S, d.id, d.done ? 'ok' : '')).join('')}</div>
      </div>`;
  },

  verdict(S, ui) {
    const v = S.verdict || {};
    const d = v.details || {};
    let scene = '';
    if (d.glasses) {
      scene = `<div class="sn-glasses">${Array.from({ length: d.glasses }, (_, i) => {
        const who = Object.entries(d.drinks || {}).filter(([, g]) => g === i).map(([id]) => ui.avatar(ui.p(id))).join('');
        return `<div class="sn-glass ${d.poisoned.includes(i) ? 'poison' : ''}"><div class="n">${i + 1}</div><div class="who">${who}</div></div>`;
      }).join('')}</div>`;
    } else if (d.checked) {
      scene = `<div class="sn-rooms">${[0, 1, 2, 3, 4].map((r) => `<div class="sn-room ${d.checked.includes(r) ? 'checked' : ''}"><div class="who">${Object.entries(d.hide || {}).filter(([, x]) => x === r).map(([id]) => ui.avatar(ui.p(id))).join('')}</div>Палата №${r + 1}</div>`).join('')}</div>`;
    } else if (d.cards) {
      scene = `<div class="sn-cards">${Object.entries(d.cards).map(([id, c]) => `<div class="sn-card">${patient(ui, S, id)}<div class="sn-grid">${Array.from({ length: 9 }, (_, k) => { const sk = c.skulls.includes(k); const op = c.opened.includes(k); return `<i class="${op ? (sk ? 'skull' : 'ok') : ''}">${sk ? '☠' : op ? '✓' : ''}</i>`; }).join('')}</div></div>`).join('')}</div>`;
    } else if (d.math) {
      scene = `<div class="sn-cards">${Object.entries(d.math).map(([id, m]) => `<div class="sn-card">${patient(ui, S, id)}<div class="sn-note" style="font-size:2.6vmin">верно ${m.right} из ${m.of}</div></div>`).join('')}</div>`;
    }
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-proc" style="font-size:5vmin">${ui.esc(S.proc.title)} · итог</div>
        ${scene}
        ${v.died?.length ? `<div class="sn-note">Перешли на вечный тихий час:</div><div class="sn-patients">${v.died.map((id) => patient(ui, S, id, 'bad')).join('')}</div>` : '<div class="sn-note">Все пережили процедуру.</div>'}
      </div>`;
    if (v.died?.length) setTimeout(() => ui.fx.shake(ui.app), 500);
  },

  escape(S, ui) { escapeScreen(S, ui, false); },
  escReveal(S, ui) { escapeScreen(S, ui, true); },

  winner(S, ui) {
    const w = ui.p(S.winner);
    ui.app.innerHTML = `
      <div class="center">
        <div class="sn-stamp">ВЫПИСАН</div>
        <div class="huge slam" style="color:${w?.color}">${ui.esc(w?.name || '—')}</div>
        <div class="sn-note">Остальные остаются на тихий час.</div>
        <div class="sn-patients">${everyone(S).filter((id) => id !== S.winner).map((id) => patient(ui, S, id)).join('')}</div>
      </div>`;
    ui.fx.confetti(['#7ee0c3', '#f4e9c1', '#d7263d', '#ffffff']);
  },
};

function escapeScreen(S, ui, reveal) {
  const lanes = everyone(S).sort((a, b) => (S.pos?.[b] || 0) - (S.pos?.[a] || 0)).map((id) => {
    const p = ui.p(id) || {};
    const pos = S.pos?.[id] || 0;
    const ghost = S.dead?.[id];
    const mv = reveal ? S.moves?.[id] : null;
    return `<div class="sn-lane ${ghost ? 'ghost' : ''}" data-p="${id}" style="--n:${S.track}">
      <span class="nm">${ui.esc(p.name)}${ghost ? ' 👻' : ''}${mv ? ` <b style="color:var(--a3)">+${mv}</b>` : ''}</span>
      <span class="avatar" style="--pc:${p.color};left:${Math.min(100, (pos / S.track) * 100)}%"><span>${p.emoji}</span></span></div>`;
  }).join('');
  const swaps = reveal && S.swaps?.length ? `<div class="sn-note">${S.swaps.map((x) => `${ui.esc(ui.p(x.ghost)?.name)} вселяется в ${ui.esc(ui.p(x.victim)?.name)}!`).join(' ')}</div>` : '';
  ui.app.innerHTML = `
    <div class="sn-wrap" style="justify-content:center">
      <div class="sn-sign" style="font-size:5vmin">${ui.esc(S.cat)}</div>
      <div class="sn-items">${S.items.map((it) => `<div class="sn-item ${reveal ? (it.ok ? 'yes' : 'no') : ''}">${ui.esc(it.t)}</div>`).join('')}</div>
      ${swaps}
      <div class="sn-track" style="padding-right:5vmin">${lanes}</div>
    </div>`;
  if (reveal && S.swaps?.length) ui.fx.shake(ui.app);
}
