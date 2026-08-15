---
id: TASK-1.1
title: Delete the site-to-label title rewriter
status: To Do
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 11:40'
labels:
  - grouping
milestone: m-0
dependencies: []
modified_files:
  - background/tab-organizer.js
parent_task_id: TASK-1
priority: high
type: bug
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
cleanAndShortenTitle() in background/tab-organizer.js (lines 24-62) silently rewrites every LLM-chosen group title through a hardcoded site table (e.g. 'Air Fryer Buy' -> Shop, 'Piano Theory' -> Music, 'Tokyo Trip' -> Travel). mergeDuplicateGroups() (lines 67-100) then merges any groups that collapse to the same canonical label, flattening correct subject-based output back into site buckets before it is ever displayed. This is the highest-impact defect in the codebase.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The synonym table (if lower.includes(...) return 'Wiki'|'Reddit'|'Video'|'Code'|'Docs'|'Shop'|'Music'|'Gaming'|'News'|'Mail'|'Social'|'Search'|'Travel') is fully removed from cleanAndShortenTitle()
- [ ] #2 Title sanitizing only strips emojis/control chars and trims to 12 chars on a word boundary; it never substitutes the subject the LLM chose
- [ ] #3 A group titled 'Air Fryer' by the LLM is still titled 'Air Fryer' after processing
- [ ] #4 Two groups titled 'Air Fryer' and 'Rust Compiler' are never merged into one
- [ ] #5 mergeDuplicateGroups() merges only on normalized-title equality (case/whitespace/punctuation-insensitive), not canonical site label
- [ ] #6 No title is ever truncated mid-word
<!-- AC:END -->
