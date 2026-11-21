const REGISTRY = require('./languages');

/** 'a.b.0' style paths of every leaf (string) under an object or array. */
function leafKeys(value, prefix = '') {
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
  }
  return prefix ? [prefix] : [];
}

const valueAt = (object, path) => path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), object);
const filled = (value) => typeof value === 'string' && value.trim() !== '';

/** Share of the reference keys (ui + game) present and non-empty in `language`. */
function translationProgress(language, reference) {
  const keys = ['ui', 'game'].flatMap((file) => leafKeys(reference[file]).map((key) => [file, key]));
  const missing = keys
    .filter(([file, key]) => !filled(valueAt(language[file], key)))
    .map(([file, key]) => `${file}:${key}`);
  const percent = keys.length ? Math.floor(((keys.length - missing.length) / keys.length) * 100) : 100;
  return { percent, missing };
}

/** One row per registry language: { code, name, percent, missing }. */
function languagesProgress(registry = REGISTRY) {
  const reference = registry.languageByCode(registry.REFERENCE_LANGUAGE);
  return registry.LANGUAGES.map((language) => ({
    code: language.code,
    name: language.name,
    ...translationProgress(language, reference),
  }));
}

module.exports = { leafKeys, valueAt, translationProgress, languagesProgress };
