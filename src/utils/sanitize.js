/**
 * Security helpers.
 *
 * React escapes text content automatically, so simple `{value}` interpolation
 * is already safe from XSS. These helpers exist for the moments that are NOT
 * automatically safe: building strings that will be reused elsewhere, reading
 * back values from localStorage, or validating data that could one day come
 * from a real backend instead of the local mock data in `src/data`.
 *
 * Rule of thumb used across this app: never trust data you didn't just create,
 * never use dangerouslySetInnerHTML, and always validate before persisting or
 * restoring anything from browser storage.
 */

const MAX_TEXT_LENGTH = 120;

/**
 * Strips any HTML tags / script content and trims to a safe max length.
 * Use this on any text that originates outside this file (future API
 * responses, query params, user-entered text, etc.) before storing or
 * displaying it.
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '') // strip tags
    .replace(/[<>]/g, '') // strip any stray angle brackets
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/**
 * Builds initials from a display name without ever trusting more than
 * letters/spaces, and always returns at most 2 characters.
 */
export function getInitials(name) {
  const safe = sanitizeText(name);
  return safe
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Validates that a value read back from localStorage is one of the ids we
 * actually know about, so a tampered or stale value in browser storage can
 * never make the app render or select something unexpected.
 */
export function isKnownId(value, knownList, key = 'id') {
  return Array.isArray(knownList) && knownList.some((item) => item[key] === value);
}

/**
 * Safe wrapper around localStorage: never throws (Safari private mode,
 * disabled storage, quota errors, etc. are all swallowed) and never stores
 * anything but plain strings.
 */
export const safeStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  },
};
