const { GameError } = require('./errors');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const MALFORMED = Symbol('malformed');

function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readBody(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return isJsonObject(parsed) ? parsed : MALFORMED;
  } catch {
    return MALFORMED;
  }
}

function errorResponse(error, logError) {
  if (error instanceof GameError) return json(error.status, { error: error.code, details: error.details });
  logError(error);
  return json(500, { error: 'INTERNAL' });
}

function makeHttpHandler({ authenticate, action, logError = console.error }) {
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
    try {
      const userId = await authenticate(request);
      const body = await readBody(request);
      if (body === MALFORMED) return json(400, { error: 'INVALID_INPUT' });
      return json(200, await action(userId, body));
    } catch (error) {
      return errorResponse(error, logError);
    }
  };
}

module.exports = { makeHttpHandler };
