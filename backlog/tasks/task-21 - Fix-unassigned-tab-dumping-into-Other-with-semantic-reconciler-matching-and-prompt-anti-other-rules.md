---
id: TASK-21
title: >-
  Fix unassigned tab dumping into Other with semantic reconciler matching and
  prompt anti-other rules
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 21:15'
updated_date: '2026-08-15 21:22'
labels: []
dependencies: []
priority: high
type: bug
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tabs sharing obvious subjects (such as Codex CLI, Kagi Codex search, Substack Codex guide) were dumped into Other instead of matching existing groups (Claude Code, OpenCodex, ChatGPT) due to domain-only reconciliation and prompt instruction encouraging dumping small topics into Other.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SYSTEM_PROMPT removes instruction telling the model to merge small topics into Other
- [x] #2 reconcilePlanWithRawTabs matches unassigned tabs against existing groups using tab title and semantic keywords, not domain alone
- [x] #3 Unassigned tabs with matching subject tokens (e.g. Codex) are merged into relevant groups rather than relegated to Other
- [x] #4 Regression tests verify semantic unassigned tab reconciliation
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove prompt instruction in SYSTEM_PROMPT telling model to merge small topics into Other. 2. Implement semantic keyword/subject matching for unassigned tabs in reconcilePlanWithRawTabs. 3. Verify that tabs with matching topics (e.g. Codex) are grouped into relevant clusters rather than dumped into Other.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed prompt instruction encouraging dumping into Other, implemented semantic keyword matching and fallback topic clustering in reconcilePlanWithRawTabs, and added regression tests in test-reconciliation-robustness.mjs.
<!-- SECTION:FINAL_SUMMARY:END -->
