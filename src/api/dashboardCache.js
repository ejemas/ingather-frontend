// Remembers the workspace summary (counts, live event, notifications) for a short time,
// so moving between dashboard pages does not wait on the server every time.
// Any change saved anywhere in the app clears it (see axios.js), and so does signing out.
const TTL_MS = 30 * 1000;
const entries = new Map();

const currentToken = () => {
  try {
    return localStorage.getItem('token') || '';
  } catch (error) {
    return '';
  }
};

const keyFor = (parts) => `${currentToken()}|${parts.join('|')}`;

export const clearDashboardCache = () => entries.clear();

// load() is only called when there is no recent answer for this account and these dates.
// Two pages asking at the same moment share one request. Failed requests are never remembered.
export const rememberDashboard = (parts, load, { fresh = false } = {}) => {
  const key = keyFor(parts);
  const hit = entries.get(key);
  if (!fresh && hit && (hit.pending || Date.now() - hit.at < TTL_MS)) return hit.promise;

  const promise = load().then(
    (data) => {
      if (entries.get(key)?.promise === promise) entries.set(key, { promise, at: Date.now(), pending: false });
      return data;
    },
    (error) => {
      if (entries.get(key)?.promise === promise) entries.delete(key);
      throw error;
    }
  );
  entries.set(key, { promise, at: Date.now(), pending: true });
  return promise;
};
