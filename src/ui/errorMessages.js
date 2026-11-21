import i18n from '../i18n';
import { teamErrorText } from './teamErrors';

// Every ApiErrorCode of the GameApi contract (src/data/api/demoApi.js) has a text under errors.<code>, except
// METHOD_NOT_ALLOWED, intentionally left to the generic message (the app always POSTs).
const isTeamError = (detail) => !!detail && typeof detail.code === 'string';

/**
 * @param {string} code an ApiErrorCode
 * @param {*} [details] team validation errors ({ code, slot }) are translated and appended
 * @returns {string}
 */
export function errorMessage(code, details) {
  const key = `errors.${code}`;
  const base = code && i18n.exists(key) ? i18n.t(key) : i18n.t('common.unexpectedError');
  const lines = Array.isArray(details) ? details.filter(isTeamError).map(teamErrorText) : [];
  return lines.length ? `${base} ${lines.join(' ')}` : base;
}
