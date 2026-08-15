---
id: TASK-16
title: >-
  Fix LLM JSON parse crash on large tab sets with auto-repair and Pass-2
  fallback
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 17:29'
updated_date: '2026-08-15 17:32'
labels:
  - reliability parser ollama
dependencies: []
modified_files:
  - background/llm-adapter.js
  - background/analysis-profile.js
  - background/service-worker.js
  - background/tab-organizer.js
  - test-json-repair-and-fallback.mjs
priority: high
type: bug
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent analyses from crashing with "invalid json" when local LLM responses are truncated or malformed by adding truncated-JSON repair, dynamic output sizing, and graceful domain clustering fallback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 extractJsonFromResponse repairs truncated JSON and salvages valid partial objects/arrays
- [x] #2 Pass 2 dynamically scales output reserve for large tab counts to prevent truncation
- [x] #3 If Pass 2 generation fails completely, service-worker falls back gracefully to domain clustering instead of crashing
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enhance extractJsonFromResponse in background/llm-adapter.js with auto-repair for truncated JSON strings, unclosed brackets/braces, dangling keys, and partial groups extraction. 2. In background/analysis-profile.js, dynamically scale Pass-2 outputReserve based on tab count. 3. In background/service-worker.js, wrap Pass-2 clustering in a graceful fallback that groups labeled tabs by subject/domain if the LLM output fails completely. 4. Add unit and regression tests in test-json-repair-and-fallback.mjs and verify.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented truncated-JSON auto-repair in LLMAdapter (repairTruncatedJson handles unclosed strings, dangling keys/colons, trailing commas, unclosed braces/brackets, and salvages partial groups/tabs arrays). Pass-2 output reserve now scales dynamically with labeled tab count (22 tok/tab + 800 base, capped at 3500). Service worker wraps Pass-2 generation in a try/catch and builds a semantic-topic fallback plan from Pass-1 labels when the model returns unrepairable output, preserving a warning and applying no tab changes until the user reviews. Added test-json-repair-and-fallback.mjs and verified all regression suites.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed invalid-JSON analysis crashes with truncated-JSON auto-repair, dynamic Pass-2 output scaling for large tab sets, and a graceful semantic-topic fallback when Pass-2 generation fails completely. Verified with test-json-repair-and-fallback.mjs, a service-worker recovery exercise, and all existing regression suites.
<!-- SECTION:FINAL_SUMMARY:END -->
