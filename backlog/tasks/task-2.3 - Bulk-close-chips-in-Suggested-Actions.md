---
id: TASK-2.3
title: Bulk-close chips in Suggested Actions
status: To Do
assignee: []
created_date: '2026-08-15 10:49'
updated_date: '2026-08-15 11:40'
labels:
  - cleanup
  - ui
milestone: m-1
dependencies:
  - TASK-2.1
  - TASK-1.5
modified_files:
  - sidepanel/app.js
  - sidepanel/index.html
  - sidepanel/style.css
  - background/tab-organizer.js
parent_task_id: TASK-2
priority: medium
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
renderResults() in sidepanel/app.js (lines 445-476), sidepanel/index.html, sidepanel/style.css. Group suggestedActions into buckets by type (Duplicates, New Tabs, Auth/Thank-you, Errors) with a count and a 'Close all (N)' button, expandable to inspect before confirming. Also fixes a live bug: applyGroupingPlan() force-closes duplicates whenever options.closeDuplicates is set (background/tab-organizer.js lines 298-308), and app.js line 584 passes closeDuplicates:true unconditionally on every Apply - so Apply currently deletes tabs the user never explicitly confirmed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 suggestedActions are grouped into labeled buckets (Duplicates, New Tabs, Auth/Thank-you, Errors) each showing an accurate count
- [ ] #2 Each bucket has a 'Close all (N)' button that closes exactly the tabs in that bucket
- [ ] #3 Buckets are expandable to inspect the individual tab list before confirming
- [ ] #4 Individual-row closing reuses the existing per-item close handler (app.js lines 462-470)
- [ ] #5 applyGroupingPlan / Apply Groups no longer force-closes duplicates unconditionally; it closes only what the user explicitly confirmed via a bucket or individual action
- [ ] #6 Opening 12 New Tabs and 3 duplicate tabs shows correct bucket counts; closing one bucket closes only those tabs; a subsequent Apply closes nothing further
<!-- AC:END -->
