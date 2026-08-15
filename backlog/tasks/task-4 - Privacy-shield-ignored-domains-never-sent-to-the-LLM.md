---
id: TASK-4
title: 'Privacy shield: ignored domains never sent to the LLM'
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 13:58'
updated_date: '2026-08-15 14:02'
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
- [x] #1 Blocked tabs matching user blocklist are excluded from distilled payload before any LLM call
- [x] #2 Blocked tabs are never moved or regrouped when applying plans
- [x] #3 Blocklist supports domain patterns, wildcard matching, and file:// scheme
- [x] #4 Blocklist configuration UI is accessible in Settings and persists in chrome.storage.local
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Privacy Blocklist textarea/input in sidepanel/index.html settings modal
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Privacy Shield in shared/junk-rules.js with support for wildcard domains (*.bank.com), exact hosts, subdomains, and file:// URLs. Added configuration textarea in sidepanel/index.html settings modal and wired persistence in sidepanel/app.js. Filtered blocked tabs in background/tab-collector.js and background/service-worker.js before any AI processing. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Privacy Shield excluding sensitive and local domains from LLM processing and tab grouping.
<!-- SECTION:FINAL_SUMMARY:END -->
