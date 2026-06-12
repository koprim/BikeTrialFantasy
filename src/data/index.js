import riders from './seed/riders.json';
import season from './seed/season.json';
import { groupByCategory } from '../engine/team';

export const RIDERS = riders;
export const SEASON = season;
export const RIDERS_BY_ID = Object.fromEntries(riders.map((r) => [r.id, r]));
export function ridersByCategory() { return groupByCategory(riders); }
