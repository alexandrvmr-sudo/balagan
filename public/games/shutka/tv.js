/* Шутка на двоих — экран. Телестудия в стикерном стиле: ведущая Жанна, дуэли пузырями, разбор голосов по шагам */

const INK = '#1a0b2e';
const LEVEL = { adult: '18+', hard: 'ЖЕСТЬ' };

/* ---------- ведущая Жанна: пышная причёска, микрофон, рот шевелится в такт голосу ---------- */
function zhanna(cls = '') {
  const lash = (x, d) => `<path d="M${x - 9 * d} ${128} l${-5 * d} -6M${x - 3 * d} ${125} l${-2 * d} -7M${x + 4 * d} ${125} l${1 * d} -7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  return `<div class="jz ${cls}"><svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <pattern id="jzSeq" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="var(--jz-dress, #ff2e63)"/><circle cx="3" cy="3" r="2" fill="#ffd23f"/><circle cx="9" cy="9" r="2" fill="#ffffff" opacity=".55"/></pattern>
      <pattern id="jzMic" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#4a4a5c"/><path d="M0 0l5 5M5 0l-5 5" stroke="#262634" stroke-width="1"/></pattern>
    </defs>
    <g class="jz-body">
      <path d="M48 128C30 44 210 44 192 128C208 176 204 214 182 236H58C36 214 32 176 48 128Z" fill="var(--jz-hair, #ff5d8f)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M44 320C44 266 76 240 120 240S196 266 196 320Z" fill="url(#jzSeq)" stroke="${INK}" stroke-width="5"/>
      <path d="M92 244Q120 268 148 244" stroke="${INK}" stroke-width="4" fill="none"/>
      <path d="M104 194h32v44q-16 12-32 0Z" fill="#ffc29c" stroke="${INK}" stroke-width="5"/>
    </g>
    <g class="jz-head">
      <ellipse cx="120" cy="140" rx="58" ry="62" fill="#ffd3b4" stroke="${INK}" stroke-width="5"/>
      <g class="jz-ear"><path d="M58 166l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
      <g class="jz-ear r"><path d="M182 166l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
      <path d="M60 136C54 78 98 62 132 68C166 74 190 100 182 140C170 112 152 100 128 106C112 92 84 100 60 136Z" fill="var(--jz-hair, #ff5d8f)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M96 84Q120 74 146 82" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>
      <g class="jz-brows"><path d="M86 118q13-9 26-1" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M128 117q13-8 26 1" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/></g>
      <g class="jz-eyes">
        <ellipse cx="100" cy="142" rx="11" ry="13" fill="#fff" stroke="${INK}" stroke-width="3.5"/><ellipse cx="140" cy="142" rx="11" ry="13" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
        <circle class="jz-pupil" cx="102" cy="144" r="6.5" fill="${INK}"/><circle class="jz-pupil" cx="142" cy="144" r="6.5" fill="${INK}"/>
        <circle cx="104.5" cy="140.5" r="2.4" fill="#fff"/><circle cx="144.5" cy="140.5" r="2.4" fill="#fff"/>
        ${lash(100, -1)}${lash(140, 1)}
      </g>
      <circle cx="84" cy="168" r="10" fill="#ff6f9c" opacity=".45"/><circle cx="156" cy="168" r="10" fill="#ff6f9c" opacity=".45"/>
      <path d="M121 146q-6 12 2 15" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="jz-mouth" id="jzMouth">
        <path d="M100 174Q120 180 140 174Q136 196 120 196Q104 196 100 174Z" fill="#6b0d2a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M108 188Q120 182 132 188Q120 194 108 188Z" fill="#ff6b8b"/>
        <path d="M101 175Q120 170 139 175" stroke="#e8174f" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>
    </g>
    <g class="jz-arm">
      <path d="M200 316Q214 282 182 252" stroke="${INK}" stroke-width="27" fill="none" stroke-linecap="round"/>
      <path d="M200 316Q214 282 182 252" stroke="var(--jz-dress, #ff2e63)" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M180 250L162 216" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
      <path d="M180 250L162 216" stroke="#ffd23f" stroke-width="8" stroke-linecap="round"/>
      <circle cx="157" cy="205" r="16" fill="url(#jzMic)" stroke="${INK}" stroke-width="4"/>
      <path d="M145 214q12 7 25-1" stroke="#ffd23f" stroke-width="4" fill="none"/>
      <circle cx="181" cy="250" r="12" fill="#ffd3b4" stroke="${INK}" stroke-width="4"/>
    </g>
  </svg></div>`;
}

/* ---------- мелочи ---------- */
const letters = (t, d0 = 0) => [...t].map((c, i) => c === ' ' ? '<i class="sp"> </i>' : `<i style="animation-delay:${(d0 + i * 0.05).toFixed(2)}s">${c}</i>`).join('');
const blank = (ui, p, fill) => ui.esc(p).replace(/_{2,}/, fill ? `<span class="blank fill">${ui.esc(fill)}</span>` : '<span class="blank"></span>');
const lvlBadge = (S) => LEVEL[S.level] ? `<div class="sh-lvl l-${S.level}">${LEVEL[S.level]}</div>` : '';
const status = (w) => (w.done >= w.need ? '<b>готово!</b>' : `<span class="pen">✎</span> ${w.done} из ${w.need}`);
const tallyDots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}"></i>`).join('');
const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };
let timers = [];
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/* студийный фон: прожекторы и плавающие «ха» — живут, пока на экране эта игра */
function backdrop() {
  const bd = document.getElementById('backdrop');
  if (!bd || bd.querySelector('.sh-bg')) return;
  const el = document.createElement('div');
  el.className = 'sh-bg';
  el.dataset.transient = '1';
  const ha = ['ХА', 'ХИ', 'ХО', 'LOL', 'ХА-ХА', '😂', 'ХЕ'];
  el.innerHTML = `<i class="spot l"></i><i class="spot r"></i><div class="dots"></div>
    ${Array.from({ length: 9 }, (_, i) => `<span class="ha" style="left:${6 + i * 11}%;animation-delay:${-i * 2.3}s;animation-duration:${16 + (i % 4) * 3}s;font-size:${3 + (i % 3)}vmin">${ha[i % ha.length]}</span>`).join('')}
    <div class="tape"></div>`;
  bd.appendChild(el);
}

export default {
  key(S) {
    if (S.phase === 'voting' || S.phase === 'reveal') return `${S.round}:${S.matchNo}`;
    return `${S.round}`;
  },

  /* голосование → итог той же дуэли: без шторки, пузыри остаются на месте */
  wipe(prev, S) { return !(prev?.phase === 'voting' && S.phase === 'reveal') && !(prev?.phase === 'roundIntro' && S.phase === 'writing'); },

  mood(S) {
    return { cooking: 'calm', roundIntro: 'reveal', writing: 'think', voting: 'tense', reveal: 'reveal', scores: 'lobby', winner: 'win' }[S.phase];
  },

  render(S, ui) {
    clearTimers();
    document.body.dataset.lvl = S.level || 'family';
    backdrop();
    const tag = ['roundIntro', 'cooking', 'winner'].includes(S.phase) ? '' : S.final ? 'финал · тройной удар' : `раунд ${S.round} из ${S.total} · ${S.value} очков`;
    ui.tag(tag);
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
        const was = el.dataset.n;
        if (was !== undefined && Number(was) < w.done && !done) ui.sfx('scribble');
        if (done && !el.classList.contains('done')) { ui.sfx('pop'); ui.fx.burstAt(el, ui.p(w.id)?.color); el.querySelector('.cav')?.classList.add('hop'); }
        el.dataset.n = w.done;
        el.classList.toggle('done', done);
        el.querySelector('.st').innerHTML = status(w);
      }
    }
    if (S.phase === 'voting') {
      const dots = ui.app.querySelector('.sh-tally');
      if (dots) {
        const before = dots.querySelectorAll('i.on').length;
        dots.innerHTML = tallyDots(S);
        if (S.voted > before) ui.sfx('clack');
      }
    }
    if (S.phase === 'reveal') {
      const q = ui.app.querySelector('.sh-quip');
      if (q && S.quip && q.dataset.t !== S.quip) { q.dataset.t = S.quip; q.innerHTML = `<b>Жанна:</b> ${ui.esc(S.quip)}`; q.classList.add('on'); }
    }
  },

  speak(on) { document.querySelector('.jz')?.classList.toggle('talk', on); },

  frame(S, ui) {
    const m = document.getElementById('jzMouth');
    if (m) m.style.transform = `scaleY(${(0.75 + ui.mouth() * 1.5).toFixed(3)})`;
  },
};

const DRAW = {
  cooking(S, ui) {
    ui.app.innerHTML = `
      <div class="sh-center">
        ${zhanna('mid')}
        <div class="sh-think">Жанна пишет затравки<br>под вашу компанию<span class="dots3"><i>.</i><i>.</i><i>.</i></span></div>
        ${S.topic ? `<div class="sh-chip">тема: «${ui.esc(S.topic)}»</div>` : ''}
      </div>`;
  },

  /* заставка раунда: лучи, огромная цифра, ведущая */
  roundIntro(S, ui) {
    const fin = S.final;
    const big = fin ? 'ФИНАЛ' : `${S.round}`;
    ui.app.innerHTML = `
      <div class="sh-intro ${fin ? 'fin' : ''}">
        <div class="sh-rays"></div>
        ${zhanna('host')}
        <div class="sh-rnd">
          <div class="kick">${fin ? 'тройной удар' : 'раунд'}</div>
          <div class="num">${letters(big, 0.25)}</div>
          <div class="rule">${fin ? 'одна затравка · три ответа · медали' : S.round === 1 ? 'по две затравки на каждого · 1000 очков' : `очки ×${S.round} · ${S.value} за дуэль`}</div>
          ${lvlBadge(S)}
        </div>
      </div>`;
    ui.sfx('drumroll');
    later(1300, () => { ui.sfx('cymbal'); ui.fx.shake(ui.app.querySelector('.sh-rnd')); });
    if (S.level === 'adult') later(2000, () => ui.sfx('ooh'));
    if (S.level === 'hard') later(2000, () => ui.sfx('airhorn'));
  },

  writing(S, ui) {
    ui.app.innerHTML = `
      <div class="sh-write2">
        <div class="sh-head">${letters(S.final ? 'ТРОЙНОЙ УДАР!' : 'ПИШИТЕ ШУТКИ!')}</div>
        <div class="sh-subh">${S.final ? 'одна затравка на всех · три ответа в телефоне' : 'у каждого две затравки · ответы — в телефоне'}</div>
        <div class="sh-desks2">${(S.progress || []).map((w, i) => {
          const p = ui.p(w.id) || {};
          return `<div class="sh-st ${w.done >= w.need ? 'done' : ''}" data-p="${w.id}" data-n="${w.done}" style="--r:${((i * 37) % 7) - 3}deg;animation-delay:${0.4 + i * 0.08}s">
            ${ui.avatar(p, 'bob')}<div class="nm">${ui.esc(p.name)}</div><div class="st">${status(w)}</div></div>`;
        }).join('')}</div>
        ${S.note ? `<div class="sh-chip">${ui.esc(S.note)}</div>` : ''}
        ${zhanna('corner')}
        ${lvlBadge(S)}
      </div>`;
    ui.sfx('swish');
  },

  voting(S, ui) {
    if (S.final) return finalVote(S, ui);
    const [a, b] = S.options || [];
    ui.app.innerHTML = `
      <div class="sh-stage">
        <div class="sh-meta">дуэль ${S.matchNo} из ${S.matchTotal}</div>
        <div class="sh-q">${blank(ui, S.prompt)}</div>
        <div class="sh-duel2">
          <div class="sh-bub a in" data-side="a"><div class="txt">${ui.esc(a?.text || '…тишина…')}</div></div>
          <div class="sh-vs2"><span>VS</span></div>
          <div class="sh-bub b in" data-side="b"><div class="txt">${ui.esc(b?.text || '…тишина…')}</div></div>
        </div>
        <div class="sh-foot"><div class="sh-tally">${tallyDots(S)}</div><span>голосуйте в телефоне!</span></div>
        ${zhanna('corner')}
      </div>`;
    ui.sfx('thud');
    later(900, () => ui.sfx('swish'));
    later(2300, () => ui.sfx('swish'));
    later(2900, () => ui.sfx('boing'));
  },

  reveal(S, ui) {
    const r = S.result;
    if (!r) return;
    if (r.final) return finalReveal(S, ui);
    const rows = r.rows;
    // пузыри стоят там же, где стояли при голосовании
    const order = (S.order || []).map((id) => rows.find((x) => x.id === id)).filter(Boolean);
    const sides = order.length === rows.length ? order : rows;
    const win = !r.tie && rows[0]?.votes > 0 ? rows[0] : null;
    const pct = (row) => (r.total ? Math.round((row.votes / r.total) * 100) : 0);

    const bubble = (row, side) => {
      const p = ui.p(row.id) || {};
      return `<div class="sh-bub ${side}" data-row="${row.id}">
        ${row.safety ? '<div class="tag">выручалка</div>' : ''}
        <div class="txt">${ui.esc(row.text || '…тишина…')}</div>
        <div class="score"><b class="pct" data-to="${pct(row)}">0</b><small>%</small><div class="meter"><i style="--w:${pct(row)}%"></i></div></div>
        <div class="voters">${(row.voters || []).map((v, k) => `<span class="vt" style="animation-delay:${(0.7 + k * 0.16).toFixed(2)}s">${ui.avatar(ui.p(v))}</span>`).join('')}</div>
        <div class="auth">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><em>+${ui.fmt(row.pts)}</em></div>
      </div>`;
    };
    ui.app.innerHTML = `
      <div class="sh-stage rev">
        <div class="sh-meta">дуэль ${S.matchNo} из ${S.matchTotal}</div>
        <div class="sh-q">${blank(ui, S.prompt)}</div>
        <div class="sh-duel2">${bubble(sides[0], 'a')}<div class="sh-vs2"><span>${r.tie ? '=' : 'VS'}</span></div>${sides[1] ? bubble(sides[1], 'b') : '<div></div>'}</div>
        <div class="sh-quip"></div>
        ${r.shutout ? '<div class="sh-stamp2">ШУТКА!</div>' : ''}
        ${zhanna('corner')}
      </div>`;

    // 1) проценты и голоса падают
    later(500, () => {
      for (const el of ui.app.querySelectorAll('.pct')) ui.fx.countUp(el, 0, Number(el.dataset.to), 1100);
      ui.app.querySelector('.sh-stage').classList.add('count');
      ui.sfx('drumroll');
      rows.forEach((row) => (row.voters || []).forEach((_, k) => later(700 + k * 160, () => ui.sfx('pop'))));
    });
    // 2) победитель
    later(2100, () => {
      const st = ui.app.querySelector('.sh-stage');
      st.classList.add('judged');
      if (win) {
        ui.app.querySelector(`.sh-bub[data-row="${win.id}"]`)?.classList.add('won');
        for (const el of ui.app.querySelectorAll(`.sh-bub:not([data-row="${win.id}"])`)) el.classList.add('lost');
        const q = ui.app.querySelector('.sh-q');
        if (q && win.text) q.innerHTML = blank(ui, S.prompt, win.text);
        ui.fx.burstAt(ui.app.querySelector('.sh-bub.won'), '#ffd23f', 50);
      }
      if (r.shutout) { ui.sfx('airhorn'); ui.sfx('cheer'); ui.fx.shake(ui.app); ui.fx.confetti(undefined, 120); }
      else if (r.tie) { ui.sfx('boing'); ui.sfx('ooh'); }
      else if (r.silent) { ui.sfx('sad'); ui.sfx('aww'); }
      else if (win) { ui.sfx('laugh'); ui.sfx('tada'); }
    });
    // 3) авторы
    later(2900, () => { ui.app.querySelector('.sh-stage').classList.add('authors'); ui.sfx('slam'); later(500, () => ui.sfx('cash')); });
    if (S.quip) later(3200, () => showQuip(S, ui));
  },

  scores(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const sorted = [...list].sort((a, b) => b.score - a.score);
    const max = Math.max(1, ...sorted.map((p) => p.score));
    ui.app.innerHTML = `
      <div class="sh-scores">
        <div class="sh-head small">${letters(`ПОСЛЕ РАУНДА ${S.round}`)}</div>
        <div class="sh-race">${sorted.map((p, i) => {
          const g = S.gains?.[p.id] || 0;
          return `<div class="sh-lane ${i === 0 ? 'lead' : ''}" style="animation-delay:${0.2 + i * 0.08}s">
            <div class="pos">${i + 1}</div>${ui.avatar(p, i === 0 ? 'bob' : '')}
            <div class="track"><i style="--from:${((p.score - g) / max) * 100}%;--to:${(p.score / max) * 100}%;background:${p.color}"></i><span class="nm">${ui.esc(p.name)}</span></div>
            <div class="gain">${g ? `+${ui.fmt(g)}` : ''}</div>
            <div class="sc" data-sc="${p.id}">${ui.fmt(p.score - g)}</div>
          </div>`;
        }).join('')}</div>
        ${zhanna('corner')}
      </div>`;
    ui.sfx('swish');
    later(700, () => {
      ui.app.querySelector('.sh-race')?.classList.add('go');
      for (const el of ui.app.querySelectorAll('[data-sc]')) {
        const p = ui.p(el.dataset.sc); const g = S.gains?.[p.id] || 0;
        ui.fx.countUp(el, p.score - g, p.score, 1400);
      }
      ui.sfx('cash');
    });
    later(2300, () => ui.sfx('applause'));
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    ui.app.innerHTML = `
      <div class="sh-win">
        <div class="sh-rays gold"></div>
        <div class="kick">самый смешной человек вечера</div>
        <div class="who">${top ? ui.avatar(top, 'bob', { mood: 'wow' }) : ''}<span style="color:${top?.color}">${ui.esc(top?.name || '—')}</span></div>
        ${ui.podium(list)}
        ${zhanna('corner wow')}
      </div>`;
    ui.sfx('drumroll');
    later(1400, () => { ui.sfx('tada'); ui.sfx('cheer'); ui.fx.confetti(); });
    later(3200, () => ui.sfx('applause'));
  },
};

function showQuip(S, ui) {
  const q = ui.app.querySelector('.sh-quip');
  if (q && S.quip) { q.dataset.t = S.quip; q.innerHTML = `<b>Жанна:</b> ${ui.esc(S.quip)}`; q.classList.add('on'); }
}

/* ---------- финал: тройной удар ---------- */
function finalVote(S, ui) {
  ui.app.innerHTML = `
    <div class="sh-stage">
      <div class="sh-q small">${blank(ui, S.prompt)}</div>
      <div class="sh-notes">${(S.options || []).map((o, i) => `
        <div class="sh-note" style="--r:${((i * 53) % 9) - 4}deg;animation-delay:${0.5 + i * 0.35}s"><div class="no">${i + 1}</div>
          <ol>${o.three.map((t) => `<li>${ui.esc(t)}</li>`).join('')}</ol></div>`).join('')}</div>
      <div class="sh-foot"><div class="sh-tally">${tallyDots(S)}</div><span>раздайте 🥇 🥈 🥉 в телефоне</span></div>
      ${zhanna('corner')}
    </div>`;
  ui.sfx('thud');
  (S.options || []).forEach((_, i) => later(500 + i * 350, () => ui.sfx('swish')));
}

function finalReveal(S, ui) {
  const r = S.result;
  ui.app.innerHTML = `
    <div class="sh-stage rev">
      <div class="sh-q small">${blank(ui, S.prompt)}</div>
      <div class="sh-notes">${r.rows.map((row, i) => {
        const p = ui.p(row.id) || {};
        const m = row.medals;
        const drops = [...Array(m.gold).fill('🥇'), ...Array(m.silver).fill('🥈'), ...Array(m.bronze).fill('🥉')];
        return `<div class="sh-note ${i === 0 ? 'top' : ''}" style="--r:${((i * 53) % 9) - 4}deg;animation-delay:${0.1 + i * 0.1}s">
          <ol>${row.three.map((t) => `<li>${ui.esc(t)}</li>`).join('')}</ol>
          <div class="medals">${drops.map((e, k) => `<span style="animation-delay:${(0.8 + k * 0.18).toFixed(2)}s">${e}</span>`).join('')}</div>
          <div class="auth">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><em>+${ui.fmt(row.pts)}</em></div>
        </div>`;
      }).join('')}</div>
      ${zhanna('corner')}
    </div>`;
  later(800, () => ui.sfx('drumroll'));
  later(2600, () => {
    ui.app.querySelector('.sh-stage').classList.add('authors', 'judged');
    ui.fx.burstAt(ui.app.querySelector('.sh-note.top'), '#ffd23f', 60);
    ui.sfx('tada'); ui.sfx('cheer');
  });
}
