---
id: TASK-10
title: Thread granularity minSize into deterministic reconciliation
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 15:04'
updated_date: '2026-08-15 15:10'
labels:
  - review
  - grouping
  - ux
milestone: m-2
dependencies:
  - TASK-3
priority: high
type: bug
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #3 review: granularity currently only steers the Pass 2 prompt, but consolidateSmallGroups(plan.groups, 3) in background/tab-organizer.js hardcodes minSize=3 on every reconcile. Broad/Detailed promise 2-tab minimum groups and 8+ atomic groups, so the local pass must honor the selected granularity instead of collapsing sub-3-tab groups.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Selected granularity reaches reconcilePlanWithRawTabs/consolidateSmallGroups instead of a hardcoded 3
- [x] #2 Broad and Detailed produce 2-tab groups when the LLM plan yields them; Balanced keeps the 3-tab minimum
- [x] #3 Prompt group-count targets and the deterministic min-size use the same granularity source
- [x] #4 Automated test verifies min-size selection for broad/balanced/detailed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 2. Thread granularity through reconcilePlanWithRawTabs and consolidateSmallGroups
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added granularityToMinSize (broad/detailed=2, balanced=3), threaded granularity through reconcilePlanWithRawTabs(plan, tabs, granularity) and into consolidateSmallGroups, and passed payload granularity from service-worker. Verified with automated tests: mapping, 2-tab broad groups preserved, balanced collapse.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Threaded granularity minSize into deterministic reconciliation so broad/detailed can yield 2-tab groups.
<!-- SECTION:FINAL_SUMMARY:END -->
