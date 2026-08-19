---
id: TASK-24
title: >-
  Implement rich browser-side metadata extraction and compact semantic signals
  in Pass 1
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 21:45'
updated_date: '2026-08-15 21:49'
labels: []
dependencies: []
priority: high
type: enhancement
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade content/extractor.js to capture rich domain signals (search queries, subreddits, repo descriptions, JSON-LD brand/byArtist/category triples, 100-char clean ledes) and wire them into Fast profile prompts so small LLMs have unambiguous context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 content/extractor.js extracts clean search queries from search engines (Kagi, Google, DDG, Bing)
- [x] #2 content/extractor.js extracts rich JSON-LD triples (brand, byArtist, category, about) into schema fields
- [x] #3 content/extractor.js captures post/article lede and platform metadata (subreddits, repo bio)
- [x] #4 background/content-distiller.js includes compact platform/query/lede micro-signals in Fast profile
- [x] #5 Pass 1 and Pass 2 prompts guide models to cluster developer tools and creative topics cleanly
- [x] #6 Automated tests verify rich extraction and grouping accuracy
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enhance content/extractor.js with search query extraction, JSON-LD rich entity triples, subreddit/forum post lede, and GitHub repo descriptions. 2. Update background/content-distiller.js to include compact platform signals, queries, and ledes in Fast mode without token bloating. 3. Update Pass-1/Pass-2 prompts and schema to utilize entity anchors. 4. Verify with automated tests.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented rich browser-side extraction for search queries, subreddits, repo bios, JSON-LD triples, and 100-char ledes. Wired compact micro-signals (q, r, p, s, c) into Fast profile prompts and added single-group tab partitioning. Verified with test-latency-profiles.mjs.
<!-- SECTION:FINAL_SUMMARY:END -->
