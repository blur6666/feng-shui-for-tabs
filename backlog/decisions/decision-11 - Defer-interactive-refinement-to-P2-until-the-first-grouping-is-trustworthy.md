---
id: decision-11
title: Defer interactive refinement to P2 until the first grouping is trustworthy
date: '2026-08-15 11:16'
status: accepted
---
## Context

Interactive per-group refinement with rules that persist across runs is valuable, but it refines whatever the first pass produced.

## Decision

Defer refinement to P2. Build it only once the first grouping is good. When built, accepted refinements persist as durable rules injected into future prompts.

## Consequences

Avoids building a correction mechanism for output that should not need correcting. Tracked as DRAFT-1; overlaps with the Fences idea in DRAFT-7, and both need the same persisted rules store and rules-list UI.
