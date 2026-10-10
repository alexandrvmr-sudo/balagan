/* Автопилот для проверки экранов: хост-телефон из той же вкладки, боты, автоответы.
   Только для песочницы (BALAGAN_TEST=1): сервер отдаёт файл по адресу /drive.js.
   На экране: await import('/drive.js'); DRIVE({ game: 'shutka', bots: 4, rating: 'adult' }); HACT({ a: 'skip' }) — к концу таймера */
window.DRIVE = (opts = {}) => {
  const code = new URLSearchParams(location.search).get('code');
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  const send = (m) => ws.send(JSON.stringify(m));
  const act = (m) => send({ t: 'act', ...m });
  const done = new Set();
  const later = (ms, fn) => setTimeout(fn, ms);
  ws.onopen = () => send({ t: 'join', code, name: opts.name || 'Саша' });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'welcome') {
      for (let i = 0; i < (opts.bots ?? 3); i++) act({ a: 'addBot' });
      later(300, () => act({ a: 'pick', game: opts.game || 'shutka' }));
      later(900, () => { if (opts.rating) act({ a: 'rating', r: opts.rating }); });
      if (!opts.lobby) later(1600, () => act({ a: 'start' }));
    }
    if (m.t === 'state') { window.HS = m; if (!opts.manual) auto(m); }
  };
  function auto(S) {
    const k = JSON.stringify([S.phase, S.task?.m, S.triple?.prompt, S.vote?.prompt, S.medals?.prompt, S.q?.text, S.spin,
      !!S.ask, S.multi?.q, S.number?.q, S.list?.q, S.match?.q, S.poll?.q, !!S.place, S.swipe?.what, S.swipe?.no,
      !!S.board, S.write?.j, !!S.pick, S.perform?.setup, S.final?.setup, !!S.fvote]);
    if (done.has(k)) return;
    done.add(k);
    const d = opts.delay ?? 1500;
    if (S.task) later(d, () => act({ a: 'answer', m: S.task.m, text: (opts.answers || ['Тёща с рассадой', 'Голосовое на четыре минуты', 'Кот с ипотекой'])[S.task.m % 3] }));
    if (S.triple) later(d, () => act({ a: 'triple', texts: ['Носки', 'Сосед с перфоратором', 'Пакет с пакетами'] }));
    if (S.vote && !S.votedFor) later(d, () => act({ a: 'vote', for: S.vote.options[opts.voteIdx ?? 0]?.id || S.vote.options[0].id }));
    if (S.medals && !S.given) { const o = S.medals.options.map((x) => x.id); later(d, () => act({ a: 'medals', gold: o[0], silver: o[1], bronze: o[2] })); }
    // Лайнер
    if (S.board) later(d, () => act({ a: 'board', catch: 'Пристегните ремни!', topics: ['Сызрань', 'холодец', 'тёща'] }));
    if (S.write) later(d, () => act({ a: 'joke', j: S.write.j, topic: 0, punch: ['и это был рейс на Сочи', 'теперь я летаю поездом', 'стюардесса до сих пор в шоке'][S.write.j % 3] }));
    if (S.pick) later(d, () => act({ a: 'pick', j: S.pick[0].j }));
    if (S.perform && !opts.noPunch) later(d + 2500, () => act({ a: 'punch' }));
    if (S.final) later(d, () => act({ a: 'fpunch', text: 'зато кофе был бесплатный' }));
    if (S.fvote && !S.votedFor) later(d, () => act({ a: 'fvote', for: S.fvote.options[0].id }));
    // Барабан
    if (S.ask) later(d, () => act({ a: 'ask', q: 'Когда я наконец высплюсь?' }));
    if (S.multi) later(d, () => act({ a: 'multi', picks: [0, 1, 2] }));
    if (S.number) later(d, () => act({ a: 'num', v: 1000 }));
    if (S.list) { later(d, () => act({ a: 'item', text: 'водка' })); later(d + 400, () => act({ a: 'listDone' })); }
    if (S.match) later(d, () => act({ a: 'match', pairs: S.match.left.map((_, i) => i) }));
    if (S.poll) later(d, () => act({ a: 'poll', for: S.poll.options[0].id }));
    if (S.place) later(d, () => act({ a: 'place', cells: Array.from({ length: S.place.n }, (_, i) => (i * 5) % S.place.wheel.length) }));
    if (S.swipe && !opts.noSpin) later(d + 800, () => act({ a: 'spin', power: 0.85 }));
    opts.onState?.(S, act);
  }
  window.HACT = act;
  return 'ok';
};
