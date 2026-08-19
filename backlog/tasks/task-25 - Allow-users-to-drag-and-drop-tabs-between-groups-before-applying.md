---
id: TASK-25
title: Allow users to drag and drop tabs between groups before applying
status: To Do
assignee: []
created_date: '2026-08-16 06:05'
labels: []
dependencies: []
priority: high
type: feature
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable interactive HTML5 drag and drop in the sidepanel proposed tab groups preview so users can reorder tabs, move tabs between groups, or merge small groups before applying changes to Chrome tab groups.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tab rows in proposed group cards are draggable (draggable='true') with visual drag-over indicators
- [ ] #2 Group cards and tab list containers act as valid drop targets
- [ ] #3 Dropping a tab into another group updates the in-memory plan structure (appState.plan) and refreshes group tab count badges
- [ ] #4 Empty groups resulting from moving tabs are cleanly handled or removed
- [ ] #5 Applying tab groups after drag-and-drop mutations correctly reflects the user-customized grouping in Chrome
- [ ] #6 Automated sidepanel tests verify drag-and-drop state mutation and plan consistency
<!-- AC:END -->
