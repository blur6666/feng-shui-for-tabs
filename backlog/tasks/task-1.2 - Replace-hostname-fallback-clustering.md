---
id: TASK-1.2
title: Replace hostname fallback clustering
status: To Do
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 11:41'
labels:
  - grouping
milestone: m-0
dependencies: []
modified_files:
  - background/tab-organizer.js
parent_task_id: TASK-1
priority: high
type: bug
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
reconcilePlanWithRawTabs() in background/tab-organizer.js (lines 405-448) clusters any tab the LLM failed to assign by hostname (reddit.com -> Reddit, wiki/fandom/gamepedia -> Wiki, github/gitlab -> Code, youtube/twitch -> Video). Combined with the context-truncation bug (TASK-1.4), this is where most Reddit/Wiki groups actually originate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The hostname-to-label mapping (reddit/wiki/fandom/gamepedia/github/gitlab/youtube/twitch) is fully removed from reconcilePlanWithRawTabs()
- [ ] #2 Unassigned tabs are never used to mint a new domain-named group
- [ ] #3 All unassigned tabs are routed into a single 'Other' group via the existing consolidateSmallGroups() leftover path
- [ ] #4 The unassigned tab count is logged (console.warn) so a high count is a visible signal rather than silently papered over
<!-- AC:END -->
