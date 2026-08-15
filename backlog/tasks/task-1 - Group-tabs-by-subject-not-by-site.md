---
id: TASK-1
title: 'Group tabs by subject, not by site'
status: Done
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 13:44'
labels:
  - grouping
milestone: m-0
dependencies: []
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root cause epic. The extension currently groups tabs by site (Wiki, Reddit, Shop) instead of by subject/intent, and three layers actively override correct LLM output: the prompt's site-name examples, a hardcoded site->label rewriter that merges groups by canonical site label, and a hostname-based fallback clusterer for unassigned tabs. A hardcoded num_ctx=16384 also silently truncates large tab sets before the model ever sees them. Reference environment for all validation: gemma 12B local via Ollama (handles 250+ tabs; free Groq fails at ~60). Subtasks must land in dependency order; see each subtask for exact files/lines.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All 7 subtasks in TASK-1 (and TASK-2.1) implemented, verified with automated test suites, and marked Done.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved root causes of site-based grouping: deleted site-to-label table and fallback clusterer, added configurable context budget with format: 'json', fed subject signals to distiller, implemented Two-Pass Label-then-Cluster architecture, rewrote prompts, and added guardrail validator.
<!-- SECTION:FINAL_SUMMARY:END -->
