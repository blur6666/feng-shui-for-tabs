---
id: TASK-1.4
title: Context budget - stop silent truncation
status: To Do
assignee: []
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 11:41'
labels:
  - grouping
  - ollama
milestone: m-0
dependencies: []
modified_files:
  - background/llm-adapter.js
  - shared/constants.js
parent_task_id: TASK-1
priority: high
type: bug
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
_callOllama() in background/llm-adapter.js hardcodes num_ctx: 16384 (line 396). 250 tabs distill to roughly 35-45k tokens (~120-180 tokens/tab across title, domain, path, description, headings, snippet), so Ollama silently drops the overflow and gemma never sees most of the tab list - those tabs then fall through to fallback clustering (TASK-1.2). Originally filed as 'later' but promoted: it is a co-cause of the bad grouping the user observed, and nothing currently reports the overflow. Reference model: gemma 12B via Ollama.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 num_ctx is a configurable setting (default 32768 for gemma 12B) instead of the hardcoded 16384, exposed in the Ollama settings panel
- [ ] #2 A token estimator (chars/4 is sufficient) runs before each call; a payload that would exceed the budget is split into a smaller batch instead of being sent
- [ ] #3 The estimated payload size vs num_ctx is surfaced in the UI so overflow is visible instead of silent
- [ ] #4 With a 250-tab session, no single call exceeds the configured num_ctx
- [ ] #5 Exceeding the budget produces a visible message, never a silent truncation
<!-- AC:END -->
