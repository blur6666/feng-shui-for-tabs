---
id: TASK-3
title: Grouping granularity control (Broad / Balanced / Detailed)
status: To Do
assignee: []
created_date: '2026-08-15 13:58'
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
- [ ] #1 User can select a granularity level (Broad, Balanced, Detailed) from the side panel before running analysis
- [ ] #2 Selected granularity persists across sessions in chrome.storage.local
- [ ] #3 Granularity instruction is passed to Pass 2 clustering and adjusts group count targets and minimum group sizes
- [ ] #4 Broad produces materially fewer, wider groups than Detailed on identical tab sets
<!-- AC:END -->
