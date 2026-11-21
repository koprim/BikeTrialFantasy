const { RARITIES } = require('./rarity');
const { TRIGGERS, REWARDS, RIDER_TRIGGERS } = require('./effects');

const CARD_TYPES = ['PILOT', 'TECHNIQUE', 'EQUIPMENT', 'REFEREE'];

// Returns a list of human-readable errors; [] means the catalog is usable.
function validateCatalog(cards, ridersById) {
  const errors = [];
  const seen = new Set();
  cards.forEach((c) => {
    const at = c.id || '(sans id)';
    if (!c.id || seen.has(c.id)) errors.push(`${at} : id manquant ou en double`);
    seen.add(c.id);
    if (!CARD_TYPES.includes(c.type)) errors.push(`${at} : type inconnu ${c.type}`);
    // Mechanics only: display texts are checked by src/i18n/gameTexts.coverage.test.js.
    const ranks = (c.rarities || []).map((r) => RARITIES.indexOf(r));
    if (!ranks.length || ranks.some((r, k) => r < 0 || (k > 0 && r <= ranks[k - 1]))) {
      errors.push(`${at} : raretés invalides (non vides, dans l'ordre C, R, E, L)`);
    }
    if (c.type === 'PILOT' && !ridersById[c.subject]) errors.push(`${at} : pilote inconnu ${c.subject}`);
    const teamCard = c.type === 'EQUIPMENT' || c.type === 'REFEREE';
    (c.effects || []).forEach((e, k) => {
      const where = `${at} effet ${k + 1}`;
      if (!e.trigger || !TRIGGERS.includes(e.trigger.type)) errors.push(`${where} : déclencheur inconnu`);
      if (!e.reward || !REWARDS.includes(e.reward.type)) errors.push(`${where} : récompense inconnue`);
      if (teamCard && e.trigger && RIDER_TRIGGERS.includes(e.trigger.type))
        errors.push(`${where} : déclencheur pilote sur une carte d'équipe`);
      if (teamCard && e.reward && e.reward.type === 'RIDER_MULTIPLIER')
        errors.push(`${where} : multiplicateur pilote sur une carte d'équipe`);
    });
  });
  return errors;
}

module.exports = { CARD_TYPES, validateCatalog };
