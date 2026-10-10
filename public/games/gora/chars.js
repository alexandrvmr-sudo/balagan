/* Герои уральских сказов: Данила-мастер, Огневушка-поскакушка, Серебряное копытце, Полоз и другие.
   Расписные, с медью и малахитом. draw({ mood }) — happy | sad | wow | dead | ghost */

const INK = '#1e140c';

function eyes(mood, x1 = 40, x2 = 60, y = 50, glow = null) {
  if (mood === 'dead' || mood === 'ghost') return `<path d="M${x1 - 4} ${y - 4}l8 8M${x1 + 4} ${y - 4}l-8 8M${x2 - 4} ${y - 4}l8 8M${x2 + 4} ${y - 4}l-8 8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const c = glow || INK;
  const r = mood === 'wow' ? 4.6 : 3.8;
  return `<g class="blink"><circle cx="${x1}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${c}"/>${glow ? '' : `<circle cx="${x1 + 1.3}" cy="${y - 1.3}" r="1.3" fill="#fff"/><circle cx="${x2 + 1.3}" cy="${y - 1.3}" r="1.3" fill="#fff"/>`}</g>`;
}
function mouth(mood, y = 64, w = 9) {
  if (mood === 'sad' || mood === 'dead' || mood === 'ghost') return `<path d="M${50 - w} ${y + 3}q${w} -7 ${w * 2} 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  if (mood === 'wow') return `<ellipse cx="50" cy="${y + 1}" rx="4.5" ry="5.5" fill="${INK}"/>`;
  return `<path d="M${50 - w} ${y}q${w} 9 ${w * 2} 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
}
const wrap = (mood, body) => {
  const ghost = mood === 'ghost';
  return `<svg viewBox="-4 -12 108 132" xmlns="http://www.w3.org/2000/svg"${ghost ? ' opacity=".6"' : ''}>
    ${ghost ? `<ellipse cx="50" cy="-4" rx="20" ry="5" fill="none" stroke="#c8ffe9" stroke-width="3"/>` : '<ellipse cx="50" cy="114" rx="30" ry="4.5" fill="rgba(0,0,0,.35)"/>'}
    ${body}</svg>`;
};
const grey = (mood, c) => (mood === 'dead' || mood === 'ghost' ? '#9a958c' : c);

/* человек из сказа: рубаха с поясом, голова, причёска, шапка, борода */
function folk(spec) {
  const { skin = '#f6cfa8', shirt = '#c0392b', trim = '#f2c14e', hair = '', hat = '', beard = '', extra = '', glow = null } = spec;
  return (o = {}) => {
    const m = o.mood || 'happy';
    const sh = grey(m, shirt), sk = grey(m, skin);
    return wrap(m, `
      <path d="M18 116Q16 84 50 80Q84 84 82 116Z" fill="${sh}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M30 86q20 8 40 0" stroke="${trim}" stroke-width="3.4" fill="none"/>
      <path d="M22 104h56" stroke="${trim}" stroke-width="4"/>
      <path d="M40 104l-4 10M60 104l4 10" stroke="${trim}" stroke-width="2.4"/>
      <ellipse cx="50" cy="52" rx="24" ry="27" fill="${sk}" stroke="${INK}" stroke-width="2.8"/>
      ${hair}${beard}
      <circle cx="35" cy="60" r="4.5" fill="#ff8a7a" opacity=".4"/><circle cx="65" cy="60" r="4.5" fill="#ff8a7a" opacity=".4"/>
      ${eyes(m, 40, 60, 51, glow)}${beard ? '' : mouth(m)}
      ${hat}${m === 'dead' || m === 'ghost' ? '' : extra}`);
  };
}

export const CHARS = {
  danila: { name: 'Данила-мастер', color: '#c0392b', draw: folk({ shirt: '#c0392b',
    hair: `<path d="M26 50Q24 22 50 22Q76 22 74 50L70 40Q50 32 30 40Z" fill="#e8c26a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`,
    extra: `<path d="M80 78l14-20" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M92 60l5-6 3 3-5 6z" fill="#c9ced6" stroke="${INK}" stroke-width="1.6"/>` }) },
  katya: { name: 'Катя', color: '#2e86de', draw: folk({ shirt: '#2e86de', trim: '#ffd23f',
    hair: `<path d="M27 54Q24 24 50 23Q76 24 73 54Q70 34 50 33Q30 34 27 54Z" fill="#7a4a2a" stroke="${INK}" stroke-width="2.6"/><path d="M72 46q12 20 4 52" stroke="#7a4a2a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M73 60l6 3M74 72l7 2M76 84l6 2" stroke="${INK}" stroke-width="1.4"/>`,
    hat: `<path d="M26 34Q50 18 74 34L72 40Q50 28 28 40Z" fill="#e63946" stroke="${INK}" stroke-width="2.4"/>${[34, 42, 50, 58, 66].map((x) => `<circle cx="${x}" cy="${31 + Math.abs(50 - x) * 0.12}" r="2" fill="#ffd23f"/>`).join('')}` }) },
  ognevushka: { name: 'Огневушка', color: '#ff7b00', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const f1 = grey(m, '#ff7b00'), f2 = grey(m, '#ffd23f');
    return wrap(m, `
      <path d="M22 116Q24 86 50 82Q76 86 78 116Z" fill="${grey(m, '#e63946')}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M24 48Q14 26 28 10Q30 24 38 22Q36 6 52 -2Q50 14 60 16Q66 4 76 10Q70 22 78 30Q86 40 76 50Z" fill="${f1}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" class="fl"/>
      <path d="M34 42Q30 28 40 20Q42 30 48 28Q48 16 58 12Q56 24 64 28Q70 36 66 44Z" fill="${f2}"/>
      <ellipse cx="50" cy="56" rx="22" ry="24" fill="${grey(m, '#ffd9b0')}" stroke="${INK}" stroke-width="2.8"/>
      <circle cx="36" cy="64" r="4.5" fill="#ff5d5d" opacity=".45"/><circle cx="64" cy="64" r="4.5" fill="#ff5d5d" opacity=".45"/>
      ${eyes(m, 41, 59, 55)}${mouth(m, 67, 7)}
      ${m === 'dead' || m === 'ghost' ? '' : `<circle cx="14" cy="70" r="3" fill="#ffd23f"/><circle cx="88" cy="58" r="2.4" fill="#ff7b00"/><circle cx="84" cy="88" r="2" fill="#ffd23f"/>`}`);
  } },
  kopytce: { name: 'Серебряное копытце', color: '#c9d6df', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const c = grey(m, '#f1f3f5');
    return wrap(m, `
      <ellipse cx="50" cy="92" rx="30" ry="18" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M30 104v10M42 106v8M58 106v8M70 104v10" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <path d="M68 104v10" stroke="#c9d6df" stroke-width="4" stroke-linecap="round"/><circle cx="70" cy="114" r="3.5" fill="#dfe7ee" stroke="${INK}" stroke-width="1.4"/>
      <path d="M32 26q-6-16 4-22q-2 12 6 16M68 26q6-16-4-22q2 12-6 16" fill="#e9e2c8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="50" cy="52" rx="24" ry="26" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M26 44q-12-2-14 6 8 2 14 0M74 44q12-2 14 6-8 2-14 0" fill="${c}" stroke="${INK}" stroke-width="2.4"/>
      <ellipse cx="50" cy="66" rx="10" ry="7" fill="#ffd6e0" stroke="${INK}" stroke-width="2"/>
      ${eyes(m, 40, 60, 48)}${mouth(m, 70, 5)}
      ${m === 'dead' || m === 'ghost' ? '' : `<path d="M14 30l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="#7ff6ff" stroke="${INK}" stroke-width="1.2"/><path d="M84 18l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#ff8fd8" stroke="${INK}" stroke-width="1.2"/>`}`);
  } },
  poloz: { name: 'Великий Полоз', color: '#f2c14e', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const g = grey(m, '#f2c14e'), d = grey(m, '#c99a2e');
    return wrap(m, `
      <path d="M14 112Q4 92 24 86Q46 80 44 96Q42 110 64 108Q90 104 84 84" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M14 112Q4 92 24 86Q46 80 44 96Q42 110 64 108Q90 104 84 84" stroke="${g}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M14 112Q4 92 24 86Q46 80 44 96Q42 110 64 108Q90 104 84 84" stroke="${d}" stroke-width="3" fill="none" stroke-dasharray="3 6"/>
      <path d="M84 84Q86 70 70 66" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M84 84Q86 70 70 66" stroke="${g}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M50 22C72 22 80 38 78 54C76 70 64 78 50 78C36 78 24 70 22 54C20 38 28 22 50 22Z" fill="${g}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M36 34l6 4M64 34l-6 4M44 30l6 2 6-2" stroke="${d}" stroke-width="2" fill="none"/>
      <path d="M32 24l4-14 8 8 6-12 6 12 8-8 4 14z" fill="#ffe08a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      ${eyes(m, 40, 60, 50, m === 'dead' || m === 'ghost' ? null : '#1b5e20')}${mouth(m, 64, 8)}
      ${m === 'dead' || m === 'ghost' ? '' : `<path d="M50 70v8l-3 4M50 78l3 4" stroke="#d62839" stroke-width="2" fill="none" stroke-linecap="round"/>`}`);
  } },
  sinyushka: { name: 'Синюшка', color: '#4ea8de', draw: folk({ skin: '#a9d6f5', shirt: '#1e6091', trim: '#9ad1ff', glow: '#00e5ff',
    hat: `<path d="M22 56Q18 18 50 16Q82 18 78 56Q72 30 50 28Q28 30 22 56Z" fill="#1e6091" stroke="${INK}" stroke-width="2.6"/><path d="M50 16l-6 -8 6 2 6-2z" fill="#1e6091" stroke="${INK}" stroke-width="2"/>${[30, 40, 50, 60, 70].map((x) => `<circle cx="${x}" cy="${30 + Math.abs(50 - x) * 0.25}" r="1.8" fill="#9ad1ff"/>`).join('')}`,
    extra: `<path d="M8 40q6 -6 10 0M88 30q6-6 10 0" stroke="#9ad1ff" stroke-width="2" fill="none" opacity=".7"/>` }) },
  kokovanya: { name: 'Дед Кокованя', color: '#8d6e63', draw: folk({ shirt: '#8d6e63', trim: '#d7ccc8', skin: '#efc9a4',
    beard: `<path d="M28 56Q30 92 50 94Q70 92 72 56Q66 70 50 70Q34 70 28 56Z" fill="#f4f1ea" stroke="${INK}" stroke-width="2.6"/><path d="M42 62q8 4 16 0" stroke="${INK}" stroke-width="2.4" fill="none"/>`,
    hat: `<path d="M24 38Q24 14 50 14Q76 14 76 38Z" fill="#6d4c41" stroke="${INK}" stroke-width="2.6"/><rect x="20" y="34" width="60" height="10" rx="5" fill="#d7ccc8" stroke="${INK}" stroke-width="2.4"/>` }) },
  murenka: { name: 'Муренка', color: '#9e9e9e', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const c = grey(m, '#8f8f8f');
    return wrap(m, `
      <path d="M78 104Q98 96 92 74" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M78 104Q98 96 92 74" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="94" rx="28" ry="20" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M26 40L22 14 40 28zM74 40L78 14 60 28z" fill="${c}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M28 34l-2-12 8 8zM72 34l2-12-8 8z" fill="#ffb3c6"/>
      <ellipse cx="50" cy="52" rx="26" ry="24" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M40 30l4 8M50 28v8M60 30l-4 8" stroke="#5f5f5f" stroke-width="2.4"/>
      ${eyes(m, 40, 60, 50, m === 'dead' || m === 'ghost' ? null : '#2ee59d')}
      <path d="M47 58l3 3 3-3z" fill="#ff8fab" stroke="${INK}" stroke-width="1.4"/>${mouth(m, 64, 6)}
      <path d="M22 58h12M22 64l12-2M66 58h12M66 62l12 2" stroke="${INK}" stroke-width="1.4"/>`);
  } },
  stepan: { name: 'Степан', color: '#e2803a', draw: folk({ shirt: '#5d4037', trim: '#e2803a', skin: '#e9b98f',
    beard: `<path d="M30 60Q32 84 50 86Q68 84 70 60Q62 70 50 70Q38 70 30 60Z" fill="#3e2723" stroke="${INK}" stroke-width="2.4"/><path d="M42 64q8 4 16 0" stroke="#f6cfa8" stroke-width="2.4" fill="none"/>`,
    hat: `<path d="M22 40Q22 12 50 12Q78 12 78 40Z" fill="#e2803a" stroke="${INK}" stroke-width="2.6"/><rect x="18" y="36" width="64" height="8" rx="4" fill="#c4622a" stroke="${INK}" stroke-width="2.2"/><circle cx="50" cy="24" r="7" fill="#fff6c8" stroke="${INK}" stroke-width="2.2"/><path d="M50 17l-10-14M50 17l10-14" stroke="#fff6c8" stroke-width="2" opacity=".6"/>`,
    extra: `<path d="M84 112L92 60" stroke="#8a5a2b" stroke-width="4.5" stroke-linecap="round"/><path d="M78 62q14-10 26 4" stroke="#9aa5b1" stroke-width="5" fill="none" stroke-linecap="round"/>` }) },
  yashcherka: { name: 'Ящерка', color: '#18c88a', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const c = grey(m, '#18c88a'), d = grey(m, '#0b8a5e');
    return wrap(m, `
      <path d="M50 104Q76 112 94 92Q98 84 90 84Q80 100 56 96" fill="${c}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <ellipse cx="50" cy="88" rx="22" ry="18" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      <path d="M30 100l-10 10M70 100l10 10M30 80l-12-4M70 80l12-4" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M30 100l-10 10M70 100l10 10M30 80l-12-4M70 80l12-4" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M50 22C74 22 82 40 80 54C78 68 66 74 50 74C34 74 22 68 20 54C18 40 26 22 50 22Z" fill="${c}" stroke="${INK}" stroke-width="2.8"/>
      ${[38, 50, 62].map((x) => `<circle cx="${x}" cy="${36 + (x === 50 ? -4 : 0)}" r="3" fill="${d}"/>`).join('')}<path d="M36 82q14 6 28 0M38 90q12 5 24 0" stroke="${d}" stroke-width="2" fill="none"/>
      <path d="M36 24l3-12 6 6 5-10 5 10 6-6 3 12z" fill="#e2803a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="50" cy="16" r="2.4" fill="#7ff6ff"/>
      ${eyes(m, 38, 62, 48)}${mouth(m, 62, 10)}`);
  } },
  cvetok: { name: 'Каменный цветок', color: '#0b6e4f', draw: (o = {}) => {
    const m = o.mood || 'happy';
    const g = grey(m, '#18a777'), d = grey(m, '#0b6e4f');
    const petal = (a) => `<ellipse cx="50" cy="20" rx="13" ry="24" fill="${g}" stroke="${INK}" stroke-width="2.4" transform="rotate(${a} 50 50)"/><path d="M50 4v30" stroke="${d}" stroke-width="2" transform="rotate(${a} 50 50)" opacity=".6"/>`;
    return wrap(m, `
      <path d="M50 76V112" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M50 76V112" stroke="${d}" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 100q-22-2-26-18 18-2 26 14M50 96q22-2 26-18-18-2-26 14" fill="${g}" stroke="${INK}" stroke-width="2.2"/>
      ${[0, 60, 120, 180, 240, 300].map(petal).join('')}
      <circle cx="50" cy="50" r="22" fill="#e2803a" stroke="${INK}" stroke-width="2.8"/>
      <path d="M36 44q14-8 28 0M34 56q16 8 32 0" stroke="#c4622a" stroke-width="2" fill="none"/>
      ${eyes(m, 42, 58, 48)}${mouth(m, 58, 6)}`);
  } },
  rudoznatec: { name: 'Рудознатец', color: '#6c757d', draw: folk({ shirt: '#495057', trim: '#ced4da', skin: '#efc9a4',
    beard: `<path d="M32 62Q36 80 50 80Q64 80 68 62Q62 70 50 70Q38 70 32 62Z" fill="#9e9e9e" stroke="${INK}" stroke-width="2.2"/><path d="M42 64q8 3 16 0" stroke="${INK}" stroke-width="2.2" fill="none"/>`,
    hat: `<path d="M26 36Q28 18 50 18Q72 18 74 36Z" fill="#343a40" stroke="${INK}" stroke-width="2.4"/><path d="M20 36h60q-4 6-30 6t-30-6z" fill="#212529" stroke="${INK}" stroke-width="2.2"/>`,
    extra: `<path d="M10 116l8-34" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/><path d="M18 82l-6-10M18 82l6-10" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/><rect x="82" y="86" width="12" height="16" rx="3" fill="#ffd23f" stroke="${INK}" stroke-width="2"/><path d="M84 86q4-8 8 0" stroke="${INK}" stroke-width="2" fill="none"/><circle cx="88" cy="94" r="3" fill="#fff6c8"/>` }) },
};
