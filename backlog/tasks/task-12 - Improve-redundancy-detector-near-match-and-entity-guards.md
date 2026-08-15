---
id: TASK-12
title: Improve redundancy detector near-match and entity guards
status: To Do
assignee: []
created_date: '2026-08-15 15:04'
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
- [ ] #1 Near-match subject+entity pairs (e.g. singular/plural) are flagged as redundancy candidates
- [ ] #2 Empty-entity subject-only matches are rejected below a subject specificity/length threshold
- [ ] #3 Generic fallback subjects ('Reference', 'Home', 'Login', short subjects) never trigger redundancy alone
- [ ] #4 Automated test covers near-match and empty-entity cases
<!-- AC:END -->
