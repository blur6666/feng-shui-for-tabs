---
id: TASK-11
title: Surface Privacy Shield shielded-tab count in results UI
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 15:04'
updated_date: '2026-08-15 15:10'
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
- [x] #1 collectAllTabs returns a shieldedTabs count of tabs excluded by the privacy blocklist
- [x] #2 The count flows through the analysis response into the side panel results
- [x] #3 Results UI renders a visible 'N tabs protected by Privacy Shield' notice when N > 0
- [x] #4 Automated test verifies counting and empty-count behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 2. Include shieldedTabs in service-worker analysis response
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
collectAllTabs now counts and returns shieldedTabs; service-worker forwards it in the analysis response; sidepanel stores it on the plan and renders a privacy-shield banner with count and pluralization. Verified with shielded-count logic test and full syntax checks.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Surfaced Privacy Shield shielded-tab count in the results UI with a visible banner.
<!-- SECTION:FINAL_SUMMARY:END -->
