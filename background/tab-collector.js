/**
 * Tab Collector Engine
 * Collects structural tab data across all windows and coordinates content script extraction safely.
 */

// Helper to normalize URLs for deduplication comparison
export function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'source'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    
    // Normalize trailing slashes
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.hostname}${pathname}${parsed.search ? parsed.search : ''}${parsed.hash ? parsed.hash : ''}`;
  } catch {
    return rawUrl;
  }
}

import { isScriptableUrl, isBlockedByPrivacy } from '../shared/junk-rules.js';
export { isScriptableUrl, isBlockedByPrivacy };

// Timeout wrapper so no single tab script can ever hang the collection
function withTimeout(promise, ms, fallbackValue = null) {
  let timer;
  const timeoutPromise = new Promise(resolve => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  return Promise.race([
    promise.then(res => {
      clearTimeout(timer);
      return res;
    }).catch(err => {
      clearTimeout(timer);
      return { error: err.message };
    }),
    timeoutPromise
  ]);
}

// Robust Worker Pool for concurrent tab processing without deadlocks
async function mapConcurrentPool(items, concurrency, workerFn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await workerFn(items[index], index);
      } catch (err) {
        results[index] = { error: err.message };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Gathers all tabs across windows with deep semantic extraction.
 * @param {Object} options Options for collection
 * @param {Function} onProgress Progress callback (completed, total)
 */
export async function collectAllTabs(options = {}, onProgress = null) {
  const {
    scope = 'all_windows', // 'all_windows' | 'current_window'
    extractReadability = true,
    skipPinned = false,
    privacyBlocklist = []
  } = options;

  let windows = [];
  if (scope === 'current_window') {
    const currentWin = await chrome.windows.getLastFocused({ populate: true });
    windows = currentWin ? [currentWin] : [];
  } else {
    windows = await chrome.windows.getAll({ populate: true });
  }

  // Flatten tabs with window context (excluding privacy-shielded tabs)
  const rawTabs = [];
  for (const win of windows) {
    if (win.type !== 'normal') continue;
    for (const tab of win.tabs || []) {
      if (skipPinned && tab.pinned) continue;
      if (isBlockedByPrivacy(tab.url, privacyBlocklist)) continue;
      rawTabs.push({
        ...tab,
        windowFocused: win.focused
      });
    }
  }

  const totalTabs = rawTabs.length;
  let completedCount = 0;

  // Deduplication map: normalizedUrl -> firstTabId
  const urlMap = new Map();
  const duplicateActions = [];

  // Extract content in concurrent worker pool of 8
  const tabRecords = await mapConcurrentPool(rawTabs, 8, async (tab) => {
    const normalized = normalizeUrl(tab.url);
    let isDuplicate = false;
    let duplicateOfTabId = null;

    if (urlMap.has(normalized)) {
      isDuplicate = true;
      duplicateOfTabId = urlMap.get(normalized);
      duplicateActions.push({
        action: 'close_duplicate',
        tabId: tab.id,
        targetTabId: duplicateOfTabId,
        url: tab.url,
        title: tab.title,
        reason: `Duplicate of Tab #${duplicateOfTabId}`
      });
    } else {
      urlMap.set(normalized, tab.id);
    }

    let extractedData = null;
    if (extractReadability && isScriptableUrl(tab.url) && !tab.discarded) {
      try {
        const executePromise = chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/extractor.js']
        }).then(res => res?.[0]?.result || null);

        // Enforce a strict 1.2s timeout per tab
        extractedData = await withTimeout(executePromise, 1200, { error: 'Extraction timed out' });
      } catch (err) {
        extractedData = { error: err.message };
      }
    }

    completedCount++;
    if (onProgress) {
      onProgress(completedCount, totalTabs);
    }

    return {
      tabId: tab.id,
      windowId: tab.windowId,
      index: tab.index,
      url: tab.url || '',
      title: tab.title || 'Untitled',
      favIconUrl: tab.favIconUrl || '',
      pinned: tab.pinned,
      active: tab.active,
      audible: tab.audible,
      discarded: tab.discarded,
      lastAccessed: tab.lastAccessed,
      groupId: tab.groupId !== -1 ? tab.groupId : null,
      isDuplicate,
      duplicateOfTabId,
      extractedData
    };
  });

  return {
    windows: windows.map(w => ({ id: w.id, focused: w.focused, tabCount: w.tabs?.length || 0 })),
    tabs: tabRecords,
    duplicateActions,
    totalTabs
  };
}
