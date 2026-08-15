---
id: TASK-14
title: Honor granularity min-size on the Apply path
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 15:24'
updated_date: '2026-08-15 15:26'
labels:
  - review grouping ux
milestone: m-2
dependencies:
  - TASK-10
priority: high
type: bug
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #3 review blocker (head 4ae7bbce): reconcilePlanWithRawTabs() honors granularityToMinSize(), but applyGroupingPlan() in background/tab-organizer.js hardcodes consolidateSmallGroups(plan.groups, 3) and the APPLY_GROUPS handler only forwards {consolidation, closeDuplicates}. Broad/Detailed previews can show 2-tab groups, but clicking Apply re-merges them to a 3-tab minimum, so the applied result contradicts the selected granularity. Carry granularity into applyGroupingPlan (store it on the plan and/or pass it in options) and use granularityToMinSize() there too.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Selected granularity reaches applyGroupingPlan instead of a hardcoded minSize of 3
- [x] #2 Applying a Broad or Detailed plan preserves 2-tab groups exactly as previewed
- [x] #3 Applying a Balanced plan still enforces the 3-tab minimum
- [x] #4 Granularity survives the sidepanel-to-service-worker APPLY_GROUPS round trip
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Persist granularity on the reconciled plan in reconcilePlanWithRawTabs. 2. Read granularity from options (falling back to plan.granularity) in applyGroupingPlan and pass granularityToMinSize(granularity) to consolidateSmallGroups. 3. Forward the selected granularity in the sidepanel APPLY_GROUPS options payload. 4. Verify preview and apply agree for broad/balanced/detailed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
reconcilePlanWithRawTabs now stamps plan.granularity; applyGroupingPlan resolves granularity from options.granularity -> plan.granularity -> 'balanced' and feeds granularityToMinSize() into consolidateSmallGroups instead of the hardcoded 3. The APPLY_GROUPS handler in background/service-worker.js merges a resolved granularity into the apply options, and sidepanel/app.js forwards appState.plan.granularity (falling back to the granularity selector) in the APPLY_GROUPS payload. Verified with a throwaway Node ESM harness (chrome API stubs) over the real module: 13/13 checks passed - broad/detailed apply keeps three 2-tab groups via both plan.granularity and options.granularity, balanced apply collapses 2-tab groups into Other and keeps 3-tab groups, missing granularity still defaults to minSize 3.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Threaded granularity into the Apply path so applyGroupingPlan enforces granularityToMinSize() instead of a hardcoded 3; verified with a Node harness against the real module (13/13 checks passed) that Broad/Detailed applies preserve previewed 2-tab groups while Balanced keeps the 3-tab minimum.
<!-- SECTION:FINAL_SUMMARY:END -->
