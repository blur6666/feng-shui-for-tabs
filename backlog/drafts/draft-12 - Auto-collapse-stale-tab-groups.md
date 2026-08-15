---
id: DRAFT-12
title: Auto-collapse stale tab groups
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - cleanup
  - ux
dependencies: []
references:
  - ideas3.md#6
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Automatically collapse any tab group whose tabs have not been activated within a configurable window (default 2 hours) to keep the tab strip slim and focused. Small, self-contained and non-destructive - nothing is closed, only collapsed - which makes it one of the cheapest wins in this set. Needs last-activated tracking per tab, which means a background listener on tab activation, plus chrome.tabGroups.update to set collapsed state. No LLM involvement at all, so it is independent of the entire P0 epic and could ship at any time.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Groups with no tab activated within the configured window are collapsed automatically
- [ ] #2 Window is user-configurable and defaults to 2 hours
- [ ] #3 The group containing the active tab is never collapsed
- [ ] #4 Feature can be disabled entirely in settings
<!-- AC:END -->
