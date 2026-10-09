/* Медная гора — экран */

const torches = (n) => Array.from({ length: Math.max(n, 0) }, () => '<i class="torch"></i>').join('') + Array.from({ length: Math.max(0, 3 - n) }, () => '<i class="torch out"></i>').join('');

export default {
  key(S) {
    if (S.phase === 'guess' || S.phase === 'opened') return `${S.round}`;
    return `${S.round}`;
  },
  wipe(prev, S) { return !(prev?.phase === 'guess' && S.phase === 'opened') && !(prev?.phase === 'opened' && S.phase === 'guess'); },

  mood(S) {
    return { teams: 'lobby', survey: 'think', guess: 'tense', opened: 'tense', roundEnd: 'reveal', winner: 'win' }[S.phase];
  },

  render(S, ui) {
    ui.tag(S.round ? `раунд ${S.round} из ${S.rounds}` : '');
    if (S.phase === 'opened') S = { ...S };
    const f = DRAW[S.phase === 'opened' ? 'guess' : S.phase];
    f?.(S, ui);
  },

  update(S, ui, prev) {
    if (S.phase === 'survey') {
      for (const d of S.done || []) ui.app.querySelector(`[data-p="${d.id}"]`)?.classList.toggle('off', !d.done);
    }
    if (S.phase === 'guess' || S.phase === 'opened') {
      drawDoors(S, ui);
      drawTeams(S, ui);
      if (S.phase === 'opened' && prev?.phase === 'guess' && S.last) {
        const el = ui.app.querySelector(`[data-d="${S.last.i}"]`);
        if (S.last.gem) ui.fx.burstAt(el, '#18c88a', 40);
        else ui.fx.shake(ui.app);
      }
    }
  },
};

function teamPanel(S, ui, t) {
  const active = (S.phase === 'guess' || S.phase === 'opened') && S.turn === t.id;
  return `<div class="gr-team ${active ? 'active' : ''}" style="--tc:${t.color}" data-t="${t.id}">
    <h3 style="color:${t.color}">${ui.esc(t.name)}</h3>
    <div class="torches">${torches(S.torches?.[t.id] ?? 3)}</div>
    <div class="score">${ui.fmt(S.teamScore?.[t.id] || 0)}</div>
    <div class="gems">${'💎'.repeat(S.gems?.[t.id] || 0)}</div>
    <div class="mem">${t.members.map((id) => ui.avatar(ui.p(id), id === S.captain ? 'cap' : '')).join('')}</div>
  </div>`;
}

function drawTeams(S, ui) {
  for (const t of S.teams || []) {
    const el = ui.app.querySelector(`.gr-team[data-t="${t.id}"]`);
    if (el) el.outerHTML = teamPanel(S, ui, t);
  }
}

function drawDoors(S, ui) {
  const box = ui.app.querySelector('.doors');
  if (!box) return;
  box.innerHTML = (S.doors || []).map((d) => {
    const hints = (S.hints?.[d.i] || []).map((id) => ui.avatar(ui.p(id))).join('');
    const cls = d.open ? (d.gem ? 'gem' : 'monster') : (S.hints?.[d.i]?.length ? 'hot' : '');
    return `<div class="door ${cls}" data-d="${d.i}">
      ${d.open ? `<div class="rk">#${d.rank}</div><div class="res">${d.gem ? '💎' : '👹'}</div>` : `<div class="hints">${hints}</div>`}
      <div class="t">${ui.esc(d.text)}</div>
    </div>`;
  }).join('');
  const tick = ui.app.querySelector('.gr-ticker');
  if (tick) {
    const team = S.teams?.find((t) => t.id === S.turn);
    const cap = ui.p(S.captain);
    tick.innerHTML = S.phase === 'opened'
      ? (S.last?.gem ? 'самоцвет!' : 'чудище гасит факел')
      : `ход: <b style="color:${team?.color}">${ui.esc(team?.name || '')}</b> · дверь выбирает <b>${ui.esc(cap?.name || '')}</b> · найдено ${S.found} из ${S.need}`;
  }
}

const DRAW = {
  teams(S, ui) {
    ui.app.innerHTML = `
      <div class="gr-teams">${(S.teams || []).map((t) => `
        <div class="gr-tcard pop" style="--tc:${t.color}">
          <h2>${ui.esc(t.name)}</h2>
          <div class="torches">${torches(3)}</div>
          <div class="mem stagger">${t.members.map((id) => { const p = ui.p(id); return `<span class="person">${ui.avatar(p)}${ui.esc(p?.name)}</span>`; }).join('')}</div>
        </div>`).join('')}</div>`;
  },

  survey(S, ui) {
    ui.app.innerHTML = `
      <div class="center">
        <div class="caps dim" style="font-size:2vmin">каждый тайно выбирает свой топ-3</div>
        <div class="big rise" style="font-family:var(--display);max-width:140vmin">${ui.esc(S.question)}</div>
        <div class="stagger" style="display:flex;flex-wrap:wrap;justify-content:center;gap:1.2vmin;max-width:140vmin">
          ${(S.options || []).map((o) => `<span class="chip" style="font-size:2vmin">${ui.esc(o)}</span>`).join('')}
        </div>
        <div style="display:flex;gap:1vmin;flex-wrap:wrap;justify-content:center;margin-top:2vmin">
          ${(S.done || []).map((d) => `<span class="person ${d.done ? '' : 'off'}" data-p="${d.id}" style="font-size:1.8vmin">${ui.avatar(ui.p(d.id))}${ui.esc(ui.p(d.id)?.name)}</span>`).join('')}
        </div>
      </div>`;
    const sync = () => { for (const d of S.done || []) ui.app.querySelector(`[data-p="${d.id}"]`)?.classList.toggle('off', !d.done); };
    sync();
  },

  guess(S, ui) {
    const [A, B] = S.teams || [];
    ui.tag(`раунд ${S.round} из ${S.rounds} · самоцвет ${ui.fmt(S.value)}`);
    ui.app.innerHTML = `
      <div class="gr-wrap">
        ${A ? teamPanel(S, ui, A) : '<div></div>'}
        <div class="gr-mid">
          <div class="gr-q rise"><div class="q">${ui.esc(S.question)}</div><div class="goal">${ui.esc(S.goal)}</div></div>
          <div class="doors"></div>
          <div class="gr-ticker"></div>
        </div>
        ${B ? teamPanel(S, ui, B) : '<div></div>'}
      </div>`;
    drawDoors(S, ui);
  },

  roundEnd(S, ui) {
    const max = Math.max(1, ...(S.ranking || []).map((r) => r.pts));
    ui.app.innerHTML = `
      <div class="center" style="gap:2vmin">
        <div class="caps dim" style="font-size:2vmin">как на самом деле ответила комната</div>
        <div class="big" style="font-size:4.4vmin">${ui.esc(S.question)}</div>
        <div class="gr-rank stagger">${(S.ranking || []).map((r) => `
          <div class="r ${r.target ? 't' : ''}"><div class="n">${r.rank}</div><div class="nm">${ui.esc(r.text)}</div>
          <div class="bar"><i style="width:${(r.pts / max) * 100}%"></i></div><div class="pt">${r.pts}</div></div>`).join('')}</div>
      </div>`;
  },

  winner(S, ui) {
    const [A, B] = S.teams || [];
    const win = S.teamScore.A === S.teamScore.B ? null : S.teamScore.A > S.teamScore.B ? A : B;
    const sage = ui.p(S.titles?.sage), crow = ui.p(S.titles?.crow);
    ui.app.innerHTML = `
      <div class="center" style="gap:3vmin">
        <div class="caps dim" style="font-size:2vmin">${win ? 'из горы выходит команда' : 'ничья — гора отпускает всех'}</div>
        ${win ? `<div class="huge slam" style="color:${win.color}">${ui.esc(win.name)}</div>
          <div style="display:flex;gap:1.4vmin;flex-wrap:wrap;justify-content:center">${win.members.map((id) => `<span class="person" style="font-size:2.4vmin">${ui.avatar(ui.p(id))}${ui.esc(ui.p(id)?.name)}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:4vmin;font-size:2.4vmin;margin-top:2vmin">
          ${A ? `<span style="color:${A.color}">${ui.esc(A.name)}: <b>${ui.fmt(S.teamScore.A)}</b></span>` : ''}
          ${B ? `<span style="color:${B.color}">${ui.esc(B.name)}: <b>${ui.fmt(S.teamScore.B)}</b></span>` : ''}
        </div>
        <div style="display:flex;gap:3vmin;margin-top:2vmin" class="stagger">
          ${sage ? `<div class="chip" style="font-size:2.2vmin">🧙 Знаток народа: ${ui.avatar(sage)}${ui.esc(sage.name)}</div>` : ''}
          ${crow && crow.id !== sage?.id ? `<div class="chip" style="font-size:2.2vmin">🐦‍⬛ Белая ворона: ${ui.avatar(crow)}${ui.esc(crow.name)}</div>` : ''}
        </div>
      </div>`;
    if (win) ui.fx.confetti(['#18c88a', '#f2c14e', '#e2803a', '#5fd3b4']);
  },
};
