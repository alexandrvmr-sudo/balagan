/* Лайнер — телефон: посадочный талон, заготовки, кнопка «Добить!», голосование кнопкой вызова */

let chosenTopic = null;

export default {
  key(S) {
    if (S.board) return 'board';
    if (S.write) return `w:${S.write.j}`;
    if (S.pick) return 'pick';
    if (S.perform) return 'perform';
    if (S.vote) return `v:${!!S.votedFor}`;
    if (S.final) return 'final';
    if (S.fvote) return `fv:${!!S.votedFor}`;
    return `wait:${S.phase}:${S.wait || ''}`;
  },

  render(S, ui) {
    if (S.board) return board(S, ui);
    if (S.write) return write(S, ui);
    if (S.pick) return pick(S, ui);
    if (S.perform) return perform(S, ui);
    if (S.vote) return vote(S, ui, S.vote.options, 'vote', 'кто смешнее? жми кнопку вызова 🛎️');
    if (S.final) return final(S, ui);
    if (S.fvote) return vote(S, ui, S.fvote.options, 'fvote', 'лучшее последнее слово');
    if (S.phase === 'winner') return winner(S, ui);
    ui.wait({ board: '🎫', takeoff: '🛫', write: '✍️', pick: '🎤', perform: '🤫', voting: '🛎️', reveal: '👏', turbulence: '⚡', final: '😱', fvote: '🛎️', freveal: '👏', landing: '🛬' }[S.phase] || '✈️', S.wait || 'Смотри на экран', S.seat ? `твоё место — ${S.seat}` : '');
  },
};

function board(S, ui) {
  const b = S.board;
  ui.main.innerHTML = `
    <div class="ln-bp"><div class="row1"><span>рейс <b>${ui.esc(b.flight)}</b></span><span>место <b>${ui.esc(b.seat)}</b></span></div></div>
    <label class="ln-l">коронная фраза — после каждой твоей шутки</label>
    <input id="c" maxlength="50" placeholder="например: ${ui.esc(b.examples[0])}" autocomplete="off">
    <div class="ln-chips">${b.examples.map((e) => `<button class="ln-chip" data-e="${ui.esc(e)}">${ui.esc(e)}</button>`).join('')}</div>
    <div class="tagline" style="margin-top:6px">сдай в багаж три слова — из них соберут шутки</div>
    ${b.cats.map((c, i) => `<label class="ln-l">${ui.esc(c.ask)}</label><input id="t${i}" maxlength="30" placeholder="${ui.esc(c.hint)}" autocomplete="off">`).join('')}`;
  ui.foot.innerHTML = `<button class="btn" id="go">Зарегистрироваться</button>`;
  for (const ch of ui.main.querySelectorAll('.ln-chip')) ch.onclick = () => { ui.main.querySelector('#c').value = ch.dataset.e; ui.buzz(10); };
  ui.foot.querySelector('#go').onclick = () => {
    ui.act({ a: 'board', catch: ui.main.querySelector('#c').value, topics: b.cats.map((_, i) => ui.main.querySelector(`#t${i}`).value) });
    ui.wait('🎫', 'Посадочный талон получен', `место ${b.seat}`);
  };
}

function write(S, ui) {
  const w = S.write;
  chosenTopic = null;
  const draw = () => {
    const filled = chosenTopic == null ? w.blank.replace('____', '<span class="blank">тема?</span>') : ui.esc(w.blank.replace('____', w.options[chosenTopic]));
    ui.main.innerHTML = `
      <div class="tagline">шутка ${w.j + 1} из ${w.of}${w.written ? ` · готово ${w.written}` : ''}</div>
      <div class="ln-card">${filled}</div>
      ${chosenTopic == null
        ? `<div class="tagline">выбери тему · ${ui.esc((w.ask || '').toLowerCase())}</div><div class="opts">${w.options.map((o, i) => `<button class="opt" data-i="${i}">${ui.esc(o)}</button>`).join('')}</div>`
        : `<textarea id="p" maxlength="110" placeholder="панчлайн — чем всё кончилось?" autocomplete="off"></textarea>`}`;
    ui.foot.innerHTML = chosenTopic == null
      ? (w.written ? '<button class="btn ghost small" id="enough">Хватит, я готов к выступлению</button>' : '')
      : `<button class="btn" id="go">Записать шутку</button><button class="btn ghost small" id="back">← другая тема</button>`;
    for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { chosenTopic = Number(b.dataset.i); draw(); setTimeout(() => ui.main.querySelector('#p')?.focus(), 100); };
    ui.foot.querySelector('#enough')?.addEventListener('click', () => { ui.act({ a: 'enough' }); ui.wait('🎤', 'Готовься к выступлению'); });
    ui.foot.querySelector('#back')?.addEventListener('click', () => { chosenTopic = null; draw(); });
    ui.foot.querySelector('#go')?.addEventListener('click', () => {
      const punch = ui.main.querySelector('#p').value.trim();
      if (!punch) return;
      ui.act({ a: 'joke', j: w.j, topic: chosenTopic, punch });
      ui.wait('📝', 'Записано');
    });
  };
  draw();
}

function pick(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">с какой шуткой выйдешь в проход?</div>
    <div class="opts">${S.pick.map((j) => `<button class="opt" data-j="${j.j}"><small>${ui.esc(j.setup)}</small>${ui.esc(j.punch)}</button>`).join('')}</div>`;
  for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.act({ a: 'pick', j: Number(b.dataset.j) }); ui.wait('🎤', 'Готовься к выходу'); };
}

function perform(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">ты в проходе · командир читает завязку</div>
    <div class="ln-card">${ui.esc(S.perform.setup)}</div>
    <div class="sub">Панчлайн: <b>${ui.esc(S.perform.punch)}</b></div>
    <div class="sub">Выдержи паузу — и жми.</div>`;
  ui.foot.innerHTML = `<button class="btn ln-big" id="hit">ДОБИТЬ! 🥁</button>`;
  ui.foot.querySelector('#hit').onclick = () => { ui.buzz(80); ui.act({ a: 'punch' }); ui.wait('🥁', 'Ба-дум-тсс!'); };
}

function vote(S, ui, options, action, title) {
  const voted = S.votedFor;
  ui.main.innerHTML = `
    <div class="tagline">${title}</div>
    <div class="opts">${options.map((o) => `<button class="opt ${voted === o.id ? 'on' : voted ? 'off' : ''}" data-o="${o.id}">${o.name ? `<small>${ui.esc(o.name)}</small>` : ''}${ui.esc(o.text)}</button>`).join('')}</div>`;
  ui.foot.innerHTML = voted ? '<div class="sub" style="text-align:center">голос принят</div>' : '';
  if (!voted) for (const b of ui.main.querySelectorAll('.opt')) b.onclick = () => { ui.buzz(40); ui.act({ a: action, for: b.dataset.o }); };
}

function final(S, ui) {
  ui.main.innerHTML = `
    <div class="tagline">турбулентность · последняя шутка</div>
    <div class="ln-card">${ui.esc(S.final.setup)} <span class="blank">…</span></div>
    <textarea id="p" maxlength="110" placeholder="допиши, пока трясёт" autocomplete="off"></textarea>`;
  ui.foot.innerHTML = `<button class="btn" id="go">Отправить, пока не упали</button>`;
  setTimeout(() => ui.main.querySelector('#p').focus(), 150);
  ui.foot.querySelector('#go').onclick = () => {
    const t = ui.main.querySelector('#p').value.trim();
    if (!t) return;
    ui.act({ a: 'fpunch', text: t });
    ui.wait('😱', 'Держись за подлокотник');
  };
}

function winner(S, ui) {
  const w = S.winner;
  const mine = w && S.you && w.id === S.you.id;
  ui.main.innerHTML = `<div class="wait"><div class="em">${mine ? '🏆' : '🛬'}</div><h1>${mine ? 'Лучший комик рейса!' : ui.esc(w?.name || '—')}</h1><div class="sub">${mine ? 'экипаж аплодирует стоя' : `лучший комик рейса · ${ui.fmt(w?.score || 0)}`}</div></div>`;
}
