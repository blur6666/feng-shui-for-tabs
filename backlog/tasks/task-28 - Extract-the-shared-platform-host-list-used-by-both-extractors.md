---
id: TASK-28
title: Extract the shared platform host list used by both extractors
status: To Do
assignee: []
created_date: '2026-08-19 22:15'
labels: []
dependencies: []
references:
  - content/extractor.js
  - background/tab-collector.js
priority: low
type: chore
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The platform detection host lists (kagi.com, google., bing.com, duckduckgo.com, search.brave.com, perplexity.ai, reddit.com, github.com and friends) are duplicated verbatim between content/extractor.js and extractUrlPlatformFallback in background/tab-collector.js. MV3 content-script isolation means the two files cannot share a module import directly, so the list needs a form both can consume without drifting. Flagged as non-blocking in the PR #5 review; the two copies have already drifted once, when the background copy double-decoded search queries and the content copy did not.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Both extractors resolve their platform host list from one declaration
- [ ] #2 Adding a host in one place takes effect in both the content script and the background fallback
- [ ] #3 Existing platform extraction tests still pass
<!-- AC:END -->
