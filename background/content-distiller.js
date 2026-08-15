/**
 * Content Distiller
 * Compacts and synthesizes tab data into token-efficient payloads for Local LLMs.
 */

export function distillTabsForPrompt(tabs, options = {}) {
  const { maxSnippetLength = 200 } = options;

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
    const headings = (ext.headings || []).map(h => (typeof h === 'string' ? h : h.text)).filter(Boolean).slice(0, 3);
    
    // Clean snippet
    let snippet = ext.readableText || '';
    if (snippet.length > maxSnippetLength) {
      snippet = snippet.slice(0, maxSnippetLength) + '...';
    }

    // Filter platform context to subject signals only (drop platform / category)
    let subjectSignals = undefined;
    if (ext.platformContext) {
      const p = ext.platformContext;
      const filtered = {};
      if (p.subreddit) filtered.subreddit = p.subreddit;
      if (p.repo) filtered.repo = p.repo;
      if (p.channel) filtered.channel = p.channel;
      if (p.tags && p.tags.length > 0) filtered.tags = p.tags;
      if (p.wiki) filtered.wiki = p.wiki;
      if (p.section) filtered.section = p.section;
      if (Object.keys(filtered).length > 0) {
        subjectSignals = filtered;
      }
    }

    const tabEntry = {
      id: tab.tabId,
      windowId: tab.windowId,
      title: tab.title || 'Untitled',
      domain: hostname,
      path: pathname && pathname !== '/' ? pathname : undefined,
      siteName: ext.siteName || undefined,
      description: ext.metaDescription || ext.ogTitle || undefined,
      schemaName: ext.schemaName || undefined,
      keywords: ext.keywords && ext.keywords.length > 0 ? ext.keywords.slice(0, 8) : undefined,
      headings: headings.length > 0 ? headings : undefined,
      platformContext: subjectSignals,
      schema: ext.schemaType || undefined,
      snippet: snippet.length > 20 ? snippet : undefined
    };

    // Remove undefined properties to keep JSON payload minimal
    Object.keys(tabEntry).forEach(key => {
      if (tabEntry[key] === undefined) {
        delete tabEntry[key];
      }
    });

    return tabEntry;
  });
}

/**
 * Builds the complete prompt for the LLM.
 */
export function constructAnalysisPrompt(distilledTabs, userInstructions = '') {
  const tabJsonString = JSON.stringify(distilledTabs, null, 2);

  let prompt = `Here is the structured list of all currently open browser tabs (${distilledTabs.length} tabs):\n\n`;
  prompt += '```json\n' + tabJsonString + '\n```\n\n';
  
  if (userInstructions && userInstructions.trim()) {
    prompt += `User Custom Instructions: "${userInstructions.trim()}"\n\n`;
  }

  prompt += `Analyze the tabs above, identify coherent semantic topics, and return a JSON object with:
1. "summary": A brief 1-2 sentence overview of user's active context.
2. "groups": Array of groups with "title" (strictly 1 to 2 words, NO emojis), "color" (one of: 'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'), "rationale", and "tabIds" (array of tab id integers).
3. "suggestedActions": Optional array of actions like closing exact duplicates.

CRITICAL NAMING & GROUPING RULES:
- STRICTLY NO EMOJIS in any group title.
- Make titles AT MOST 12 CHARACTERS and 1-2 words (e.g., 'Wiki', 'Reddit', 'Music', 'Code', 'Docs', 'Shop', 'Gaming', 'News', 'Video', 'Social').
- Every group MUST contain MORE THAN 2 TABS (minimum 3 tabs per group). Never create 1 or 2 tab groups; merge similar or singleton tabs into broader groups or an 'Other' group. Larger groups are favored.
- EVERY single tab ID from the input must be included in exactly one group. Do NOT omit any tab ID.
- Keep adjacent groups with distinct alternating colors: 'blue', 'orange', 'green', 'pink', 'cyan', 'red', 'yellow', 'purple', 'grey'.
- Return ONLY the valid JSON object.`;

  return prompt;
}
