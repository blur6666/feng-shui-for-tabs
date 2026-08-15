---
id: TASK-2.1
title: 'P1-1: Local junk detection rules'
status: To Do
assignee: []
created_date: '2026-08-15 10:49'
updated_date: '2026-08-15 11:20'
labels:
  - cleanup
  - p1
milestone: m-1
dependencies: []
modified_files:
  - shared/junk-rules.js
parent_task_id: TASK-2
priority: medium
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New shared/junk-rules.js, consumed by the P0-4 pass-1 labeler as a pre-tag and as the fallback when the LLM omits junkType. Reuse isScriptableUrl() from background/tab-collector.js (lines 26-40) for the new-tab/extension/settings patterns rather than duplicating that list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New tab / extension / settings pages are detected: chrome://newtab, chrome://, chrome-extension://, about:blank, edge://, devtools://, view-source:
- [ ] #2 Error pages are detected by title matching: 404, Not Found, Page not found, 500, This site can't be reached, Problem loading page
- [ ] #3 Auth/transactional pages are detected by path matching: /login, /signin, /oauth, /reset-password, /forgot, /verify, /confirm, /thank-you, /obrigado, /success, /checkout/complete
- [ ] #4 isScriptableUrl() from background/tab-collector.js is reused, not duplicated
- [ ] #5 Each rule is a pure function taking {url, title} and returning a junkType string or null, independently unit-testable
<!-- AC:END -->
