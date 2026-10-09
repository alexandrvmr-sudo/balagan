/* Соединение с сервером: переподключается само, с нарастающей паузой */

export function connect({ hello, onMessage, onDown, onUp }) {
  let ws = null;
  let tries = 0;
  let closed = false;

  function open() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onopen = () => { tries = 0; onUp?.(); const h = hello(); if (h) ws.send(JSON.stringify(h)); };
    ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = () => {
      if (closed) return;
      onDown?.();
      tries++;
      setTimeout(open, Math.min(400 * tries, 4000));
    };
  }
  open();

  return {
    send(m) { try { ws.send(JSON.stringify(m)); } catch {} },
    close() { closed = true; try { ws.close(); } catch {} },
    get ready() { return ws?.readyState === 1; },
  };
}
