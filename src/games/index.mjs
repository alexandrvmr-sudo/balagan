/* Реестр игр. Порядок — порядок в меню. */
import shutka from './shutka.mjs';

export const GAMES = [shutka].filter(Boolean);
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
