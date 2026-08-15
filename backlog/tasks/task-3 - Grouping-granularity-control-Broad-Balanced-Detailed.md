---
id: TASK-3
title: Grouping granularity control (Broad / Balanced / Detailed)
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 13:58'
updated_date: '2026-08-15 14:00'
labels:
  - ux
  - grouping
milestone: m-2
dependencies: []
priority: high
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the user control how specific groups should be, instead of a one-size-fits-all taxonomy. Three levels: Broad/Minimalist targets 2-4 groups and combines related topics for a clean strip; Balanced/Standard targets 4-8 groups and is the current default; Detailed/Atomic targets 8+ groups and separates projects, issues, reference docs and shopping types. UI is a horizontal control/dropdown in the main side panel view, passed to Pass 2 clustering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User can select a granularity level (Broad, Balanced, Detailed) from the side panel before running analysis
- [x] #2 Selected granularity persists across sessions in chrome.storage.local
- [x] #3 Granularity instruction is passed to Pass 2 clustering and adjusts group count targets and minimum group sizes
- [x] #4 Broad produces materially fewer, wider groups than Detailed on identical tab sets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Granularity selector (Broad / Balanced / Detailed) in sidepanel/index.html and sidepanel/style.css
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Grouping Granularity selector in sidepanel/index.html with Broad (2-4), Balanced (4-8), and Detailed (8+) modes. Persisted selection in chrome.storage.local via sidepanel/app.js. Passed granularity into constructClusteringPrompt and background/service-worker.js to steer Pass 2 clustering. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented user-controlled grouping granularity (Broad, Balanced, Detailed) across UI, storage, prompt construction, and clustering pipeline.
<!-- SECTION:FINAL_SUMMARY:END -->
