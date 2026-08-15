---
id: TASK-8
title: Stack PR2 on PR1 with milestone-only diff
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 14:33'
updated_date: '2026-08-15 14:38'
labels:
  - review
  - delivery
  - git
milestone: m-1
dependencies:
  - TASK-6
priority: high
type: chore
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve PR #2 review feedback about duplicated milestone scope. PR #2 must be a stacked follow-up to PR #1 so its diff contains only Milestone m-1 cleanup-control work, while inherited PR #1 fixes are supplied by its base branch rather than duplicated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PR #2 base branch is feat/m0-subject-grouping-and-two-pass-pipeline rather than master
- [x] #2 PR #2 head is a linear descendant of the PR #1 head
- [x] #3 PR #2 diff against its base is limited to Milestone m-1 cleanup control files and Backlog metadata
- [x] #4 PR #2 review response documents that the six inherited PR #1 findings are addressed in the base and identifies any m-1-specific regression separately
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify PR #2 base/head refs through GitHub CLI and compare merge-base with PR #1 head
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified with gh pr view that PR #2 base is feat/m0-subject-grouping-and-two-pass-pipeline; git merge-base confirms PR #1 is an ancestor of PR #2; and three-dot diff lists only m-1 cleanup files plus Backlog metadata. Posted a PR #2 disposition comment and individual thread replies explaining inherited fixes and TASK-7's m-1-specific XSS/syntax repair.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Converted PR #2 into a correctly scoped stacked PR on PR #1, verified ancestry and m-1-only diff, and documented review dispositions in GitHub.
<!-- SECTION:FINAL_SUMMARY:END -->
