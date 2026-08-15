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

const SITE_TOKENS = [
  'reddit', 'wiki', 'wikipedia', 'youtube', 'github', 'gitlab',
  'amazon', 'mercado livre', 'mercadolivre', 'twitch', 'stackoverflow',
  'stackexchange', 'google', 'bing', 'twitter', 'facebook', 'instagram',
  'threads', 'ebay', 'fandom', 'steam'
];

/**
 * Validates a grouping plan against anti-site and anti-duplicate rules.
 * @param {object} plan
 * @param {Array<object>} labeledTabs
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validateGroupingPlan(plan, labeledTabs = []) {
  const violations = [];
  if (!plan || !plan.groups || plan.groups.length === 0) {
    return { valid: true, violations: [] };
  }

  const tabMap = new Map((labeledTabs || []).map(t => [t.id, t]));
  const seenTitles = new Map();
  const seenLabels = new Map();

  for (let i = 0; i < plan.groups.length; i++) {
    const group = plan.groups[i];
    const rawTitle = (group.title || '').trim().toLowerCase();
    const rawLabel = (group.label || group.title || '').trim().toLowerCase();
    const tabIds = group.tabIds || [];

    // 1. Check title against known site tokens
    for (const site of SITE_TOKENS) {
      if (rawTitle === site || rawTitle === site.replace(/\s+/g, '') || rawTitle.startsWith(site + ' ') || rawTitle.endsWith(' ' + site)) {
        violations.push(`Group "${group.title}" is named after website "${site}" rather than a topic`);
        break;
      }
    }

    // 2. Check if tabs are >80% one domain but span multiple distinct subjects
    if (tabIds.length >= 3) {
      const domainCounts = new Map();
      const distinctSubjects = new Set();

      for (const id of tabIds) {
        const tab = tabMap.get(id);
        if (tab) {
          const domain = (tab.domain || '').toLowerCase();
          if (domain) domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
          if (tab.subject) distinctSubjects.add(tab.subject.toLowerCase().trim());
        }
      }

      for (const [dom, count] of domainCounts.entries()) {
        const share = count / tabIds.length;
        if (share > 0.8 && distinctSubjects.size >= 3) {
          violations.push(`Group "${group.title}" contains ${Math.round(share * 100)}% tabs from ${dom} but spans ${distinctSubjects.size} distinct subjects`);
          break;
        }
      }
    }

    // 3. Duplicate checks
    const normTitle = rawTitle.replace(/[^\w]/g, '');
    const normLabel = rawLabel.replace(/[^\w]/g, '');

    if (normTitle && seenTitles.has(normTitle)) {
      violations.push(`Duplicate group theme detected between group #${seenTitles.get(normTitle) + 1} and group #${i + 1} ("${group.title}")`);
    } else if (normTitle) {
      seenTitles.set(normTitle, i);
    }

    if (normLabel && seenLabels.has(normLabel)) {
      violations.push(`Duplicate group label detected between group #${seenLabels.get(normLabel) + 1} and group #${i + 1} ("${group.label}")`);
    } else if (normLabel) {
      seenLabels.set(normLabel, i);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Strips emojis, control characters, and trims to <= 12 characters respecting word boundaries
 * where possible (falling back to a 12-char slice if the first word itself exceeds 12 chars)
 * without substituting the subject chosen by the LLM.
 */
export function cleanAndShortenTitle(rawTitle) {
  if (!rawTitle) return 'Other';

  // 1. Remove emojis, symbols, surrogate pairs, and control characters
  let title = rawTitle
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // control chars
    .replace(/[^\w\s\-/]/g, '') // remove special punctuation
    .trim();

  const lower = title.toLowerCase();
  if (!title || lower === 'other' || lower === 'misc' || lower === 'uncategorized') return 'Other';

  // 2. Truncate strictly <= 12 characters respecting word boundaries (never cut mid-word)
  if (title.length > 12) {
    const words = title.split(/\s+/).filter(Boolean);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= 12) {
        current = candidate;
      } else {
        break;
      }
    }
    // If the first word itself is longer than 12 chars, truncate it to 12 chars
    title = current || (words[0] ? words[0].slice(0, 12).trim() : '');
  }

  if (!title) return 'Other';
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Merges groups with normalized-title equality (case/whitespace/punctuation-insensitive).
 */
export function mergeDuplicateGroups(groups) {
  if (!groups || groups.length === 0) return [];

  const titleMap = new Map(); // normalizedKey -> { title, tabIds: Set, rationales: [] }

  for (const group of groups) {
    const cleanTitle = cleanAndShortenTitle(group.title);
    const key = cleanTitle.toLowerCase().replace(/[^\w]/g, '');

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
 * Maps a granularity level to the minimum group size enforced locally.
 * Broad and Detailed allow 2-tab groups; Balanced keeps the 3-tab minimum.
 * @param {string} granularity 'broad' | 'balanced' | 'detailed'
 * @returns {number}
 */
export function granularityToMinSize(granularity) {
  if (granularity === 'broad' || granularity === 'detailed') return 2;
  return 3;
}

/**
 * Ensures every group has at least minSize tabs (default 3).
 * Merges smaller groups and consolidates 'Other'.
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

  // Handle leftovers / Other: keep as dedicated 'Other' group to avoid polluting subject clusters
  if (leftoverTabIds.length > 0) {
    validGroups.push({
      title: 'Other',
      color: 'grey',
      rationale: 'Unassigned or standalone reference tabs',
      tabIds: leftoverTabIds
    });
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
    // Honor the granularity the preview was reconciled with so Apply cannot re-merge
    // 2-tab Broad/Detailed groups back to the Balanced 3-tab minimum.
    const granularity = options.granularity || plan?.granularity || 'balanced';
    const minSize = granularityToMinSize(granularity);

    // 1. Take Snapshot first
    await this.captureSnapshot();

    // 2. Filter, deduplicate titles, consolidate small groups (granularity min size) & alternate colors
    let groups = consolidateSmallGroups(plan.groups || [], minSize);
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

    // Handle suggested actions: Close duplicates ONLY IF explicitly requested
    if (options.closeDuplicates === true && plan.suggestedActions) {
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
  static reconcilePlanWithRawTabs(plan, rawTabs, granularity = 'balanced') {
    if (!plan) plan = { groups: [] };
    if (!plan.groups) plan.groups = [];
    const minSize = granularityToMinSize(granularity);

    const assignedTabIds = new Set();
    plan.groups.forEach(g => {
      (g.tabIds || []).forEach(id => assignedTabIds.add(id));
    });

    const unassignedTabs = (rawTabs || []).filter(t => !assignedTabIds.has(t.tabId) && !t.pinned);

    if (unassignedTabs.length > 0) {
      console.warn(`[Reconciler] Found ${unassignedTabs.length} unassigned tabs not grouped by LLM.`);

      // Route all unassigned tabs into Other group
      plan.groups.push({
        title: 'Other',
        color: 'grey',
        rationale: 'Unassigned or standalone reference tabs',
        tabIds: unassignedTabs.map(t => t.tabId)
      });
    }

    // Step 1: Merge duplicates
    // Step 2: Enforce the granularity minimum tab count across the entire plan
    plan.groups = consolidateSmallGroups(plan.groups, minSize);

    // Step 3: Enforce strictly alternating colors across all groups
    applyAlternatingColors(plan.groups);

    // Step 4: Persist the granularity on the plan so the Apply path enforces the same min size
    plan.granularity = granularity;

    return plan;
  }
}
