---
id: TASK-20
title: >-
  Fix PR4 review concerns: domain validation, compact key parsing, and Fast
  profile context cap
status: Done
assignee: []
created_date: '2026-08-15 20:50'
updated_date: '2026-08-15 20:57'
labels: []
dependencies: []
priority: high
type: bug
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Addresses critical and high priority review concerns on PR4: wire tab domain into labeled tabs for anti-site validation, normalize compact keys and string IDs in Pass 1 reader, and ensure Fast profile context cap respects explicit user num_ctx configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 labeledTabs includes domain so validateGroupingPlan anti-domain checks execute
- [x] #2 readLabels normalizes compact keys (i, s, e, n, j) and string tab IDs
- [x] #3 configuredContextCap respects explicit user num_ctx if configured
- [x] #4 Automated regression tests verify domain validation, compact key parsing, and context budgeting
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pass domain into labeledTabs in tab-labeler.js. 2. Normalize compact keys and string IDs in tab-labeler.js readLabels. 3. Adjust configuredContextCap to allow explicit user num_ctx. 4. Add regression tests.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Populated domain into labeledTabs, enabled compact key parsing (i, s, e, n, j) and string ID coercion in readLabels, updated configuredContextCap and getRequestContextBudget to allow context scaling up to user-configured num_ctx, and added regression test coverage.
<!-- SECTION:FINAL_SUMMARY:END -->
