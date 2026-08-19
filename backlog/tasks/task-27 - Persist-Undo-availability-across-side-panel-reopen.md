---
id: TASK-27
title: Persist Undo availability across side panel reopen
status: To Do
assignee: []
created_date: '2026-08-19 22:15'
labels: []
dependencies: []
references:
  - sidepanel/app.js
  - background/tab-organizer.js
priority: medium
type: enhancement
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
appState.canUndo tracks whether an applied grouping is still restorable, but it lives only in the side panel session. Closing and reopening the panel resets it to false, so a snapshot the service worker still holds in chrome.storage.session becomes unreachable through the UI even though UNDO_GROUPS would succeed. Needs a way for the panel to ask whether a snapshot exists on load.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reopening the side panel while a session snapshot exists shows the Undo action
- [ ] #2 Reopening with no snapshot leaves Undo hidden
- [ ] #3 Undo hides again once the snapshot is consumed or cleared
<!-- AC:END -->
