---
id: decision-10
title: Promote the context-window limit from later to the first milestone
date: '2026-08-15 11:16'
status: accepted
---
## Context

_callOllama hardcoded num_ctx to 16384 in background/llm-adapter.js. 250 tabs distill to roughly 35 to 45k tokens, so Ollama silently dropped most of the tab list. The model never saw those tabs, left them unassigned, and the hostname fallback then clustered them by domain. No error surfaced anywhere. This was originally filed as a later item.

## Decision

Promote the context budget into milestone m-0, alongside the grouping fixes.

## Consequences

Reframes the root cause: the model was largely innocent, and bad grouping was partly an invisible truncation bug. Any quality judgement made before this is fixed is unreliable, which is why it is sequenced early in the landing order. Requires making num_ctx a setting and adding a pre-call token estimator. Implemented by TASK-1.4.
