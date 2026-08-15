---
id: TASK-13
title: Restrict privacy blocklist URL prefix matching
status: To Do
assignee: []
created_date: '2026-08-15 15:04'
labels:
  - review
  - privacy
  - security
milestone: m-2
dependencies:
  - TASK-4
priority: medium
type: bug
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #3 review: isBlockedByPrivacy's lowerUrl.startsWith(rule) prefix branch is too broad - a rule like 'test' blocks testing-site.com and 'http' blocks every tab. Restrict the prefix branch to rules that look like scheme+host or contain a path separator, and document the behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bare single-token rules like 'test' or 'http' no longer block unrelated URLs
- [ ] #2 Scheme+host rules (e.g. 'https://bank.com/private') still match as prefixes
- [ ] #3 Domain/wildcard/file rules behave unchanged
- [ ] #4 Automated test covers over-broad prefix cases
<!-- AC:END -->
