import { teamErrorText } from './teamErrors';
import { TEAM_ERROR_CODES } from '../engine/team';
import i18n from '../i18n';

test('a slot error names the translated slot', () => {
  expect(teamErrorText({ code: 'RIDER_ALREADY_IN_TEAM', slot: 'eliteWomen2' })).toBe(
    'Elite Femme 20" (2) : pilote déjà dans l\'équipe.',
  );
  expect(teamErrorText({ code: 'CARD_NOT_OWNED', slot: 'referee' })).toBe('Arbitre : carte non possédée.');
  expect(teamErrorText({ code: 'TOO_MANY_EQUIPMENT', slot: null })).toBe("Trop d'équipements.");
});

test('every engine code has a French text', () => {
  TEAM_ERROR_CODES.forEach((code) => expect(i18n.exists(`team.${code}`, { lng: 'fr', fallbackLng: false })).toBe(true));
});
