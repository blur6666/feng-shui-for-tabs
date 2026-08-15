---
id: DRAFT-16
title: 'Named session workspaces: save and restore group structures'
status: Draft
assignee: []
created_date: '2026-08-15 11:08'
labels:
  - ideas
  - sessions
dependencies: []
references:
  - ideas3.md#9
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Save an entire grouping setup as a named workspace - Home Renovation, Q3 Tax Prep, Feature X Build - and restore all associated tabs in their respective groups in one click. Distinct from the existing undo snapshot, which is a single-slot rollback of the last apply; workspaces are durable, named, and re-openable after a browser restart. Storage shape matters here: storing full page state is out of scope, storing URL plus group membership plus group title and colour is enough. Worth checking the size limits of chrome.storage.local against a 250-tab workspace before committing to a format.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A grouping setup can be saved under a user-supplied name and listed afterwards
- [ ] #2 Restoring a workspace reopens its tabs in their original groups with original titles and colours
- [ ] #3 Workspaces survive a browser restart
- [ ] #4 Saving a 250-tab workspace stays within chrome.storage.local limits, verified
<!-- AC:END -->
