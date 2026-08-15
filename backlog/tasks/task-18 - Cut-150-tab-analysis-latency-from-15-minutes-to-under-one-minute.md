---
id: TASK-18
title: Cut 150-tab analysis latency from 15+ minutes to under one minute
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 18:32'
updated_date: '2026-08-15 20:11'
labels:
  - performance
dependencies: []
documentation:
  - backlog/docs/doc-5 - Latency-profiling-150-tab-analysis-on-gemma4-12b.md
priority: high
type: task
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A 150-tab analysis is expected to finish in under a minute but currently takes 15+ minutes and frequently never completes. Profiling against the real pipeline on the users machine (see doc-5) attributes this to four independent causes: the default model is gemma4:12b (3x slower per token than qwen2.5:3b and it drops labels, forcing retries); strict schema-constrained decoding costs up to 6.8x the wall time of plain json mode; oversized num_predict reserves create a ~37s decode floor per batch; and stream:false on Pass 1 disables the stall detector so slow batches burn the full timeout and then retry from scratch. A separate crash makes every run of 20 tabs or fewer fail outright. This parent tracks the latency work as a whole; subtasks deliver it in reviewable slices, cheapest and safest first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A 150-tab analysis completes end to end in under 60 seconds on the reference machine with the default configuration
- [x] #2 A 150-tab analysis completes without any batch hitting a request or stall timeout
- [x] #3 Analyses of 20 tabs or fewer complete without crashing
- [x] #4 No regression in the four existing regression suites
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix the small-tab auto-profile crash and ensure the post-collection profile settings propagate. 2. Ship qwen2.5:3b as the fresh-install Ollama default without changing existing settings. 3. Make Pass 1 compact, plain-json, streamed, and conservatively budgeted. 4. Verify the full 150-tab pipeline on the reference machine, update the benchmark and performance documentation, and run all regression suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final verification: benchmark-analysis-profiles.mjs Fast/qwen2.5:3b 150-tab reference-machine run completed end to end in 21.698s (Pass 1 11.876s; Pass 2 9.613s), with no request or stall timeout, 100% Pass-1 coverage, zero fallbacks/retries, and Pass-1 stop reasons stop/stop/stop. testSmallTabSetProfileReresolutionDoesNotCrash verifies a 10-tab auto-profile run succeeds. All four regression suites pass and git diff --check is clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed all five latency subtasks. The default Fast/qwen2.5:3b 150-tab reference run completes end to end in 21.698s, with no request or stall timeout and 100% Pass-1 coverage. Small analyses no longer crash; the four regression suites pass; benchmark and performance documentation are updated.
<!-- SECTION:FINAL_SUMMARY:END -->
