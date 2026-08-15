---
id: TASK-10
title: Thread granularity minSize into deterministic reconciliation
status: To Do
assignee: []
created_date: '2026-08-15 15:04'
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
- [ ] #1 Selected granularity reaches reconcilePlanWithRawTabs/consolidateSmallGroups instead of a hardcoded 3
- [ ] #2 Broad and Detailed produce 2-tab groups when the LLM plan yields them; Balanced keeps the 3-tab minimum
- [ ] #3 Prompt group-count targets and the deterministic min-size use the same granularity source
- [ ] #4 Automated test verifies min-size selection for broad/balanced/detailed
<!-- AC:END -->
