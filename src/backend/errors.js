const HTTP_STATUS_BY_CODE = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_OPENED: 409,
  STARTER_ALREADY_OPENED: 409,
  TEAM_LOCKED: 409,
  NOT_ALLOWED: 422,
  INVALID_TEAM: 422,
  BUSY: 503,
};

class GameError extends Error {
  constructor(code, status, details) {
    super(code);
    this.name = 'GameError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function gameError(code, details) {
  if (!(code in HTTP_STATUS_BY_CODE)) throw new Error(`Unknown game error ${code}`);
  return new GameError(code, HTTP_STATUS_BY_CODE[code], details);
}

module.exports = { GameError, gameError };
