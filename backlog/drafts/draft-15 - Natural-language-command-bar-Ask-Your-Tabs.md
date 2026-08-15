---
id: DRAFT-15
title: Natural language command bar (Ask Your Tabs)
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - ux
  - llm
dependencies: []
references:
  - ideas3.md#8
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the user type semantic queries and actions into the existing prompt input instead of only running a full analysis. Two capabilities. Semantic search: 'Where was that article with the chart on interest rates?' or 'Find the tab with the pricing comparison table' - answered against the distilled per-tab labels rather than by rescanning pages. Action commands: 'Group everything related to my trip to Tokyo and move it to a new window', 'Close all shopping tabs except the cheapest flight', 'Mute and collapse all video tabs'. Starred by the user as high interest. This is the largest idea in the set and the one most dependent on the P0 epic - it is only as good as the per-tab labels underneath it, so it should not start until the two-pass pipeline (TASK-1.5) is landed and validated. Destructive commands must preview and confirm before executing; a misparsed close command that fires immediately is unrecoverable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A natural language query returns matching tabs ranked by relevance, using stored labels without new page scraping
- [ ] #2 Action commands produce a previewed plan that the user confirms before anything is closed or moved
- [ ] #3 An unparseable command fails with a clear message and takes no action
- [ ] #4 Works on the reference environment (gemma 12B via Ollama) without exceeding the configured context budget
<!-- AC:END -->
