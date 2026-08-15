---
id: TASK-2
title: Cleanup buttons and manual tab control
status: To Do
assignee: []
created_date: '2026-08-15 10:48'
updated_date: '2026-08-15 11:40'
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
Independently useful once P0 lands. Adds local junk detection, bulk-close buckets in the existing Suggested Actions section, and middle-click-to-close on individual tab rows and whole groups. Also fixes a live bug found while scoping this work: applyGroupingPlan force-closes duplicate tabs whenever closeDuplicates is set, and sidepanel/app.js passes closeDuplicates:true unconditionally on every Apply - so Apply currently deletes tabs the user never confirmed.
<!-- SECTION:DESCRIPTION:END -->
