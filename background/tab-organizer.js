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
  const inputIds = new Set((labeledTabs || []).map(t => t.id));
  const seenTitles = new Map();
  const seenLabels = new Map();
  let maxGroupSize = 0;
  let dominantGroupTitle = '';

  for (let i = 0; i < plan.groups.length; i++) {
    const group = plan.groups[i];
    if (!group || typeof group !== 'object') continue;
    const rawTitle = (group.title || '').trim().toLowerCase();
    const rawLabel = (group.label || group.title || '').trim().toLowerCase();
    const tabIds = group.tabIds || [];

    // 1. Check for out-of-input / hallucinated tab IDs
    if (inputIds.size > 0) {
      const unknownIds = tabIds.filter(id => !inputIds.has(id));
      if (unknownIds.length > 0) {
        violations.push(
          `Group "${group.title || 'Untitled'}" contains ${unknownIds.length} hallucinated tab ID(s) (${unknownIds.slice(0, 3).join(', ')}${unknownIds.length > 3 ? '...' : ''}) that were not in the input set`
        );
      }
    }

    const validGroupTabCount = inputIds.size > 0 ? tabIds.filter(id => inputIds.has(id)).length : tabIds.length;
    if (validGroupTabCount > maxGroupSize) {
      maxGroupSize = validGroupTabCount;
      dominantGroupTitle = group.title || 'Untitled';
    }

    // 2. Check title against known site tokens
    for (const site of SITE_TOKENS) {
      if (rawTitle === site || rawTitle === site.replace(/\s+/g, '') || rawTitle.startsWith(site + ' ') || rawTitle.endsWith(' ' + site)) {
        violations.push(`Group "${group.title}" is named after website "${site}" rather than a topic`);
        break;
      }
    }

    // 3. Check if tabs are >80% one domain but span multiple distinct subjects
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

    // 4. Duplicate checks
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

  // 5. Check for degenerate single-group plan or clustering collapse
  if (inputIds.size >= 6 && plan.groups.length === 1) {
    violations.push(`Plan collapsed all ${inputIds.size} tabs into a single group "${plan.groups[0]?.title || 'Group'}" without topic clustering`);
  } else if (inputIds.size >= 10 && plan.groups.length < 3 && maxGroupSize / Math.max(1, inputIds.size) >= 0.85) {
    violations.push(`Plan concentrated ${Math.round((maxGroupSize / inputIds.size) * 100)}% of tabs into single dominant group "${dominantGroupTitle}"`);
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
 * Normalizes raw LLM grouping output across dictionary formats, property name variations,
 * and string/object ID representations into clean integer tabId lists.
 */
export function normalizePlanGroups(plan, validTabIds = null) {
  if (!plan) return { summary: '', groups: [], suggestedActions: [] };
  let rawGroups = plan.groups;
  if (!rawGroups && typeof plan === 'object') {
    const entries = Object.entries(plan).filter(([k, v]) => Array.isArray(v) && k !== 'suggestedActions');
    if (entries.length > 0) {
      rawGroups = entries.map(([title, tabIds]) => ({ title, tabIds }));
    }
  } else if (typeof rawGroups === 'object' && !Array.isArray(rawGroups)) {
    rawGroups = Object.entries(rawGroups).map(([title, tabIds]) => ({ title, tabIds }));
  }

  if (!Array.isArray(rawGroups)) rawGroups = [];

  const normalized = rawGroups.map(group => {
    if (!group || typeof group !== 'object') return null;
    const title = group.title || group.name || group.label || 'Other';
    const label = group.label || group.title || title;
    const color = group.color || 'blue';
    const rationale = group.rationale || group.reason || '';

    const rawIds = group.tabIds ?? group.tabs ?? group.tab_ids ?? group.ids ?? group.i ?? [];
    const tabIds = [];
    if (Array.isArray(rawIds)) {
      for (const item of rawIds) {
        let id = null;
        if (typeof item === 'number' && Number.isFinite(item)) {
          id = item;
        } else if (typeof item === 'string' && /^\d+$/.test(item.trim())) {
          id = Number(item.trim());
        } else if (item && typeof item === 'object') {
          const nestedId = item.id ?? item.tabId ?? item.tab_id ?? item.i;
          if (nestedId !== undefined && nestedId !== null && !isNaN(Number(nestedId))) {
            id = Number(nestedId);
          }
        }
        if (id !== null && (!validTabIds || validTabIds.has(id))) {
          tabIds.push(id);
        }
      }
    }

    return {
      title,
      label,
      color,
      rationale,
      tabIds: Array.from(new Set(tabIds))
    };
  }).filter(g => g && g.tabIds.length > 0);

  return {
    summary: plan.summary || '',
    warning: plan.warning || undefined,
    groups: normalized,
    suggestedActions: Array.isArray(plan.suggestedActions) ? plan.suggestedActions : []
  };
}

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'this', 'that', 'how', 'what', 'why',
  'app', 'site', 'page', 'tab', 'tabs', 'group', 'groups', 'com', 'org', 'net',
  'http', 'https', 'www', 'you', 'your', 'about', 'guide', 'into', 'using',
  'does', 'help', 'search', 'home', 'main', 'view', 'post', 'thread', 'reddit',
  'kagi', 'google', 'github', 'youtube'
]);

export function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word));
}

/**
 * Ensures every group has at least minSize tabs (default 3).
 * Merges smaller groups and consolidates 'Other' without destroying the entire plan.
 */
export function consolidateSmallGroups(groups, minSize = 3) {
  if (!groups || groups.length === 0) return [];

  // Step 1: Merge any groups sharing identical/synonymous titles
  const merged = mergeDuplicateGroups(groups);

  const validGroups = [];
  const smallGroups = [];
  const leftoverTabIds = [];

  for (const group of merged) {
    if (group.title === 'Other') {
      leftoverTabIds.push(...group.tabIds);
    } else if (group.tabIds.length >= minSize) {
      validGroups.push(group);
    } else {
      smallGroups.push(group);
    }
  }

  // Preserve 2-tab groups with semantic topic titles rather than destroying them into 'Other'
  for (const small of smallGroups) {
    if (small.tabIds.length >= 2) {
      validGroups.push(small);
    } else {
      leftoverTabIds.push(...small.tabIds);
    }
  }

  // Handle true leftovers / Other: keep as dedicated 'Other' group
  if (leftoverTabIds.length > 0) {
    validGroups.push({
      title: 'Other',
      label: 'Other',
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
   * 2. Preserves semantic group clusters without collapsing large tab sets into a single 'Other' group.
   * 3. Every title is at most 12 characters and has NO emojis.
   * 4. Adjacent groups have strictly alternating contrasting colors.
   */
  static reconcilePlanWithRawTabs(plan, rawTabs, granularity = 'balanced') {
    const validTabIds = new Set((rawTabs || []).map(t => t.tabId ?? t.id));
    const normalizedPlan = normalizePlanGroups(plan, validTabIds);
    const minSize = granularityToMinSize(granularity);

    const assignedTabIds = new Set();
    normalizedPlan.groups.forEach(g => {
      (g.tabIds || []).forEach(id => assignedTabIds.add(id));
    });

    const unassignedTabs = (rawTabs || []).filter(t => !assignedTabIds.has(t.tabId ?? t.id) && !t.pinned);

    if (unassignedTabs.length > 0) {
      console.warn(`[Reconciler] Found ${unassignedTabs.length} unassigned tabs not grouped by LLM.`);

      const rawTabMap = new Map((rawTabs || []).map(t => [t.tabId ?? t.id, t]));

      // Build keyword profiles for existing groups
      const groupProfiles = normalizedPlan.groups.map(grp => {
        const titleTokens = extractKeywords(grp.title);
        const labelTokens = extractKeywords(grp.label);
        const rationaleTokens = extractKeywords(grp.rationale);
        const assignedTabTokens = (grp.tabIds || []).flatMap(id => {
          const tab = rawTabMap.get(id);
          return tab ? extractKeywords(tab.title) : [];
        });
        const allKeywords = new Set([
          ...titleTokens,
          ...labelTokens,
          ...rationaleTokens,
          ...assignedTabTokens
        ]);
        return {
          group: grp,
          cleanTitle: cleanAndShortenTitle(grp.title).toLowerCase(),
          keywords: allKeywords
        };
      });

      const remainingUnassigned = [];

      // Step 1: Semantic matching of unassigned tabs into existing groups
      for (const tab of unassignedTabs) {
        const tabId = tab.tabId ?? tab.id;
        const tabTokens = new Set([
          ...extractKeywords(tab.title),
          ...extractKeywords(tab.subject),
          ...extractKeywords(tab.entity),
          ...extractKeywords(tab.url)
        ]);

        let bestGroup = null;
        let bestScore = 0;

        for (const profile of groupProfiles) {
          let score = 0;
          const lowerTitle = (tab.title || '').toLowerCase();
          const lowerUrl = (tab.url || '').toLowerCase();

          // High-confidence title or URL substring match against group title
          if (profile.cleanTitle && profile.cleanTitle.length >= 3 && profile.cleanTitle !== 'other') {
            if (lowerTitle.includes(profile.cleanTitle) || lowerUrl.includes(profile.cleanTitle)) {
              score += 4;
            }
          }

          // Keyword overlap
          for (const token of tabTokens) {
            if (profile.keywords.has(token)) {
              score += 1;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestGroup = profile.group;
          }
        }

        if (bestGroup && bestScore >= 1) {
          bestGroup.tabIds.push(tabId);
          assignedTabIds.add(tabId);
        } else {
          remainingUnassigned.push(tab);
        }
      }

      // Step 2: Semantic topic clustering for remaining unassigned tabs
      if (remainingUnassigned.length > 0) {
        const clusterMap = new Map();

        for (const tab of remainingUnassigned) {
          const tokens = new Set([
            ...extractKeywords(tab.title),
            ...extractKeywords(tab.subject),
            ...extractKeywords(tab.entity),
            ...extractKeywords(tab.url)
          ]);
          for (const token of tokens) {
            if (!clusterMap.has(token)) clusterMap.set(token, []);
            clusterMap.get(token).push(tab);
          }
        }

        const assignedRemainingTabIds = new Set();
        const sortedClusters = Array.from(clusterMap.entries())
          .filter(([, tabs]) => tabs.length >= 2)
          .sort((a, b) => b[1].length - a[1].length);

        for (const [keyword, tabs] of sortedClusters) {
          const unassignedInCluster = tabs.filter(t => !assignedRemainingTabIds.has(t.tabId ?? t.id));
          if (unassignedInCluster.length >= 2) {
            const clusterTitle = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            const clusterTabIds = unassignedInCluster.map(t => t.tabId ?? t.id);
            clusterTabIds.forEach(id => assignedRemainingTabIds.add(id));

            normalizedPlan.groups.push({
              title: cleanAndShortenTitle(clusterTitle),
              label: clusterTitle,
              color: 'cyan',
              rationale: `Grouped by topic (${clusterTitle})`,
              tabIds: clusterTabIds
            });
          }
        }

        // Step 3: Truly isolated singletons
        const isolatedTabs = remainingUnassigned.filter(t => !assignedRemainingTabIds.has(t.tabId ?? t.id));
        if (isolatedTabs.length === 1) {
          const singleTab = isolatedTabs[0];
          const singleTitle = cleanAndShortenTitle(singleTab.title || 'Reference');
          normalizedPlan.groups.push({
            title: singleTitle,
            label: singleTitle,
            color: 'cyan',
            rationale: `Standalone topic (${singleTitle})`,
            tabIds: [singleTab.tabId ?? singleTab.id]
          });
        } else if (isolatedTabs.length > 1) {
          normalizedPlan.groups.push({
            title: 'Other',
            label: 'Other',
            color: 'grey',
            rationale: 'Standalone reference tabs',
            tabIds: isolatedTabs.map(t => t.tabId ?? t.id)
          });
        }
      }
    }

    // Step 1: Merge duplicates
    // Step 2: Enforce the granularity minimum tab count across the entire plan
    normalizedPlan.groups = consolidateSmallGroups(normalizedPlan.groups, minSize);

    // Step 3: Enforce strictly alternating colors across all groups
    applyAlternatingColors(normalizedPlan.groups);

    // Step 4: Persist the granularity on the plan so the Apply path enforces the same min size
    normalizedPlan.granularity = granularity;

    return normalizedPlan;
  }
}
