---
id: TASK-22
title: Fix broken favicon HTML injection in sidepanel tab list
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 21:15'
updated_date: '2026-08-15 21:22'
labels: []
dependencies: []
priority: medium
type: bug
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The defaultIcon SVG string contains unescaped double quotes inside onerror handler breaking the HTML attribute and rendering raw alt markup before every tab title.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 defaultIcon is safely escaped or handled via an image error event listener
- [x] #2 No raw HTML or alt markup renders before tab titles in the sidepanel UI
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Safely render tab favicon img in sidepanel/app.js. 2. Verify with tests.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Safely URL-encoded defaultIcon SVG data URI and added onerror=null guard in sidepanel/app.js, verified with test-sidepanel-profiles.mjs.
<!-- SECTION:FINAL_SUMMARY:END -->
