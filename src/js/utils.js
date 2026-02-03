/**
 * @file Shared utilities for HTML escaping, URL validation, and slug validation.
 * @module utils
 */

/**
 * Escape HTML special characters to prevent XSS when inserting user-controlled
 * strings into the DOM via innerHTML.
 * @param {string} str - The raw string to escape.
 * @returns {string} The escaped string safe for HTML insertion.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Validate and sanitize a URL, only allowing https: and mailto: protocols.
 * Returns an empty string for any disallowed protocol (javascript:, data:, etc.).
 * @param {string} url - The URL to validate.
 * @returns {string} The sanitized URL or empty string if disallowed.
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Allow relative URLs (start with / or alphanumeric)
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return trimmed;
    }
  } catch {
    // Invalid URL
  }
  return '';
}

/**
 * Validate a slug parameter: only allow alphanumeric characters, hyphens, and
 * underscores. Rejects anything that could be used for path traversal.
 * @param {string} slug - The slug to validate.
 * @returns {string|null} The validated slug or null if invalid.
 */
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  // Allow alphanumeric, hyphens, underscores (no dots, slashes, etc.)
  if (/^[a-zA-Z0-9_-]+$/.test(slug)) return slug;
  return null;
}
