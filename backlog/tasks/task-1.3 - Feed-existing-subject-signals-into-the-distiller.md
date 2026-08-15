---
id: TASK-1.3
title: Feed existing subject signals into the distiller
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 13:38'
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
- [x] #1 Distilled tab entries include schemaName, keywords (already capped at 8 in content/extractor.js), and siteName when present
- [x] #2 platformContext.subreddit / .repo / .channel / .tags are kept (subject signals) but platformContext.platform and the hardcoded category:'Gaming' (content/extractor.js:89-96, fires on any hostname containing 'wiki') are dropped
- [x] #3 The existing undefined-stripping loop still keeps the payload compact
- [x] #4 A Mercado Livre product page's distilled entry contains the product name via schemaName; a GitHub issue and a Reddit thread each carry a recognizable subject field, not just a platform name
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Clean up platformContext in content/extractor.js to drop hardcoded category: 'Gaming' and platform strings
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated content/extractor.js to drop hardcoded platform/category strings and updated background/content-distiller.js to include schemaName, keywords (max 8), siteName, and subject-specific platform signals (subreddit, repo, channel, tags, wiki). Verified with node test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enhanced tab distillation to include schemaName, keywords, siteName, and specific subject context while pruning platform categories and stripping undefined keys.
<!-- SECTION:FINAL_SUMMARY:END -->
