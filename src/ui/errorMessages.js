// French message for every ApiErrorCode of the GameApi contract (src/data/api/demoApi.js).
const MESSAGES = {
  ALREADY_OPENED: 'Pack du jour déjà ouvert. Reviens demain !',
  STARTER_ALREADY_OPENED: 'Pack de départ déjà ouvert.',
  NOT_ALLOWED: 'Action impossible.',
  NOT_AVAILABLE: 'Indisponible dans ce mode.',
  STORAGE_FAILED: 'Sauvegarde locale impossible.',
  INVALID_INPUT: 'Demande invalide.',
  INVALID_TEAM: 'Équipe invalide.',
  TEAM_LOCKED: 'La manche a commencé : équipe verrouillée.',
  NOT_FOUND: 'Introuvable.',
  FORBIDDEN: 'Action non autorisée.',
  BUSY: 'Serveur occupé, réessaie dans un instant.',
  UNAUTHENTICATED: "Session expirée, relance l'application.",
  INTERNAL: 'Erreur du serveur, réessaie plus tard.',
  NETWORK: 'Connexion impossible. Vérifie ta connexion.',
  ACCOUNT_SAVE_FAILED: 'Impossible de sauvegarder le compte.',
  SIGN_IN_FAILED: 'Aucun compte sauvegardé avec cette adresse.',
};

const FALLBACK_MESSAGE = 'Une erreur est survenue.';

/**
 * @param {string} code an ApiErrorCode
 * @param {*} [details] string details (e.g. team validation errors) are appended
 * @returns {string}
 */
export function errorMessage(code, details) {
  const base = MESSAGES[code] || FALLBACK_MESSAGE;
  return Array.isArray(details) && details.length ? `${base} ${details.join(' ')}` : base;
}
