---
id: DRAFT-5
title: >-
  Domain-oriented grouping as an explicit opt-in mode (CONFLICTS with P0 -
  decide before building)
status: Draft
assignee: []
created_date: '2026-08-15 11:06'
labels:
  - ideas
  - grouping
  - conflict
dependencies: []
references:
  - ideas3.md#2
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CONFLICT WARNING - read before starting. This proposes sorting tabs strictly by primary website, merging minor subdomains (GitHub, YouTube, AWS Console, Miscellaneous), aimed at users who open many pages from the same site. This is exactly the behaviour TASK-1.2 (delete hostname fallback clustering) and TASK-1.7 (reject site-named groups) exist to remove. The distinction that makes it valid: the current problem is not that domain grouping exists, it is that it happens SILENTLY as a fallback and OVERRIDES a model that grouped correctly. A domain grouping the user explicitly asked for is correct output, and the P0-5 validator would be wrong to reject it. Guiding rule: never INFER a group from a hostname, only ever OBEY one. Practical consequence - if this is ever built, the site-name rejection in TASK-1.7 must be switchable per-mode rather than unconditional. Doing that when TASK-1.7 is written is cheap; retrofitting it later is not. Do not start this before the P0 epic (TASK-1) is done and validated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Domain grouping is reachable only through explicit user selection, never as a fallback for unassigned tabs
- [ ] #2 The anti-site validator is bypassed in this mode only, and remains unconditional in every other mode
- [ ] #3 Switching back to a subject-based perspective produces no site-named groups
<!-- AC:END -->
