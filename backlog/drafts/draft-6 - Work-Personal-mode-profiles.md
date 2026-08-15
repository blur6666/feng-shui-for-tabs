---
id: DRAFT-6
title: Work / Personal mode profiles
status: Draft
assignee: []
created_date: '2026-08-15 11:06'
labels:
  - ideas
  - personalization
dependencies: []
references:
  - ideas3.md#3
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the user declare what mode they are currently in, which sets explicit system instructions for the analysis. In Work Mode, personal tabs are collapsed into a single Ignore or After Work group rather than being organized in detail. In Personal Mode, work-related tabs are consolidated or moved to another window. The mode becomes a prompt-level instruction injected into the clustering pass, so it depends on the prompt rewrite (TASK-1.6) being settled first to avoid two competing sources of prompt text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A mode toggle is available in the side panel and persists across sessions
- [ ] #2 Active mode injects its instruction into the clustering prompt
- [ ] #3 In Work Mode, personal tabs are consolidated into a single low-detail group instead of being finely grouped
<!-- AC:END -->
