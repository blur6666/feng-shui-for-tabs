---
id: decision-4
title: Use a two-pass label-then-cluster pipeline instead of a single LLM call
date: '2026-08-15 11:16'
status: accepted
---
## Context

A single LLM call was being asked to both understand up to 250 pages and design a taxonomy over them. On a 12B local model this is unreliable, and the call size grows without bound with tab count.

## Decision

Split into two passes: pass 1 labels each tab in batches of roughly 20, returning subject, entity, intent and junkType; pass 2 clusters the compact labels only.

## Consequences

Each call stays small and reliable regardless of tab count, and pass 2 operates on clean semantic labels instead of raw page noise. The pass 2 payload drops to roughly 20 tokens per tab. Adds an orchestration layer and more total calls. This is the core architectural decision of TASK-1; TASK-1.5 implements it and several other tasks depend on its output fields.
