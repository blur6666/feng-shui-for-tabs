---
id: DRAFT-14
title: Multi-monitor spatial routing and Zen focus mode
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - window-management
dependencies: []
references:
  - ideas3.md#7
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Distribute groups across physical windows and monitors instead of stacking everything in one tab strip. Window-per-context allocation: main monitor gets active coding/work/primary task, secondary monitor gets documentation, chat, music and references. Zen/Focus Mode isolation: temporarily extract only the 2-3 tabs needed for the current task into a clean separate window, leaving everything else grouped in the background, and restore them on exit. Uses chrome.windows APIs; note that Chrome cannot query which physical monitor a window sits on beyond screen coordinates, so monitor assignment has to be inferred from window bounds or configured by the user. Zen mode needs a reliable restore path - the existing restoreLastSnapshot does not restore across windows, so that gap needs closing first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Groups can be distributed across multiple windows in one action
- [ ] #2 Zen mode extracts a chosen set of tabs into a new window and restores them to their original group on exit
- [ ] #3 Restore returns every tab to its prior window and group, verified after a browser restart
<!-- AC:END -->
