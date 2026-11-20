/**
 * A jest mock whose calls stay in flight until the test settles them, oldest first.
 * @returns {{ call: jest.Mock, settle: function(*): void }}
 */
export function deferredCall() {
  const pending = [];
  const call = jest.fn(
    (...args) =>
      new Promise((resolve) => {
        pending.push({ args, resolve });
      }),
  );
  return { call, settle: (value) => pending.shift().resolve(value) };
}
