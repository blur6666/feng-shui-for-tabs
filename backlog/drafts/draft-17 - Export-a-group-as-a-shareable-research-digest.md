---
id: DRAFT-17
title: Export a group as a shareable research digest
status: Draft
assignee: []
created_date: '2026-08-15 11:08'
labels:
  - ideas
  - export
dependencies: []
references:
  - ideas3.md#9
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Export a tab group as a Markdown or Notion-ready summary table, with key points extracted from each page, to share with teammates or keep as a record. Overlaps deliberately with the digest half of the tab bankruptcy draft - the same renderer should serve both, one exporting a single group and one exporting everything before closing it. Whoever builds either should factor the digest generation out once. Reuses per-tab summaries from the pass-1 labeling in TASK-1.5 rather than adding a summarization call.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A group can be exported to Markdown containing title, URL and key points per tab
- [ ] #2 Export is copyable to clipboard and savable as a file
- [ ] #3 The digest renderer is shared with the tab bankruptcy export rather than duplicated
<!-- AC:END -->
