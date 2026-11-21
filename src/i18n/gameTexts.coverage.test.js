const { CARDS, SEASONS } = require('../data/index');
const { languageByCode, REFERENCE_LANGUAGE } = require('./languages');

const french = languageByCode(REFERENCE_LANGUAGE).game;
const filled = (value) => typeof value === 'string' && value.trim() !== '';

test('every card has a French name and one French text per effect', () => {
  CARDS.forEach((card) => {
    const texts = french.cards[card.id];
    expect(filled(texts?.name)).toBe(true);
    expect(texts.effects).toHaveLength(card.effects.length);
    texts.effects.forEach((effect) => expect(filled(effect)).toBe(true));
  });
});

test('every season and round has a French name', () => {
  SEASONS.forEach((season) => {
    expect(filled(french.seasons[season.id]?.name)).toBe(true);
    season.events.forEach((event) => expect(filled(french.events[event.id]?.name)).toBe(true));
  });
});

test('seed data carries no display text', () => {
  CARDS.forEach((card) => {
    expect(card).not.toHaveProperty('name');
    card.effects.forEach((effect) => expect(effect).not.toHaveProperty('description'));
  });
  SEASONS.forEach((season) => {
    expect(season).not.toHaveProperty('name');
    season.events.forEach((event) => expect(event).not.toHaveProperty('name'));
  });
});
