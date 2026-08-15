---
id: TASK-1.3
title: Feed existing subject signals into the distiller
status: To Do
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 11:40'
labels:
  - grouping
milestone: m-0
dependencies: []
modified_files:
  - background/content-distiller.js
parent_task_id: TASK-1
priority: high
type: enhancement
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
content/extractor.js already extracts schemaName, keywords, and siteName - the strongest subject signals available (a Mercado Livre product page yields schemaName: 'Air Fryer Philips 5000'). distillTabsForPrompt() in background/content-distiller.js (lines 31-42) discards all three before building the LLM payload. This is free accuracy sitting unused.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Distilled tab entries include schemaName, keywords (already capped at 8 in content/extractor.js), and siteName when present
- [ ] #2 platformContext.subreddit / .repo / .channel / .tags are kept (subject signals) but platformContext.platform and the hardcoded category:'Gaming' (content/extractor.js:89-96, fires on any hostname containing 'wiki') are dropped
- [ ] #3 The existing undefined-stripping loop still keeps the payload compact
- [ ] #4 A Mercado Livre product page's distilled entry contains the product name via schemaName; a GitHub issue and a Reddit thread each carry a recognizable subject field, not just a platform name
<!-- AC:END -->
