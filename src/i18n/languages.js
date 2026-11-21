// The ONLY place that declares languages. Adding one = a locales/<code>/ folder + one line here.
// Static requires: Metro cannot load a folder dynamically.
const LANGUAGES = [
  { code: 'fr', name: 'Français', ui: require('./locales/fr/ui.json'), game: require('./locales/fr/game.json') },
  { code: 'en', name: 'English', ui: require('./locales/en/ui.json'), game: require('./locales/en/game.json') },
  { code: 'es', name: 'Español', ui: require('./locales/es/ui.json'), game: require('./locales/es/game.json') },
];
const REFERENCE_LANGUAGE = 'fr'; // complete language, base of the translated percentage
const FALLBACK_LANGUAGE = 'en'; // shown when a key is missing

/** @param {string} code @returns {typeof LANGUAGES[number] | null} */
const languageByCode = (code) => LANGUAGES.find((language) => language.code === code) || null;

module.exports = { LANGUAGES, REFERENCE_LANGUAGE, FALLBACK_LANGUAGE, languageByCode };
