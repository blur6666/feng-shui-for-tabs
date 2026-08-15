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
 * Builds the Pass 1 prompt for batch labeling of tab semantics.
 */
export function constructLabelingPrompt(batchTabs) {
  const tabJsonString = JSON.stringify(batchTabs, null, 2);
  let prompt = `Analyze each of the following ${batchTabs.length} tabs and extract its core subject, entity, intent, and junk status.\n\n`;
  prompt += '```json\n' + tabJsonString + '\n```\n\n';
  prompt += `CRITICAL RULES:
1. "subject": Describe WHAT THE PAGE IS ABOUT (task, project, problem, product). NEVER use the website name.
2. "entity": Specific product or topic name if identifiable.
3. "intent": User goal (e.g., research, shopping, troubleshooting, reference).
4. "junkType": Set to 'new_tab', 'error', 'auth', 'blank', or 'thank_you' if the page is low-value/operational; otherwise null.
5. You MUST return an entry for EVERY tab ID in the batch.

Return JSON matching:
{
  "tabs": [
    { "id": 123, "subject": "Air Fryer Buying Guide", "entity": "Air Fryer", "intent": "shopping", "junkType": null }
  ]
}`;
  return prompt;
}

/**
 * Builds the Pass 2 prompt for clustering labeled tabs into coherent Chrome Tab Groups.
 */
export function constructClusteringPrompt(labeledTabs, userInstructions = '') {
  const tabJsonString = JSON.stringify(labeledTabs, null, 2);

  let prompt = `Here are the semantic labels for all open tabs (${labeledTabs.length} tabs):\n\n`;
  prompt += '```json\n' + tabJsonString + '\n```\n\n';

  if (userInstructions && userInstructions.trim()) {
    prompt += `User Custom Instructions: "${userInstructions.trim()}"\n\n`;
  }

  prompt += `Synthesize the tabs above into coherent subject-based groups.\n
CRITICAL GROUPING & TAXONOMY RULES:
- GROUP BY SUBJECT / TASK, NOT BY WEBSITE.
  Worked Example: An r/airfryer discussion, an online air fryer product listing, and a video air fryer review belong in ONE group ('Air Fryer'). Two unrelated Wikipedia articles belong in DIFFERENT groups based on their distinct topics.
- "title": AT MOST 12 CHARACTERS and 1-2 words. Abbreviate if needed (e.g., 'Air Fryer', 'Rust Bugs', 'Tokyo Trip', 'ML AirFryer').
- "label": Full descriptive topic label (e.g., 'Philips Air Fryer Research').
- STRICTLY NO EMOJIS in titles or labels.
- Minimum 3 tabs per group. Never create 1 or 2 tab groups. Merge small topics into broader themes or 'Other'.
- EVERY single tab ID from the input must be included in exactly one group. Do not omit any ID.
- Assign alternating colors ('blue', 'orange', 'green', 'pink', 'cyan', 'red', 'yellow', 'purple', 'grey').

Return valid JSON matching:
{
  "summary": "Brief summary of active tasks",
  "groups": [
    {
      "title": "Air Fryer",
      "label": "Air Fryer Comparison and Reviews",
      "color": "blue",
      "rationale": "Product listings, forum threads, and video reviews for air fryers",
      "tabIds": [1, 2, 3]
    }
  ]
}`;

  return prompt;
}

/**
 * Legacy single-pass prompt builder fallback (with anti-site taxonomy rules).
 */
export function constructAnalysisPrompt(distilledTabs, userInstructions = '') {
  return constructClusteringPrompt(distilledTabs, userInstructions);
}
