---
id: TASK-1.5
title: Two-pass label then cluster pipeline
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 10:48'
updated_date: '2026-08-15 13:42'
labels:
  - grouping
milestone: m-0
dependencies:
  - TASK-1.3
  - TASK-1.4
  - TASK-2.1
modified_files:
  - background/tab-labeler.js
  - background/service-worker.js
  - shared/constants.js
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A single call asking a 12B model to both understand ~250 pages and design a taxonomy is unreliable. Split into pass 1 (batched, ~20 tabs/call: label each tab with subject/entity/intent/junkType) and pass 2 (cluster the compact labels, ~20 tokens/tab so ~5k tokens for 250 tabs). Batching keeps each call small and reliable at any tab count. New module background/tab-labeler.js, orchestrated from background/service-worker.js (ANALYZE_TABS case, lines 146-210). Junk-tagged tabs (junkType != null) are pulled out locally into suggestedActions and excluded from pass 2, so no junk group can ever be named - the LLM still decides what's junk, it just can't name a group after it. Pass 2 must also return an abbreviated title (<=12 chars, LLM-generated, e.g. 'Mercado Livre' -> 'ML AirFryer') plus a full label field for tooltip/rationale; add label to JSON_SCHEMA in shared/constants.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pass 1 returns {id, subject, entity, intent, junkType} for every tab in a batch; subject describes what the page is about, never the site name
- [x] #2 Batches run sequentially (~20 tabs each) and ANALYSIS_PROGRESS events fire per batch, reusing the existing stage:'distilling'/'thinking' events consumed by sidepanel/app.js
- [x] #3 Missing ids from a pass-1 batch are retried once, then defaulted rather than dropped silently
- [x] #4 Tabs with a non-null junkType never appear in plan.groups; they are converted to suggestedActions entries instead
- [x] #5 Pass 2 clusters only on {subject, entity, intent} and returns title (<=12 chars, pre-abbreviated by the LLM), label (full name), rationale, tabIds, color
- [x] #6 No single call exceeds the token budget from TASK-1.4, at 30, 120, and 250 tab counts
- [x] #7 label is added to JSON_SCHEMA in shared/constants.js
- [x] #8 Ollama requests in both pass 1 and pass 2 pass format: 'json' to ensure deterministic JSON parsing on local models like Gemma 12B
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update shared/constants.js with LABELING_SYSTEM_PROMPT, CLUSTERING_SYSTEM_PROMPT, LABELING_JSON_SCHEMA, and update JSON_SCHEMA to include group label field
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Two-Pass Label-then-Cluster architecture. Added background/tab-labeler.js with sequential ~20 tab batching, single retry for missing IDs, deterministic junk pre-tagging, and junk routing to Suggested Actions. Updated background/service-worker.js, background/llm-adapter.js, and background/content-distiller.js. Verified against all 8 ACs with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Two-Pass Label-then-Cluster architecture: Pass 1 labels tabs in batches (~20 tabs/call) with entity, intent, and junk routing; Pass 2 clusters compact semantic labels with <=12 char titles and full topic labels.
<!-- SECTION:FINAL_SUMMARY:END -->
