const { makeRng } = require('./rng');

test('deterministic for a seed', () => {
  const a = makeRng(42); const b = makeRng(42);
  const seqA = [a(), a(), a()]; const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
});
test('values in [0,1)', () => {
  const r = makeRng(7);
  for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
test('different seeds differ', () => {
  expect(makeRng(1)()).not.toEqual(makeRng(2)());
});
