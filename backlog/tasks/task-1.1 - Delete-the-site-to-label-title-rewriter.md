---
id: TASK-1.1
title: Delete the site-to-label title rewriter
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 13:30'
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
- [x] #1 The synonym table (if lower.includes(...) return 'Wiki'|'Reddit'|'Video'|'Code'|'Docs'|'Shop'|'Music'|'Gaming'|'News'|'Mail'|'Social'|'Search'|'Travel') is fully removed from cleanAndShortenTitle()
- [x] #2 Title sanitizing only strips emojis/control chars and trims to 12 chars on a word boundary; it never substitutes the subject the LLM chose
- [x] #3 A group titled 'Air Fryer' by the LLM is still titled 'Air Fryer' after processing
- [x] #4 Two groups titled 'Air Fryer' and 'Rust Compiler' are never merged into one
- [x] #5 mergeDuplicateGroups() merges only on normalized-title equality (case/whitespace/punctuation-insensitive), not canonical site label
- [x] #6 No title is ever truncated mid-word
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the hardcoded site-to-label synonym table from cleanAndShortenTitle in background/tab-organizer.js
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deleted hardcoded synonym table in background/tab-organizer.js. Rewrote cleanAndShortenTitle to strip emojis/control chars and perform word-boundary truncation <= 12 chars. Updated mergeDuplicateGroups to merge on normalized title equality. Verified with automated test suite across all 6 ACs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the hardcoded site-to-label table from cleanAndShortenTitle and updated mergeDuplicateGroups to merge on normalized title equality. Verified against all 6 acceptance criteria with automated test suite.
<!-- SECTION:FINAL_SUMMARY:END -->
