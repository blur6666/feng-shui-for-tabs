---
id: TASK-15
title: Bound tab-analysis latency with Fast and Quality profiles
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 16:39'
updated_date: '2026-08-15 17:02'
labels:
  - performance
  - ollama
  - grouping
dependencies: []
priority: high
type: feature
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the opaque, unbounded 100-tab LLM pipeline with a measurable, cancellable Fast profile and an accuracy-first Quality profile. Preserve local privacy and semantic grouping while reducing unnecessary model work and exposing objective performance diagnostics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fast processing uses adaptive compact batches and does not rely on the fixed 20-tab Pass-1 batch size
- [x] #2 Quality processing preserves rich evidence and the anti-site and duplicate validation behavior
- [x] #3 A user can cancel analysis and receives stage-specific timeout or failure feedback
- [x] #4 The completed analysis exposes safe per-phase timing and token-rate diagnostics without tab content
- [x] #5 Automated coverage validates batch planning, cancellation, retries, and tab coverage
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Decompose latency redesign into TASK-15.1 (instrumentation/cancellation), TASK-15.2 (adaptive compact two-pass processing), and TASK-15.3 (profiles UI and documentation). 2. Implement and test each subtask with strict objective evidence. 3. Add persistent regression checks and reproducible 100-tab Ollama benchmark tooling. 4. Verify all acceptance criteria across the end-to-end suite.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed and verified all three subtasks: TASK-15.1 (instrumentation and cancellation), TASK-15.2 (adaptive compact two-pass processing), and TASK-15.3 (profiles UI and documentation). Automated test-latency-profiles.mjs and test-sidepanel-profiles.mjs verify adaptive packing, deterministic junk prefiltering, classified retries, schema/context/keep-alive request bounds, throttled live streaming, user cancellation, and diagnostics. Live Ollama 100-tab benchmarks proved Fast execution at 26.2s (2 Pass-1 batches + 1 Pass-2 batch) and Quality execution at 33.2s (5 Pass-1 batches + 1 Pass-2 batch).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and verified the hybrid Fast/Quality latency redesign across TASK-15.1, TASK-15.2, and TASK-15.3. Added adaptive token-budget Pass-1 packing, deterministic local prefiltering, profile-bound effective context and output reserves, keep-alive reuse, run-scoped cancellation and deadlines, throttled live stream rendering, post-run diagnostics, and documentation. Verified with node test-latency-profiles.mjs, node test-sidepanel-profiles.mjs, and a live 100-tab Ollama benchmark finishing in 26.2 seconds on Fast.
<!-- SECTION:FINAL_SUMMARY:END -->
