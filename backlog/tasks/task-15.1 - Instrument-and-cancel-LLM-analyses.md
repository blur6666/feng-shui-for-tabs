---
id: TASK-15.1
title: Instrument and cancel LLM analyses
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 16:40'
updated_date: '2026-08-15 16:46'
labels:
  - performance
  - ollama
  - reliability
dependencies: []
modified_files:
  - background/llm-adapter.js
  - background/service-worker.js
  - background/tab-collector.js
  - background/tab-labeler.js
parent_task_id: TASK-15
priority: high
type: task
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add request-scoped telemetry, Ollama timing metrics, explicit cancellation, and stage-specific timeout behavior so long analyses are observable and controllable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each LLM request reports phase, batch, elapsed time, retry count, and safe aggregate diagnostics
- [x] #2 Ollama final responses capture load, prompt-evaluation, and generation metrics when available
- [x] #3 Cancel stops queued and in-flight analysis work without applying tab changes
- [x] #4 Stall and request deadlines identify the affected phase and batch
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor LLMAdapter requests to accept phase, signal, timing, streaming, and schema options while preserving provider compatibility. 2. Parse Ollama completion metrics and enforce phase-specific stall and total deadlines. 3. Wire a run-scoped AbortController and CANCEL_ANALYSIS handling through the service worker. 4. Emit safe per-request diagnostics and test cancellation, metrics parsing, and deadline failures.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refactored the LLM adapter to return structured values plus safe request metrics, parse final Ollama timing fields, support response schemas, keep-alive, non-streaming Pass 1, cancellation signals, and request/stall deadlines. Wired a run-scoped AbortController, CANCEL_ANALYSIS handler, cancellable collection worker pool, per-request diagnostics, and batch completion progress through the service worker. Verified syntax plus mocked non-streaming metrics, timeout, and fragmented NDJSON stream smoke tests.

Validation passed: node --check on all four modified background modules; mocked Ollama non-streaming metrics and deadline smoke test; mocked fragmented NDJSON stream smoke test; cancelled collection and phase-specific deadline smoke test; and a mocked service-worker integration exercise proving metrics progress, diagnostics, CANCEL_ANALYSIS, and a cancelled in-flight run.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added run-scoped cancellation, request and inactivity deadlines, safe per-call diagnostics, and Ollama load/prompt/generation timing metrics. Verified with syntax checks plus mocked adapter, fragmented-stream, collection-cancellation, deadline, and service-worker cancellation integration tests.
<!-- SECTION:FINAL_SUMMARY:END -->
