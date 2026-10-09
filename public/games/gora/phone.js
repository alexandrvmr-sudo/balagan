/* Медная гора — телефон */

let order = [];
let sel = null;

export default {
  key(S) {
    if (S.survey) return 'survey';
    if (S.guess) return `g:${S.guess.mine}:${S.guess.captain}:${S.guess.phase}:${S.guess.doors.filter((d) => d.open).length}`;
    return `w:${S.phase}:${S.wait || ''}:${S.winTeam || ''}`;
  },

  render(S, ui) {
    if (S.survey) return survey(S, ui);
    if (S.guess) return guess(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait(S.phase === 'teams' ? '⛏️' : '💎', S.wait || 'Смотри на экран');
    if (S.team) ui.foot.innerHTML = `<div class="gr-tbadge" style="--tc:${S.teamColor}">команда «${ui.esc(S.teamName)}»</div>`;
  },

  update(S, ui) {
    if (S.guess) {
      const g = S.guess;
      for (const el of ui.main.querySelectorAll('.gr-door')) {
        const i = Number(el.dataset.d);
        const hc = el.querySelector('.hc');
        if (hc) hc.innerHTML = (g.hints?.[i] || []).map((id) => ui.avatar(ui.p(id))).join('');
      }
    }
  },
};

function survey(S, ui) {
  order = [];
  const draw = () => {
    ui.main.innerHTML = `
      <div class="tagline">твой топ-3 · тайно</div>
      <h2>${ui.esc(S.survey.q)}</h2>
      <div class="opts">${S.survey.options.map((o, i) => {
        const k = order.indexOf(i);
        return `<button class="rank-opt ${k >= 0 ? 'on' : ''}" data-i="${i}"><b>${k >= 0 ? k + 1 : ''}</b><span>${ui.esc(o)}</span></button>`;
      }).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="go" ${order.length === 3 ? '' : 'disabled'}>${order.length === 3 ? 'Готово' : `выбери ещё ${3 - order.length}`}</button>`;
    for (const b of ui.main.querySelectorAll('.rank-opt')) {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        const k = order.indexOf(i);
        if (k >= 0) order.splice(k, 1); else if (order.length < 3) order.push(i);
        ui.buzz(15);
        draw();
      };
    }
    ui.foot.querySelector('#go').onclick = () => { ui.act({ a: 'rank', order }); ui.wait('🤫', 'Принято'); };
  };
  draw();
}

function guess(S, ui) {
  const g = S.guess;
  sel = null;
  const head = g.mine
    ? (g.captain ? 'Твой ход — выбирай дверь' : `Решает ${ui.esc(g.captainName || 'капитан')} — подскажи!`)
    : 'Ход соперников — подслушивай';
  const draw = () => {
    ui.main.innerHTML = `
      <div class="gr-tbadge" style="--tc:${S.teamColor || '#888'}">${S.team ? `команда «${ui.esc(S.teamName)}»` : 'ты в зале'}</div>
      <div class="tagline">${ui.esc(g.goal)}</div>
      <h2>${head}</h2>
      <div class="gr-doors">${g.doors.map((d) => `
        <button class="gr-door ${d.open ? (d.gem ? 'gem' : 'monster') : ''} ${sel === d.i || (!g.captain && g.hint === d.i) ? 'sel' : ''}" data-d="${d.i}" ${d.open || !g.mine || g.phase !== 'guess' ? 'disabled' : ''}>
          <div class="hc">${(g.hints?.[d.i] || []).map((id) => ui.avatar(ui.p(id))).join('')}</div>
          ${d.open ? `<div class="num">${d.gem ? '💎' : '👹'}</div>` : ''}${ui.esc(d.text)}
        </button>`).join('')}</div>`;
    ui.foot.innerHTML = g.captain && g.mine && g.phase === 'guess'
      ? `<button class="btn" id="open" ${sel == null ? 'disabled' : ''}>${sel == null ? 'выбери дверь' : 'Открыть дверь'}</button>`
      : '';
    for (const b of ui.main.querySelectorAll('.gr-door:not([disabled])')) {
      b.onclick = () => {
        const i = Number(b.dataset.d);
        ui.buzz(15);
        if (g.captain) { sel = i; draw(); }
        else { g.hint = i; ui.act({ a: 'hint', door: i }); draw(); }
      };
    }
    ui.foot.querySelector('#open')?.addEventListener('click', () => { ui.act({ a: 'open', door: sel }); ui.buzz(60); });
  };
  draw();
}

function winner(S, ui) {
  const mine = S.winTeam && S.team === S.winTeam;
  ui.main.innerHTML = `<div class="wait"><div class="em">${S.winTeam ? (mine ? '🏆' : '🪨') : '🤝'}</div>
    <h1>${S.winTeam ? (mine ? 'Вы выбрались!' : `Победили «${ui.esc(S.winName)}»`) : 'Ничья'}</h1>
    <div class="sub">у тебя ${ui.fmt(S.you?.score || 0)} очков</div></div>`;
}
