import i18n from '../i18n';

const PLACE_KEYS = { equipment: 'compose.pickers.equipment', referee: 'compose.pickers.referee' };

/** Translated name of a team place: a slot id, 'equipment' or 'referee'. */
export function placeLabel(place) {
  return i18n.t(PLACE_KEYS[place] || `compose.slots.${place}`);
}

/** @param {{ code: string, slot: string|null }} error from validateCardTeam */
export function teamErrorText(error) {
  return i18n.t(`team.${error.code}`, { where: error.slot ? placeLabel(error.slot) : '' });
}
