import riders from './seed/riders.json';
import seasons from './seed/seasons.json';
import demoPlayer from './seed/demoPlayer.json';
import cards from './seed/cards.json';
import balance from './seed/balance.json';
import { groupByCategory } from '../engine/team';

export const EDITION = '2026'; // card edition of the current season (must match scripts/gen-dev-seed.js)
export const RIDERS = riders;
export const SEASONS = seasons;
export const EVENTS_BY_ID = Object.fromEntries(seasons.flatMap((s) => s.events.map((e) => [e.id, e])));
export const DEMO_PLAYER = demoPlayer;
export const RIDERS_BY_ID = Object.fromEntries(riders.map((r) => [r.id, r]));
// Legends (active: false) never race: keep them out of the per-category lists used by bots and the briefing.
export const RIDERS_BY_CATEGORY = groupByCategory(riders.filter((r) => r.active !== false));
export function ridersByCategory() {
  return RIDERS_BY_CATEGORY;
}
export const CARDS = cards;
export const CARDS_BY_ID = Object.fromEntries(cards.map((c) => [c.id, c]));
export const BALANCE = balance;
