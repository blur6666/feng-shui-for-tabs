---
id: DRAFT-1
title: 'P2-1: Interactive refinement with durable rules'
status: Draft
assignee: []
created_date: '2026-08-15 10:49'
labels:
  - refinement
  - p2
  - deferred
dependencies: []
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deferred by explicit decision: the first grouping must be trustworthy (P0 done, validated) before refinement is worth building. Per-group 'Refine' control accepts a free-text request (e.g. 'split the cooking stuff out of this group') and re-sends only that group to the LLM. Accepting a refinement persists a durable rule in chrome.storage.local, injected into every future analysis prompt, so the taxonomy is learned over time. Requires a rules-list UI with delete, otherwise bad rules become permanent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A per-group Refine control accepts free text and re-sends only that group's tabs to the LLM, leaving other groups untouched
- [ ] #2 Accepting a refinement persists a durable rule to chrome.storage.local
- [ ] #3 Persisted rules are injected into every future analysis prompt
- [ ] #4 A rules-list UI exists showing all persisted rules with a delete action per rule
<!-- AC:END -->
