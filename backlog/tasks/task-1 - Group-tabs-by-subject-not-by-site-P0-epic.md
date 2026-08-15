---
id: TASK-1
title: 'Group tabs by subject, not by site (P0 epic)'
status: To Do
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 11:20'
labels:
  - grouping
  - p0
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
