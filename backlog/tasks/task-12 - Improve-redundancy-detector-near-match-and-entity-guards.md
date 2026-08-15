---
id: TASK-12
title: Improve redundancy detector near-match and entity guards
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 15:04'
updated_date: '2026-08-15 15:10'
labels:
  - review
  - cleanup
  - intelligence
milestone: m-2
dependencies:
  - TASK-5
priority: high
type: bug
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #3 review: detectSemanticRedundancies only flags exact normalized subject+entity equality, missing near matches ('air fryer' vs 'air fryers'), and treats subject-only equality as redundant when entity is empty, which false-positives on generic labels ('Reference', 'Home', 'Login').
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Near-match subject+entity pairs (e.g. singular/plural) are flagged as redundancy candidates
- [x] #2 Empty-entity subject-only matches are rejected below a subject specificity/length threshold
- [x] #3 Generic fallback subjects ('Reference', 'Home', 'Login', short subjects) never trigger redundancy alone
- [x] #4 Automated test covers near-match and empty-entity cases
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 2. Require entity match; guard empty-entity subject-only matches with length threshold and generic-token blocklist
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
detectSemanticRedundancies now normalizes labels with singularization for near-match comparisons, requires entity match for subject matches, guards empty-entity subject-only matches with a length threshold and generic-token blocklist, and fixes whitespace normalization. Verified: singular/plural same-entity flagged; Reference/Home/Login never; specific empty-entity subject flagged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved redundancy detector with near-match normalization and empty-entity false-positive guards.
<!-- SECTION:FINAL_SUMMARY:END -->
