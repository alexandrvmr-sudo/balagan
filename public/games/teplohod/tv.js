/* Теплоход — экран */

const dots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}" style="display:inline-block;width:1.6vmin;height:1.6vmin;border-radius:50%;margin:0 .4vmin;background:${i < S.voted ? 'var(--a2)' : 'rgba(255,255,255,.2)'}"></i>`).join('');

export default {
  key(S) {
    if (S.phase === 'perform') return `${S.matchNo}:${S.performer}:${S.part}`;
    if (S.phase === 'voting' || S.phase === 'reveal') return `${S.matchNo}`;
    return '';
  },
  wipe(prev, S) { return !(prev?.phase === 'perform' && S.phase === 'perform'); },
  mood(S) { return { board: 'lobby', write: 'think', pick: 'calm', perform: 'silence', voting: 'tense', reveal: 'reveal', final: 'tense', fvote: 'tense', freveal: 'reveal', winner: 'win' }[S.phase]; },

  render(S, ui) {
    document.body.classList.toggle('sinking', ['final', 'fvote', 'freveal'].includes(S.phase));
    if (!['final', 'fvote', 'freveal'].includes(S.phase)) document.querySelector('.tp-water')?.remove();
    ui.tag({ board: 'посадка', write: 'пишем шутки', pick: 'выбор номера', perform: `выступление ${S.matchNo} из ${S.matchTotal}`, voting: `дуэль ${S.matchNo} из ${S.matchTotal}`, reveal: `дуэль ${S.matchNo} из ${S.matchTotal}`, final: 'теплоход тонет', fvote: 'теплоход тонет', freveal: 'теплоход тонет' }[S.phase] || '');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    for (const w of S.progress || []) {
      const el = ui.app.querySelector(`[data-p="${w.id}"]`);
      if (!el) continue;
      if (w.done && !el.classList.contains('done')) ui.sfx('pop');
      el.classList.toggle('done', !!w.done);
      const st = el.querySelector('.st');
      if (st) st.textContent = w.done ? 'готово' : w.n != null ? `шуток: ${w.n}` : 'пишет…';
    }
    const d = ui.app.querySelector('.tp-dots');
    if (d) d.innerHTML = dots(S);
  },
};

function tickets(S, ui, label) {
  return `<div class="tp-tickets stagger">${(S.progress || []).map((w) => {
    const p = ui.p(w.id) || {};
    return `<div class="tp-ticket ${w.done ? 'done' : ''}" data-p="${w.id}">${ui.avatar(p)}<div class="nm">${ui.esc(p.name)}</div><div class="st">${w.done ? 'готово' : label(w)}</div></div>`;
  }).join('')}</div>`;
}

function water() {
  if (!document.querySelector('.tp-water')) { const w = document.createElement('div'); w.className = 'tp-water'; w.dataset.transient = '1'; document.body.appendChild(w); }
}

const DRAW = {
  board(S, ui) {
    ui.app.innerHTML = `
      <div class="tp-hero">
        <div class="tp-ship">🚢</div>
        <div class="big" style="font-family:var(--display)">Посадка на теплоход «Весёлый карась»</div>
        <div class="lead dim">придумайте коронную фразу и слова для тем</div>
        ${tickets(S, ui, () => 'на трапе…')}
      </div>`;
  },

  write(S, ui) {
    ui.app.innerHTML = `
      <div class="tp-hero">
        <div class="tp-ship">✍️</div>
        <div class="big" style="font-family:var(--display)">Пишем шутки</div>
        <div class="lead dim">выбери тему — допиши панчлайн</div>
        ${tickets(S, ui, (w) => `шуток: ${w.n}`)}
      </div>`;
  },

  pick(S, ui) {
    ui.app.innerHTML = `
      <div class="tp-hero">
        <div class="tp-ship">🎤</div>
        <div class="big" style="font-family:var(--display)">Выбираем номер</div>
        ${tickets(S, ui, () => 'думает…')}
      </div>`;
  },

  perform(S, ui) {
    const p = ui.p(S.performer) || {};
    ui.app.innerHTML = `
      <div class="tp-stage">
        <div class="tp-mic">${ui.avatar(p)}<span class="m">🎤</span></div>
        <div class="tp-name">${ui.esc(p.name)}</div>
        <div class="tp-setup" id="setup"></div>
        ${S.part === 'punch' ? `<div class="tp-punch">${ui.esc(S.punch)}</div><div class="tp-catch">«${ui.esc(S.catch)}»</div>` : ''}
        <div class="tp-lineup">${(S.lineup || []).map((id) => { const x = ui.p(id); return `<span class="person ${id === S.performer ? 'now' : ''}">${ui.avatar(x)}${ui.esc(x?.name)}</span>`; }).join('')}</div>
      </div>`;
    const el = ui.app.querySelector('#setup');
    if (S.part === 'setup') ui.fx.typewriter(el, S.setup, 38);
    else { el.textContent = S.setup; ui.fx.shake(ui.app.querySelector('.tp-punch')); }
  },

  voting(S, ui) {
    ui.app.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:3vmin">
        <div class="center" style="flex:0"><div class="big" style="font-family:var(--display);font-size:5vmin">Кто смешнее?</div></div>
        <div class="tp-duel">${(S.options || []).map((o) => { const p = ui.p(o.id) || {}; return `
          <div class="tp-joke"><div class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span></div><div class="s">${ui.esc(o.setup)}</div><div class="p">${ui.esc(o.punch)}</div></div>`; }).join('')}</div>
        <div class="tp-dots" style="text-align:center">${dots(S)}</div>
      </div>`;
  },

  reveal(S, ui) {
    const r = S.result;
    ui.app.innerHTML = `
      <div class="tp-duel">${r.rows.map((row, i) => { const p = ui.p(row.id) || {}; const win = i === 0 && row.votes > 0 && !r.tie; return `
        <div class="tp-joke ${win ? 'win' : ''}">
          ${row.ovation ? '<div class="tp-stamp">Овация!</div>' : ''}
          <div class="s">${ui.esc(row.setup)}</div><div class="p">${ui.esc(row.punch)}</div>
          <div class="voters">${(row.voters || []).map((v) => ui.avatar(ui.p(v))).join('')}</div>
          <div class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><span class="pts">+${ui.fmt(row.pts)}</span></div>
        </div>`; }).join('')}</div>`;
    setTimeout(() => ui.fx.burstAt(ui.app.querySelector('.tp-joke.win'), '#ffd166', 40), 500);
  },

  final(S, ui) {
    water();
    ui.app.innerHTML = `
      <div class="tp-hero">
        <div class="tp-ship" style="transform:rotate(-18deg)">🚢</div>
        <div class="big" style="font-family:var(--display);color:var(--a1)">Мы тонем!</div>
        <div class="tp-setup">${ui.esc(S.setup)} <b style="color:var(--a1)">…</b></div>
        ${tickets(S, ui, () => 'спасается…')}
      </div>`;
  },

  fvote(S, ui) {
    water();
    ui.app.innerHTML = `
      <div class="tp-hero" style="justify-content:flex-start">
        <div class="tp-setup" style="font-size:2.8vmin">${ui.esc(S.setup)}</div>
        <div class="tp-final-list stagger">${(S.options || []).map((o) => `<div class="row"><span>${ui.esc(o.text)}</span></div>`).join('')}</div>
        <div class="lead dim">голосуйте за лучшее последнее слово</div>
      </div>`;
  },

  freveal(S, ui) {
    water();
    ui.app.innerHTML = `
      <div class="tp-hero" style="justify-content:flex-start">
        <div class="tp-setup" style="font-size:2.8vmin">${ui.esc(S.setup)}</div>
        <div class="tp-final-list stagger">${(S.result || []).map((r, i) => { const p = ui.p(r.id) || {}; return `
          <div class="row ${i === 0 ? 'win' : ''}"><span>${ui.esc(r.text)}</span><span class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span> <b style="color:var(--a2)">+${ui.fmt(r.pts)}</b></span></div>`; }).join('')}</div>
      </div>`;
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    ui.app.innerHTML = `
      <div class="center" style="gap:2vmin">
        <div class="caps dim" style="font-size:2vmin">лучший комик рейса</div>
        <div class="huge slam" style="font-family:var(--display);color:${top?.color}">${ui.esc(top?.name || '—')}</div>
        ${ui.podium(list)}
      </div>`;
    ui.fx.confetti(['#ff7a1a', '#ffd166', '#7cc6fe', '#2ec4b6', '#ffffff']);
    ui.sfx('applause');
  },
};
