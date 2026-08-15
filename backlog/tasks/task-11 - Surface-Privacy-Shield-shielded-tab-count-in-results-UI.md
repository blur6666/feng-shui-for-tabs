---
id: TASK-11
title: Surface Privacy Shield shielded-tab count in results UI
status: To Do
assignee: []
created_date: '2026-08-15 15:04'
labels:
  - review
  - privacy
  - ui
milestone: m-2
dependencies:
  - TASK-4
priority: high
type: feature
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #3 review: shielded tabs are dropped silently at collection, so users cannot tell the shield did anything or how many tabs were excluded. Return a shielded count from collectAllTabs and surface it in the results UI (e.g. 'N tabs protected by Privacy Shield').
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 collectAllTabs returns a shieldedTabs count of tabs excluded by the privacy blocklist
- [ ] #2 The count flows through the analysis response into the side panel results
- [ ] #3 Results UI renders a visible 'N tabs protected by Privacy Shield' notice when N > 0
- [ ] #4 Automated test verifies counting and empty-count behavior
<!-- AC:END -->
