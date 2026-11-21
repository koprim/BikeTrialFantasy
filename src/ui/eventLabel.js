import i18n from '../i18n';
import { eventStatus } from '../engine/calendar';
import { eventOutcome } from '../state/selectors';

// Status text for an event row, e.g. 'Ouverte · à composer' or 'Terminée · 412 pts'.
export function eventLabel(event, ctx) {
  const status = eventStatus(event, ctx.now);
  const hasTeam = !!ctx.picks[event.id];
  if (status === 'open') return i18n.t(hasTeam ? 'eventStatus.openReady' : 'eventStatus.openToCompose');
  if (status === 'live') return i18n.t(hasTeam ? 'eventStatus.live' : 'eventStatus.liveNotPlayed');
  if (!hasTeam) return i18n.t('eventStatus.notPlayed');
  return i18n.t('eventStatus.finished', { points: eventOutcome({ event, ...ctx }).player.total.toFixed(0) });
}
