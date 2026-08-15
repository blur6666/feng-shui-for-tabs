---
id: TASK-13
title: Restrict privacy blocklist URL prefix matching
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 15:04'
updated_date: '2026-08-15 15:10'
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
- [x] #1 Bare single-token rules like 'test' or 'http' no longer block unrelated URLs
- [x] #2 Scheme+host rules (e.g. 'https://bank.com/private') still match as prefixes
- [x] #3 Domain/wildcard/file rules behave unchanged
- [x] #4 Automated test covers over-broad prefix cases
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 2. Keep wildcard/domain/file rules unchanged
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
isBlockedByPrivacy now only applies the URL prefix branch when the rule looks like scheme+host or contains a path separator; bare tokens no longer block unrelated URLs while domain, wildcard, and file rules are unchanged. Verified with over-broad prefix, scheme+host, and domain/wildcard tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restricted privacy blocklist prefix matching to scheme+host or path rules.
<!-- SECTION:FINAL_SUMMARY:END -->
