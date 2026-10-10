/* Офисные кандидаты: голова на плечах, у каждого своя причёска и рабочая примета.
   Стикерный контур, глаза моргают. draw({ mood }) — happy | sad | wow | dead | ghost */

const INK = '#1d1b2f';

const HAIR = {
  short: 'M23 52Q20 22 50 21Q80 22 77 52Q72 34 50 34Q28 34 23 52Z',
  spiky: 'M23 50L22 30L30 34L32 18L40 28L46 14L52 27L60 15L63 29L72 20L72 34L78 32L77 50Q70 36 50 36Q30 36 23 50Z',
  side: 'M22 54Q18 22 52 20Q82 22 78 52Q76 40 66 34Q48 40 30 36Q24 42 22 54Z',
  bob: 'M21 70Q14 26 50 21Q86 26 79 70H71Q74 40 50 37Q26 40 29 70Z',
  long: 'M20 96Q10 26 50 21Q90 26 80 96H70Q76 42 50 37Q24 42 30 96Z',
  bun: 'M23 52Q20 24 50 23Q80 24 77 52Q72 36 50 36Q28 36 23 52Z',
  curly: 'M20 58Q14 46 20 38Q16 26 28 22Q32 12 44 16Q52 8 60 16Q72 12 74 24Q86 28 80 40Q86 50 80 58Q74 42 50 38Q26 42 20 58Z',
  messy: 'M22 52Q18 30 30 24Q34 14 46 18Q56 10 64 18Q78 18 78 34Q82 42 78 52Q72 38 60 36L56 42L50 35L42 41L38 35Q28 38 22 52Z',
};

function eyes(kind, mood, glasses) {
  if (mood === 'dead' || mood === 'ghost') return `<g stroke="${INK}" stroke-width="3.4" stroke-linecap="round"><path d="M35 50l8 8M43 50l-8 8M57 50l8 8M65 50l-8 8"/></g>`;
  const dy = mood === 'wow' ? -1.5 : 0;
  let e = `<g class="blink"><circle cx="39" cy="${54 + dy}" r="4.2" fill="${INK}"/><circle cx="61" cy="${54 + dy}" r="4.2" fill="${INK}"/><circle cx="40.5" cy="${52.5 + dy}" r="1.4" fill="#fff"/><circle cx="62.5" cy="${52.5 + dy}" r="1.4" fill="#fff"/></g>`;
  if (kind === 'sleepy') e = `<path d="M34 55q5 4 10 0M56 55q5 4 10 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (glasses === 'round') e += `<g fill="rgba(255,255,255,.25)" stroke="${INK}" stroke-width="2.6"><circle cx="39" cy="54" r="9"/><circle cx="61" cy="54" r="9"/></g><path d="M48 54h4" stroke="${INK}" stroke-width="2.6"/>`;
  if (glasses === 'square') e += `<g fill="rgba(255,255,255,.2)" stroke="${INK}" stroke-width="2.6"><rect x="29" y="47" width="19" height="14" rx="3"/><rect x="52" y="47" width="19" height="14" rx="3"/></g><path d="M48 53h4" stroke="${INK}" stroke-width="2.6"/>`;
  if (glasses === 'chain') e += `<g fill="rgba(255,255,255,.2)" stroke="${INK}" stroke-width="2.4"><path d="M29 50h19v8q-9 5-19 0z"/><path d="M52 50h19v8q-10 5-19 0z"/></g><path d="M48 52h4" stroke="${INK}" stroke-width="2.4"/><path d="M29 53q-8 20 0 34M71 53q8 20 0 34" stroke="#c9a227" stroke-width="1.6" fill="none" stroke-dasharray="2 2"/>`;
  return e;
}

function mouth(mood, kind) {
  if (mood === 'sad' || mood === 'dead' || mood === 'ghost') return `<path d="M42 74q8-6 16 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (mood === 'wow') return `<ellipse cx="50" cy="72" rx="5" ry="6.5" fill="${INK}"/><ellipse cx="50" cy="74.5" rx="3" ry="2.4" fill="#ff6b8b"/>`;
  if (kind === 'grin') return `<path d="M39 68q11 12 22 0z" fill="${INK}"/><path d="M42 69h16v3H42z" fill="#fff"/>`;
  if (kind === 'smirk') return `<path d="M41 71q10 4 19-4" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return `<path d="M40 68q10 10 20 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

function office(id, spec) {
  const { skin = '#ffd9b8', hair = 'short', hairColor = '#5a3b2a', shirt = '#3a86ff', tie = null, glasses = null, eye = 'dot', smile = 'smile', extra = '', top = '', beard = '' } = spec;
  return (o = {}) => {
    const mood = o.mood || 'happy';
    const ghost = mood === 'ghost';
    const sk = mood === 'dead' || ghost ? '#c9c4bd' : skin;
    return `<svg viewBox="-4 -10 108 132" xmlns="http://www.w3.org/2000/svg"${ghost ? ' opacity=".6"' : ''}>
      ${ghost ? `<ellipse cx="50" cy="-2" rx="20" ry="5" fill="none" stroke="#fff6c8" stroke-width="3"/>` : '<ellipse cx="50" cy="119" rx="34" ry="4.5" fill="rgba(0,0,0,.3)"/>'}
      ${hair === 'long' ? `<path d="${HAIR.long}" fill="${hairColor}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : ''}
      <path d="M12 120Q12 92 50 88Q88 92 88 120Z" fill="${shirt}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M40 89l10 12 10-12" fill="#fff" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      ${tie ? `<path d="M50 99l-5 6 5 15 5-15z" fill="${tie}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` : ''}
      <rect x="43" y="78" width="14" height="12" fill="${sk}" stroke="${INK}" stroke-width="2.6"/>
      <circle cx="23" cy="58" r="5.5" fill="${sk}" stroke="${INK}" stroke-width="2.6"/><circle cx="77" cy="58" r="5.5" fill="${sk}" stroke="${INK}" stroke-width="2.6"/>
      <ellipse cx="50" cy="55" rx="27" ry="30" fill="${sk}" stroke="${INK}" stroke-width="3"/>
      ${beard}
      ${hair !== 'bald' && hair !== 'long' && HAIR[hair] ? `<path d="${HAIR[hair]}" fill="${hairColor}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : ''}
      ${hair === 'long' ? `<path d="M23 52Q22 26 50 23Q78 26 77 52Q72 36 50 36Q28 36 23 52Z" fill="${hairColor}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : ''}
      ${hair === 'bun' ? `<circle cx="50" cy="17" r="9" fill="${hairColor}" stroke="${INK}" stroke-width="3"/>` : ''}
      ${hair === 'bald' ? `<path d="M24 56q0-10 4-14M76 56q0-10-4-14" stroke="${hairColor}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M38 32q8-4 16-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>` : ''}
      <circle cx="33" cy="66" r="5" fill="#ff8aa0" opacity=".35"/><circle cx="67" cy="66" r="5" fill="#ff8aa0" opacity=".35"/>
      ${eyes(eye, mood, glasses)}
      ${mouth(mood, smile)}
      ${top}
      ${mood === 'dead' || ghost ? '' : extra}
    </svg>`;
  };
}

export const CHARS = {
  stazher: { name: 'Стажёр', color: '#4cc9f0', draw: office('stazher', { hair: 'spiky', hairColor: '#8a5a2b', shirt: '#9ad1ff',
    extra: `<path d="M36 90l14 18 14-18" stroke="#ff2e63" stroke-width="2.4" fill="none"/><rect x="43" y="104" width="14" height="10" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M78 38q4 6 0 10-4-4 0-10z" fill="#7ec8ff" stroke="${INK}" stroke-width="1.6"/>` }) },
  buh: { name: 'Бухгалтер', color: '#a06cd5', draw: office('buh', { hair: 'bun', hairColor: '#a0412d', shirt: '#a06cd5', glasses: 'chain', smile: 'smirk',
    extra: `<rect x="70" y="96" width="18" height="22" rx="3" fill="#e9ecef" stroke="${INK}" stroke-width="2"/><rect x="73" y="99" width="12" height="5" fill="#b8f400" stroke="${INK}" stroke-width="1.2"/><path d="M74 108h2M79 108h2M74 113h2M79 113h2" stroke="${INK}" stroke-width="2"/>` }) },
  admin: { name: 'Сисадмин', color: '#2a9d8f', draw: office('admin', { hair: 'messy', hairColor: '#3b2b20', shirt: '#2a9d8f', eye: 'sleepy',
    beard: `<path d="M26 64Q30 92 50 92Q70 92 74 64Q68 78 50 78Q32 78 26 64Z" fill="#3b2b20" stroke="${INK}" stroke-width="2.6"/>`,
    extra: `<path d="M22 48Q22 20 50 20Q78 20 78 48" stroke="${INK}" stroke-width="4" fill="none"/><rect x="16" y="46" width="9" height="16" rx="4" fill="#333" stroke="${INK}" stroke-width="2"/><path d="M20 62q2 12 18 14" stroke="${INK}" stroke-width="2.6" fill="none"/><circle cx="40" cy="76" r="3" fill="#333"/>` }) },
  sales: { name: 'Продажник', color: '#e63946', draw: office('sales', { hair: 'side', hairColor: '#1d1b2f', shirt: '#f8f9fa', tie: '#e63946', smile: 'grin',
    extra: `<rect x="78" y="44" width="10" height="20" rx="3" fill="#1d1b2f" stroke="${INK}" stroke-width="2" transform="rotate(14 83 54)"/><path d="M30 32q10-6 22-4" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5"/>` }) },
  kurier: { name: 'Курьер', color: '#ffb703', draw: office('kurier', { hair: 'short', hairColor: '#5a3b2a', shirt: '#ffb703', skin: '#f5c79f',
    top: `<path d="M22 44Q22 18 50 18Q78 18 78 44Z" fill="#ffb703" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M74 42h18q2 6-6 6H74z" fill="#ffb703" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="30" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
    extra: `<rect x="-2" y="88" width="22" height="22" rx="2" fill="#c8945c" stroke="${INK}" stroke-width="2.4"/><path d="M-2 96h22M9 88v8" stroke="${INK}" stroke-width="2"/>` }) },
  ohrana: { name: 'Охранник', color: '#264653', draw: office('ohrana', { hair: 'short', hairColor: '#2b2b2b', shirt: '#264653', skin: '#e8b48a', smile: 'smirk',
    top: `<path d="M20 42Q22 16 50 16Q78 16 80 42Z" fill="#1d3557" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M18 42h64q-2 6-32 6t-32-6z" fill="#14213d" stroke="${INK}" stroke-width="2.6"/><path d="M50 22l5 4-5 6-5-6z" fill="#ffd23f" stroke="${INK}" stroke-width="1.6"/>`,
    extra: `<rect x="72" y="92" width="10" height="20" rx="2" fill="#333" stroke="${INK}" stroke-width="2"/><path d="M75 92v-8" stroke="${INK}" stroke-width="2.4"/><circle cx="77" cy="100" r="2" fill="#e63946"/>` }) },
  hr: { name: 'Кадровичка', color: '#ff70a6', draw: office('hr', { hair: 'curly', hairColor: '#f4c95d', shirt: '#ff70a6', smile: 'grin',
    extra: `${[34, 40, 46, 52, 58, 64].map((x, i) => `<circle cx="${x}" cy="${92 + Math.abs(2.5 - i) * -1.2 + 3}" r="2.8" fill="#fffaf0" stroke="${INK}" stroke-width="1.2"/>`).join('')}` }) },
  market: { name: 'Маркетолог', color: '#ff9f1c', draw: office('market', { hair: 'short', hairColor: '#6d4c41', shirt: '#2ec4b6', glasses: 'round',
    top: `<path d="M23 42Q22 14 50 14Q78 14 77 42Z" fill="#ff9f1c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="21" y="36" width="58" height="9" rx="4" fill="#ffbf69" stroke="${INK}" stroke-width="2.6"/><circle cx="50" cy="12" r="5" fill="#ffbf69" stroke="${INK}" stroke-width="2.4"/>`,
    extra: `<path d="M74 96h14l-2 22H76z" fill="#fff" stroke="${INK}" stroke-width="2.2"/><path d="M74 102h14" stroke="#8d6e63" stroke-width="5"/><path d="M80 90q2-4 0-8M84 90q2-4 0-8" stroke="#bbb" stroke-width="1.6" fill="none"/>` }) },
  sekretar: { name: 'Секретарь', color: '#9b5de5', draw: office('sekretar', { hair: 'long', hairColor: '#2b2118', shirt: '#f1f3f5', skin: '#ffe0c7',
    top: `<path d="M50 22l-10-7v14zM50 22l10-7v14z" fill="#e63946" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="50" cy="22" r="3" fill="#e63946" stroke="${INK}" stroke-width="2"/>`,
    extra: `<path d="M24 58q-2 14 14 18" stroke="${INK}" stroke-width="2.4" fill="none"/><circle cx="40" cy="76" r="2.6" fill="${INK}"/><path d="M34 100l16 10 16-10" stroke="#9b5de5" stroke-width="3" fill="none"/>` }) },
  director: { name: 'Директор', color: '#ffd23f', draw: office('director', { hair: 'bald', hairColor: '#7a7a7a', shirt: '#2b2d42', tie: '#ffd23f', skin: '#f5c79f', smile: 'smirk',
    beard: `<path d="M38 66c4-5 10-4 12 0 2-4 8-5 12 0-4 3-8 3-12 1-4 2-8 2-12-1z" fill="#6d6d6d" stroke="${INK}" stroke-width="1.6"/>`,
    extra: `<path d="M30 92l6 6M70 92l-6 6" stroke="#ffd23f" stroke-width="2"/><rect x="14" y="100" width="12" height="4" rx="2" fill="#ffd23f" stroke="${INK}" stroke-width="1.4"/>` }) },
  uborka: { name: 'Тётя Люба', color: '#4361ee', draw: office('uborka', { hair: 'bob', hairColor: '#8d6e63', shirt: '#4361ee', skin: '#ffd9b8', smile: 'smirk',
    top: `<path d="M20 50Q18 18 50 17Q82 18 80 50Q70 32 50 32Q30 32 20 50Z" fill="#4cc9f0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M76 46l12 10-4 4-10-8" fill="#4cc9f0" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>${[30, 42, 54, 66].map((x) => `<circle cx="${x}" cy="28" r="2.2" fill="#fff"/>`).join('')}`,
    extra: `<path d="M90 8V118" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/><path d="M82 112h16l4 8H78z" fill="#e9ecef" stroke="${INK}" stroke-width="2"/>` }) },
  dizayner: { name: 'Дизайнер', color: '#ef476f', draw: office('dizayner', { hair: 'short', hairColor: '#1d1b2f', shirt: '#1d1b2f', skin: '#ffe0c7', smile: 'smirk',
    top: `<ellipse cx="46" cy="24" rx="28" ry="10" fill="#ef476f" stroke="${INK}" stroke-width="3" transform="rotate(-10 46 24)"/><path d="M44 14l2-6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    beard: `<path d="M44 80q6 8 12 0" fill="#1d1b2f" stroke="${INK}" stroke-width="2"/>`,
    extra: `<path d="M74 44l12-14" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/><path d="M86 30l3-4" stroke="#ef476f" stroke-width="5" stroke-linecap="round"/><path d="M30 100c6-4 10 4 16 0s10 4 16 0" stroke="#ffd23f" stroke-width="2.4" fill="none"/>` }) },
};
