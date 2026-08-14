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

    // 2. Schema.org JSON-LD Extraction
    let schemaType = null;
    let schemaName = null;
    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        if (script.textContent) {
          const json = JSON.parse(script.textContent);
          const item = Array.isArray(json) ? json[0] : (json['@graph'] ? json['@graph'][0] : json);
          if (item && item['@type']) {
            schemaType = Array.isArray(item['@type']) ? item['@type'].join(', ') : item['@type'];
            schemaName = item.name || item.headline || null;
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
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    let platformContext = null;

    if (hostname.includes('github.com')) {
      const repoMatch = pathname.match(/^\/([^/]+)\/([^/]+)/);
      const isIssueOrPr = pathname.includes('/issues/') || pathname.includes('/pull/');
      platformContext = {
        platform: 'GitHub',
        repo: repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : null,
        section: isIssueOrPr ? (pathname.includes('/pull/') ? 'Pull Request' : 'Issue') : 'Repository',
        labels: Array.from(document.querySelectorAll('.IssueLabel, .hx_IssueLabel')).map(l => l.innerText.trim()).slice(0, 5)
      };
    } else if (hostname.includes('youtube.com')) {
      const channelName = document.querySelector('#channel-name, .ytd-channel-name')?.innerText?.trim();
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
      platformContext = {
        platform: 'Reddit',
        subreddit: subreddit ? `r/${subreddit[1]}` : null
      };
    } else if (hostname.includes('fandom.com') || hostname.includes('wiki') || hostname.includes('gamepedia')) {
      const parts = hostname.split('.');
      const wikiName = parts[0] === 'www' ? parts[1] : parts[0];
      platformContext = {
        platform: 'Gaming / Wiki',
        wiki: wikiName,
        category: 'Gaming'
      };
    } else if (hostname.includes('steampowered.com') || hostname.includes('steamcommunity.com')) {
      platformContext = {
        platform: 'Steam',
        category: 'Gaming'
      };
    } else if (hostname.includes('twitch.tv')) {
      platformContext = {
        platform: 'Twitch',
        category: 'Live Stream'
      };
    }

    // 5. Clean Readability Core Text Extract
    // Extract main text while excluding navigation, footers, sidebars, forms, and scripts
    let readableText = '';
    const mainEl = document.querySelector('article, main, [role="main"], .main-content, #main-content') || document.body;
    if (mainEl) {
      // Clone element so we don't mutate the live DOM
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
      // Normalize whitespace
      readableText = rawText
        .replace(/\s+/g, ' ')
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, 800); // 800 characters limit per tab
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
      headings,
      platformContext,
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
