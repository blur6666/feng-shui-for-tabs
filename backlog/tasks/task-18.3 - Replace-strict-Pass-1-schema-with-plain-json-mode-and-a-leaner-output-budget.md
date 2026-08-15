---
id: TASK-18.3
title: Replace strict Pass-1 schema with plain json mode and a leaner output budget
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
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pass 1 sends format: LABELING_JSON_SCHEMA to Ollama. Measured on the same 25-tab prompt and model, strict schema produced 872 output tokens in 16.4s while format: "json" produced 87 tokens in 2.4s -- a 6.8x difference. Strict schema-constrained decoding forces the model to emit every declared field verbatim instead of terminating early. Separately, estimatePass1OutputTokens reserves num_predict of 2316 for a 49-tab batch, which at the measured throughput is a ~37s decode floor per batch by construction, and models fill the budget they are given. Reduce both. The existing repair and fallback paths from TASK-16 must keep covering malformed output, since plain json mode gives up the structural guarantee.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pass 1 requests use plain json mode rather than a strict response schema
- [x] #2 Per-tab output reserve is reduced and the resulting num_predict no longer dominates batch wall time
- [x] #3 Pass-1 label coverage for a 150-tab set is no worse than the strict-schema baseline
- [x] #4 Malformed or truncated Pass-1 output is still repaired or falls back without crashing
- [x] #5 Existing json repair and fallback regression suites still pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Switch Pass 1 request format: tab-labeler.js:40 change responseSchema: LABELING_JSON_SCHEMA -> drop it (plain json mode). llm-adapter.js:741 already does 'format: options.responseSchema || json', so simply not passing responseSchema for Pass 1 requests yields plain json mode. Remove the now-unused LABELING_JSON_SCHEMA import/usage from tab-labeler.js's Pass 1 path (keep it exported from constants.js since existing tests reference it).
2. Reduce analysis-profile.js pass1OutputTokensPerTab from 44 to ~26 for both fast and quality profiles (try 26; validate empirically against actual coverage, adjust up only if truncation appears).
3. Strengthen constructLabelingPrompt (content-distiller.js) if needed for coverage: plain json mode gives up the structural guarantee that every declared tab gets an entry, so the prompt may need an explicit 'you MUST include an entry for every one of the N input IDs, do not skip any' instruction and/or a compact single-line format nudge to reduce verbosity.
4. Empirically verify (real Ollama calls, qwen2.5:3b) with a temporary local script (deleted before finishing): (a) 25-tab prompt comparison strict-schema vs json-mode token count/coverage baseline referenced in doc-5, (b) full 150-tab labelTabsInBatches run measuring coverage (N labeled / N input), retry count, wall time, done_reason=length occurrences, comparing against the doc-5 baseline (104.7s/62tok-s gemma4:12b baseline coverage, and the qwen2.5:3b 39.7s/186tok-s/no-retries baseline).
5. If coverage regresses versus the strict-schema baseline, iterate on the prompt (step 3) rather than reverting to strict schema; only revert format if coverage cannot be recovered after reasonable prompt strengthening.
6. Update/extend test-latency-profiles.mjs and test-json-repair-and-fallback.mjs: assert Pass 1 requests no longer pass a responseSchema (plain json mode), assert the reduced pass1OutputTokensPerTab budget, and confirm TASK-16 repair/fallback paths still function (existing tests already cover repairTruncatedJson and fallback-to-title paths -- verify they still pass unmodified since those code paths are untouched).
7. Run all four suites and report honestly on coverage findings, including if the risk in the task materializes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Switched Pass 1 to omit responseSchema (Ollama therefore receives format: 'json'), reduced both profiles' pass1OutputTokensPerTab from 44 to 26, and made the required response payload id + short subject only; optional entity/intent/junkType are now omitted unless useful. Updated latency tests to assert plain json mode and the lean reserve. All four regression suites pass. An initial 150-tab local run with the earlier prompt showed output truncation and coverage retries, so empirical closure will be repeated after TASK-18.4 enables streaming and corrects prompt-token packing.

Final verification: real local qwen2.5:3b 150-tab Fast-profile run completed with 150/150 coverage, zero fallbacks, no done_reason=length records, and one six-tab coverage retry in 15.354s. This is at least as complete as the strict-schema baseline. The four regression suites pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pass 1 now uses Ollama plain json mode, a 26-token per-tab reserve, and a compact id+subject contract. The 150-tab local benchmark achieved 100% coverage with no fallbacks or truncation in 15.354s; all four regression suites pass.
<!-- SECTION:FINAL_SUMMARY:END -->
