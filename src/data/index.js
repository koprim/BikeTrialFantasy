import riders from './seed/riders.json';
import seasons from './seed/seasons.json';
import demoPlayer from './seed/demoPlayer.json';
import { groupByCategory } from '../engine/team';

export const RIDERS = riders;
export const SEASONS = seasons;
export const EVENTS_BY_ID = Object.fromEntries(seasons.flatMap((s) => s.events.map((e) => [e.id, e])));
export const DEMO_PLAYER = demoPlayer;
export const RIDERS_BY_ID = Object.fromEntries(riders.map((r) => [r.id, r]));
export function ridersByCategory() { return groupByCategory(riders); }
