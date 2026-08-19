/**
 * Tab Content & Semantic Extractor
 * Safely extracts rich semantic information from the active DOM without blocking execution.
 */
(() => {
  try {
    // 1. Meta Tags Extraction
    const getMetaContent = (names) => {
      for (const name of names) {
        const el = document.querySelector(`meta[name="${name}" i], meta[property="${name}" i]`);
        if (el && el.content && el.content.trim()) {
          return el.content.trim();
        }
      }
      return null;
    };

    const metaDescription = getMetaContent(['description', 'og:description', 'twitter:description']);
    const ogTitle = getMetaContent(['og:title', 'twitter:title']);
    const siteName = getMetaContent(['og:site_name', 'application-name']);
    const keywordsRaw = getMetaContent(['keywords', 'news_keywords']);
    const keywords = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 8) : [];
    const canonical = document.querySelector('link[rel="canonical"]')?.href || null;

    // 2. Schema.org JSON-LD Extraction (Rich Triples)
    // JSON-LD values are strings, nested objects, or arrays of either. Anything that is
    // not reduced to plain text here can reach a Chrome tab-group title as "[object Object]".
    const readSchemaText = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return value.trim() || null;
      if (Array.isArray(value)) {
        for (const entry of value) {
          const text = readSchemaText(entry);
          if (text) return text;
        }
        return null;
      }
      if (typeof value === 'object') return typeof value.name === 'string' ? value.name.trim() || null : null;
      return null;
    };

    let schemaType = null;
    let schemaName = null;
    let schemaBrand = null;
    let schemaArtist = null;
    let schemaCategory = null;
    let schemaAbout = null;

    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        if (script.textContent) {
          const json = JSON.parse(script.textContent);
          const item = Array.isArray(json) ? json[0] : (json['@graph'] ? json['@graph'][0] : json);
          if (item && item['@type']) {
            schemaType = Array.isArray(item['@type']) ? item['@type'].join(', ') : item['@type'];
            schemaName = item.name || item.headline || null;
            schemaBrand = readSchemaText(item.brand);
            schemaArtist = readSchemaText(item.byArtist);
            schemaCategory = readSchemaText(item.category) || readSchemaText(item.applicationCategory);
            schemaAbout = readSchemaText(item.about);
            break;
          }
        }
      }
    } catch {
      // JSON parsing safe fallback
    }

    // 3. Headings Structure (Outline)
    const headings = [];
    const headingEls = document.querySelectorAll('h1, h2, h3');
    for (let i = 0; i < Math.min(headingEls.length, 6); i++) {
      const text = headingEls[i].innerText?.trim();
      if (text && text.length > 2 && text.length < 120) {
        headings.push({ tag: headingEls[i].tagName.toLowerCase(), text });
      }
    }

    // 4. Platform-Specific Context Enrichment
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname;
    let platformContext = null;

    // Search Engines Query Extraction
    if (hostname.includes('kagi.com') || hostname.includes('google.') || hostname.includes('bing.com') || 
        hostname.includes('duckduckgo.com') || hostname.includes('search.brave.com') || hostname.includes('perplexity.ai')) {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q') || params.get('query') || params.get('p') || document.querySelector('input[name="q"], #searchbox')?.value?.trim();
      if (query) {
        platformContext = {
          platform: 'Search',
          query: query.slice(0, 100)
        };
      }
    } else if (hostname.includes('github.com')) {
      const repoMatch = pathname.match(/^\/([^/]+)\/([^/]+)/);
      const isIssueOrPr = pathname.includes('/issues/') || pathname.includes('/pull/');
      const repoAbout = document.querySelector('.BorderGrid-cell p.f4, .f4.my-3, [itemprop="about"]')?.innerText?.trim();
      platformContext = {
        platform: 'GitHub',
        repo: repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : null,
        about: repoAbout ? repoAbout.slice(0, 120) : null,
        section: isIssueOrPr ? (pathname.includes('/pull/') ? 'Pull Request' : 'Issue') : 'Repository',
        labels: Array.from(document.querySelectorAll('.IssueLabel, .hx_IssueLabel')).map(l => l.innerText.trim()).slice(0, 5)
      };
    } else if (hostname.includes('youtube.com')) {
      const channelName = document.querySelector('#channel-name, .ytd-channel-name, ytd-channel-name')?.innerText?.trim();
      platformContext = {
        platform: 'YouTube',
        channel: channelName || null,
        isVideo: pathname.startsWith('/watch')
      };
    } else if (hostname.includes('stackoverflow.com') || hostname.includes('stackexchange.com')) {
      const tags = Array.from(document.querySelectorAll('.post-tag, .js-post-tag')).map(t => t.innerText.trim());
      platformContext = {
        platform: 'StackOverflow',
        tags: tags.slice(0, 6),
        hasAcceptedAnswer: !!document.querySelector('.accepted-answer, .js-accepted-answer')
      };
    } else if (hostname.includes('reddit.com')) {
      const subreddit = pathname.match(/^\/r\/([^/]+)/);
      const postLede = document.querySelector('[data-test-id="post-content"] p, shreddit-post p, .Post p, .text-neutral-content')?.innerText?.trim();
      platformContext = {
        platform: 'Reddit',
        subreddit: subreddit ? `r/${subreddit[1]}` : null,
        lede: postLede ? postLede.slice(0, 140) : null
      };
    } else if (hostname.includes('aistudio.google.com')) {
      platformContext = {
        platform: 'GoogleAI',
        service: 'Google AI Studio'
      };
    } else if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
      platformContext = {
        platform: 'OpenAI',
        service: hostname.includes('chatgpt.com') ? 'ChatGPT' : 'OpenAI'
      };
    } else if (hostname.includes('claude.ai') || hostname.includes('anthropic.com')) {
      platformContext = {
        platform: 'Anthropic',
        service: 'Claude'
      };
    } else if (hostname.includes('fandom.com') || hostname.includes('wiki') || hostname.includes('gamepedia')) {
      const parts = hostname.split('.');
      const wikiName = parts[0] === 'www' ? parts[1] : parts[0];
      platformContext = {
        wiki: wikiName
      };
    }

    // 5. Clean Readability Core Text Extract & First-Sentence Lede
    let readableText = '';
    let lede = platformContext?.lede || null;
    const mainEl = document.querySelector('article, main, [role="main"], .main-content, #main-content') || document.body;
    if (mainEl) {
      const clone = mainEl.cloneNode(true);
      const ignoreSelectors = [
        'script', 'style', 'noscript', 'nav', 'header', 'footer', 
        'aside', 'form', 'svg', 'canvas', 'iframe', '[role="banner"]', 
        '[role="navigation"]', '.sidebar', '.menu', '.nav', '.ad', '.ads',
        '.cookie-banner', '#cookie-notice'
      ];
      ignoreSelectors.forEach(sel => {
        clone.querySelectorAll(sel).forEach(el => el.remove());
      });

      const rawText = clone.innerText || clone.textContent || '';
      readableText = rawText
        .replace(/\s+/g, ' ')
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, 800);

      if (!lede && readableText.length > 20) {
        lede = readableText.slice(0, 140);
      }
    }

    return {
      success: true,
      url: window.location.href,
      title: document.title || '',
      siteName,
      ogTitle,
      metaDescription,
      keywords,
      canonical,
      schemaType,
      schemaName,
      schemaBrand,
      schemaArtist,
      schemaCategory,
      schemaAbout,
      headings,
      platformContext,
      lede,
      readableText
    };
  } catch (err) {
    return {
      success: false,
      url: window.location.href,
      title: document.title || '',
      error: err.message
    };
  }
})();
