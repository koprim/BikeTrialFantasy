// Lists, per registry language, the translated percentage and the missing keys (file:key).
const { languagesProgress } = require('../src/i18n/progress');

languagesProgress().forEach(({ code, name, percent, missing }) => {
  console.log(`${code} (${name}): ${percent} %`);
  missing.forEach((key) => console.log(`  - ${key}`));
});
