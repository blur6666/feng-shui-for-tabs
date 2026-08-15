---
id: TASK-1.7
title: Anti-site and anti-duplicate group validator
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:48'
updated_date: '2026-08-15 13:44'
labels:
  - grouping
milestone: m-0
dependencies:
  - TASK-1.5
modified_files:
  - background/tab-organizer.js
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Covers the two explicit user rules: group by subject not by site, and never create two groups with the same theme. A local validation step, run before the plan reaches the UI, rejects and forces one retry when the LLM plan still violates these rules - prompt instructions alone do not reliably hold a 12B model to them. New validation step in background/tab-organizer.js, run after pass 2 completes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A group is rejected if its title matches a known site/platform token (reddit, wiki, wikipedia, youtube, github, amazon, mercado livre, twitch, stackoverflow, ...) or if its tabs are >80% one domain while spanning multiple distinct subject values
- [x] #2 A group is rejected as a semantic duplicate if its label is near-identical to another group's label, or its tab set overlaps another group's
- [x] #3 On violation, pass 2 is re-asked exactly once, with the specific violation quoted back to the model (e.g. "'Wiki' is named after a website, not a subject; it contains 4 distinct subjects: ...")
- [x] #4 If validation still fails after the retry, the better of the two plans is kept and a warning is surfaced in the UI rather than silently shipping a bad grouping
- [x] #5 At most one retry call is made per analysis
- [x] #6 A plan containing a group named 'Reddit' never reaches the UI unflagged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement validateGroupingPlan in background/tab-organizer.js to detect site-named groups, domain-dominated multi-subject groups, and semantic duplicate groups
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented validateGroupingPlan in background/tab-organizer.js detecting site tokens, single-domain multi-subject anomalies, and duplicate themes. Integrated guardrail retry mechanism into background/service-worker.js with error quoting and UI warning propagation. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented anti-site and anti-duplicate validator with single-retry feedback loop and warning flags.
<!-- SECTION:FINAL_SUMMARY:END -->
