/* Реестр игр. Порядок — порядок в меню. */
import shutka from './shutka.mjs';
import gora from './gora.mjs';
import sobes from './sobes.mjs';
import teplohod from './teplohod.mjs';
import sanatoriy from './sanatoriy.mjs';
import baraban from './baraban.mjs';

export const GAMES = [shutka, sanatoriy, sobes, teplohod, baraban, gora].filter(Boolean);
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
