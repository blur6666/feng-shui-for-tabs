/**
 * Content Distiller
 * Compacts and synthesizes tab data into token-efficient payloads for Local LLMs.
 */

import { JUNK_TYPE_LIST } from '../shared/constants.js';
import { detectJunk } from '../shared/junk-rules.js';

function isFastProfile(profile) {
  return profile?.id === 'fast' || profile === 'fast';
}

function truncate(value, maxLength) {
  if (!value) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function compactLabelingRecord(tab) {
  const record = {
    i: tab.id,
    t: truncate(tab.title, 140)
  };
  const location = [tab.domain, tab.path].filter(Boolean).join('');
  if (location) record.u = truncate(location, 140);
  if (tab.description) record.d = truncate(tab.description, 180);
  if (tab.schemaName) record.e = truncate(tab.schemaName, 120);
  if (tab.headings?.[0]) record.h = truncate(tab.headings[0], 120);
  return record;
}

function compactClusteringRecord(tab) {
  const record = { i: tab.id, s: truncate(tab.subject, 100) || 'Topic' };
  if (tab.entity) record.e = truncate(tab.entity, 100);
  if (tab.intent) record.n = truncate(tab.intent, 48);
  return record;
}

export function distillTabsForPrompt(tabs, options = {}) {
  const { maxSnippetLength = 200, profile = null } = options;
  const fast = isFastProfile(profile);
  const includeRichEvidence = !fast || profile?.richEvidence !== false;
  const effectiveSnippetLength = fast ? 0 : maxSnippetLength;

  return tabs.map(tab => {
    let hostname = '';
    let pathname = '';
    try {
      if (tab.url) {
        const u = new URL(tab.url);
        hostname = u.hostname;
        pathname = u.pathname;
      }
    } catch {
      hostname = tab.url;
    }

    const ext = tab.extractedData || {};
    const headings = (ext.headings || [])
      .map(heading => (typeof heading === 'string' ? heading : heading.text))
      .filter(Boolean)
      .slice(0, includeRichEvidence ? 3 : 1);

    let snippet = ext.readableText || '';
    if (effectiveSnippetLength > 0 && snippet.length > effectiveSnippetLength) {
      snippet = `${snippet.slice(0, effectiveSnippetLength)}...`;
    }

    let subjectSignals;
    if (includeRichEvidence && ext.platformContext) {
      const platform = ext.platformContext;
      const filtered = {};
      if (platform.subreddit) filtered.subreddit = platform.subreddit;
      if (platform.repo) filtered.repo = platform.repo;
      if (platform.channel) filtered.channel = platform.channel;
      if (platform.tags?.length) filtered.tags = platform.tags;
      if (platform.wiki) filtered.wiki = platform.wiki;
      if (platform.section) filtered.section = platform.section;
      if (Object.keys(filtered).length > 0) subjectSignals = filtered;
    }

    const tabEntry = {
      id: tab.tabId,
      windowId: tab.windowId,
      title: tab.title || 'Untitled',
      domain: hostname,
      path: pathname && pathname !== '/' ? pathname : undefined,
      siteName: includeRichEvidence ? ext.siteName || undefined : undefined,
      description: ext.metaDescription || ext.ogTitle || undefined,
      schemaName: ext.schemaName || undefined,
      keywords: includeRichEvidence && ext.keywords?.length ? ext.keywords.slice(0, 8) : undefined,
      headings: headings.length ? headings : undefined,
      platformContext: subjectSignals,
      schema: includeRichEvidence ? ext.schemaType || undefined : undefined,
      snippet: effectiveSnippetLength > 0 && snippet.length > 20 ? snippet : undefined,
      localJunk: detectJunk(tab) || undefined
    };

    Object.keys(tabEntry).forEach(key => {
      if (tabEntry[key] === undefined) delete tabEntry[key];
    });

    return tabEntry;
  });
}

/**
 * Builds the Pass-1 prompt for batch labeling. Fast mode uses intentionally
 * terse keys: i=id, t=title, u=URL/domain path, d=description, e=entity hint,
 * and h=heading. The result schema remains explicit and stable.
 */
export function constructLabelingPrompt(batchTabs, profile = null) {
  const fast = isFastProfile(profile);
  const payload = fast ? batchTabs.map(compactLabelingRecord) : batchTabs;
  const tabJsonString = JSON.stringify(payload);
  const evidenceLegend = fast
    ? 'Input keys: i tab ID, t title, u URL/domain path, d description, e entity hint, h heading.\n'
    : '';

  return `Analyze ${batchTabs.length} browser tabs. Return one compact semantic label per input ID.\n${evidenceLegend}TABS=${tabJsonString}\n\nRules: return every input ID exactly once; subject is a 2-6 word description of what the page is about, never its website; omit entity, intent, and junkType unless they materially add information. No prose, explanations, or markdown.\nReturn only JSON: {"tabs":[{"id":123,"subject":"Air Fryer Guide"}]}`;
}

/**
 * Builds the Pass-2 prompt for clustering semantic labels into Chrome groups.
 */
export function constructClusteringPrompt(labeledTabs, userInstructions = '', granularity = 'balanced', profile = null) {
  const fast = isFastProfile(profile);
  const payload = fast ? labeledTabs.map(compactClusteringRecord) : labeledTabs;
  const tabJsonString = JSON.stringify(payload);
  const evidenceLegend = fast ? 'Input keys: i tab ID, s subject, e entity, n intent.\n' : '';

  let granularityRule = '';
  if (granularity === 'broad') {
    granularityRule = 'GRANULARITY: BROAD. Target 2-4 umbrella groups; minimum group size 2.';
  } else if (granularity === 'detailed') {
    granularityRule = 'GRANULARITY: DETAILED. Target 8+ focused groups; minimum group size 2.';
  } else {
    granularityRule = 'GRANULARITY: BALANCED. Target 4-8 coherent groups; minimum group size 3.';
  }

  const customRule = userInstructions?.trim() ? `User focus: "${userInstructions.trim()}"\n` : '';
  return `${evidenceLegend}${customRule}Cluster ${labeledTabs.length} semantic tab labels into subject/task groups. TABS=${tabJsonString}\n\n${granularityRule}\nGroup strictly by topic/task, not host or domain. Every input tab ID must be assigned to its relevant topic group. Do not group all tabs into 'Other' or 'Misc'. Titles must be 1-2 words and <=12 characters; label is the full descriptive topic; no emojis; use alternating Chrome colors.\nReturn only JSON: {"summary":"Brief active-work summary","groups":[{"title":"Air Fryer","label":"Air Fryer Research","color":"blue","rationale":"Product listings and reviews","tabIds":[1,2,3]}]}`;
}

/**
 * Legacy single-pass prompt builder fallback (with anti-site taxonomy rules).
 */
export function constructAnalysisPrompt(distilledTabs, userInstructions = '', profile = null) {
  return constructClusteringPrompt(distilledTabs, userInstructions, 'balanced', profile);
}
