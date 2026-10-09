/* Шутка на двоих — экран */

const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export default {
  key(S) {
    if (S.phase === 'writing') return `${S.round}`;
    if (S.phase === 'voting' || S.phase === 'reveal') return `${S.round}:${S.matchNo}`;
    return `${S.round}`;
  },

  mood(S) {
    if (S.phase === 'writing') return 'think';
    if (S.phase === 'voting') return 'tense';
    if (S.phase === 'reveal') return 'reveal';
    if (S.phase === 'cooking') return 'calm';
    if (S.phase === 'scores') return 'lobby';
    if (S.phase === 'winner') return 'win';
  },

  render(S, ui) {
    const tag = S.final ? 'финал · тройной удар' : `раунд ${S.round} из ${S.total} · ${S.value} очков`;
    ui.tag(S.phase === 'cooking' ? '' : tag);
    const f = DRAW[S.phase];
    if (f) f(S, ui);
    else ui.app.innerHTML = '';
  },

  update(S, ui) {
    if (S.phase === 'writing') {
      for (const w of S.progress || []) {
        const el = ui.app.querySelector(`[data-p="${w.id}"]`);
        if (!el) continue;
        const done = w.done >= w.need;
        if (done && !el.classList.contains('done')) { ui.sfx('pop'); ui.fx.burstAt(el, ui.p(w.id)?.color); }
        el.classList.toggle('done', done);
        el.querySelector('.st').innerHTML = status(w);
      }
    }
    if (S.phase === 'voting') {
      const dots = ui.app.querySelector('.sh-tally');
      if (dots) dots.innerHTML = tallyDots(S);
    }
    if (S.phase === 'reveal') {
      const q = ui.app.querySelector('.sh-quip');
      if (q && S.quip && q.textContent !== S.quip) { q.textContent = S.quip; q.classList.add('rise'); }
    }
  },
};

const status = (w) => (w.done >= w.need ? 'готово ✓' : `<span class="pen">✏️</span> ${w.done} из ${w.need}`);
const tallyDots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}"></i>`).join('');

const DRAW = {
  cooking(S, ui) {
    ui.app.innerHTML = `
      <div class="center rise">
        <div class="spinner"></div>
        <div class="big">Жанна пишет затравки<br>под вашу компанию</div>
        ${S.topic ? `<div class="lead dim">тема: «${ui.esc(S.topic)}»</div>` : ''}
      </div>`;
  },

  writing(S, ui) {
    ui.app.innerHTML = `
      <div class="sh-write">
        <div class="rise">
          <div class="caps dim" style="font-size:2vmin">${S.final ? 'одна затравка на всех · три ответа' : 'каждому две затравки'}</div>
          <div class="big" style="margin-top:1.4vmin">${S.final ? 'Тройной удар!' : 'Пишите шутки!'}</div>
        </div>
        <div class="sh-desks stagger">${(S.progress || []).map((w) => {
          const p = ui.p(w.id) || {};
          return `<div class="sh-desk ${w.done >= w.need ? 'done' : ''}" data-p="${w.id}">${ui.avatar(p)}<div class="nm" style="color:${p.color}">${ui.esc(p.name)}</div><div class="st">${status(w)}</div></div>`;
        }).join('')}</div>
        ${S.note ? `<div class="badge">${ui.esc(S.note)}</div>` : ''}
      </div>`;
  },

  voting(S, ui) {
    if (S.final) {
      ui.app.innerHTML = `
        <div class="sh-vote">
          <div class="sh-prompt small">${ui.esc(S.prompt)}</div>
          <div class="sh-grid stagger">${(S.options || []).map((o, i) => `
            <div class="sh-three"><ol>${o.three.map((t) => `<li>${ui.esc(t)}</li>`).join('')}</ol><div class="foot dim">вариант ${i + 1}</div></div>`).join('')}</div>
          <div class="sh-tally">${tallyDots(S)}</div>
        </div>`;
      return;
    }
    const [a, b] = S.options || [];
    ui.app.innerHTML = `
      <div class="sh-vote">
        <div class="caps dim" style="text-align:center;font-size:1.8vmin">дуэль ${S.matchNo} из ${S.matchTotal} · голосуйте в телефоне</div>
        <div class="sh-prompt">${ui.esc(S.prompt)}</div>
        <div class="sh-duel">
          <div class="sh-ans l"><div class="txt">${ui.esc(a?.text || '— промолчал —')}</div></div>
          <div class="sh-vs">или</div>
          <div class="sh-ans r"><div class="txt">${ui.esc(b?.text || '— промолчал —')}</div></div>
        </div>
        <div class="sh-tally">${tallyDots(S)}</div>
      </div>`;
  },

  reveal(S, ui) {
    const r = S.result;
    if (!r) return;
    if (r.final) {
      ui.app.innerHTML = `
        <div class="sh-vote">
          <div class="sh-prompt small">${ui.esc(S.prompt)}</div>
          <div class="sh-grid stagger">${r.rows.map((row, i) => {
            const p = ui.p(row.id) || {};
            const m = row.medals;
            return `<div class="sh-three ${i === 0 ? 'win' : ''}">
              <ol>${row.three.map((t) => `<li>${ui.esc(t)}</li>`).join('')}</ol>
              <div class="foot"><span style="display:flex;align-items:center;gap:1vmin">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span></span>
              <span class="medals">${'🥇'.repeat(m.gold)}${'🥈'.repeat(m.silver)}${'🥉'.repeat(m.bronze)}</span><span style="color:var(--a2)">+${ui.fmt(row.pts)}</span></div>
            </div>`;
          }).join('')}</div>
        </div>`;
      ui.sfx('shutout');
      return;
    }
    const cards = r.rows.map((row, i) => {
      const p = ui.p(row.id) || {};
      const win = i === 0 && row.votes > 0 && !r.tie;
      return `<div class="sh-ans ${i === 0 ? 'l' : 'r'} ${win ? 'win' : r.tie ? '' : 'lose'}" data-row="${row.id}">
        ${row.safety ? '<div class="tag">выручай</div>' : ''}
        <div class="txt">${ui.esc(row.text || '— промолчал —')}</div>
        <div class="voters">${(row.voters || []).map((v, k) => `<span style="animation-delay:${0.3 + k * 0.12}s;display:inline-block">${ui.avatar(ui.p(v))}</span>`).join('')}</div>
        <div class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span></div>
        <div class="pts">+${ui.fmt(row.pts)}</div>
      </div>`;
    });
    ui.app.innerHTML = `
      <div class="sh-vote" style="position:relative">
        <div class="sh-prompt small">${ui.esc(S.prompt)}</div>
        <div class="sh-duel">${cards[0]}<div class="sh-vs">${r.tie ? '=' : '—'}</div>${cards[1] || ''}</div>
        <div class="sh-quip">${ui.esc(S.quip || '')}</div>
        ${r.shutout ? '<div class="sh-stamp">ШУТКА!</div>' : ''}
      </div>`;
    setTimeout(() => {
      const win = ui.app.querySelector('.sh-ans.win');
      if (win) ui.fx.burstAt(win, '#ffd23f', 40);
      if (r.shutout) { ui.fx.shake(ui.app); ui.fx.confetti(undefined, 90); }
    }, 900);
  },

  scores(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    ui.app.innerHTML = `<div class="center">${ui.board(list, S.gains, `после раунда ${S.round}`)}</div>`;
    for (const el of ui.app.querySelectorAll('[data-sc]')) {
      const id = el.dataset.sc; const p = ui.p(id); const g = S.gains?.[id] || 0;
      ui.fx.countUp(el, p.score - g, p.score, 1200);
    }
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    ui.app.innerHTML = `
      <div class="center" style="gap:2vmin">
        <div class="caps dim" style="font-size:2vmin">самый смешной человек вечера</div>
        <div class="huge slam" style="color:${top?.color}">${ui.esc(top?.name || '—')}</div>
        ${ui.podium(list)}
      </div>`;
    ui.fx.confetti();
  },
};
