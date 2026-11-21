const fs = require('fs');
const path = require('path');

// A UTF-8 file re-read as Windows-1252 and saved again shows a lead character (U+00C2, U+00C3, or U+00E2 U+20AC)
// followed by a continuation character, in place of the accent. Written with escapes so this file never matches.
const DOUBLE_ENCODED = new RegExp('[\u00C2\u00C3][\u0080-\u00BF\u2018-\u203A]|\u00E2\u20AC');
const ROOT = process.cwd();

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|json)$/.test(entry.name) ? [full] : [];
  });
}

function corruptedLines(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (DOUBLE_ENCODED.test(line) ? [`${path.relative(ROOT, file)}:${i + 1}`] : []));
}

test('no source file contains double-encoded UTF-8 (mojibake)', () => {
  const files = [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'App.js')];
  expect(files.flatMap(corruptedLines)).toEqual([]);
});
