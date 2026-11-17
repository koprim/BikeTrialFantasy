// Errors raised when the request never reached the server (offline, DNS, CORS-less abort...).
const NETWORK_ERROR_NAMES = ['AuthRetryableFetchError', 'FunctionsFetchError'];
const NETWORK_MESSAGE = /failed to fetch|network request failed|load failed|networkerror/i;

// A PostgREST/Postgres error always carries a `code`; a fetch failure never does.
// Plain TypeErrors (e.g. a mapping bug) are not network errors unless their message says so.
function isNetworkError(error) {
  if (!error) return false;
  if (NETWORK_ERROR_NAMES.includes(error.name)) return true;
  return !error.code && NETWORK_MESSAGE.test(String(error.message));
}

module.exports = { isNetworkError };
