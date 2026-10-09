/* Пациенты Палаты №6 — вязаные куклы: фактура петель, пуговицы-глаза, швы, рот на нитке.
   draw({ mood }) — happy | sad | wow | dead | ghost */

const THREAD = '#2a211c';
const BONE = '#efe6d2';

const BODY = {
  egg: 'M50 14C73 14 84 33 84 56C84 86 70 104 50 104C30 104 16 86 16 56C16 33 27 14 50 14Z',
  pear: 'M50 14C64 14 70 26 70 38C70 48 86 58 86 78C86 96 70 106 50 106C30 106 14 96 14 78C14 58 30 48 30 38C30 26 36 14 50 14Z',
  box: 'M36 16H64Q82 16 82 34V84Q82 104 64 104H36Q18 104 18 84V34Q18 16 36 16Z',
  tall: 'M50 8Q74 8 74 32V82Q74 106 50 106Q26 106 26 82V32Q26 8 50 8Z',
  wide: 'M50 24C78 24 92 44 92 66C92 92 74 104 50 104C26 104 8 92 8 66C8 44 22 24 50 24Z',
};

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}

/* пуговица с дырочками и ниткой крест-накрест */
const button = (x, y, r = 7.5, col = BONE) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${THREAD}" stroke-width="1.6"/>
  <circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="${shade(col, 0.82)}" stroke-width="1"/>
  <path d="M${x - 2.4} ${y - 2.4}l4.8 4.8M${x + 2.4} ${y - 2.4}l-4.8 4.8" stroke="${THREAD}" stroke-width="1.4" stroke-linecap="round"/></g>`;

const xEye = (x, y) => `<path d="M${x - 6} ${y - 6}l12 12M${x + 6} ${y - 6}l-12 12" stroke="${THREAD}" stroke-width="3.2" stroke-linecap="round"/>`;
const closedEye = (x, y) => `<path d="M${x - 7} ${y}q7 6 14 0" stroke="${THREAD}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M${x - 4} ${y + 3}l-1 3M${x} ${y + 4}v3M${x + 4} ${y + 3}l1 3" stroke="${THREAD}" stroke-width="1.6" stroke-linecap="round"/>`;

/* рот, пришитый ниткой: линия с поперечными стежками */
function stitchMouth(kind, y = 78) {
  if (kind === 'o') return `<ellipse cx="50" cy="${y}" rx="6" ry="7.5" fill="${THREAD}"/><ellipse cx="50" cy="${y + 2}" rx="3.5" ry="3" fill="#7a2c2c"/>`;
  const d = kind === 'sad' ? `M36 ${y + 3}Q50 ${y - 7} 64 ${y + 3}` : kind === 'flat' ? `M36 ${y}H64` : kind === 'wave' ? `M34 ${y}q4-4 8 0t8 0 8 0 8 0` : `M36 ${y - 2}Q50 ${y + 9} 64 ${y - 2}`;
  const ticks = [38, 43, 48, 53, 58, 62].map((x) => `M${x} ${y - 4}l1.5 7`).join('');
  return `<path d="${d}" stroke="${THREAD}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="${ticks}" stroke="${THREAD}" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`;
}

function knit(id, spec) {
  const { body = 'egg', color, eyes = 'buttons', mouth = 'smile', extra = '', tilt = 0, eyeY = 52 } = spec;
  return (o = {}) => {
    const mood = o.mood || 'happy';
    const dead = mood === 'dead' || mood === 'ghost';
    const base = dead ? '#9b958c' : color;
    const dark = shade(base, 0.62), light = shade(base, 1.18);
    const pid = `k${id}${dead ? 'd' : ''}`;
    const eyesSvg = dead ? xEye(38, eyeY) + xEye(62, eyeY)
      : eyes === 'closed' ? closedEye(38, eyeY) + closedEye(62, eyeY)
      : eyes === 'odd' ? button(37, eyeY, 9.5) + button(63, eyeY + 1, 6, '#3a3330')
      : eyes === 'dark' ? button(38, eyeY, 7.5, '#3a3330') + button(62, eyeY, 7.5, '#3a3330')
      : button(38, eyeY) + button(62, eyeY);
    const m = dead ? 'flat' : mood === 'sad' ? 'sad' : mood === 'wow' ? 'o' : mouth;
    return `<svg viewBox="-4 -14 108 134" xmlns="http://www.w3.org/2000/svg"${mood === 'ghost' ? ' opacity=".62"' : ''}>
      <defs>
        <pattern id="${pid}" width="7" height="6" patternUnits="userSpaceOnUse">
          <rect width="7" height="6" fill="${base}"/>
          <path d="M0 0l3.5 4 3.5-4" stroke="${dark}" stroke-width="1.1" fill="none" opacity=".55"/>
          <path d="M0 3l3.5 4 3.5-4" stroke="${light}" stroke-width=".8" fill="none" opacity=".5"/>
        </pattern>
        ${mood === 'ghost' ? `<filter id="${pid}g"><feGaussianBlur stdDeviation="3"/></filter>` : ''}
      </defs>
      ${mood === 'ghost' ? `<ellipse cx="50" cy="-4" rx="20" ry="5" fill="none" stroke="#fff6c8" stroke-width="3"/><path d="${BODY[body]}" fill="#dff8ff" filter="url(#${pid}g)" opacity=".7"/>` : `<ellipse cx="50" cy="112" rx="30" ry="5" fill="rgba(0,0,0,.35)"/>`}
      <g transform="rotate(${tilt} 50 60)">
        <ellipse cx="13" cy="66" rx="9" ry="13" fill="url(#${pid})" stroke="${dark}" stroke-width="1.6" transform="rotate(${spec.armsUp ? -60 : 20} 13 66)"/>
        <ellipse cx="87" cy="66" rx="9" ry="13" fill="url(#${pid})" stroke="${dark}" stroke-width="1.6" transform="rotate(${spec.armsUp ? 60 : -20} 87 66)"/>
        <ellipse cx="37" cy="106" rx="10" ry="8" fill="url(#${pid})" stroke="${dark}" stroke-width="1.6"/>
        <ellipse cx="63" cy="106" rx="10" ry="8" fill="url(#${pid})" stroke="${dark}" stroke-width="1.6"/>
        <path d="${BODY[body]}" fill="url(#${pid})" stroke="${dark}" stroke-width="2.2"/>
        <path d="${BODY[body]}" transform="translate(50 60) scale(.88) translate(-50 -60)" fill="none" stroke="${light}" stroke-width="1.4" stroke-dasharray="3 3" opacity=".75"/>
        <path d="M50 ${body === 'wide' ? 28 : 18}V100" stroke="${dark}" stroke-width="1.2" stroke-dasharray="2 3" opacity=".45"/>
        ${eyesSvg}${stitchMouth(m)}
        ${dead ? '' : extra}
      </g>
    </svg>`;
  };
}

export const CHARS = {
  bessonnica: { name: 'Бессонница', color: '#8a94b8', draw: knit('bessonnica', { body: 'egg', color: '#8a94b8', eyes: 'buttons', mouth: 'flat',
    extra: `<path d="M30 60q8 5 16 0M54 60q8 5 16 0" stroke="#4b3a66" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M44 14q2-10 8-12-1 6 4 5-3 6 2 9" stroke="${THREAD}" stroke-width="2" fill="none"/>` }) },
  ikota: { name: 'Икота', color: '#f2d16b', draw: knit('ikota', { body: 'pear', color: '#f2d16b', eyes: 'buttons', mouth: 'o',
    extra: `<circle cx="72" cy="66" r="4" fill="#fff" stroke="${THREAD}" stroke-width="1.2" opacity=".85"/><circle cx="80" cy="56" r="2.6" fill="#fff" stroke="${THREAD}" stroke-width="1" opacity=".8"/>` }) },
  migren: { name: 'Мигрень', color: '#a678d6', draw: knit('migren', { body: 'box', color: '#a678d6', eyes: 'odd', mouth: 'wave',
    extra: `<path d="M17 36Q50 26 83 36V44Q50 34 17 44Z" fill="#f4f1ea" stroke="${THREAD}" stroke-width="1.4"/><path d="M24 39h4M34 36h4M46 34h4M58 35h4M70 37h4" stroke="#c9c2b4" stroke-width="1.2"/><circle cx="66" cy="38" r="3" fill="#c0392b"/><path d="M40 6q4 4 0 8t0 8M58 4q4 4 0 8t0 8" stroke="#ffd23f" stroke-width="2" fill="none"/>` }) },
  allergia: { name: 'Аллергия', color: '#f08aa0', draw: knit('allergia', { body: 'egg', color: '#f08aa0', eyes: 'buttons', mouth: 'sad',
    extra: `<circle cx="50" cy="66" r="7.5" fill="#d7263d" stroke="${THREAD}" stroke-width="1.4"/><circle cx="48" cy="64" r="2" fill="#ff8a96"/><path d="M33 62q-1 6 1 9M67 62q1 6-1 9" stroke="#7ec8ff" stroke-width="2" fill="none" stroke-linecap="round"/>` }) },
  radikulit: { name: 'Радикулит', color: '#7cc08a', draw: knit('radikulit', { body: 'wide', color: '#7cc08a', eyes: 'buttons', mouth: 'wave', tilt: -12, eyeY: 58,
    extra: `<path d="M62 88h14v-6h6v14h-6v-6H62z" fill="#f4f1ea" stroke="${THREAD}" stroke-width="1.2"/><path d="M94 40V112" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/><path d="M94 40q-8-4-10 4" stroke="#8a5a2b" stroke-width="4" fill="none" stroke-linecap="round"/>` }) },
  skleroz: { name: 'Склероз', color: '#6c9ee0', draw: knit('skleroz', { body: 'tall', color: '#6c9ee0', eyes: 'odd', mouth: 'flat',
    extra: `<path d="M44 24q0-8 6-8t6 6q0 4-5 6v4" stroke="${THREAD}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="51" cy="37" r="1.6" fill="${THREAD}"/><path d="M84 62l-8-6v12zM84 62l8-6v12z" fill="#d7263d" stroke="${THREAD}" stroke-width="1.2"/>` }) },
  ipohondria: { name: 'Ипохондрия', color: '#f2a35e', draw: knit('ipohondria', { body: 'egg', color: '#f2a35e', eyes: 'buttons', mouth: 'flat',
    extra: `<path d="M30 42l14 4M70 42l-14 4" stroke="${THREAD}" stroke-width="2.4" stroke-linecap="round"/><rect x="56" y="74" width="28" height="5" rx="2.5" fill="#f4f1ea" stroke="${THREAD}" stroke-width="1.2" transform="rotate(-14 56 76)"/><circle cx="84" cy="70" r="4" fill="#d7263d" stroke="${THREAD}" stroke-width="1.2"/><path d="M24 70h8M28 66v8" stroke="#f4f1ea" stroke-width="3"/>` }) },
  lunatizm: { name: 'Лунатизм', color: '#4a5a9a', draw: knit('lunatizm', { body: 'egg', color: '#4a5a9a', eyes: 'closed', mouth: 'smile', armsUp: true,
    extra: `<path d="M24 26Q50 -2 76 26Q50 18 24 26Z" fill="#e94f64" stroke="${THREAD}" stroke-width="1.6"/><path d="M50 4Q70 0 82 14" stroke="#e94f64" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="84" cy="16" r="6" fill="#fff" stroke="${THREAD}" stroke-width="1.4"/><path d="M68 10l2-6M76 14l4-4" stroke="#ffd23f" stroke-width="1.6"/>` }) },
};
