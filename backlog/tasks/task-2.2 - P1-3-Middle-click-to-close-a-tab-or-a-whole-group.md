---
id: TASK-2.2
title: 'P1-3: Middle-click to close a tab or a whole group'
status: To Do
assignee: []
created_date: '2026-08-15 10:49'
updated_date: '2026-08-15 11:20'
labels:
  - cleanup
  - p1
  - ui
milestone: m-1
dependencies: []
modified_files:
  - sidepanel/app.js
parent_task_id: TASK-2
priority: medium
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
renderGroupsList() in sidepanel/app.js (lines 482-569). Middle-click closes the real Chrome tab immediately with no confirmation dialog (explicit user decision). restoreLastSnapshot() does not restore closed tabs, so this is a destructive action - state that limitation in the row tooltip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Middle-click (auxclick, e.button === 1) on a .tab-item-row calls chrome.tabs.remove(tabId), removes the row from the DOM, drops the id from group.tabIds, and refreshes stats
- [ ] #2 Middle-click on a .group-card header closes every tab in that group the same way
- [ ] #3 mousedown for button 1 calls e.preventDefault() to suppress Chrome's autoscroll cursor
- [ ] #4 No confirmation dialog is shown; the tab closes immediately
- [ ] #5 A tooltip states that Undo does not restore tabs closed this way
- [ ] #6 Left-click behavior on tab rows and group headers is unchanged
<!-- AC:END -->
