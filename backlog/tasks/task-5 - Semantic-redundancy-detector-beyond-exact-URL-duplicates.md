---
id: TASK-5
title: Semantic redundancy detector (beyond exact-URL duplicates)
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 13:58'
updated_date: '2026-08-15 14:03'
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
- [x] #1 Tabs sharing identical or near-identical subject and entity from Pass 1 labeling are flagged as redundancy candidates
- [x] #2 Candidates appear in a dedicated Redundancy bucket in Suggested Actions with explanation
- [x] #3 Candidates are never closed automatically; user must confirm
- [x] #4 Adds zero extra LLM calls beyond the Pass 1 labeling pipeline
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement detectSemanticRedundancies helper in background/tab-labeler.js that compares Pass 1 {subject, entity} outputs to find multiple tabs covering the exact same subject & entity (e.g. duplicate API docs, multiple product listings of the same item)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented detectSemanticRedundancies in background/tab-labeler.js to cluster tabs sharing identical subject and entity from Pass 1 labeling without additional LLM calls. Routed redundancy candidates into a dedicated Redundant Topics bucket in Suggested Actions in sidepanel/app.js. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented zero-cost semantic redundancy detection leveraging Pass 1 labels into Suggested Actions.
<!-- SECTION:FINAL_SUMMARY:END -->
