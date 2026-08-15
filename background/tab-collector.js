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

export function extractUrlPlatformFallback(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // Search Engine query
    if (host.includes('kagi.com') || host.includes('google.') || host.includes('bing.com') ||
        host.includes('duckduckgo.com') || host.includes('search.brave.com') || host.includes('perplexity.ai')) {
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('p');
      if (q) {
        return {
          platform: 'Search',
          query: decodeURIComponent(q.replace(/\+/g, ' ')).slice(0, 100)
        };
      }
    }

    // Reddit subreddit
    if (host.includes('reddit.com')) {
      const m = path.match(/^\/r\/([^/]+)/);
      if (m) {
        return {
          platform: 'Reddit',
          subreddit: `r/${m[1]}`
        };
      }
    }

    // GitHub repo
    if (host.includes('github.com')) {
      const m = path.match(/^\/([^/]+)\/([^/]+)/);
      if (m && !['settings', 'notifications', 'explore', 'orgs'].includes(m[1])) {
        return {
          platform: 'GitHub',
          repo: `${m[1]}/${m[2]}`
        };
      }
    }

    // Google AI Studio
    if (host.includes('aistudio.google.com')) {
      return { platform: 'GoogleAI', service: 'Google AI Studio' };
    }

    // OpenAI / ChatGPT
    if (host.includes('chatgpt.com') || host.includes('openai.com')) {
      return { platform: 'OpenAI', service: host.includes('chatgpt.com') ? 'ChatGPT' : 'OpenAI' };
    }

    // Anthropic Claude
    if (host.includes('claude.ai') || host.includes('anthropic.com')) {
      return { platform: 'Anthropic', service: 'Claude' };
    }
  } catch {}
  return null;
}

import { isScriptableUrl, isBlockedByPrivacy } from '../shared/junk-rules.js';
export { isScriptableUrl, isBlockedByPrivacy };

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  throw reason instanceof Error ? reason : new Error('Analysis cancelled during tab collection.');
}

// Timeout wrapper so no single tab script can ever hang the collection.
function withTimeout(promise, ms, fallbackValue = null, signal = null) {
  let timer;
  let abortListener;
  const timeoutPromise = new Promise(resolve => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  const abortPromise = signal
    ? new Promise((resolve, reject) => {
      abortListener = () => reject(signal.reason instanceof Error ? signal.reason : new Error('Analysis cancelled during tab collection.'));
      if (signal.aborted) abortListener();
      else signal.addEventListener('abort', abortListener, { once: true });
    })
    : null;

  return Promise.race([
    promise.then(res => res).catch(err => ({ error: err.message })),
    timeoutPromise,
    abortPromise
  ].filter(Boolean)).finally(() => {
    if (timer) clearTimeout(timer);
    if (signal && abortListener) signal.removeEventListener('abort', abortListener);
  });
}

// Robust Worker Pool for concurrent tab processing without deadlocks.
async function mapConcurrentPool(items, concurrency, workerFn, signal = null) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      throwIfAborted(signal);
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await workerFn(items[index], index);
      } catch (err) {
        if (signal?.aborted) throw err;
        results[index] = { error: err.message };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  throwIfAborted(signal);
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
    privacyBlocklist = [],
    signal = null
  } = options;

  throwIfAborted(signal);
  let windows = [];
  if (scope === 'current_window') {
    const currentWin = await chrome.windows.getLastFocused({ populate: true });
    windows = currentWin ? [currentWin] : [];
  } else {
    windows = await chrome.windows.getAll({ populate: true });
  }

  // Flatten tabs with window context (excluding privacy-shielded tabs)
  const rawTabs = [];
  let shieldedTabs = 0;
  for (const win of windows) {
    throwIfAborted(signal);
    if (win.type !== 'normal') continue;
    for (const tab of win.tabs || []) {
      throwIfAborted(signal);
      if (skipPinned && tab.pinned) continue;
      if (isBlockedByPrivacy(tab.url, privacyBlocklist)) {
        shieldedTabs++;
        continue;
      }
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
    throwIfAborted(signal);
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
        extractedData = await withTimeout(executePromise, 1200, { error: 'Extraction timed out' }, signal);
      } catch (err) {
        extractedData = { error: err.message };
      }
    }

    if (!extractedData || !extractedData.platformContext) {
      const urlPlatform = extractUrlPlatformFallback(tab.url);
      if (urlPlatform) {
        extractedData = { ...(extractedData || {}), platformContext: urlPlatform };
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
  }, signal);

  return {
    windows: windows.map(w => ({ id: w.id, focused: w.focused, tabCount: w.tabs?.length || 0 })),
    tabs: tabRecords,
    duplicateActions,
    totalTabs,
    shieldedTabs
  };
}
