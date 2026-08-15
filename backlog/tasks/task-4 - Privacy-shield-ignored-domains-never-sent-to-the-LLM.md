---
id: TASK-4
title: 'Privacy shield: ignored domains never sent to the LLM'
status: To Do
assignee: []
created_date: '2026-08-15 13:58'
labels:
  - privacy
  - personalization
milestone: m-2
dependencies: []
priority: medium
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent sensitive pages from ever leaving the machine or being regrouped. A user-configurable domain/URL blocklist (bank.com, health portals, internal hosts, file://) that excludes matching tabs from the distilled payload entirely and locks them in place in the tab strip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Blocked tabs matching user blocklist are excluded from distilled payload before any LLM call
- [ ] #2 Blocked tabs are never moved or regrouped when applying plans
- [ ] #3 Blocklist supports domain patterns, wildcard matching, and file:// scheme
- [ ] #4 Blocklist configuration UI is accessible in Settings and persists in chrome.storage.local
<!-- AC:END -->
