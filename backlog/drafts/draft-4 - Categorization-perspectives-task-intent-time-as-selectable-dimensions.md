---
id: DRAFT-4
title: Categorization perspectives (task / intent / time as selectable dimensions)
status: Draft
assignee: []
created_date: '2026-08-15 11:06'
labels:
  - ideas
  - grouping
dependencies: []
references:
  - ideas3.md#2
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tabs are not always best grouped by topic. Let the user pick the DIMENSION of sorting. A) Task-Oriented: group by the active project or action (Feature X Build, Tax Filing 2026, Vacation Planning, Incident Debugging). Best for multitaskers. B) Functional/Intent-Oriented: group by what the user is doing on the page - Do/Edit (docs, code sandboxes, email compose), Reference (API docs, stackoverflow, github issues), Read/Watch (articles, videos), Utilities (calculator, calendar, settings). Best for reducing context switching. D) Time and Urgency, inbox-zero style: Inbox (newly opened), Today (active), Backlog (read-later), Snoozed (inactive). Note that the two-pass pipeline (TASK-1.5) already emits a per-tab intent field with values shopping|research|reference|reading|watching|doing|admin, so perspective B is largely a matter of clustering on a field that will already exist. IMPORTANT - the fourth perspective from the source (C, Domain-Oriented: sort strictly by website, for users with 40 GitHub tabs open) is deliberately excluded here because it directly contradicts TASK-1.2 and TASK-1.7, which delete hostname clustering and reject site-named groups. It is only viable as an explicit opt-in mode with a mode-aware validator. Tracked separately as its own draft so the conflict is decided consciously rather than by accident.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 User can select a grouping perspective before running an analysis
- [ ] #2 Task, Intent and Time perspectives each produce visibly different groupings on the same tab set
- [ ] #3 Intent perspective reuses the per-tab intent field from the two-pass pipeline rather than adding a new LLM call
- [ ] #4 Time perspective works without an LLM call, using tab activity metadata only
- [ ] #5 Selection persists across sessions
<!-- AC:END -->
