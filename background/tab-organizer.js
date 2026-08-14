/**
 * Tab Organizer & Undo Engine
 * Executes Chrome Tab Groups operations, manages window consolidation, and maintains undo snapshots.
 */

import { CHROME_TAB_COLORS } from '../shared/constants.js';

// High-contrast alternating color sequence
const CONTRAST_PALETTE = [
  'blue',
  'orange',
  'green',
  'pink',
  'cyan',
  'yellow',
  'purple',
  'red',
  'grey'
];

/**
 * Strips all emojis, TLDs, and maps synonyms to canonical <= 12 char titles.
 */
export function cleanAndShortenTitle(rawTitle) {
  if (!rawTitle) return 'Other';

  // 1. Remove emojis, symbols, and surrogate pairs
  let title = rawTitle
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\.(com|org|net|io|dev|app|ai|wiki|edu|gov|co|uk|de|gg)/gi, '') // strip domain TLDs
    .replace(/[^\w\s\-/]/g, '') // remove special punctuation
    .trim();

  const lower = title.toLowerCase();

  // 2. Canonical Semantic Normalization (unifies synonyms & domains)
  if (lower.includes('wikipedia') || lower.includes('wiki') || lower.includes('fandom') || lower.includes('gamepedia')) return 'Wiki';
  if (lower.includes('reddit')) return 'Reddit';
  if (lower.includes('youtube') || lower.includes('twitch') || lower.includes('video') || lower.includes('stream') || lower.includes('watch') || lower.includes('netflix')) return 'Video';
  if (lower.includes('github') || lower.includes('gitlab') || lower.includes('code') || lower.includes('coding') || lower.includes('dev') || lower.includes('repo') || lower.includes('program')) return 'Code';
  if (lower.includes('stackoverflow') || lower.includes('stackexchange') || lower.includes('docs') || lower.includes('documentation') || lower.includes('reference') || lower.includes('manual')) return 'Docs';
  if (lower.includes('amazon') || lower.includes('ebay') || lower.includes('shop') || lower.includes('store') || lower.includes('product') || lower.includes('buy') || lower.includes('cart')) return 'Shop';
  if (lower.includes('songsterr') || lower.includes('ableton') || lower.includes('music') || lower.includes('piano') || lower.includes('guitar') || lower.includes('theory') || lower.includes('audio') || lower.includes('spotify') || lower.includes('sound') || lower.includes('chords')) return 'Music';
  if (lower.includes('game') || lower.includes('gaming') || lower.includes('steam') || lower.includes('poe') || lower.includes('quest') || lower.includes('rpg') || lower.includes('ign')) return 'Gaming';
  if (lower.includes('news') || lower.includes('article') || lower.includes('journal') || lower.includes('post') || lower.includes('blog')) return 'News';
  if (lower.includes('mail') || lower.includes('gmail') || lower.includes('email') || lower.includes('inbox') || lower.includes('outlook')) return 'Mail';
  if (lower.includes('twitter') || lower.includes('facebook') || lower.includes('social') || lower.includes('instagram') || lower.includes('threads')) return 'Social';
  if (lower.includes('search') || lower.includes('kagi') || lower.includes('google') || lower.includes('bing') || lower.includes('duckduckgo')) return 'Search';
  if (lower.includes('travel') || lower.includes('hotel') || lower.includes('flight') || lower.includes('trip') || lower.includes('booking')) return 'Travel';

  // 3. Fallback: Limit strictly to 1-2 words and at most 12 characters
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    title = words.slice(0, 2).join(' ');
  }
  if (title.length > 12) {
    title = title.slice(0, 12).trim();
  }

  if (!title || lower.includes('other') || lower.includes('misc') || lower.includes('uncategorized')) return 'Other';
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Merges groups with identical or synonymous normalized titles.
 */
export function mergeDuplicateGroups(groups) {
  if (!groups || groups.length === 0) return [];

  const titleMap = new Map(); // canonicalTitle -> { title, tabIds: Set, rationales: [] }

  for (const group of groups) {
    const cleanTitle = cleanAndShortenTitle(group.title);
    const key = cleanTitle.toLowerCase();

    if (!titleMap.has(key)) {
      titleMap.set(key, {
        title: cleanTitle,
        tabIds: new Set(group.tabIds || []),
        rationales: [group.rationale || '']
      });
    } else {
      const existing = titleMap.get(key);
      (group.tabIds || []).forEach(id => existing.tabIds.add(id));
      if (group.rationale) existing.rationales.push(group.rationale);
    }
  }

  const merged = [];
  for (const [, item] of titleMap.entries()) {
    merged.push({
      title: item.title,
      color: 'blue',
      rationale: item.rationales.filter(Boolean).join('; '),
      tabIds: Array.from(item.tabIds)
    });
  }

  return merged;
}

/**
 * Ensures every group has >2 tabs (at least 3 tabs).
 * Merges smaller groups (1-2 tabs) and consolidates 'Other'.
 */
export function consolidateSmallGroups(groups, minSize = 3) {
  if (!groups || groups.length === 0) return [];

  // Step 1: Merge any groups sharing identical/synonymous titles
  const merged = mergeDuplicateGroups(groups);

  const validGroups = [];
  const leftoverTabIds = [];

  for (const group of merged) {
    if (group.title === 'Other') {
      leftoverTabIds.push(...group.tabIds);
    } else if (group.tabIds.length >= minSize) {
      validGroups.push(group);
    } else {
      leftoverTabIds.push(...group.tabIds);
    }
  }

  // Handle leftovers / Other
  if (leftoverTabIds.length > 0) {
    if (leftoverTabIds.length >= minSize) {
      validGroups.push({
        title: 'Other',
        color: 'grey',
        rationale: 'Consolidated reference tabs',
        tabIds: leftoverTabIds
      });
    } else if (validGroups.length > 0) {
      // If remaining tabs count < minSize, append them to the largest group
      const largest = validGroups.reduce((max, g) => (g.tabIds.length > max.tabIds.length ? g : max), validGroups[0]);
      largest.tabIds.push(...leftoverTabIds);
    } else {
      // If total tabs across all browser is < minSize
      validGroups.push({
        title: 'General',
        color: 'blue',
        rationale: 'Active tabs',
        tabIds: leftoverTabIds
      });
    }
  }

  return validGroups;
}

/**
 * Assigns strictly alternating colors across all groups.
 */
export function applyAlternatingColors(groups) {
  let lastColor = null;
  let paletteIdx = 0;

  for (let i = 0; i < groups.length; i++) {
    let color = CONTRAST_PALETTE[paletteIdx % CONTRAST_PALETTE.length];
    if (color === lastColor) {
      paletteIdx++;
      color = CONTRAST_PALETTE[paletteIdx % CONTRAST_PALETTE.length];
    }
    groups[i].color = color;
    lastColor = color;
    paletteIdx++;
  }
  return groups;
}

export class TabOrganizer {
  /**
   * Captures full snapshot of current tabs & groups across all windows for Undo.
   */
  static async captureSnapshot() {
    const windows = await chrome.windows.getAll({ populate: true });
    const tabSnapshots = [];
    const groupMap = new Map();

    for (const win of windows) {
      if (win.type !== 'normal') continue;
      for (const tab of win.tabs || []) {
        if (tab.groupId && tab.groupId !== -1 && !groupMap.has(tab.groupId)) {
          try {
            const groupInfo = await chrome.tabGroups.get(tab.groupId);
            groupMap.set(tab.groupId, {
              id: groupInfo.id,
              title: groupInfo.title,
              color: groupInfo.color,
              collapsed: groupInfo.collapsed
            });
          } catch {
            // Group might have been removed
          }
        }

        tabSnapshots.push({
          tabId: tab.id,
          windowId: tab.windowId,
          index: tab.index,
          pinned: tab.pinned,
          groupId: tab.groupId !== -1 ? tab.groupId : null,
          groupInfo: tab.groupId !== -1 ? groupMap.get(tab.groupId) || null : null
        });
      }
    }

    const snapshot = {
      timestamp: Date.now(),
      tabs: tabSnapshots,
      groups: Array.from(groupMap.values())
    };

    await chrome.storage.session.set({ lastTabSnapshot: snapshot });
    return snapshot;
  }

  /**
   * Applies the LLM Grouping Plan.
   */
  static async applyGroupingPlan(plan, options = {}) {
    const { consolidation = 'in_place' } = options;

    // 1. Take Snapshot first
    await this.captureSnapshot();

    // 2. Filter, deduplicate titles, consolidate small groups (>2 tabs) & alternate colors
    let groups = consolidateSmallGroups(plan.groups || [], 3);
    applyAlternatingColors(groups);

    const results = [];

    const sanitizeColor = (color) => {
      const lower = (color || '').toLowerCase();
      return CHROME_TAB_COLORS.includes(lower) ? lower : 'blue';
    };

    for (const group of groups) {
      const rawTabIds = group.tabIds || [];
      if (rawTabIds.length === 0) continue;

      // Verify tabs currently exist and are not pinned
      const verifiedTabs = [];
      for (const tabId of rawTabIds) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab && !tab.pinned) {
            verifiedTabs.push(tab);
          }
        } catch {
          // Tab no longer exists, skip
        }
      }

      if (verifiedTabs.length === 0) continue;

      const tabIds = verifiedTabs.map(t => t.id);

      // Handle window consolidation if enabled
      if (consolidation === 'consolidate_windows' && verifiedTabs.length > 1) {
        const targetWindowId = verifiedTabs[0].windowId;
        const tabsInOtherWindows = verifiedTabs.filter(t => t.windowId !== targetWindowId).map(t => t.id);
        
        if (tabsInOtherWindows.length > 0) {
          try {
            await chrome.tabs.move(tabsInOtherWindows, { windowId: targetWindowId, index: -1 });
          } catch (err) {
            console.warn('Could not move tabs across windows:', err);
          }
        }
      }

      // Group tabs by windowId if in_place
      const windowTabMap = new Map();
      for (const tab of verifiedTabs) {
        const winId = tab.windowId;
        if (!windowTabMap.has(winId)) windowTabMap.set(winId, []);
        windowTabMap.get(winId).push(tab.id);
      }

      for (const [winId, wTabIds] of windowTabMap.entries()) {
        try {
          const groupId = await chrome.tabs.group({ tabIds: wTabIds });
          await chrome.tabGroups.update(groupId, {
            title: cleanAndShortenTitle(group.title),
            color: sanitizeColor(group.color),
            collapsed: false
          });
          results.push({ groupId, windowId: winId, title: group.title, count: wTabIds.length });
        } catch (err) {
          console.error(`Failed to group tabs for "${group.title}":`, err);
        }
      }
    }

    // Handle suggested actions: Close duplicates if explicitly permitted
    if (options.closeDuplicates && plan.suggestedActions) {
      for (const act of plan.suggestedActions) {
        if (act.action === 'close_duplicate' && act.tabId) {
          try {
            await chrome.tabs.remove(act.tabId);
          } catch {
            // Tab might already be closed
          }
        }
      }
    }

    return { success: true, createdGroups: results };
  }

  /**
   * Restores tabs to previous snapshot (1-Click Undo).
   */
  static async restoreLastSnapshot() {
    const { lastTabSnapshot } = await chrome.storage.session.get('lastTabSnapshot');
    if (!lastTabSnapshot || !lastTabSnapshot.tabs) {
      throw new Error('No previous grouping snapshot available to undo.');
    }

    const { tabs } = lastTabSnapshot;

    // 1. Ungroup all currently open non-pinned tabs first
    const currentWindows = await chrome.windows.getAll({ populate: true });
    for (const win of currentWindows) {
      if (win.type !== 'normal') continue;
      const groupedTabIds = (win.tabs || [])
        .filter(t => t.groupId && t.groupId !== -1 && !t.pinned)
        .map(t => t.id);
      
      if (groupedTabIds.length > 0) {
        try {
          await chrome.tabs.ungroup(groupedTabIds);
        } catch (err) {
          console.warn('Error ungrouping tabs during undo:', err);
        }
      }
    }

    // 2. Re-create previous groups if they existed
    const groupTabMap = new Map();
    for (const snap of tabs) {
      if (snap.groupInfo && snap.groupId) {
        const key = `${snap.windowId}_${snap.groupInfo.title}_${snap.groupInfo.color}`;
        if (!groupTabMap.has(key)) {
          groupTabMap.set(key, { info: snap.groupInfo, tabIds: [] });
        }
        groupTabMap.get(key).tabIds.push(snap.tabId);
      }
    }

    for (const [, item] of groupTabMap.entries()) {
      const validIds = [];
      for (const id of item.tabIds) {
        try {
          const tab = await chrome.tabs.get(id);
          if (tab) validIds.push(id);
        } catch {
          // Tab gone
        }
      }

      if (validIds.length > 0) {
        try {
          const newGroupId = await chrome.tabs.group({ tabIds: validIds });
          await chrome.tabGroups.update(newGroupId, {
            title: item.info.title || '',
            color: item.info.color || 'grey',
            collapsed: item.info.collapsed || false
          });
        } catch (err) {
          console.error('Error re-grouping during undo:', err);
        }
      }
    }

    // Clear snapshot after undo
    await chrome.storage.session.remove('lastTabSnapshot');
    return { success: true };
  }

  /**
   * Reconciles the LLM grouping plan with all raw tabs, ensuring 100% of tabs are grouped.
   * Guarantees:
   * 1. No duplicate groups (merges same/synonymous titles like Music+Music, Code+Coding, Search+Kagi).
   * 2. Every group has >2 tabs (at least 3 tabs).
   * 3. Every title is at most 12 characters and has NO emojis.
   * 4. Adjacent groups have strictly alternating contrasting colors.
   */
  static reconcilePlanWithRawTabs(plan, rawTabs) {
    if (!plan) plan = { groups: [] };
    if (!plan.groups) plan.groups = [];

    const assignedTabIds = new Set();
    plan.groups.forEach(g => {
      (g.tabIds || []).forEach(id => assignedTabIds.add(id));
    });

    const unassignedTabs = rawTabs.filter(t => !assignedTabIds.has(t.tabId) && !t.pinned);

    if (unassignedTabs.length > 0) {
      console.log(`[Reconciler] Clustering ${unassignedTabs.length} remaining tabs.`);

      // Group unassigned tabs by domain / category
      const domainClusters = new Map();
      for (const tab of unassignedTabs) {
        let domainKey = 'Other';
        try {
          if (tab.url) {
            const u = new URL(tab.url);
            domainKey = u.hostname.replace(/^www\./, '');
          }
        } catch {
          domainKey = 'Other';
        }

        if (domainKey.includes('reddit.com')) {
          domainKey = 'Reddit';
        } else if (domainKey.includes('wiki') || domainKey.includes('fandom') || domainKey.includes('gamepedia')) {
          domainKey = 'Wiki';
        } else if (domainKey.includes('github') || domainKey.includes('gitlab')) {
          domainKey = 'Code';
        } else if (domainKey.includes('youtube') || domainKey.includes('twitch')) {
          domainKey = 'Video';
        }

        if (!domainClusters.has(domainKey)) {
          domainClusters.set(domainKey, []);
        }
        domainClusters.get(domainKey).push(tab);
      }

      const remainderTabs = [];

      for (const [domain, tabs] of domainClusters.entries()) {
        const cleanTitle = cleanAndShortenTitle(domain);
        if (tabs.length >= 3) {
          plan.groups.push({
            title: cleanTitle,
            color: 'blue',
            rationale: `Clustered ${tabs.length} tabs from ${domain}`,
            tabIds: tabs.map(t => t.tabId)
          });
        } else {
          remainderTabs.push(...tabs);
        }
      }

      // Consolidate small remainders into Other
      if (remainderTabs.length > 0) {
        plan.groups.push({
          title: 'Other',
          color: 'grey',
          rationale: 'Standalone reference tabs',
          tabIds: remainderTabs.map(t => t.tabId)
        });
      }
    }

    // Step 1: Merge duplicates and synonyms (e.g. Music+Music+Songsterr -> Music, Code+Coding -> Code)
    // Step 2: Enforce >2 tabs per group constraint across the entire plan
    plan.groups = consolidateSmallGroups(plan.groups, 3);

    // Step 3: Enforce strictly alternating colors across all groups
    applyAlternatingColors(plan.groups);

    return plan;
  }
}
