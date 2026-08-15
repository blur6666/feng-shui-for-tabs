---
id: DRAFT-9
title: 'Multi-state previews: compare two grouping plans before applying'
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - ux
dependencies: []
references:
  - ideas3.md#4
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On Analyze, generate two distinct organization plans - for example Plan A Broad/Minimalist and Plan B Detailed/Categorized - and let the user preview both before applying. UI is a toggle such as [View Plan A (3 Groups)] [View Plan B (7 Groups)] with a side-by-side or carousel comparison. Cost caveat for whoever picks this up: on the reference environment (gemma 12B local via Ollama, 250+ tabs) this doubles the clustering pass. It is only cheap if it reuses a single pass-1 labeling run and varies only pass 2, which the two-pass pipeline (TASK-1.5) makes possible. Do not implement as two full independent analyses. Natural companion to the granularity draft - the two plans are really two granularity settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two plans are generated from a single pass-1 labeling run, with only the clustering pass repeated
- [ ] #2 User can switch between plans and see group counts and membership for each before applying
- [ ] #3 Applying commits exactly one plan; the other is discarded
- [ ] #4 Total added latency on a 250-tab session is bounded by one extra clustering call, measured and logged
<!-- AC:END -->
