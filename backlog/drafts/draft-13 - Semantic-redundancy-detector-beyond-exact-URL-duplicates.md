---
id: DRAFT-13
title: Semantic redundancy detector (beyond exact-URL duplicates)
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - cleanup
dependencies: []
references:
  - ideas3.md#6
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Flag tabs whose CONTENT overlaps, not just tabs with identical URLs: three tabs of the same API documentation page reached by different routes, several product listings for the same item, or multiple articles covering one story. This extends TASK-2.3 (bulk-close chips in Suggested Actions), which handles exact-URL duplicates only - the UI bucket already exists, so this adds a detection method rather than new surface. Detection can lean on the pass-1 labeling output from TASK-1.5: two tabs sharing both subject and entity are redundancy candidates without any extra LLM call. Starred by the user as high interest. Being destructive and fuzzier than exact matching, it must always present candidates for confirmation rather than auto-closing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tabs sharing subject and entity from the labeling pass are surfaced as redundancy candidates
- [ ] #2 Candidates appear in the existing Suggested Actions bucket UI and are never closed automatically
- [ ] #3 Each candidate group shows why it was flagged so the user can judge it
- [ ] #4 Detection adds no additional LLM call beyond the existing labeling pass
<!-- AC:END -->
