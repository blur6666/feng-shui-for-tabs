---
id: TASK-26
title: >-
  Fix PR5 review findings across grouping pipeline, extraction, and undo
  lifecycle
status: Done
assignee:
  - '@claude'
created_date: '2026-08-19 22:14'
updated_date: '2026-08-19 22:14'
labels: []
dependencies: []
references:
  - 'https://github.com/blur6666/feng-shui-for-tabs/pull/5'
modified_files:
  - background/tab-organizer.js
  - background/tab-labeler.js
  - background/tab-collector.js
  - background/content-distiller.js
  - content/extractor.js
  - sidepanel/app.js
priority: high
type: bug
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #5 review and a follow-up code review surfaced seven defects, six of them a shared shape: a field or guard that silently evaluated to empty, so the protection looked present in the code but never fired, and no test covered it. Landed on master in squash 927548c.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 consolidateSmallGroups enforces the granularity minSize again without ever producing a dominant Other group
- [x] #2 Dense prompt indices outside the idMap are dropped rather than accepted as real Chrome tab IDs
- [x] #3 Group labels survive mergeDuplicateGroups so sub-minSize semantic scoring has tokens to match on
- [x] #4 The fallback clusterer has a usable url signal and matches isolated tabs on raw-tab data
- [x] #5 Search queries are decoded exactly once and JSON-LD object values never reach prompts as [object Object]
- [x] #6 Undo stays reachable while its session snapshot is still restorable
- [x] #7 Every fix has regression coverage and all four suites pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Enforcement of minSize is budgeted rather than literal: the one-line fix the review proposed (group.tabIds.length >= minSize alone) collapses 112 tabs in 56 LLM-made pairs into a single Other group, failing Case 4 of test-reconciliation-robustness.mjs and reintroducing the TASK-21 dump. Sub-minSize groups are now offered to a semantically matching group first, then dissolved into Other only while Other stays within max(3, 20% of the plan). Broad and Detailed (minSize 2) behavior is unchanged. Also corrected the review premise: master did not enforce the Balanced 3-tab minimum either, since PR #4 (1247dba) had added an explicit preserve-2-tab-groups block; the defect predates this branch.

Verification: all four Node suites pass (test-reconciliation-robustness, test-latency-profiles, test-json-repair-and-fallback, test-sidepanel-profiles) on the merged master. Nine regression cases added; each was confirmed to fail against the previous behavior by stashing the fix and re-running. Findings 3 and 5 were additionally reproduced against single-fix-reverted copies of the module. No browser verification was performed - all checks are Node-level against stubs, and content/extractor.js has no DOM harness, so the distillTabsForPrompt guard is the tested layer for the JSON-LD fix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed seven defects found in review of PR #5: budgeted minSize enforcement in consolidateSmallGroups, dense-index rejection in normalizePlanGroups, label preservation through mergeDuplicateGroups, url signal restored for the fallback clusterer, single-decode search queries, JSON-LD value normalization, and a canUndo-driven Undo lifecycle in the sidepanel. Verified with nine new regression cases across three suites, each confirmed failing before its fix; all four suites pass. Landed on master in squash 927548c.
<!-- SECTION:FINAL_SUMMARY:END -->
