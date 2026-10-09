/* Мелкие помощники для экрана и телефона */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const byId = (S, id) => (S?.players || []).find((p) => p.id === id);

export function avatar(p, cls = '') {
  if (!p) return `<span class="avatar ${cls}" style="--pc:#555"><span>?</span></span>`;
  return `<span class="avatar ${cls}" style="--pc:${p.color}"><span>${p.emoji}</span></span>`;
}

export const who = (p) => p ? `${avatar(p)}<b style="color:${p.color}">${esc(p.name)}</b>` : '';

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* хранилище, которое не падает в приватном режиме */
export const store = {
  get(k, box = localStorage) { try { return box.getItem(k); } catch { return null; } },
  set(k, v, box = localStorage) { try { box.setItem(k, v); } catch {} },
  del(k, box = localStorage) { try { box.removeItem(k); } catch {} },
};

/* кольцо-таймер */
export function ring(cls = '') {
  return `<div class="ring ${cls}"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg><b></b></div>`;
}

export function updateRing(el, S) {
  if (!el) return;
  const fg = el.querySelector('.fg');
  const num = el.querySelector('b');
  if (!S?.deadline || !S.timerTotal) { el.style.visibility = 'hidden'; return; }
  const left = Math.max(0, S.deadline - Date.now());
  el.style.visibility = 'visible';
  fg.setAttribute('stroke-dashoffset', String(276.5 * (1 - left / S.timerTotal)));
  el.classList.toggle('warn', left < 6000);
  num.textContent = Math.ceil(left / 1000);
}

export const secondsLeft = (S) => (S?.deadline ? Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000)) : null);

/* лёгкая вибрация на телефоне */
export const buzz = (ms = 30) => { try { navigator.vibrate?.(ms); } catch {} };
