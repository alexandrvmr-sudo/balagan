/* Лайнер — экран. Один рейс: табло вылетов → взлёт → набор высоты → стендап в проходе салона →
   турбулентность с кислородными масками → посадка под аплодисменты. Небо меняется вместе с сюжетом. */

const SKY = { board: 'night', takeoff: 'dawn', write: 'day', pick: 'day', perform: 'cabin', voting: 'cabin', reveal: 'cabin', turbulence: 'storm', final: 'storm', fvote: 'storm', freveal: 'storm', landing: 'sunset', winner: 'sunset' };
const LEVEL = { adult: '18+', hard: 'ЖЕСТЬ' };
let timers = [];
const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };

/* ---------- самолёт сбоку ---------- */
function plane(cls = '') {
  return `<svg class="ln-plane ${cls}" viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M120 96l-46 52h26l70-50z" fill="#c9d6e6" stroke="#203a5c" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 62L12 14h28l44 44z" fill="#1f6fd1" stroke="#203a5c" stroke-width="3" stroke-linejoin="round"/>
    <text x="34" y="44" font-family="Unbounded,sans-serif" font-weight="900" font-size="15" fill="#fff" transform="rotate(-8 34 44)">БГ</text>
    <path d="M30 70Q36 52 70 52H330Q392 54 406 80Q392 104 330 106H70Q36 104 30 88Z" fill="#f7fbff" stroke="#203a5c" stroke-width="3.5"/>
    <path d="M44 84H392" stroke="#1f6fd1" stroke-width="7"/>
    <path d="M44 93H380" stroke="#ff7a1a" stroke-width="3"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${98 + i * 20}" y="64" width="10" height="11" rx="4" fill="#9fd3ff" stroke="#203a5c" stroke-width="1.6"/>`).join('')}
    <path d="M362 62q22 2 34 16h-30q-6-8-4-16z" fill="#203a5c"/>
    <path d="M190 92l-24 54h30l52-54z" fill="#dfe8f3" stroke="#203a5c" stroke-width="3" stroke-linejoin="round"/>
    <rect x="200" y="108" width="40" height="16" rx="8" fill="#c9d6e6" stroke="#203a5c" stroke-width="3"/>
    <g class="ln-gear"><path d="M120 106v14M300 106v14" stroke="#203a5c" stroke-width="4"/><circle cx="120" cy="124" r="6" fill="#203a5c"/><circle cx="300" cy="124" r="6" fill="#203a5c"/></g>
    <path class="ln-jetfx" d="M28 76h-30M28 84h-40M28 92h-28" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}

/* ---------- командир: фуражка, усы, гарнитура; рот — по голосу ---------- */
function captain(cls = '') {
  return `<div class="ln-cap ${cls}"><svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="58" fill="#1f6fd1" stroke="#fff" stroke-width="4"/>
    <path d="M18 120q4-30 42-32 38 2 42 32z" fill="#203a5c"/><path d="M50 90l10 14 10-14" fill="#fff"/><path d="M58 96h4l2 20h-8z" fill="#ff7a1a"/>
    <path d="M86 102l6-6 6 6" stroke="#ffd23f" stroke-width="3" fill="none"/>
    <ellipse cx="60" cy="62" rx="26" ry="28" fill="#ffd3b4" stroke="#203a5c" stroke-width="3"/>
    <path d="M30 44q30-22 60 0v6H30z" fill="#203a5c"/><path d="M26 50h68q-2 8-34 8t-34-8z" fill="#152a44"/>
    <path d="M52 38l8-6 8 6-8 3z" fill="#ffd23f"/><path d="M42 40h10M68 40h10" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <g class="ln-eyes"><circle cx="50" cy="62" r="3.4" fill="#203a5c"/><circle cx="70" cy="62" r="3.4" fill="#203a5c"/></g>
    <path d="M44 55q6-4 12 0M64 55q6-4 12 0" stroke="#7a4a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g id="lnMouth"><ellipse cx="60" cy="80" rx="6" ry="3.4" fill="#5a1020"/></g>
    <path d="M60 74c-4-4-12-5-17-1 4 0 7 4 12 4 3 0 4-1 5-3zM60 74c4-4 12-5 17-1-4 0-7 4-12 4-3 0-4-1-5-3z" fill="#7a4a2a"/>
    <path d="M34 60q-4 10 2 18" stroke="#203a5c" stroke-width="4" fill="none"/><path d="M36 78q8 8 18 6" stroke="#203a5c" stroke-width="3" fill="none"/><circle cx="55" cy="84" r="3" fill="#203a5c"/>
  </svg></div>`;
}

/* ---------- небо: градиент, облака, звёзды, молнии — живут в подложке ---------- */
function sky(mode) {
  const bd = document.getElementById('backdrop');
  if (!bd) return;
  let el = bd.querySelector('.ln-sky');
  if (!el) {
    el = document.createElement('div');
    el.className = 'ln-sky';
    el.dataset.transient = '1';
    const cloud = (i) => `<svg class="cl" viewBox="0 0 200 80" style="top:${8 + ((i * 37) % 70)}%;animation-duration:${38 + (i % 4) * 14}s;animation-delay:${-i * 9}s;width:${18 + (i % 3) * 10}vmin"><path d="M30 70h140c18 0 26-26 6-34 2-20-24-30-40-18-8-22-46-22-54 2-18-6-38 6-34 24-20 2-22 26-18 26z" fill="#fff"/></svg>`;
    el.innerHTML = `<div class="stars"></div><div class="far">${Array.from({ length: 5 }, (_, i) => cloud(i)).join('')}</div><div class="near">${Array.from({ length: 4 }, (_, i) => cloud(i + 5)).join('')}</div><div class="bolt"></div><div class="ground"></div>`;
    bd.appendChild(el);
  }
  el.dataset.mode = mode;
}

const lvl = (S) => (LEVEL[S.level] ? `<span class="ln-lvl l-${S.level}">${LEVEL[S.level]}</span>` : '');
const dots = (S) => Array.from({ length: S.voters || 0 }, (_, i) => `<i class="${i < S.voted ? 'on' : ''}"></i>`).join('');
const letters = (t, d0 = 0) => [...t].map((c, i) => (c === ' ' ? '<i class="sp"> </i>' : `<i style="animation-delay:${(d0 + i * 0.045).toFixed(2)}s">${c}</i>`)).join('');
const seat = (i) => `${12 + Math.floor(i / 2)}${'АВ'[i % 2]}`;

export default {
  key(S) {
    if (S.phase === 'perform') return `${S.matchNo}:${S.performer}:${S.part}`;
    if (S.phase === 'voting' || S.phase === 'reveal') return `${S.matchNo}`;
    return '';
  },
  wipe(prev, S) {
    if (prev?.phase === 'perform' && (S.phase === 'perform' || S.phase === 'voting')) return false;
    if (prev?.phase === 'voting' && S.phase === 'reveal') return false;
    return !(prev?.phase === 'takeoff' && S.phase === 'write') && !(prev?.phase === 'turbulence' && S.phase === 'final') && !(prev?.phase === 'landing' && S.phase === 'winner');
  },
  mood(S) { return { board: 'lobby', takeoff: 'reveal', write: 'think', pick: 'calm', perform: 'silence', voting: 'tense', reveal: 'reveal', turbulence: 'tense', final: 'tense', fvote: 'tense', freveal: 'reveal', landing: 'reveal', winner: 'win' }[S.phase]; },

  render(S, ui) {
    timers.forEach(clearTimeout); timers = [];
    sky(SKY[S.phase] || 'day');
    document.body.classList.toggle('ln-shake', ['turbulence', 'final'].includes(S.phase));
    ui.tag({ board: `рейс ${S.flight} · регистрация`, takeoff: 'взлёт', write: 'набор высоты', pick: 'выбор номера', perform: `стендап в проходе · ${S.matchNo} из ${S.matchTotal}`, voting: `дуэль ${S.matchNo} из ${S.matchTotal}`, reveal: `дуэль ${S.matchNo} из ${S.matchTotal}`, turbulence: 'турбулентность', final: 'турбулентность', fvote: 'последняя шутка', freveal: 'последняя шутка', landing: 'посадка' }[S.phase] || '');
    DRAW[S.phase]?.(S, ui);
  },

  update(S, ui) {
    for (const w of S.progress || []) {
      const el = ui.app.querySelector(`[data-p="${w.id}"]`);
      if (!el) continue;
      if (w.done && !el.classList.contains('done')) { ui.sfx(S.phase === 'board' ? 'stamp' : 'pop'); el.querySelector('.cav')?.classList.add('hop'); }
      el.classList.toggle('done', !!w.done);
      const st = el.querySelector('.st');
      if (st) st.textContent = stLabel(S, w);
    }
    if (S.phase === 'write') altimeter(S, ui);
    const d = ui.app.querySelector('.ln-dots');
    if (d) { const before = d.querySelectorAll('i.on').length; d.innerHTML = dots(S); if (S.voted > before) ui.sfx('seatbelt'); }
  },

  frame(S, ui) {
    const m = document.getElementById('lnMouth');
    if (m) m.style.transform = `scaleY(${(0.6 + ui.mouth() * 2.2).toFixed(3)})`;
  },
};

function stLabel(S, w) {
  if (S.phase === 'board') return w.done ? 'ЗАРЕГИСТРИРОВАН' : 'регистрация…';
  if (S.phase === 'write') return w.done ? 'готово' : `шуток: ${w.n}`;
  if (S.phase === 'pick') return w.done ? 'выбрал' : 'думает…';
  return w.done ? 'готово' : 'пишет…';
}

function passes(S, ui, extra = '') {
  return `<div class="ln-passes">${(S.progress || []).map((w, i) => {
    const p = ui.p(w.id) || {};
    const k = S.players.findIndex((x) => x.id === w.id);
    return `<div class="ln-pass ${w.done ? 'done' : ''}" data-p="${w.id}" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s">
      <div class="l">${ui.avatar(p)}<div><b>${ui.esc(p.name)}</b><small>место ${seat(k)}</small></div></div>
      <div class="st">${stLabel(S, w)}</div>${extra}</div>`;
  }).join('')}</div>`;
}

/* высотомер: плавно догоняет высоту от сервера */
function altimeter(S, ui) {
  const el = ui.app.querySelector('.ln-alt');
  if (!el) return;
  const max = Math.max(S.altMax || 10000, 1);
  const to = S.alt || 0;
  const from = Number(el.dataset.v || 0);
  if (from === to) return;
  el.dataset.v = to;
  ui.fx.countUp(el.querySelector('b'), from, to, 900);
  el.querySelector('.fill').style.height = `${Math.min(100, (to / max) * 100)}%`;
  if (to > from) { ui.sfx('whoosh'); el.closest('.ln-climb')?.querySelector('.ln-plane')?.classList.add('lift'); later(700, () => el.closest('.ln-climb')?.querySelector('.ln-plane')?.classList.remove('lift')); }
}

const DRAW = {
  /* табло вылетов: буквы перещёлкиваются, как на старом вокзальном табло */
  board(S, ui) {
    const rows = [
      ['SU 1402', 'МУРМАНСК', '19:40', 'ЗАДЕРЖАН'],
      [S.flight, 'ДЕСЯТЬ ТЫСЯЧ МЕТРОВ', '20:45', 'РЕГИСТРАЦИЯ'],
      ['БГ 007', 'УРЮПИНСК', '21:10', 'ОТМЕНЁН'],
      ['DP 404', 'СОЧИ', '21:30', 'ПО ПЛАНУ'],
    ];
    const flap = (t, d) => [...t].map((c, i) => `<i style="animation-delay:${(d + i * 0.035).toFixed(2)}s">${c === ' ' ? '&nbsp;' : ui.esc(c)}</i>`).join('');
    ui.app.innerHTML = `
      <div class="ln-terminal">
        <div class="ln-board">
          <div class="hd"><span>рейс</span><span>направление</span><span>время</span><span>статус</span></div>
          ${rows.map((r, k) => `<div class="row ${k === 1 ? 'hot' : ''}">${r.map((c, j) => `<span class="c${j}">${flap(c, 0.2 + k * 0.25 + j * 0.1)}</span>`).join('')}</div>`).join('')}
        </div>
        <div class="ln-hint">коронная фраза и три слова для багажа — в телефоне ${lvl(S)}</div>
        ${passes(S, ui)}
        ${captain('corner')}
      </div>`;
    ui.sfx('chime');
    later(400, () => { for (let i = 0; i < 14; i++) later(i * 60, () => ui.sfx('clack')); });
  },

  takeoff(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene takeoff">
        <div class="ln-sign on">ПРИСТЕГНИТЕ РЕМНИ</div>
        <div class="ln-runway"><i></i></div>
        <div class="ln-fly">${plane()}</div>
        ${captain('corner')}
      </div>`;
    ui.sfx('seatbelt');
    later(2600, () => ui.sfx('whoosh2'));
  },

  write(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-climb">
        <div class="ln-head">${letters('НАБОР ВЫСОТЫ')}</div>
        <div class="ln-sub">каждая шутка поднимает нас выше · пишите в телефоне</div>
        <div class="ln-mid"><div class="ln-cruise">${plane()}</div>
          <div class="ln-alt" data-v="0"><div class="tube"><div class="fill"></div></div><div class="val"><b>0</b><small>метров</small></div></div></div>
        ${passes(S, ui)}
        ${captain('corner')}
      </div>`;
    later(100, () => altimeter(S, ui));
  },

  pick(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-climb">
        <div class="ln-head">${letters('ВЫБОР НОМЕРА')}</div>
        <div class="ln-sub">комики выбирают лучшую шутку · высота ${ui.fmt(S.alt || 0)} м</div>
        <div class="ln-mid"><div class="ln-cruise">${plane()}</div></div>
        ${passes(S, ui)}
        ${captain('corner')}
      </div>`;
  },

  /* салон: ряды кресел с пассажирами, комик в проходе под прожектором */
  perform(S, ui) {
    const p = ui.p(S.performer) || {};
    const crowd = S.players.filter((x) => x.id !== S.performer);
    const punch = S.part === 'punch';
    ui.app.innerHTML = `
      <div class="ln-cabin ${punch ? 'punch' : ''}">
        <div class="ln-bins"></div>
        <div class="ln-sign ${punch ? 'on hot' : ''}">АПЛОДИСМЕНТЫ</div>
        <div class="ln-perf"><div class="spot"></div>${ui.avatar(p, 'bob')}<span class="mic">🎤</span><b style="color:${p.color}">${ui.esc(p.name)}</b></div>
        <div class="ln-joke"><div class="setup" id="setup"></div>${punch ? `<div class="pl">${ui.esc(S.punch)}</div><div class="cp">«${ui.esc(S.catch)}»</div>` : ''}</div>
        <div class="ln-seats">${crowd.map((x, i) => `<div class="seat ${punch ? 'laugh' : ''}" style="--d:${(i * 0.09).toFixed(2)}s">${ui.avatar(x, '', { mood: punch ? 'wow' : 'happy' })}</div>`).join('')}</div>
      </div>`;
    const el = ui.app.querySelector('#setup');
    if (!punch) ui.fx.typewriter(el, S.setup, 36);
    else {
      el.textContent = S.setup;
      ui.fx.shake(ui.app.querySelector('.ln-joke .pl'));
      later(250, () => { ui.sfx('chime'); ui.sfx('laugh'); });
      later(900, () => ui.sfx('applause'));
    }
  },

  voting(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-vote">
        <div class="ln-head small">${letters('КТО СМЕШНЕЕ?')}</div>
        <div class="ln-tix">${(S.options || []).map((o, i) => { const p = ui.p(o.id) || {}; return `
          <div class="ln-tix1" style="animation-delay:${(0.2 + i * 0.25).toFixed(2)}s"><div class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span></div><div class="s">${ui.esc(o.setup)}</div><div class="p">${ui.esc(o.punch)}</div></div>`; }).join('')}</div>
        <div class="ln-call">кнопка вызова — в телефоне <span class="ln-dots">${dots(S)}</span></div>
      </div>`;
  },

  reveal(S, ui) {
    const r = S.result;
    ui.app.innerHTML = `
      <div class="ln-vote">
        <div class="ln-tix">${r.rows.map((row, i) => { const p = ui.p(row.id) || {}; const win = i === 0 && row.votes > 0 && !r.tie; return `
          <div class="ln-tix1 ${win ? 'win' : 'lose'}">
            ${row.ovation ? '<div class="ln-stamp">ОВАЦИЯ!</div>' : ''}
            <div class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><em>+${ui.fmt(row.pts)}</em></div>
            <div class="s">${ui.esc(row.setup)}</div><div class="p">${ui.esc(row.punch)}</div>
            <div class="bells">${(row.voters || []).map((v, k) => `<span style="animation-delay:${(0.5 + k * 0.18).toFixed(2)}s"><i>🛎️</i>${ui.avatar(ui.p(v))}</span>`).join('')}</div>
          </div>`; }).join('')}</div>
      </div>`;
    r.rows.forEach((row) => (row.voters || []).forEach((_, k) => later(500 + k * 180, () => ui.sfx('seatbelt'))));
    later(1400, () => {
      ui.fx.burstAt(ui.app.querySelector('.ln-tix1.win'), '#ffd166', 40);
      ui.sfx(r.rows[0]?.ovation ? 'cheer' : r.tie ? 'ooh' : 'applause');
      if (r.rows[0]?.ovation) ui.fx.confetti(undefined, 80);
    });
  },

  turbulence(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene storm">
        <div class="ln-masks">${Array.from({ length: 7 }, (_, i) => `<div class="mask" style="left:${8 + i * 13}%;animation-delay:${(0.6 + (i % 3) * 0.15).toFixed(2)}s"><i></i><b></b></div>`).join('')}</div>
        <div class="ln-sign on red">ТУРБУЛЕНТНОСТЬ</div>
        <div class="ln-fly shaky">${plane()}</div>
        <div class="ln-sub big">последняя шутка перед посадкой</div>
        ${captain('corner')}
      </div>`;
    later(700, () => ui.sfx('seatbelt'));
    later(1400, () => ui.sfx('thunder'));
  },

  final(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene storm">
        <div class="ln-masks still">${Array.from({ length: 7 }, (_, i) => `<div class="mask" style="left:${8 + i * 13}%"><i></i><b></b></div>`).join('')}</div>
        <div class="ln-final"><div class="k">все дописывают одну завязку</div><div class="q">${ui.esc(S.setup)} <span>…</span></div></div>
        ${passes(S, ui)}
        ${captain('corner')}
      </div>`;
  },

  fvote(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene storm">
        <div class="ln-final small"><div class="q">${ui.esc(S.setup)}</div></div>
        <div class="ln-flist">${(S.options || []).map((o, i) => `<div class="r" style="animation-delay:${(0.2 + i * 0.12).toFixed(2)}s"><b>${i + 1}</b>${ui.esc(o.text)}</div>`).join('')}</div>
        <div class="ln-call">голосуйте за лучшее последнее слово <span class="ln-dots">${dots(S)}</span></div>
      </div>`;
  },

  freveal(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene storm">
        <div class="ln-final small"><div class="q">${ui.esc(S.setup)}</div></div>
        <div class="ln-flist">${(S.result || []).map((r, i) => { const p = ui.p(r.id) || {}; return `
          <div class="r ${i === 0 ? 'win' : ''}" style="animation-delay:${(0.2 + i * 0.15).toFixed(2)}s"><b>${r.votes}</b>${ui.esc(r.text)}<span class="who">${ui.avatar(p)}<span style="color:${p.color}">${ui.esc(p.name)}</span><em>+${ui.fmt(r.pts)}</em></span></div>`; }).join('')}</div>
      </div>`;
    later(900, () => { ui.sfx('applause'); ui.fx.burstAt(ui.app.querySelector('.ln-flist .win'), '#ffd166', 40); });
  },

  landing(S, ui) {
    ui.app.innerHTML = `
      <div class="ln-scene landing">
        <div class="ln-sign">АПЛОДИСМЕНТЫ ПИЛОТУ</div>
        <div class="ln-runway"><i></i></div>
        <div class="ln-fly down">${plane()}</div>
        <div class="ln-puff"></div>
        ${captain('corner')}
      </div>`;
    later(3300, () => { ui.sfx('thud'); ui.app.querySelector('.ln-puff')?.classList.add('go'); });
    later(3700, () => { ui.app.querySelector('.ln-sign')?.classList.add('on', 'hot'); ui.sfx('chime'); ui.sfx('cheer'); });
    later(4600, () => ui.sfx('applause'));
  },

  winner(S, ui) {
    const list = S.players.filter((p) => !p.audience);
    const top = [...list].sort((a, b) => b.score - a.score)[0];
    const k = S.players.findIndex((x) => x.id === top?.id);
    ui.app.innerHTML = `
      <div class="ln-win">
        <div class="ln-award">
          <div class="l"><small>посадочный талон · рейс ${ui.esc(S.flight)}</small><div class="t">ЛУЧШИЙ КОМИК РЕЙСА</div>
            <div class="who">${top ? ui.avatar(top, 'bob', { mood: 'wow' }) : ''}<b style="color:${top?.color}">${ui.esc(top?.name || '—')}</b></div></div>
          <div class="r"><small>место</small><b>${seat(Math.max(0, k))}</b><small>класс</small><b>БИЗНЕС</b></div>
        </div>
        ${ui.podium(list)}
        ${captain('corner')}
      </div>`;
    ui.fx.confetti(['#ff7a1a', '#ffd166', '#7cc6fe', '#1f6fd1', '#ffffff']);
    ui.sfx('tada');
    later(600, () => ui.sfx('applause'));
  },
};
