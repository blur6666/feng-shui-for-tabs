---
id: TASK-15.2
title: Make two-pass processing adaptive and compact
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 16:40'
updated_date: '2026-08-15 16:51'
labels:
  - performance
  - ollama
  - pipeline
dependencies: []
modified_files:
  - background/analysis-profile.js
  - background/content-distiller.js
  - background/tab-labeler.js
  - background/service-worker.js
  - background/llm-adapter.js
  - shared/constants.js
parent_task_id: TASK-15
priority: high
type: task
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prefilter deterministic junk, pack Pass-1 prompts by token budget, right-size context and output limits, use structured responses, and make retry policy profile-aware without losing tab coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fast mode prefilters locally known junk before Pass 1 and uses adaptive token-budget batches
- [x] #2 Fast mode uses compact evidence and profile-specific effective context and output limits
- [x] #3 Quality mode retains rich evidence and its validation recovery behavior
- [x] #4 Retries are classified and incomplete parsed results retry only missing tab IDs
- [x] #5 Every raw tab remains represented after reconciliation or an explicit suggested action
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit Fast and Quality profile policy with adaptive token-budget batch planning and per-request context/output limits. 2. Compact Fast evidence and prefilter deterministic junk before labeling while retaining rich Quality evidence. 3. Send phase schemas, effective context, output caps, and model keep-alive through the adapter. 4. Make coverage versus full-failure retries profile-aware and verify planning, prefiltering, coverage retry, and validation-retry behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Fast and Quality profile policy with adaptive Pass-1 token budgeting, dynamic per-request context sizing, bounded output, keep-alive, schema-constrained Ollama calls, compact Fast prompts, and rich Quality evidence. Locally known junk now skips Pass 1; Fast avoids full-batch and validation retries while Quality preserves them. Verified syntax, 100-tab Fast two-batch planning, local-junk prefiltering, coverage-only retry, full-failure profile policy, schema/context/output/keep-alive payloads, Fast versus Quality validation behavior, and raw-tab reconciliation coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added adaptive Fast and Quality two-pass policies: compact token-budgeted Fast batches, deterministic junk prefiltering, dynamic context/output caps, schemas and keep-alive, plus conservative rich Quality behavior and classified retries. Verified with mocked 100-tab, retry, payload, profile-validation, and reconciliation coverage smoke tests.
<!-- SECTION:FINAL_SUMMARY:END -->
