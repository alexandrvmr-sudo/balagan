/* Собеседование — экран. Анжела живёт в ретро-мониторе с гарнитурой, за спиной — офис.
   Между раундами — мультвставки: загрузка Анжелы, взбесившаяся кофемашина, шредер, приказ о назначении. */

const ANG = { name: 'Анжела', color: '#9b5de5' };
let timers = [];
const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };

/* ---------- Анжела: expr — calm | happy | stern | think | wow ---------- */
function angela(expr = 'calm', cls = '') {
  const eyes = {
    calm: `<g class="sb-blink"><ellipse cx="96" cy="84" rx="13" ry="15" fill="#7ff6ff"/><ellipse cx="144" cy="84" rx="13" ry="15" fill="#7ff6ff"/><circle cx="98" cy="87" r="6" fill="#1b1340"/><circle cx="146" cy="87" r="6" fill="#1b1340"/><circle cx="101" cy="82" r="2.4" fill="#fff"/><circle cx="149" cy="82" r="2.4" fill="#fff"/></g>`,
    happy: `<path d="M82 88q14-16 28 0M130 88q14-16 28 0" stroke="#7ff6ff" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    stern: `<g class="sb-blink"><path d="M83 82h26v8H83zM131 82h26v8h-26z" fill="#7ff6ff"/></g><path d="M80 70l30 6M160 70l-30 6" stroke="#ff8fd8" stroke-width="5" stroke-linecap="round"/>`,
    think: `<g><ellipse cx="96" cy="84" rx="13" ry="15" fill="#7ff6ff"/><ellipse cx="144" cy="84" rx="13" ry="15" fill="#7ff6ff"/><circle cx="100" cy="77" r="6" fill="#1b1340"/><circle cx="148" cy="77" r="6" fill="#1b1340"/></g>`,
    wow: `<g><circle cx="96" cy="84" r="16" fill="#7ff6ff"/><circle cx="144" cy="84" r="16" fill="#7ff6ff"/><circle cx="96" cy="84" r="5" fill="#1b1340"/><circle cx="144" cy="84" r="5" fill="#1b1340"/></g>`,
  }[expr] || '';
  const brows = expr === 'stern' ? '' : `<path d="M82 64q14-8 28-2M130 62q14-6 28 2" stroke="#ff8fd8" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  return `<div class="sb-ang ${expr} ${cls}"><svg viewBox="0 0 240 262" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="sbScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d6b"/><stop offset="1" stop-color="#140d3a"/></linearGradient>
      <pattern id="sbScan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(255,255,255,.05)"/></pattern>
      <radialGradient id="sbGlow" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#b388ff" stop-opacity=".35"/><stop offset="1" stop-color="#b388ff" stop-opacity="0"/></radialGradient>
    </defs>
    <path d="M92 214h56l12 34H80z" fill="#cfc8b8" stroke="#2b2240" stroke-width="5" stroke-linejoin="round"/>
    <rect x="62" y="244" width="116" height="12" rx="6" fill="#b9b1a0" stroke="#2b2240" stroke-width="5"/>
    <rect x="16" y="10" width="208" height="206" rx="22" fill="#ece6d6" stroke="#2b2240" stroke-width="6"/>
    <rect x="32" y="26" width="176" height="152" rx="16" fill="url(#sbScr)" stroke="#2b2240" stroke-width="4"/>
    <g class="sb-face">
      <rect x="32" y="26" width="176" height="152" rx="16" fill="url(#sbGlow)"/>
      <path d="M58 150Q46 70 80 46Q120 22 160 46Q194 70 182 150H166Q172 84 150 66Q120 54 90 66Q68 84 74 150Z" fill="#b388ff" opacity=".85"/>
      <path d="M78 58Q120 30 162 58Q140 50 120 56Q100 50 78 58Z" fill="#d6bcff"/>
      ${brows}${eyes}
      <circle cx="82" cy="112" r="8" fill="#ff6bcb" opacity=".35"/><circle cx="158" cy="112" r="8" fill="#ff6bcb" opacity=".35"/>
      <g id="sbMouth"><path d="M102 126Q120 120 138 126Q132 142 120 142Q108 142 102 126Z" fill="#ff6bcb"/><path d="M106 127Q120 124 134 127" stroke="#fff" stroke-width="2" opacity=".6" fill="none"/></g>
    </g>
    <g class="sb-static"><rect x="32" y="26" width="176" height="152" rx="16" fill="#3a3a4a"/></g>
    <g class="sb-load"><text x="120" y="92" text-anchor="middle" font-family="Unbounded,sans-serif" font-weight="900" font-size="14" fill="#7ff6ff">АНЖЕЛА 3.0</text>
      <rect x="62" y="104" width="116" height="12" rx="6" fill="none" stroke="#7ff6ff" stroke-width="2"/><rect class="bar" x="64" y="106" width="0" height="8" rx="4" fill="#7ff6ff"/></g>
    <rect x="32" y="26" width="176" height="152" rx="16" fill="url(#sbScan)" pointer-events="none"/>
    <path d="M44 36q30-8 60-6" stroke="#fff" stroke-width="5" opacity=".18" fill="none" stroke-linecap="round"/>
    <text x="40" y="203" font-family="Unbounded,sans-serif" font-weight="900" font-size="11" fill="#8a8170">АНЖЕЛА 3.0 · HR</text>
    <circle class="sb-led" cx="200" cy="199" r="5" fill="#2ee59d" stroke="#2b2240" stroke-width="2"/>
    <path d="M10 70Q10 -6 120 -4Q230 -6 230 70" stroke="#2b2240" stroke-width="9" fill="none" stroke-linecap="round"/>
    <rect x="0" y="60" width="18" height="34" rx="8" fill="#3a2f5a" stroke="#2b2240" stroke-width="4"/>
    <path d="M14 92Q30 150 96 140" stroke="#2b2240" stroke-width="4" fill="none"/><circle cx="98" cy="140" r="6" fill="#3a2f5a" stroke="#2b2240" stroke-width="3"/>
  </svg></div>`;
}

/* ---------- офис за спиной: окно с городом, часы, плакат, фикус ---------- */
function office() {
  const bd = document.getElementById('backdrop');
  if (!bd || bd.querySelector('.sb-office')) return;
  const el = document.createElement('div');
  el.className = 'sb-office';
  el.dataset.transient = '1';
  const towers = Array.from({ length: 9 }, (_, i) => `<i style="left:${i * 11 + 2}%;height:${30 + ((i * 37) % 55)}%;--w:${7 + (i % 3) * 2}%"></i>`).join('');
  el.innerHTML = `
    <div class="win"><div class="city">${towers}</div></div>
    <div class="clock"><i class="h"></i><i class="m"></i></div>
    <div class="poster"><b>МЫ — СЕМЬЯ*</b><small>*почти</small></div>
    <div class="plant">🪴</div>
    <div class="floor"></div>`;
  bd.appendChild(el);
}

/* ---------- магнитики ---------- */
const tiles = (ui, list, glow = false) => `<div class="sb-mag">${(list || []).map((t, k) => {
  const p = t.by ? ui.p(t.by) : null;
  const punct = /^[,.!?]$/.test(t.w);
  return `<span class="m ${punct ? 'p' : ''} ${glow && p ? 'own' : ''}" style="--oc:${p?.color || '#d7dbe6'};--r:${((k * 47) % 9) - 4}deg;animation-delay:${(0.2 + k * 0.06).toFixed(2)}s">${ui.esc(t.w)}</span>`;
}).join('')}</div>`;
const dots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}"></i>`).join('');
const nameOf = (ui, id) => (id === 'angela' ? ANG : ui.p(id) || {});
const letters = (t, d0 = 0) => [...t].map((c, i) => (c === ' ' ? '<i class="sp"> </i>' : `<i style="animation-delay:${(d0 + i * 0.045).toFixed(2)}s">${c}</i>`)).join('');

function badges(S, ui) {
  return `<div class="sb-badges">${(S.progress || []).map((w, i) => {
    const p = ui.p(w.id) || {};
    const done = w.done >= w.need;
    return `<div class="sb-badge ${done ? 'done' : ''}" data-p="${w.id}" style="--r:${((i * 31) % 7) - 3}deg;animation-delay:${(0.3 + i * 0.07).toFixed(2)}s"><div class="clip"></div>
      <div class="ph" style="background:${p.color}22">${ui.avatar(p)}</div><b>${ui.esc(p.name)}</b><small class="st">${done ? 'готово' : `${w.done} из ${w.need}`}</small></div>`;
  }).join('')}</div>`;
}

export default {
  key(S) {
    if (S.phase === 'toon') return `${S.toon?.kind}`;
    return S.phase === 'voting' || S.phase === 'reveal' ? `${S.round}:${S.matchNo}` : `${S.round}`;
  },
  wipe(prev, S) { return !(prev?.phase === 'voting' && S.phase === 'reveal'); },
  mood(S) { return { toon: 'calm', ice: 'calm', compose: 'think', voting: 'tense', reveal: 'reveal', scores: 'lobby', winner: 'win' }[S.phase]; },

  render(S, ui) {
    timers.forEach(clearTimeout); timers = [];
    office();
    document.body.dataset.lvl = S.level || 'family';
    ui.tag(S.phase === 'toon' || S.phase === 'winner' ? '' : S.round ? `раунд ${S.round} из ${S.rounds} · ${S.roundTitle}` : 'разогрев');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    if (S.phase === 'ice' || S.phase === 'compose') {
      for (const w of S.progress || []) {
        const el = ui.app.querySelector(`[data-p="${w.id}"]`);
        if (!el) continue;
        const done = w.done >= w.need;
        if (done && !el.classList.contains('done')) { ui.sfx('stamp'); el.querySelector('.cav')?.classList.add('hop'); }
        el.classList.toggle('done', done);
        el.querySelector('.st').textContent = done ? 'готово' : `${w.done} из ${w.need}`;
      }
      const jar = ui.app.querySelector('.sb-jar');
      if (jar && S.words != null) {
        const have = jar.querySelectorAll('i').length;
        const want = Math.min(80, S.words);
        if (want > have) { jar.insertAdjacentHTML('beforeend', Array.from({ length: want - have }, (_, k) => `<i style="--c:${['#ff2e63', '#ffd23f', '#2ec4b6', '#9b5de5', '#3a86ff', '#b8f400'][(have + k) % 6]};--r:${((have + k) * 53) % 40 - 20}deg"></i>`).join('')); ui.sfx('type'); }
        const c = ui.app.querySelector('.sb-count b');
        if (c) c.textContent = S.words;
      }
    }
    if (S.phase === 'voting') { const d = ui.app.querySelector('.sb-dots'); if (d) { const n = d.querySelectorAll('i.on').length; d.innerHTML = dots(S); if (S.voted > n) ui.sfx('clack'); } }
  },

  speak(on) { document.querySelector('.sb-ang')?.classList.toggle('talk', on); },

  frame(S, ui) {
    const m = document.getElementById('sbMouth');
    if (m) m.style.transform = `scaleY(${(0.55 + ui.mouth() * 2).toFixed(3)})`;
  },
};

const DRAW = {
  toon(S, ui) { (TOON[S.toon?.kind] || TOON.boot)(S, ui); },

  ice(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-room">
        ${angela(S.round ? 'happy' : 'calm', 'side')}
        <div class="sb-col">
          <div class="sb-h">${letters(S.round ? 'РАССКАЖИТЕ ЕЩЁ' : 'ЗНАКОМСТВО')}</div>
          <div class="sb-lead">отвечайте развёрнуто — ваши слова достанутся другим кандидатам</div>
          ${badges(S, ui)}
          <div class="sb-count">в базе Анжелы <b>${S.words || 0}</b> слов</div>
          <div class="sb-jar"></div>
        </div>
      </div>`;
    ui.sfx('whoosh');
  },

  compose(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-room">
        ${angela('think', 'side')}
        <div class="sb-col">
          <div class="sb-h">${letters('СОБИРАЙТЕ ОТВЕТЫ')}</div>
          <div class="sb-lead">из чужих слов, как магнитики на холодильнике</div>
          ${badges(S, ui)}
          <div class="sb-float">${['я', 'очень', 'никогда', 'кот', 'премия', 'потому что', 'дача', 'начальник'].map((w, i) => `<span style="--d:${i * 0.7}s;left:${8 + i * 11}%">${w}</span>`).join('')}</div>
        </div>
      </div>`;
  },

  voting(S, ui) {
    const [a, b] = S.options || [];
    ui.app.innerHTML = `
      <div class="sb-vote">
        <div class="sb-ask">${angela('calm', 'tiny')}<div class="bubble">${ui.esc(S.q)}</div></div>
        <div class="sb-doors">
          <div class="sb-door l"><div class="lab">кандидат 1</div>${tiles(ui, a?.tiles)}</div>
          <div class="sb-or">ИЛИ</div>
          <div class="sb-door r"><div class="lab">кандидат 2</div>${tiles(ui, b?.tiles)}</div>
        </div>
        <div class="sb-call">голосуйте в телефоне <span class="sb-dots">${dots(S)}</span></div>
      </div>`;
    ui.sfx('whoosh');
  },

  reveal(S, ui) {
    const r = S.result;
    const win = r.rows[0]?.votes > 0 && !r.tie ? r.rows[0] : null;
    const angelaWon = win?.id === 'angela';
    const door = (row, i) => {
      const p = nameOf(ui, row.id);
      const ok = win && row.id === win.id;
      const credit = Object.entries(row.credit || {}).map(([id, pts]) => { const c = ui.p(id); return c ? `<span>${ui.avatar(c)}<em style="color:${c.color}">+${pts}</em></span>` : ''; }).join('');
      return `<div class="sb-door ${i ? 'r' : 'l'} ${ok ? 'win' : win ? 'lose' : ''}">
        <div class="stamp ${ok ? 'yes' : r.tie ? 'tie' : 'no'}">${ok ? 'ПРИНЯТ' : r.tie ? 'ДУМАЕМ' : 'ОТКАЗ'}</div>
        ${tiles(ui, row.tiles, true)}
        <div class="vt">${(row.voters || []).map((v, k) => `<span style="animation-delay:${(0.4 + k * 0.14).toFixed(2)}s">${ui.avatar(ui.p(v))}</span>`).join('')}</div>
        <div class="who">${row.id === 'angela' ? '<b style="color:#9b5de5">🤖 Анжела</b>' : `${ui.avatar(p)}<b style="color:${p.color}">${ui.esc(p.name)}</b>`}${row.pts ? `<em>+${ui.fmt(row.pts)}</em>` : ''}</div>
        ${credit ? `<div class="credit"><small>за слова:</small>${credit}</div>` : ''}
      </div>`;
    };
    ui.app.innerHTML = `
      <div class="sb-vote rev">
        <div class="sb-ask">${angela(angelaWon ? 'wow' : win ? 'happy' : 'stern', 'tiny')}<div class="bubble small">${ui.esc(S.q)}</div></div>
        <div class="sb-doors">${r.rows.map(door).join('<div class="sb-or">—</div>')}</div>
      </div>`;
    later(700, () => ui.sfx('stamp'));
    later(1000, () => { ui.sfx(win ? 'applause' : 'ooh'); if (win) ui.fx.burstAt(ui.app.querySelector('.sb-door.win'), '#b8f400', 40); });
    later(1600, () => { if (ui.app.querySelector('.credit')) ui.sfx('coin'); });
  },

  scores(S, ui) {
    const list = S.players.filter((p) => !p.audience).sort((a, b) => b.score - a.score);
    ui.app.innerHTML = `
      <div class="sb-sheet">
        <div class="hd"><b>ВЕДОМОСТЬ</b><small>по итогам раунда ${S.round} · отдел кадров «Балаган Групп»</small></div>
        <div class="rows">${list.map((p, i) => { const g = S.gains?.[p.id] || 0; return `
          <div class="r" style="animation-delay:${(0.2 + i * 0.08).toFixed(2)}s"><span class="n">${i + 1}</span>${ui.avatar(p)}<b>${ui.esc(p.name)}</b><span class="dots"></span><em>${g ? `+${ui.fmt(g)}` : ''}</em><strong data-sc="${p.id}">${ui.fmt(p.score - g)}</strong></div>`; }).join('')}</div>
        <div class="sign">Анжела 3.0 <i>✍</i></div>
      </div>`;
    later(600, () => { for (const el of ui.app.querySelectorAll('[data-sc]')) { const p = ui.p(el.dataset.sc); const g = S.gains?.[p.id] || 0; ui.fx.countUp(el, p.score - g, p.score, 1200); } ui.sfx('cash'); });
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    ui.app.innerHTML = `
      <div class="sb-win">
        <div class="sb-order">
          <small>ПРИКАЗ № 404</small><b>о назначении на должность</b>
          <div class="who">${top ? ui.avatar(top, 'bob', { mood: 'wow' }) : ''}<span style="color:${top?.color}">${ui.esc(top?.name || '—')}</span></div>
          <div class="job">${ui.esc(S.job || '')}</div>
          <div class="stamp">УТВЕРЖДЕНО</div>
        </div>
        ${ui.podium(list)}
        ${angela('happy', 'corner')}
      </div>`;
    later(900, () => ui.sfx('stamp'));
    later(1200, () => { ui.sfx('tada'); ui.sfx('applause'); ui.fx.confetti(['#3a86ff', '#b8f400', '#19b37a', '#9b5de5', '#ffffff']); });
  },
};

/* ---------- мультвставки ---------- */
const TOON = {
  boot(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-toon boot">
        <div class="sb-sign">ОТДЕЛ КАДРОВ «БАЛАГАН ГРУПП»</div>
        ${angela('calm', 'big booting')}
        <div class="sb-desk"></div>
      </div>`;
    const a = ui.app.querySelector('.sb-ang');
    ui.sfx('buzz');
    later(1400, () => { a.classList.add('loading'); ui.sfx('type'); });
    later(1500, () => { const bar = a.querySelector('.bar'); bar.style.transition = 'width 1.8s steps(12)'; bar.setAttribute('width', '112'); });
    later(3500, () => { a.classList.remove('booting', 'loading'); a.classList.add('on'); ui.sfx('tada'); });
  },

  coffee(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-toon coffee">
        <div class="sb-sign">КОФЕ-БРЕЙК</div>
        <div class="sb-cm"><div class="body"><div class="scr">ЭСПРЕССО</div><div class="btn"></div><div class="btn b2"></div></div>
          <div class="spout"></div><div class="stream"></div><div class="cup"><i></i></div><div class="puddle"></div>
          <div class="steam"><i></i><i></i><i></i></div></div>
        ${angela('wow', 'corner')}
        <div class="sb-desk"></div>
      </div>`;
    ui.sfx('buzz');
    later(600, () => ui.app.querySelector('.sb-cm')?.classList.add('pour'));
    later(700, () => ui.sfx('splash'));
    later(3200, () => { ui.app.querySelector('.sb-cm')?.classList.add('over'); ui.sfx('rumble'); });
    later(4800, () => ui.sfx('ding'));
  },

  shredder(S, ui) {
    const names = ['ЛИЧНОЕ ДЕЛО', 'РЕЗЮМЕ', 'ОТЧЁТ', S.toon?.name ? `ДЕЛО: ${S.toon.name}` : 'ЛИЧНОЕ ДЕЛО'];
    ui.app.innerHTML = `
      <div class="sb-toon shred">
        <div class="sb-sign">ОБНОВЛЕНИЕ ЛИЧНЫХ ДЕЛ</div>
        <div class="sb-sh">${names.map((n, i) => `<div class="folder f${i}" style="animation-delay:${(0.4 + i * 1.1).toFixed(2)}s"><b>${ui.esc(n)}</b></div>`).join('')}
          <div class="box"><div class="slot"></div><div class="led"></div></div><div class="strips">${Array.from({ length: 12 }, (_, i) => `<i style="left:${8 + i * 7.4}%;animation-delay:${(1.2 + (i % 4) * 0.25).toFixed(2)}s"></i>`).join('')}</div></div>
        ${angela('stern', 'corner')}
      </div>`;
    [0, 1, 2].forEach((i) => later(1000 + i * 1100, () => ui.sfx('buzz')));
    later(4300, () => ui.sfx('boing'));
  },

  promo(S, ui) {
    ui.app.innerHTML = `
      <div class="sb-toon promo">
        <div class="sb-sign">ПРИКАЗ ПЕЧАТАЕТСЯ</div>
        <div class="sb-pr"><div class="paper"><b>ПРИКАЗ № 404</b><i></i><i></i><i class="s"></i><div class="stamp">УТВЕРЖДЕНО</div></div><div class="printer"><div class="slot"></div><div class="led"></div></div></div>
        ${angela('happy', 'corner')}
      </div>`;
    for (let i = 0; i < 16; i++) later(300 + i * 140, () => ui.sfx('type'));
    later(3200, () => { ui.app.querySelector('.sb-pr')?.classList.add('stamped'); ui.sfx('stamp'); ui.fx.shake(ui.app.querySelector('.sb-pr')); });
  },
};
