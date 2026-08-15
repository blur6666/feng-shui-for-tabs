---
id: TASK-23
title: >-
  Update proposed plan action button from Undo to Cancel before changes are
  applied
status: To Do
assignee: []
created_date: '2026-08-15 21:32'
labels: []
dependencies: []
priority: medium
type: enhancement
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the proposed tab groups preview screen, nothing has been applied to the browser yet. Showing an 'Undo' button causes confusion; the button should be labeled 'Cancel' to dismiss the proposed plan without applying changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The secondary action button in the proposed tab groups preview footer is labeled Cancel instead of Undo
- [ ] #2 Clicking Cancel clears the proposed plan and resets the view back to the initial state without modifying tabs
- [ ] #3 After Apply Groups is clicked and groups are created, the post-apply state allows Undoing the applied grouping
<!-- AC:END -->
