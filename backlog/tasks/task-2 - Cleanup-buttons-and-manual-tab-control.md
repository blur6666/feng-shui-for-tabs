---
id: TASK-2
title: Cleanup buttons and manual tab control
status: Done
assignee: []
created_date: '2026-08-15 10:48'
updated_date: '2026-08-15 13:54'
labels:
  - cleanup
milestone: m-1
dependencies: []
priority: medium
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Independently useful once milestone m-0 lands. Adds local junk detection, bulk-close buckets in the existing Suggested Actions section, and middle-click-to-close on individual tab rows and whole groups. Also fixes a live bug found while scoping this work: applyGroupingPlan force-closes duplicate tabs whenever closeDuplicates is set, and sidepanel/app.js passes closeDuplicates:true unconditionally on every Apply - so Apply currently deletes tabs the user never confirmed.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All subtasks in TASK-2 (TASK-2.1, TASK-2.2, TASK-2.3) implemented, verified with automated test suites, and marked Done.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered local junk detection, middle-click fast close, categorized bulk-close chips, and non-destructive Apply Groups.
<!-- SECTION:FINAL_SUMMARY:END -->
