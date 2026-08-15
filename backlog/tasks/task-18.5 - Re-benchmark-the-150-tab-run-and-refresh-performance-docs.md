---
id: TASK-18.5
title: Re-benchmark the 150-tab run and refresh performance docs
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 18:34'
updated_date: '2026-08-15 20:11'
labels:
  - performance
  - documentation
dependencies:
  - TASK-18.2
  - TASK-18.3
  - TASK-18.4
parent_task_id: TASK-18
priority: medium
type: task
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the loop on the latency work. Re-run the reproducible benchmark after the other subtasks land, confirm the under-60s target on the reference machine, and update the performance documentation so the README no longer describes superseded behavior (profile tuning, model recommendations, num_ctx guidance, and the claim that concurrency does not help -- the last was re-verified as correct at sequential 28.9s vs parallel 27.2s for 4x30). Record the post-change numbers next to the pre-change baseline in doc-5 so the improvement is auditable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 benchmark-analysis-profiles.mjs runs against the new defaults and its output is recorded
- [x] #2 A 150-tab run is measured end to end and the result is compared against the 104.7s Pass-1 baseline
- [x] #3 doc-5 contains post-change numbers alongside the original baseline
- [x] #4 README performance guidance matches the shipped defaults and profile behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the reproducible benchmark driver to run 150 tabs and report end-to-end Pass-1/Pass-2 timings, coverage, retries, output stop reasons, and model/profile configuration. 2. Run it with the shipped qwen2.5:3b Fast default on the reference machine. 3. Update doc-5 via Backlog CLI with the post-change measurements alongside the original baseline. 4. Align README performance guidance with the shipped default and profiles, then run all regression suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated benchmark-analysis-profiles.mjs to default to 150 tabs and emit end-to-end timing, Pass-1 coverage, fallbacks, retries, and stop reasons. Reference-machine run: Fast/qwen2.5:3b, Pass 1 11.876s, Pass 2 9.613s, total 21.698s, 100% Pass-1 coverage, zero fallbacks/retries, and three Pass-1 stop reasons. Updated doc-5 through Backlog CLI and README benchmark guidance. All four regression suites pass; git diff --check passes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The 150-tab benchmark now records end-to-end latency and operational metrics. The shipped Fast/qwen2.5:3b configuration completed in 21.698s (11.876s Pass 1 + 9.613s Pass 2) with 100% Pass-1 coverage and no retries. Documentation and README now reflect the defaults and benchmark workflow.
<!-- SECTION:FINAL_SUMMARY:END -->
