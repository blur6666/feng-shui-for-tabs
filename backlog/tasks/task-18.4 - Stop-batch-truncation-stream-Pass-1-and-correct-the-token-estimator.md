---
id: TASK-18.4
title: 'Stop batch truncation: stream Pass 1 and correct the token estimator'
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 18:34'
updated_date: '2026-08-15 20:09'
labels:
  - performance
dependencies: []
parent_task_id: TASK-18
priority: high
type: task
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two coupled defects make heavy batches fail expensively. First, background/tab-labeler.js sets stream: false for Pass 1, and Ollama withholds response headers until generation completes (verified: headers at 12961ms, body at 12963ms), so control.touch() never fires mid-request and stallTimeoutMs degrades into a plain total timeout -- a slow batch is killed at 45s having done real work, then retried from scratch. This is the most likely mechanism behind runs that never finish. Second, estimateTokens uses chars/4 and under-estimates JSON payloads by roughly 10% (predicted 6723 vs actual 7444 on a 50-tab batch), so the planner packs batches past their real budget until Ollama returns done_reason=length mid-JSON. Fix both so batches stay inside their real budget and genuinely stalled requests are distinguished from slow ones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pass 1 streams so the stall detector observes real token activity and a progressing request is not aborted
- [x] #2 Token estimation no longer under-estimates JSON payloads, verified against actual prompt_eval_count
- [x] #3 No batch in a 150-tab run returns done_reason=length
- [x] #4 A genuinely stalled request is still aborted by the stall timeout
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change Pass-1 requests to stream and verify the Ollama NDJSON reader touches the stall timer on each response chunk. 2. Calibrate the shared token estimator against the measured JSON-heavy prompt payload, then update planner tests to prevent under-estimation. 3. Add regression coverage for progressing streams and truly stalled requests. 4. Run the 150-tab local benchmark to verify no done_reason=length responses, coverage, retries, and total latency; use its metrics to close TASK-18.3 and document TASK-18.5.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final verification: Pass-1 requests stream. test-latency-profiles.mjs proves active NDJSON chunks keep a 20ms stall deadline alive and a silent stream is aborted by it. estimateTokens now budgets JSON at chars/3.5 instead of chars/4. The real 150-tab qwen2.5:3b run completed in 15.354s with 150/150 coverage, zero done_reason=length records, and zero fallbacks; prompt_eval_count was 4,651-4,699 for the 50-tab batches. All four regression suites pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enabled streamed Pass-1 requests and conservative JSON token budgeting (chars/3.5). Regression tests cover progress-aware stall handling and true stalls; the 150-tab local qwen2.5:3b run had no truncations and completed with 100% coverage in 15.354s.
<!-- SECTION:FINAL_SUMMARY:END -->
