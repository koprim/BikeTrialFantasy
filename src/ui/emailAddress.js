// Domain labels cannot contain a dot, so each one ends at a known character: no backtracking (linear time).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** @param {string} address @returns {boolean} */
export function isEmailAddress(address) {
  return EMAIL_PATTERN.test(address);
}
