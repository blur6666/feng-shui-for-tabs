---
id: TASK-5
title: Semantic redundancy detector (beyond exact-URL duplicates)
status: To Do
assignee: []
created_date: '2026-08-15 13:58'
labels:
  - cleanup
  - intelligence
milestone: m-2
dependencies: []
priority: medium
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Flag tabs whose semantic content overlaps, not just tabs with identical URLs: multiple tabs of the same API documentation page, duplicate product listings for the same item, or redundant news articles. Surfaces redundancy candidates into the Suggested Actions bucket using Pass 1 {subject, entity} matches without requiring extra LLM calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tabs sharing identical or near-identical subject and entity from Pass 1 labeling are flagged as redundancy candidates
- [ ] #2 Candidates appear in a dedicated Redundancy bucket in Suggested Actions with explanation
- [ ] #3 Candidates are never closed automatically; user must confirm
- [ ] #4 Adds zero extra LLM calls beyond the Pass 1 labeling pipeline
<!-- AC:END -->
