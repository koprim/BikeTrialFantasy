import { isEmailAddress } from './emailAddress';

test('accepts an ordinary address and a sub-domain', () => {
  expect(isEmailAddress('robin@example.com')).toBe(true);
  expect(isEmailAddress('robin.l+trial@mail.example.co.uk')).toBe(true);
});

test('rejects addresses without a dotted domain, with spaces or a second @', () => {
  ['', 'robin', 'robin@', 'robin@example', '@example.com', 'robin@example.', 'rob in@example.com', 'a@b@c.com'].forEach(
    (address) => expect(isEmailAddress(address)).toBe(false),
  );
});

test('rejects empty domain labels', () => {
  expect(isEmailAddress('robin@.example.com')).toBe(false);
  expect(isEmailAddress('robin@example..com')).toBe(false);
});

test('answers in linear time on a long hostile input', () => {
  const hostile = `a@${'a.'.repeat(50000)}`;
  const started = Date.now();
  isEmailAddress(`${hostile} `);
  expect(Date.now() - started).toBeLessThan(500);
});
