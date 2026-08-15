---
id: TASK-18.1
title: Fix const reassignment crash on analyses of 20 tabs or fewer
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 18:33'
updated_date: '2026-08-15 18:53'
labels:
  - performance
  - bug
dependencies: []
modified_files:
  - background/service-worker.js
  - test-latency-profiles.mjs
parent_task_id: TASK-18
priority: high
type: bug
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
background/service-worker.js declares profile with const, then reassigns it after tab collection when the auto-resolved profile differs from the pre-collection guess. Verified this throws TypeError: Assignment to constant variable. Auto mode always resolves to Fast before collection (tab count defaults to 0) and to Quality at 20 tabs or fewer, so every analysis of 20 tabs or fewer crashes. 21+ tabs survive only because both sides happen to resolve to Fast. Introduced by TASK-17 and never exercised on a small tab set.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An analysis of 20 tabs or fewer completes without throwing
- [x] #2 The profile actually used after collection is the one auto-selected from the authoritative tab count, and diagnostics report it
- [x] #3 Request timeout, stall timeout and keep-alive options reflect the re-resolved profile
- [x] #4 A regression test covers the small-tab-set path and fails against the current code
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change 'const profile' to 'let profile' at service-worker.js:257 so the reassignment at line 309 does not throw.
2. Verify the re-resolution block (lines 307-314) already updates requestOptions.timeoutMs/stallTimeoutMs/keepAlive and diagnostics.profile from the authoritative post-collection profile; confirm labelTabsInBatches and pass2Options both consume requestOptions (they do, via spread), so no further wiring changes should be needed once the crash is fixed.
3. Add a regression test to test-latency-profiles.mjs that drives the ANALYZE_TABS path (or an equivalent unit-level harness) with <=20 tabs so auto mode resolves Quality post-collection while Fast was guessed pre-collection, asserting no TypeError is thrown and that the final requestOptions reflect the Quality profile's timeouts/keepAlive.
4. Run all four test suites.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: service-worker.js:257 declared 'const profile' and reassigned it at line 309 in the auto-mode post-collection re-resolution block, throwing TypeError: Assignment to constant variable for every analysis of AUTO_QUALITY_MAX_TABS (20) or fewer tabs (auto mode guesses Fast pre-collection since tabCount=0, then re-resolves to Quality once the real tab count is known).

Fix: changed 'const profile' to 'let profile' (service-worker.js:257). No other changes needed -- the existing re-resolution block at lines 307-314 already updates diagnostics.profile and requestOptions.timeoutMs/stallTimeoutMs/keepAlive from the re-resolved profile, and both labelTabsInBatches (line 332, via {...requestOptions, profile}) and the Pass-2 pass2Options (line 358, via {...requestOptions}) consume requestOptions by spread, so the corrected values propagate automatically once the reassignment itself stops throwing.

Regression test added: test-latency-profiles.mjs::testSmallTabSetProfileReresolutionDoesNotCrash. It stubs chrome.* (windows.getAll, scripting.executeScript, storage.local.get, runtime.onMessage) and LLMAdapter (generateGroupingPlan, warmOllama), dynamically imports background/service-worker.js with a cache-busting query string, and drives the real onMessage handler with an ANALYZE_TABS message for 10 tabs (<= AUTO_QUALITY_MAX_TABS). Verified this test fails against the pre-fix code with the exact reported error (AssertionError: 'Analysis must not crash for a 10-tab set: Assignment to constant variable') by temporarily reverting only the const->let edit and re-running; passes cleanly with the fix applied.

Also asserts diagnostics.profile === 'quality' (correct re-resolution) and that the captured Pass-1 request options (timeoutMs, stallTimeoutMs, keepAlive) match ANALYSIS_PROFILES.quality rather than the pre-collection Fast guess, directly covering AC #2 and #3.

All four suites pass: test-latency-profiles.mjs, test-sidepanel-profiles.mjs, test-json-repair-and-fallback.mjs, test-reconciliation-robustness.mjs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the const-reassignment crash: service-worker.js:257 'const profile' -> 'let profile', which was throwing TypeError: Assignment to constant variable on every analysis of <=20 tabs (auto mode resolves Fast pre-collection, Quality post-collection). The existing re-resolution block (lines 307-314) already propagated the corrected profile's timeouts/stallTimeout/keepAlive into requestOptions, which both Pass 1 (labelTabsInBatches) and Pass 2 consume by spread, so no further wiring was needed. Added test-latency-profiles.mjs::testSmallTabSetProfileReresolutionDoesNotCrash, which drives the real onMessage handler with a 10-tab ANALYZE_TABS request against stubbed chrome.* and LLMAdapter; verified it fails against the pre-fix code with the exact reported TypeError and passes with the fix. It also asserts diagnostics.profile === 'quality' and that Pass-1 request timeoutMs/stallTimeoutMs/keepAlive equal ANALYSIS_PROFILES.quality (AC2, AC3). All four suites (test-latency-profiles.mjs, test-sidepanel-profiles.mjs, test-json-repair-and-fallback.mjs, test-reconciliation-robustness.mjs) pass.
<!-- SECTION:FINAL_SUMMARY:END -->
