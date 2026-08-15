---
id: TASK-1.4
title: Context budget - stop silent truncation
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:47'
updated_date: '2026-08-15 13:37'
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
- [x] #1 num_ctx is a configurable setting (default 32768 for gemma 12B) instead of the hardcoded 16384, exposed in the Ollama settings panel
- [x] #2 A token estimator (chars/4 is sufficient) runs before each call; a payload that would exceed the budget is split into a smaller batch instead of being sent
- [x] #3 The estimated payload size vs num_ctx is surfaced in the UI so overflow is visible instead of silent
- [x] #4 With a 250-tab session, no single call exceeds the configured num_ctx
- [x] #5 Exceeding the budget produces a visible message, never a silent truncation
- [x] #6 Ollama requests specify format: 'json' in the payload to enforce grammar-constrained structured JSON output from local models like Gemma 12B
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add num_ctx (default 32768) to DEFAULT_SETTINGS.ollama in shared/constants.js
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added num_ctx configuration (default 32768) in shared/constants.js, sidepanel/index.html, and sidepanel/app.js. Implemented estimateTokens and budget validation in background/llm-adapter.js with visible overflow rejection and progress surfacing in background/service-worker.js. Enforced format: 'json' in Ollama requests. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made Ollama num_ctx configurable (default 32768), added pre-call token estimation to prevent silent truncation, surfaced token estimates in progress messages, and enforced format: 'json' for Ollama inference.
<!-- SECTION:FINAL_SUMMARY:END -->
