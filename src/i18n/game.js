const REGISTRY = require('./languages');

const text = (value) => (typeof value === 'string' && value !== '' ? value : undefined);

// chosen language → FALLBACK_LANGUAGE → REFERENCE_LANGUAGE, each once.
function chainFor(lang, registry) {
  const codes = [...new Set([lang, registry.FALLBACK_LANGUAGE, registry.REFERENCE_LANGUAGE])];
  return codes
    .map(registry.languageByCode)
    .filter(Boolean)
    .map((language) => language.game || {});
}

/** Game texts (cards, effects, seasons, rounds) in `lang`, with the fallback chain. */
function gameText(lang, registry = REGISTRY) {
  const chain = chainFor(lang, registry);
  const pick = (read) => chain.map(read).map(text).find(Boolean);
  return {
    cardName: (id) => pick((game) => game.cards?.[id]?.name) ?? id,
    effectText: (cardId, index, value) =>
      (pick((game) => game.cards?.[cardId]?.effects?.[index]) ?? '').split('{{value}}').join(value),
    seasonName: (id) => pick((game) => game.seasons?.[id]?.name) ?? id,
    eventName: (id) => pick((game) => game.events?.[id]?.name) ?? id,
  };
}

module.exports = { gameText };
