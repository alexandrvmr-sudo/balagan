/* Хохотунчики — мультяшные существа в стикерном стиле: толстый контур, жёсткая тень, глазки моргают.
   Общий набор для игр без своих персонажей. draw({ mood }) → строка SVG, mood: happy | sad | wow | dead | ghost */

const INK = '#1b1030';

const BODY = {
  round: 'M50 18c22 0 36 16 36 40s-14 40-36 40-36-16-36-40 14-40 36-40z',
  tall: 'M50 10c16 0 26 10 26 26v40c0 14-10 22-26 22s-26-8-26-22V36c0-16 10-26 26-26z',
  pear: 'M50 16c13 0 20 10 22 22 2 8 14 18 14 34 0 16-16 26-36 26S14 88 14 72c0-16 12-26 14-34 2-12 9-22 22-22z',
  square: 'M28 22h44c8 0 14 6 14 14v46c0 8-6 14-14 14H28c-8 0-14-6-14-14V36c0-8 6-14 14-14z',
  bean: 'M44 14c18-2 34 10 38 28 4 20-4 38-20 48-14 8-34 6-44-8-10-14-6-30 2-42 6-10 12-24 24-26z',
  drop: 'M50 8c10 18 34 34 34 60 0 18-16 30-34 30S16 86 16 68C16 42 40 26 50 8z',
};

function eyes(type, mood) {
  if (mood === 'dead') return `<g stroke="${INK}" stroke-width="4" stroke-linecap="round"><path d="M33 46l10 10M43 46l-10 10M57 46l10 10M67 46l-10 10"/></g>`;
  const blink = 'class="blink"';
  if (type === 'one') return `<g ${blink}><circle cx="50" cy="50" r="13" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="52" cy="52" r="6" fill="${INK}"/><circle cx="54" cy="49" r="2" fill="#fff"/></g>`;
  if (type === 'sleepy') return `<g stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"><path d="M32 52q6 5 12 0M56 52q6 5 12 0"/></g>`;
  if (type === 'glasses') return `<g ${blink}><circle cx="38" cy="50" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="62" cy="50" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M48 50h4" stroke="${INK}" stroke-width="3"/><circle cx="39" cy="51" r="4" fill="${INK}"/><circle cx="63" cy="51" r="4" fill="${INK}"/></g>`;
  if (type === 'angry') return `<g ${blink}><circle cx="38" cy="52" r="6" fill="${INK}"/><circle cx="62" cy="52" r="6" fill="${INK}"/></g><path d="M30 40l14 6M70 40l-14 6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  const big = type === 'big';
  const r = big ? 10 : 7, pr = big ? 5 : 6;
  const dy = mood === 'wow' ? -2 : 0;
  return `<g ${blink}>${big ? `<circle cx="38" cy="50" r="${r}" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="62" cy="50" r="${r}" fill="#fff" stroke="${INK}" stroke-width="3"/>` : ''}
    <circle cx="${big ? 40 : 38}" cy="${51 + dy}" r="${pr}" fill="${INK}"/><circle cx="${big ? 64 : 62}" cy="${51 + dy}" r="${pr}" fill="${INK}"/>
    <circle cx="${big ? 42 : 40}" cy="${48 + dy}" r="2" fill="#fff"/><circle cx="${big ? 66 : 64}" cy="${48 + dy}" r="2" fill="#fff"/></g>`;
}

function mouth(type, mood) {
  if (mood === 'sad' || mood === 'dead') return `<path d="M40 76q10-8 20 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (mood === 'wow' || type === 'o') return `<ellipse cx="50" cy="74" rx="6" ry="8" fill="${INK}"/><ellipse cx="50" cy="77" rx="3.5" ry="3" fill="#ff6b8b"/>`;
  if (type === 'grin') return `<path d="M34 68q16 18 32 0z" fill="${INK}"/><path d="M38 69h24v4H38z" fill="#fff"/>`;
  if (type === 'tongue') return `<path d="M36 68q14 14 28 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 74q8 0 6 9-6 4-10-2z" fill="#ff6b8b" stroke="${INK}" stroke-width="2.5"/>`;
  if (type === 'smirk') return `<path d="M38 72q12 6 24-6" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (type === 'zig') return `<path d="M34 72l6-5 6 5 6-5 6 5 6-5" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>`;
  if (type === 'teeth') return `<path d="M36 68h28q-2 12-14 12t-14-12z" fill="${INK}"/><path d="M42 68v5h5v-5M53 68v5h5v-5" fill="#fff"/>`;
  return `<path d="M36 68q14 14 28 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

function extra(type, color) {
  switch (type) {
    case 'horns': return `<path d="M30 30l-6-18 16 12zM70 30l6-18-16 12z" fill="#fff4d6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'antenna': return `<path d="M50 18V4" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="4" r="5" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>`;
    case 'hat': return `<path d="M36 22l14-22 14 22z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="0" r="4" fill="#ff2e63" stroke="${INK}" stroke-width="2"/>`;
    case 'bow': return `<path d="M50 16l-16-8v16zM50 16l16-8v16z" fill="#ff2e63" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="16" r="4" fill="#ff2e63" stroke="${INK}" stroke-width="3"/>`;
    case 'tuft': return `<path d="M42 20q-2-14 8-16-2 8 6 4-2 10 6 6-2 8-10 8" fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'ears': return `<path d="M22 34q-12-18 2-22 8 8 10 18zM78 34q12-18-2-22-8 8-10 18z" fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'crown': return `<path d="M34 22l4-14 8 8 4-12 4 12 8-8 4 14z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    default: return '';
  }
}

export function blob({ body = 'round', color = '#ff5d73', eyes: e = 'dots', mouth: m = 'smile', extra: x = '' }) {
  return (o = {}) => {
    const mood = o.mood || 'happy';
    const fill = mood === 'dead' || mood === 'ghost' ? '#9a93a8' : color;
    const op = mood === 'ghost' ? ' opacity=".6"' : '';
    return `<svg viewBox="-6 -10 112 120" xmlns="http://www.w3.org/2000/svg"${op}>
      <ellipse cx="52" cy="104" rx="28" ry="5" fill="rgba(0,0,0,.25)"/>
      <path d="${BODY[body]}" transform="translate(5 5)" fill="${INK}"/>
      ${extra(x, fill)}
      <path d="${BODY[body]}" fill="${fill}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="40" cy="34" rx="9" ry="5" fill="rgba(255,255,255,.35)" transform="rotate(-20 40 34)"/>
      <ellipse cx="34" cy="98" rx="9" ry="5" fill="${fill}" stroke="${INK}" stroke-width="3"/><ellipse cx="66" cy="98" rx="9" ry="5" fill="${fill}" stroke="${INK}" stroke-width="3"/>
      ${mood !== 'dead' ? `<ellipse cx="28" cy="64" rx="5" ry="3" fill="rgba(255,90,120,.45)"/><ellipse cx="72" cy="64" rx="5" ry="3" fill="rgba(255,90,120,.45)"/>` : ''}
      ${eyes(e, mood)}${mouth(m, mood)}
    </svg>`;
  };
}

/* общий набор на 12 игроков */
export const BLOBS = {
  pyshka:  { name: 'Пышка',     color: '#ff5d73', draw: blob({ body: 'round', color: '#ff5d73', eyes: 'big', mouth: 'smile', extra: 'bow' }) },
  zhuzha:  { name: 'Жужа',      color: '#ffd23f', draw: blob({ body: 'drop', color: '#ffd23f', eyes: 'dots', mouth: 'grin', extra: 'antenna' }) },
  bubu:    { name: 'Бубу',      color: '#4dd4ac', draw: blob({ body: 'square', color: '#4dd4ac', eyes: 'one', mouth: 'teeth', extra: 'horns' }) },
  sonya:   { name: 'Соня',      color: '#9db4ff', draw: blob({ body: 'bean', color: '#9db4ff', eyes: 'sleepy', mouth: 'o', extra: 'hat' }) },
  vreda:   { name: 'Вредина',   color: '#c77dff', draw: blob({ body: 'pear', color: '#c77dff', eyes: 'angry', mouth: 'smirk', extra: 'tuft' }) },
  umnik:   { name: 'Умник',     color: '#56cfe1', draw: blob({ body: 'tall', color: '#56cfe1', eyes: 'glasses', mouth: 'smile', extra: '' }) },
  kotleta: { name: 'Котлета',   color: '#f9844a', draw: blob({ body: 'round', color: '#f9844a', eyes: 'dots', mouth: 'tongue', extra: 'ears' }) },
  shishka: { name: 'Шишка',     color: '#9bf6a9', draw: blob({ body: 'drop', color: '#9bf6a9', eyes: 'big', mouth: 'zig', extra: 'tuft' }) },
  korol:   { name: 'Король',    color: '#ffb703', draw: blob({ body: 'square', color: '#ffb703', eyes: 'dots', mouth: 'smirk', extra: 'crown' }) },
  plaksa:  { name: 'Плакса',    color: '#ff8fab', draw: blob({ body: 'bean', color: '#ff8fab', eyes: 'big', mouth: 'o', extra: 'ears' }) },
  gromila: { name: 'Громила',   color: '#6c8cff', draw: blob({ body: 'square', color: '#6c8cff', eyes: 'angry', mouth: 'teeth', extra: 'horns' }) },
  chudik:  { name: 'Чудик',     color: '#e0aaff', draw: blob({ body: 'tall', color: '#e0aaff', eyes: 'one', mouth: 'grin', extra: 'antenna' }) },
};
