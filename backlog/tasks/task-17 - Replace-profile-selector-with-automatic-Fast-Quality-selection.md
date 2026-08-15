---
id: TASK-17
title: Replace profile selector with automatic Fast/Quality selection
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 17:56'
updated_date: '2026-08-15 17:59'
labels:
  - performance ux
dependencies: []
modified_files:
  - sidepanel/index.html
  - sidepanel/app.js
  - sidepanel/style.css
  - background/analysis-profile.js
  - background/service-worker.js
  - shared/constants.js
  - README.md
  - test-sidepanel-profiles.mjs
  - test-latency-profiles.mjs
priority: medium
type: task
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the visible Fast/Quality processing profile selector from the side panel and switch to automatic backend selection based on tab count: Quality for small tab sets, Fast for large ones. Preserve the latency and diagnostics behavior of both profiles with no visible new control.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No profile selector or hint appears in the side panel UI
- [x] #2 Backend auto-selects Quality for small tab sets and Fast for large ones without user input
- [x] #3 Existing stored fast/quality settings still resolve correctly
- [x] #4 Regression suites updated and passing
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the profile selector row and hint from sidepanel/index.html and all related DOM references/listeners/state from sidepanel/app.js. 2. Add tab-count based auto selection in background/analysis-profile.js (Quality for <= 20 tabs, Fast above) and resolve the profile in the service worker after tab collection. 3. Update DEFAULT_SETTINGS to auto mode while honoring stored fast/quality values. 4. Update README and regression suites; verify all tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed the profile selector row, hint, and all related DOM references/listeners/state from the side panel. resolveAnalysisProfile now auto-selects Quality for 20 tabs or fewer and Fast above, honoring stored fast/quality values. Service worker re-resolves the profile after collection using the authoritative tab count. DEFAULT_SETTINGS defaults to auto. README updated. Verified all four regression suites plus new auto-selection assertions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the side-panel profile selector with automatic backend selection: Quality for 20 tabs or fewer, Fast above, honoring any stored explicit profile. Removed all selector UI, updated defaults to auto, re-resolved the profile in the service worker after collection, and updated docs and regression suites. All tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
