---
id: DRAFT-11
title: 'One-click tab bankruptcy: digest, archive and close everything'
status: Draft
assignee: []
created_date: '2026-08-15 11:07'
labels:
  - ideas
  - cleanup
dependencies: []
references:
  - ideas3.md#6
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For sessions that are past saving (100+ tabs), a single action that exports an AI-generated Markdown or HTML digest with a one-sentence summary per tab, saves it to a timestamped bookmark folder or a local file, and then cleanly closes the tabs. The point is that closing feels safe because nothing is lost. Destructive, so it needs an explicit confirmation step - note this deliberately differs from the middle-click behaviour in TASK-2.2, which closes without confirmation because it is one tab at a time. Depends on summaries, which the pass-1 labeling in TASK-1.5 already produces per tab; reuse that rather than adding a summarization call.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Digest contains every closed tab with title, URL and a one-sentence summary
- [ ] #2 Digest is persisted before any tab is closed, and the close is aborted if persistence fails
- [ ] #3 Action requires an explicit confirmation showing the tab count
- [ ] #4 Pinned tabs are never closed
<!-- AC:END -->
