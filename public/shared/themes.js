/* Темы игр: ведущий, голос, музыка, эмблема. Общие для экрана и телефона. */

const svg = (body) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const THEMES = {
  menu: {
    music: 'menu',
    host: 'Балаган',
    voice: { gender: 'm', rate: 1.03, pitch: 1 },
  },

  shutka: {
    music: 'shutka',
    host: 'Ведущая Жанна',
    voice: { gender: 'f', pref: ['Milena', 'Google русский'], rate: 1.06, pitch: 1.1 },
    emblem: svg(`
      <path d="M14 22h62a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H40l-16 14v-14h-10A10 10 0 0 1 4 62V32a10 10 0 0 1 10-10z" fill="#ff2e63"/>
      <path d="M48 46h58a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10h-8v14L84 94H48a10 10 0 0 1-10-10V56a10 10 0 0 1 10-10z" fill="#ffd23f"/>
      <text x="45" y="56" font-family="Unbounded,sans-serif" font-weight="900" font-size="22" fill="#fff" text-anchor="middle">ХА</text>
      <text x="78" y="80" font-family="Unbounded,sans-serif" font-weight="900" font-size="22" fill="#2a1600" text-anchor="middle">ХА</text>`),
  },

  sanatoriy: {
    music: 'sanatoriy',
    ambience: 'hospital',
    reverb: 0.35,
    host: 'Главврач',
    voice: { gender: 'm', pref: ['Yuri'], rate: 0.86, pitch: 0.6 },
    emblem: svg(`
      <rect x="8" y="8" width="104" height="104" rx="14" fill="#cfe8e2"/>
      <path d="M8 34h104M8 60h104M8 86h104M34 8v104M60 8v104M86 8v104" stroke="#9cc5bb" stroke-width="2"/>
      <path d="M48 22h24v26h26v24H72v26H48V72H22V48h26z" fill="#d7263d"/>
      <path d="M60 98c0 0-5 6-5 10a5 5 0 0 0 10 0c0-4-5-10-5-10z" fill="#d7263d"/>`),
  },

  sobes: {
    music: 'sobes',
    host: 'Анжела, HR-нейросеть',
    voice: { gender: 'f', pref: ['Milena', 'Google русский'], rate: 1.0, pitch: 1.3 },
    emblem: svg(`
      <rect x="14" y="38" width="92" height="64" rx="10" fill="#3a86ff"/>
      <path d="M44 38v-10a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v10" stroke="#3a86ff" stroke-width="8" fill="none"/>
      <rect x="14" y="58" width="92" height="8" fill="#2a6ad6"/>
      <circle cx="92" cy="34" r="20" fill="#b8f400"/>
      <path d="M83 34l6 6 12-12" stroke="#16210a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },

  lainer: {
    music: 'lainer',
    ambience: 'cabin',
    reverb: 0.1,
    host: 'Командир корабля',
    voice: { gender: 'm', pref: ['Yuri'], rate: 0.97, pitch: 0.85 },
    emblem: svg(`
      <circle cx="60" cy="60" r="54" fill="#1f6fd1"/>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#fff" stroke-width="4" opacity=".35"/>
      <path d="M18 78c8-6 18-6 26 0s18 6 26 0 18-6 26 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M22 58l66-26c8-3 14 2 10 8l-12 10-14 30-10 4 2-24-22 9-6 10-8 2 3-14z" fill="#fff"/>
      <path d="M88 40l-4 8" stroke="#ff7a1a" stroke-width="5" stroke-linecap="round"/>`),
  },

  baraban: {
    music: 'baraban',
    host: 'Великий Барабан',
    voice: { gender: 'm', pref: ['Yuri'], rate: 1.04, pitch: 0.8 },
    emblem: svg(`
      <circle cx="60" cy="62" r="50" fill="#6b0f1a"/>
      ${Array.from({ length: 8 }, (_, i) => {
        const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
        const x1 = 60 + 46 * Math.cos(a1), y1 = 62 + 46 * Math.sin(a1), x2 = 60 + 46 * Math.cos(a2), y2 = 62 + 46 * Math.sin(a2);
        const c = ['#ffd23f', '#ff2e63', '#2ec4b6', '#5a7dff'][i % 4];
        return `<path d="M60 62L${x1.toFixed(1)} ${y1.toFixed(1)}A46 46 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}z" fill="${c}"/>`;
      }).join('')}
      <circle cx="60" cy="62" r="12" fill="#ffd23f" stroke="#6b0f1a" stroke-width="4"/>
      <path d="M60 2l10 18H50z" fill="#fff"/>`),
  },

  gora: {
    music: 'gora',
    ambience: 'cave',
    reverb: 0.4,
    host: 'Хозяйка Медной горы',
    voice: { gender: 'f', pref: ['Milena'], rate: 0.88, pitch: 0.8 },
    emblem: svg(`
      <path d="M60 10l38 22v44L60 108 22 76V32z" fill="#0b6e4f"/>
      <path d="M60 10l38 22-38 20-38-20z" fill="#18a777"/>
      <path d="M60 52v56L22 76V32z" fill="#08573e"/>
      <path d="M34 40c8 4 18 4 26 0M30 60c10 6 22 6 30 0M66 30c8 4 16 4 22 0M70 64c6 4 14 4 20 0" stroke="#2ee59d" stroke-width="3" fill="none" opacity=".7"/>
      <path d="M86 92l26-26" stroke="#c46a2b" stroke-width="7" stroke-linecap="round"/>
      <path d="M100 64c8-2 14 2 16 8-6-2-12-2-18 2z" fill="#c9c9c9"/>`),
  },
};

export const theme = (id) => THEMES[id] || THEMES.menu;

/* настроение музыки по фазе, если игра не сказала иначе */
export const DEFAULT_MOOD = {
  menu: 'lobby', lobby: 'lobby', intro: 'calm', cooking: 'calm',
  writing: 'think', voting: 'tense', reveal: 'reveal', scores: 'calm', winner: 'win',
};
