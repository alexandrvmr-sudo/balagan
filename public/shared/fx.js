/* Эффекты: конфетти, искры, тряска, счётчики, печатная машинка, шторка между экранами */

let canvas = null, ctx = null, bits = [], raf = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  // размер в CSS задаём явно: иначе на ретине холст растягивается вдвое и всё съезжает
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:50';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const size = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
  size(); addEventListener('resize', size);
}

function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const k = devicePixelRatio;
  bits = bits.filter((b) => b.y < innerHeight + 40 && b.life-- > 0);
  for (const b of bits) {
    b.vy += b.g; b.x += b.vx; b.y += b.vy; b.a += b.va; b.vx *= 0.995;
    ctx.save(); ctx.translate(b.x * k, b.y * k); ctx.rotate(b.a);
    ctx.fillStyle = b.c;
    if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w * k / 2, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-b.w * k / 2, -b.h * k / 2, b.w * k, b.h * k);
    ctx.restore();
  }
  raf = bits.length ? requestAnimationFrame(frame) : 0;
  if (!bits.length) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const run = () => { if (!raf) raf = requestAnimationFrame(frame); };

export function confetti(colors = ['#ff2e63', '#ffd23f', '#2ec4b6', '#5a7dff', '#c77dff'], n = 180) {
  ensureCanvas();
  for (let i = 0; i < n; i++) {
    bits.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6,
      vx: -1 + Math.random() * 2, vy: 1 + Math.random() * 3, g: 0.03, a: Math.random() * 6, va: -0.1 + Math.random() * 0.2,
      w: 6 + Math.random() * 7, h: 10 + Math.random() * 12, c: colors[i % colors.length], life: 600,
    });
  }
  run();
}

/* искры из точки — попадания, голоса, очки */
export function burst(x, y, color = '#ffd23f', n = 28) {
  ensureCanvas();
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6;
    bits.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, g: 0.18, a: 0, va: 0, w: 5 + Math.random() * 5, h: 5, c: color, round: true, life: 80 });
  }
  run();
}

export function burstAt(el, color, n) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, n);
}

export function shake(el = document.body) {
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

export function countUp(el, from, to, ms = 900) {
  if (!el) return;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = String(Math.round(from + (to - from) * e)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function typewriter(el, text, cps = 45, onChar) {
  if (!el) return Promise.resolve();
  el.textContent = '';
  return new Promise((done) => {
    let i = 0;
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (onChar && text[i - 1] !== ' ') onChar();
      if (i >= text.length) { clearInterval(id); done(); }
    }, 1000 / cps);
  });
}

/* шторка между экранами: закрывает, меняем содержимое, открывает */
let wipeEl = null;
export function wipe(color = 'var(--a1)') {
  if (!wipeEl) {
    wipeEl = document.createElement('div');
    wipeEl.className = 'wipe';
    document.body.appendChild(wipeEl);
  }
  wipeEl.style.setProperty('--wc', color);
  wipeEl.classList.remove('go'); void wipeEl.offsetWidth; wipeEl.classList.add('go');
  return new Promise((r) => setTimeout(r, 330));
}
