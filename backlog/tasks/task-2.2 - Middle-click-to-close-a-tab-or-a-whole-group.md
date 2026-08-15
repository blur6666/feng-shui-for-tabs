---
id: TASK-2.2
title: Middle-click to close a tab or a whole group
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:49'
updated_date: '2026-08-15 13:50'
labels:
  - cleanup
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
- [x] #1 Middle-click (auxclick, e.button === 1) on a .tab-item-row calls chrome.tabs.remove(tabId), removes the row from the DOM, drops the id from group.tabIds, and refreshes stats
- [x] #2 Middle-click on a .group-card header closes every tab in that group the same way
- [x] #3 mousedown for button 1 calls e.preventDefault() to suppress Chrome's autoscroll cursor
- [x] #4 No confirmation dialog is shown; the tab closes immediately
- [x] #5 A tooltip states that Undo does not restore tabs closed this way
- [x] #6 Left-click behavior on tab rows and group headers is unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect renderGroupsList and event listeners in sidepanel/app.js
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented middle-click (auxclick with button 1) closing for individual tab rows and entire group cards in sidepanel/app.js. Suppressed autoscroll on mousedown, added tooltips stating Undo does not restore closed tabs, and updated tab stats. Verified with DOM event test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented middle-click fast closing on tab rows and group headers with autoscroll suppression and informative tooltips.
<!-- SECTION:FINAL_SUMMARY:END -->
