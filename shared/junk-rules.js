/**
 * Shared Junk Detection Rules
 * Pure functions for local, deterministic classification of low-value and operational tabs.
 */

// Checks if a URL is scriptable by content scripts
export function isScriptableUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file:///')) &&
    !lower.startsWith('chrome://') &&
    !lower.startsWith('chrome-extension://') &&
    !lower.startsWith('edge://') &&
    !lower.startsWith('about:') &&
    !lower.startsWith('devtools://') &&
    !lower.startsWith('view-source:') &&
    !lower.startsWith('https://chromewebstore.google.com') &&
    !lower.startsWith('https://chrome.google.com/webstore')
  );
}

/**
 * Rule 1: New tab, extension, devtools, or internal settings pages.
 * @param {{ url?: string, title?: string }} tab
 * @returns {'new_tab' | 'extension' | 'internal' | null}
 */
export function detectNewTabOrExtension(tab) {
  const url = (tab?.url || '').toLowerCase();
  if (!url) return 'new_tab';

  if (url === 'about:blank' || url.startsWith('chrome://newtab') || url.startsWith('edge://newtab')) {
    return 'new_tab';
  }

  if (url.startsWith('chrome-extension://') || url.startsWith('edge-extension://') || url.startsWith('moz-extension://')) {
    return 'extension';
  }

  if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('devtools://') || url.startsWith('view-source:')) {
    return 'internal';
  }

  return null;
}

/**
 * Rule 2: Error pages (404, 500, connection lost).
 * @param {{ url?: string, title?: string }} tab
 * @returns {'error' | null}
 */
export function detectErrorPage(tab) {
  const title = (tab?.title || '').toLowerCase();
  if (!title) return null;

  const errorPatterns = [
    /\b404\b/i,
    /\b500\b/i,
    /not found/i,
    /page not found/i,
    /this site can't be reached/i,
    /problem loading page/i,
    /server error/i,
    /access denied/i
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(title)) {
      return 'error';
    }
  }

  return null;
}

/**
 * Rule 3: Auth, login, signup, password reset, or post-action thank-you pages.
 * @param {{ url?: string, title?: string }} tab
 * @returns {'auth_or_transactional' | null}
 */
export function detectAuthOrTransactional(tab) {
  const rawUrl = tab?.url || '';
  if (!rawUrl) return null;

  let pathname = '';
  try {
    const parsed = new URL(rawUrl);
    pathname = parsed.pathname.toLowerCase();
  } catch {
    pathname = rawUrl.toLowerCase();
  }

  const authPatterns = [
    /\/(login|signin|sign-in|log-in)(\/|$)/i,
    /\/oauth(\/|$)/i,
    /\/(reset-password|forgot-password|forgot)(\/|$)/i,
    /\/(verify|confirm|confirmation)(\/|$)/i,
    /\/(thank-you|thankyou|obrigado|success|checkout\/complete)(\/|$)/i
  ];

  for (const pattern of authPatterns) {
    if (pattern.test(pathname)) {
      return 'auth_or_transactional';
    }
  }

  return null;
}

/**
 * Master junk classifier running all pure rules sequentially.
 * @param {{ url?: string, title?: string }} tab
 * @returns {string | null}
 */
export function detectJunk(tab) {
  return (
    detectNewTabOrExtension(tab) ||
    detectErrorPage(tab) ||
    detectAuthOrTransactional(tab) ||
    null
  );
}
