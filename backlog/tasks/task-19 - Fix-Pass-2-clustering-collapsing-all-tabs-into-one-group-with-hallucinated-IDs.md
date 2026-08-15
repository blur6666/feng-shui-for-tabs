---
id: TASK-19
title: Fix Pass-2 clustering collapsing all tabs into one group with hallucinated IDs
status: In Progress
assignee:
  - '@claude'
created_date: '2026-08-15 18:34'
updated_date: '2026-08-15 20:17'
labels:
  - bug
dependencies:
  - TASK-18.3
documentation:
  - backlog/docs/doc-5 - Latency-profiling-150-tab-analysis-on-gemma4-12b.md
priority: high
type: bug
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Independent of latency, Pass-2 clustering is producing unusable output. Measured with 150 clean synthetic labels spanning 5 clearly distinct topics, the model returned a single group containing 163 tab IDs -- more IDs than were supplied, so it hallucinated some. The prompt asks for 4-8 balanced groups and explicitly forbids dumping everything into Other, and the reconciler downstream cannot recover from a single-group plan. Two guardrails are missing: nothing validates that returned tab IDs are a subset of the input, and validateGroupingPlan does not reject a degenerate single-group plan. Found while profiling for TASK-18 but is a correctness defect, not a performance one, so it is tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tab IDs returned by Pass 2 that were not in the input are rejected rather than propagated into the plan
- [ ] #2 A degenerate plan that places nearly all tabs in one group is detected and does not reach the user unchallenged
- [ ] #3 A 150-label set spanning clearly distinct topics yields multiple topic groups consistent with the requested granularity
- [ ] #4 Regression coverage exists for both the hallucinated-ID and single-group cases
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace Pass-2 parsing, validation, reconciliation, and retry behavior to find the narrowest enforcement points. 2. Reject out-of-input tab IDs and degenerate single-group plans with diagnostics that trigger the existing validation retry/fallback path. 3. Add regression cases for hallucinated IDs, a collapsed 150-tab plan, and a valid multi-topic plan at balanced granularity. 4. Run the regression suites and a representative 150-label Pass-2 benchmark.
<!-- SECTION:PLAN:END -->
