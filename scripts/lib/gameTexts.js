const fs = require('fs');
const path = require('path');

const FRENCH_GAME_TEXTS = path.join(__dirname, '..', '..', 'src', 'i18n', 'locales', 'fr', 'game.json');

// Seed effects use {value}; locale files use the i18next form {{value}}.
const toTemplate = (description) => description.split('{value}').join('{{value}}');

function splitSeason({ name, events, ...season }, texts) {
  texts.seasons[season.id] = { name };
  return {
    ...season,
    events: events.map(({ name: eventName, ...event }) => {
      texts.events[event.id] = { name: eventName };
      return event;
    }),
  };
}

function splitCard({ name, effects, ...card }, texts) {
  texts.cards[card.id] = { name, effects: effects.map((effect) => toTemplate(effect.description)) };
  return { ...card, effects: effects.map(({ description, ...effect }) => effect) };
}

/** Generated data in, { seasons, cards } mechanics + French texts out. `cards` is optional. */
function splitGameTexts({ seasons, cards }) {
  const texts = { cards: {}, seasons: {}, events: {} };
  return {
    seasons: seasons.map((season) => splitSeason(season, texts)),
    cards: cards ? cards.map((card) => splitCard(card, texts)) : undefined,
    texts,
  };
}

/** Seasons and events are replaced; card texts too, unless the generator produced none. */
function mergeGameTexts(current, texts) {
  const hasCards = Object.keys(texts.cards).length > 0;
  return { cards: hasCards ? texts.cards : current.cards || {}, seasons: texts.seasons, events: texts.events };
}

function writeFrenchGameTexts(texts, file = FRENCH_GAME_TEXTS) {
  const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, `${JSON.stringify(mergeGameTexts(current, texts), null, 2)}\n`);
}

module.exports = { splitGameTexts, mergeGameTexts, writeFrenchGameTexts, FRENCH_GAME_TEXTS };
