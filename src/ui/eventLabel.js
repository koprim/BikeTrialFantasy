import { eventStatus } from '../engine/calendar';
import { eventOutcome } from '../state/selectors';

// Status text for an event row, e.g. 'Ouverte · à composer' or 'Terminée · 412 pts'.
export function eventLabel(event, ctx) {
  const status = eventStatus(event, ctx.now);
  const hasTeam = !!ctx.picks[event.id];
  if (status === 'open') return hasTeam ? 'Ouverte · équipe prête' : 'Ouverte · à composer';
  if (status === 'live') return hasTeam ? 'En cours' : 'En cours · non jouée';
  if (!hasTeam) return 'Non jouée';
  return `Terminée · ${eventOutcome({ event, ...ctx }).player.total.toFixed(0)} pts`;
}
