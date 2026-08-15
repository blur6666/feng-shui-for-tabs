---
id: TASK-2.1
title: Local junk detection rules
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:49'
updated_date: '2026-08-15 13:39'
labels:
  - cleanup
milestone: m-0
dependencies: []
modified_files:
  - shared/junk-rules.js
parent_task_id: TASK-2
priority: medium
type: feature
ordinal: 5500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New shared/junk-rules.js, consumed by the TASK-1.5 pass-1 labeler as a pre-tag and as the fallback when the LLM omits junkType. Reuse isScriptableUrl() from background/tab-collector.js (lines 26-40) for the new-tab/extension/settings patterns rather than duplicating that list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New tab / extension / settings pages are detected: chrome://newtab, chrome://, chrome-extension://, about:blank, edge://, devtools://, view-source:
- [x] #2 Error pages are detected by title matching: 404, Not Found, Page not found, 500, This site can't be reached, Problem loading page
- [x] #3 Auth/transactional pages are detected by path matching: /login, /signin, /oauth, /reset-password, /forgot, /verify, /confirm, /thank-you, /obrigado, /success, /checkout/complete
- [x] #4 isScriptableUrl() from background/tab-collector.js is reused, not duplicated
- [x] #5 Each rule is a pure function taking {url, title} and returning a junkType string or null, independently unit-testable
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create shared/junk-rules.js with pure functions detectNewTabOrExtension, detectErrorPage, detectAuthOrTransactional, and detectJunk
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created shared/junk-rules.js exporting pure functions detectNewTabOrExtension, detectErrorPage, detectAuthOrTransactional, and detectJunk. Re-exported isScriptableUrl in background/tab-collector.js. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented pure-function local junk detection rules covering internal URLs, errors, and auth/transactional pages in shared/junk-rules.js with shared isScriptableUrl reuse.
<!-- SECTION:FINAL_SUMMARY:END -->
