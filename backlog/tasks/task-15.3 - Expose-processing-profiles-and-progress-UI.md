---
id: TASK-15.3
title: Expose processing profiles and progress UI
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 16:40'
updated_date: '2026-08-15 17:01'
labels:
  - performance
  - ux
  - documentation
dependencies: []
modified_files:
  - sidepanel/app.js
  - sidepanel/index.html
  - sidepanel/style.css
  - README.md
parent_task_id: TASK-15
priority: medium
type: task
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Fast and Quality controls, responsive progress and diagnostics, and documentation explaining local model, context, and performance trade-offs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can select Fast or Quality processing and the choice persists safely
- [x] #2 Progress shows batch completion, elapsed time, retries, and throttled live output
- [x] #3 Fast analysis has a visible cancel control and completed runs show safe diagnostics
- [x] #4 Documentation explains model selection, context sizing, profiles, and benchmark results
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a persisted Fast/Quality selector with backwards-safe settings merging. 2. Add cancel control, run-aware progress, batch timing, retry/fallback messages, throttled streamed output, and post-run diagnostics. 3. Preserve existing provider settings and show model/context guidance without automatic model changes. 4. Update README with the profiles, practical local model guidance, diagnostics, and reproducible benchmark procedure.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified persisted Fast/Quality selection in chrome.storage.local, progress meta with batch/retry/timing/tok-rate details, throttled live streaming output to prevent reflow starvation, cancel button sending CANCEL_ANALYSIS and setting cancelled state, diagnostics details card showing safe metrics, and README documentation with profiles table, model/context recommendations, and reproducible benchmark commands. Ran node test-sidepanel-profiles.mjs and automated 100-tab Ollama benchmarks (Fast: 26.2s across 2 Pass-1 batches; Quality: 33.2s across 5 Pass-1 batches).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Exposed persisted Fast and Quality processing profile selector, responsive progress with stage/batch/timing/rate meta, throttled live streaming output, visible Cancel button sending CANCEL_ANALYSIS, post-run diagnostics details, and comprehensive documentation with benchmark instructions. Verified with unit regression tests and live 100-tab Ollama benchmarks.
<!-- SECTION:FINAL_SUMMARY:END -->
