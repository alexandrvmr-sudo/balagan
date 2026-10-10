/* Реестр игр. Порядок — порядок в меню. */
import shutka from './shutka.mjs';
import gora from './gora.mjs';
import sobes from './sobes.mjs';
import lainer from './lainer.mjs';
import sanatoriy from './sanatoriy.mjs';
import baraban from './baraban.mjs';

export const GAMES = [shutka, sanatoriy, sobes, lainer, baraban, gora].filter(Boolean);
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
