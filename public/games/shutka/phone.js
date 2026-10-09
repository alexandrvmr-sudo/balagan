/* Шутка на двоих — телефон */

const MEDALS = ['gold', 'silver', 'bronze'];
const ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' };
let picks = {};

export default {
  key(S) {
    if (S.task) return `t:${S.task.m}`;
    if (S.triple) return 'triple';
    if (S.vote) return `v:${S.vote.prompt}:${!!S.votedFor}`;
    if (S.medals) return `m:${!!S.given}`;
    return `w:${S.wait || ''}:${S.phase}`;
  },

  lobby(S, ui) {
    if (!S.you?.isHost || !S.ai) return;
    ui.main.innerHTML = `
      <div class="tagline" style="margin-bottom:8px">тема вечера — по ней ИИ придумает затравки</div>
      <input id="topic" maxlength="120" placeholder="например: днюха Макса, все с работы" value="${ui.esc(S.topic || '')}">`;
    const t = ui.main.querySelector('#topic');
    let timer;
    t.oninput = () => { clearTimeout(timer); timer = setTimeout(() => ui.act({ a: 'topic', topic: t.value }), 400); };
  },

  render(S, ui) {
    if (S.task) return task(S, ui);
    if (S.triple) return triple(S, ui);
    if (S.vote) return vote(S, ui);
    if (S.medals) return medals(S, ui);
    if (S.phase === 'winner') return winner(S, ui);
    const em = { cooking: '🧠', writing: '✍️', voting: '👀', reveal: '🎤', scores: '📊' }[S.phase] || '🎪';
    ui.wait(em, S.wait || 'Смотри на экран', S.you && !S.you.audience ? `у тебя ${ui.fmt(S.you.score)} очков` : '');
  },
};

function task(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">затравка ${S.task.no} из ${S.task.of} · ${S.value} очков</div>
    <div class="sh-p">${ui.esc(S.task.prompt)}</div>
    <textarea id="ans" maxlength="90" placeholder="впиши самое смешное…" autocomplete="off" autocapitalize="sentences" enterkeyhint="send"></textarea>
    <div class="count" id="cnt">0 / 90</div>`;
  ui.foot.innerHTML = `<button class="btn" id="send">Готово</button><button class="btn ghost small" id="help">Выручай! (подставить готовый ответ)</button>`;
  const ta = ui.main.querySelector('#ans');
  const cnt = ui.main.querySelector('#cnt');
  setTimeout(() => ta.focus(), 150);
  ta.oninput = () => { cnt.textContent = `${ta.value.length} / 90`; };
  const send = () => {
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    ui.act({ a: 'answer', m: S.task.m, text });
    ui.wait('✅', 'Принято');
  };
  ui.foot.querySelector('#send').onclick = send;
  ui.foot.querySelector('#help').onclick = () => { ui.act({ a: 'safety', m: S.task.m }); ui.wait('🛟', 'Выручили!'); };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
}

function triple(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">финал · три ответа · 3000 очков</div>
    <div class="sh-p">${ui.esc(S.triple.prompt)}</div>
    ${[1, 2, 3].map((n) => `<input id="t${n}" maxlength="50" placeholder="${n}." autocomplete="off">`).join('')}`;
  ui.foot.innerHTML = `<button class="btn" id="send">Ударить!</button>`;
  setTimeout(() => ui.main.querySelector('#t1').focus(), 150);
  ui.foot.querySelector('#send').onclick = () => {
    const texts = [1, 2, 3].map((n) => ui.main.querySelector(`#t${n}`).value.trim());
    if (!texts.some(Boolean)) return;
    ui.act({ a: 'triple', texts });
    ui.wait('🥊', 'Тройной удар нанесён');
  };
}

function vote(S, ui) {
  const voted = S.votedFor;
  ui.main.innerHTML = `
    <div class="tagline">что смешнее?</div>
    <div class="sh-p" style="font-size:18px">${ui.esc(S.vote.prompt)}</div>
    <div class="opts">${S.vote.options.map((o) => `<button class="opt ${voted === o.id ? 'on' : voted ? 'off' : ''}" data-o="${o.id}">${ui.esc(o.text)}</button>`).join('')}</div>`;
  ui.foot.innerHTML = voted ? '<div class="sub" style="text-align:center">голос принят</div>' : '';
  if (voted) return;
  for (const b of ui.main.querySelectorAll('.opt')) {
    b.onclick = () => { ui.buzz(40); ui.act({ a: 'vote', for: b.dataset.o }); };
  }
}

function medals(S, ui) {
  if (S.given) { ui.wait('🏅', 'Медали розданы'); return; }
  picks = {};
  const draw = () => {
    const next = MEDALS.find((m) => !picks[m]);
    ui.main.innerHTML = `
      <div class="tagline">раздай медали · ${next ? `сейчас: ${ICON[next]}` : 'все розданы'}</div>
      <div class="sh-p" style="font-size:17px">${ui.esc(S.medals.prompt)}</div>
      <div class="opts">${S.medals.options.map((o) => {
        const got = MEDALS.find((m) => picks[m] === o.id);
        return `<button class="medal-opt ${got ? 'on' : ''}" data-o="${o.id}"><b>${got ? ICON[got] : '·'}</b><span>${o.three.map(ui.esc).join(' · ')}</span></button>`;
      }).join('')}</div>`;
    ui.foot.innerHTML = `<button class="btn" id="give" ${picks.gold ? '' : 'disabled'}>Отдать медали</button>`;
    for (const b of ui.main.querySelectorAll('.medal-opt')) {
      b.onclick = () => {
        const id = b.dataset.o;
        const had = MEDALS.find((m) => picks[m] === id);
        if (had) delete picks[had];
        else { const m = MEDALS.find((x) => !picks[x]); if (m) picks[m] = id; }
        ui.buzz(20);
        draw();
      };
    }
    ui.foot.querySelector('#give').onclick = () => ui.act({ a: 'medals', ...picks });
  };
  draw();
}

function winner(S, ui) {
  const w = S.winner;
  const mine = w && S.you && w.id === S.you.id;
  ui.main.innerHTML = `
    <div class="wait">
      <div class="em">${mine ? '🏆' : '🎉'}</div>
      <h1>${mine ? 'Это ты!' : ui.esc(w?.name || '—')}</h1>
      <div class="sub">${mine ? 'самый смешной человек вечера' : `победа с ${ui.fmt(w?.score || 0)} очками`}</div>
    </div>`;
}
