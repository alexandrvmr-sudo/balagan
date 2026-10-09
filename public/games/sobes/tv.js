/* Собеседование — экран */

const tiles = (ui, list) => `<div class="tiles">${(list || []).map((t, k) => {
  const p = t.by ? ui.p(t.by) : null;
  const punct = /^[,.!?]$/.test(t.w);
  return `<span class="tile ${punct ? 'p' : ''}" style="--oc:${p?.color || '#c3cad8'};animation-delay:${k * 0.05}s">${ui.esc(t.w)}</span>`;
}).join('')}</div>`;

const dots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}"></i>`).join('');
const nameOf = (ui, id) => (id === 'angela' ? { name: 'Анжела', color: '#7b5cff', emoji: '🤖' } : ui.p(id) || {});

export default {
  key(S) { return S.phase === 'voting' || S.phase === 'reveal' ? `${S.round}:${S.matchNo}` : `${S.round}`; },
  mood(S) { return { ice: 'calm', compose: 'think', voting: 'tense', reveal: 'reveal', scores: 'lobby', winner: 'win' }[S.phase]; },

  render(S, ui) {
    ui.tag(S.round ? `раунд ${S.round} из ${S.rounds} · ${S.roundTitle}` : 'разогрев');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    if (S.phase === 'ice' || S.phase === 'compose') {
      for (const w of S.progress || []) {
        const el = ui.app.querySelector(`[data-p="${w.id}"]`);
        if (!el) continue;
        const done = w.done >= w.need;
        if (done && !el.classList.contains('done')) ui.sfx('pop');
        el.classList.toggle('done', done);
        el.querySelector('.st').textContent = done ? 'готово' : `${w.done} из ${w.need}`;
      }
      const c = ui.app.querySelector('.sb-count');
      if (c && S.words != null) c.textContent = `${S.words} слов в базе`;
    }
    if (S.phase === 'voting') { const d = ui.app.querySelector('.sb-tally'); if (d) d.innerHTML = dots(S); }
  },
};

function desks(S, ui) {
  return `<div class="sb-desks stagger">${(S.progress || []).map((w) => {
    const p = ui.p(w.id) || {};
    return `<div class="sb-desk ${w.done >= w.need ? 'done' : ''}" data-p="${w.id}"><div class="laptop">💻</div><div class="nm" style="color:${p.color}">${ui.esc(p.name)}</div><div class="st">${w.done >= w.need ? 'готово' : `${w.done} из ${w.need}`}</div></div>`;
  }).join('')}</div>`;
}

const DRAW = {
  ice(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-hero">
        <div class="angela"></div>
        <div class="big">${S.round ? 'Расскажите о себе ещё' : 'Анжела знакомится'}</div>
        <div class="lead dim">отвечайте развёрнуто — ваши слова достанутся другим кандидатам</div>
        ${desks(S, ui)}
        <div class="sb-count">${S.words || 0} слов в базе</div>
      </div>`;
  },

  compose(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-hero">
        <div class="angela"></div>
        <div class="big">Собирайте ответы<br>из чужих слов</div>
        ${desks(S, ui)}
      </div>`;
  },

  voting(S, ui) {
    const [a, b] = S.options || [];
    ui.app.innerHTML = `
      <div class="sb-vote">
        <div class="sb-q"><div class="angela small"></div><div class="bubble">${ui.esc(S.q)}</div></div>
        <div class="sb-pair">
          <div class="sb-cv"><div class="head">кандидат 1</div>${tiles(ui, a?.tiles)}</div>
          <div class="sb-or">или</div>
          <div class="sb-cv"><div class="head">кандидат 2</div>${tiles(ui, b?.tiles)}</div>
        </div>
        <div class="sb-tally">${dots(S)}</div>
      </div>`;
  },

  reveal(S, ui) {
    const r = S.result;
    const cards = r.rows.map((row, i) => {
      const p = nameOf(ui, row.id);
      const win = i === 0 && row.votes > 0 && !r.tie;
      const credit = Object.entries(row.credit || {}).map(([id, pts]) => { const c = ui.p(id); return c ? `${ui.avatar(c)}<span style="color:${c.color}">+${pts}</span>` : ''; }).join(' ');
      return `<div class="sb-cv ${win ? 'win' : ''}">
        <div class="stampy ${win ? 'yes' : 'no'}">${win ? 'ПРИНЯТ' : r.tie ? 'ДУМАЕМ' : 'ОТКАЗ'}</div>
        ${tiles(ui, row.tiles)}
        <div class="voters">${(row.voters || []).map((v) => ui.avatar(ui.p(v))).join('')}</div>
        <div class="who">${row.id === 'angela' ? '<span class="angela small" style="width:4vmin;height:4vmin"></span>' : ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><span class="pts">${row.pts ? `+${ui.fmt(row.pts)}` : ''}</span></div>
        ${credit ? `<div class="credit">за слова: ${credit}</div>` : ''}
      </div>`;
    });
    ui.app.innerHTML = `
      <div class="sb-vote">
        <div class="sb-q"><div class="angela small"></div><div class="bubble" style="font-size:3vmin">${ui.esc(S.q)}</div></div>
        <div class="sb-pair">${cards[0]}<div class="sb-or">${r.tie ? '=' : '—'}</div>${cards[1] || ''}</div>
      </div>`;
    setTimeout(() => ui.fx.burstAt(ui.app.querySelector('.sb-cv.win'), '#b8f400', 36), 700);
  },

  scores(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    ui.app.innerHTML = `<div class="center">${ui.board(list, S.gains, `после раунда ${S.round}`)}</div>`;
    for (const el of ui.app.querySelectorAll('[data-sc]')) { const p = ui.p(el.dataset.sc); const g = S.gains?.[p.id] || 0; ui.fx.countUp(el, p.score - g, p.score, 1200); }
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    ui.app.innerHTML = `
      <div class="center" style="gap:2vmin">
        <div class="caps dim" style="font-size:2vmin">Анжела приняла решение</div>
        <div class="huge slam" style="color:${top?.color}">${ui.esc(top?.name || '—')}</div>
        <div class="sb-job">${ui.esc(S.job || '')}</div>
        ${ui.podium(list)}
      </div>`;
    ui.fx.confetti(['#3a86ff', '#b8f400', '#19b37a', '#7b5cff', '#ffffff']);
  },
};
