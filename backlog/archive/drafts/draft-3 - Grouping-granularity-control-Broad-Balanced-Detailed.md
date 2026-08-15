---
id: DRAFT-3
title: Grouping granularity control (Broad / Balanced / Detailed)
status: Draft
assignee: []
created_date: '2026-08-15 11:05'
labels:
  - ideas
  - ux
  - grouping
dependencies: []
references:
  - ideas3.md#1
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the user control how specific groups should be, instead of a one-size-fits-all taxonomy. Three levels: Broad/Minimalist targets 2-4 groups and combines related topics for a clean strip; Balanced/Standard targets 4-8 groups and is the current default; Detailed/Atomic targets 8+ groups and separates projects, issues, reference docs and shopping types. Example at Broad: Work, Personal, Leisure. Example at Detailed: Rust Compiler Bugs, Rust API Docs, Cargo Issues, Weekly Groceries. UI is a horizontal slider or dropdown in the main view. Implementation note for whoever picks this up: granularity is a pass-2 clustering parameter, so this depends on the two-pass pipeline (TASK-1.5) landing first. It also interacts with the hardcoded 3-tab minimum group size, which Broad and Detailed would need to vary.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 User can select a granularity level from the side panel before running an analysis
- [ ] #2 Selected level is passed into the clustering pass and measurably changes the resulting group count
- [ ] #3 Selection persists across sessions in chrome.storage.local
- [ ] #4 Broad produces materially fewer groups than Detailed on the same tab set
<!-- AC:END -->
