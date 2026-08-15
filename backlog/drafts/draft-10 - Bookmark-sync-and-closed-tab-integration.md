---
id: DRAFT-10
title: Bookmark sync and closed-tab integration
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - integration
dependencies: []
references:
  - ideas3.md#5
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend organization beyond open tabs into the rest of the browser. Bookmark Sync Organizer: analyze open tabs, check whether matching folders already exist in the bookmark bar, and offer to file open tabs into those folders, or archive stale tabs into a new folder named AI Archive - [Date]. Merged History Scanner: scan recently closed tabs and surface any that would fit an active group, offering to restore them. Requires the bookmarks permission in the manifest, which is a user-visible permission prompt change - worth deciding whether that cost is acceptable before building. The sessions API covers recently closed tabs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Extension requests and uses the bookmarks permission
- [ ] #2 Open tabs can be filed into an existing matching bookmark folder in one action
- [ ] #3 Stale tabs can be archived into a dated AI Archive folder and closed
- [ ] #4 Recently closed tabs that match an active group are surfaced with a restore action
<!-- AC:END -->
