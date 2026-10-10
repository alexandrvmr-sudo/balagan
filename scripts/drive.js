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
    const k = JSON.stringify([S.phase, S.task?.m, S.triple?.prompt, S.vote?.prompt, S.medals?.prompt, S.q?.text, S.spin]);
    if (done.has(k)) return;
    done.add(k);
    const d = opts.delay ?? 1500;
    if (S.task) later(d, () => act({ a: 'answer', m: S.task.m, text: (opts.answers || ['Тёща с рассадой', 'Голосовое на четыре минуты', 'Кот с ипотекой'])[S.task.m % 3] }));
    if (S.triple) later(d, () => act({ a: 'triple', texts: ['Носки', 'Сосед с перфоратором', 'Пакет с пакетами'] }));
    if (S.vote && !S.votedFor) later(d, () => act({ a: 'vote', for: S.vote.options[opts.voteIdx ?? 0]?.id || S.vote.options[0].id }));
    if (S.medals && !S.given) { const o = S.medals.options.map((x) => x.id); later(d, () => act({ a: 'medals', gold: o[0], silver: o[1], bronze: o[2] })); }
    opts.onState?.(S, act);
  }
  window.HACT = act;
  return 'ok';
};
