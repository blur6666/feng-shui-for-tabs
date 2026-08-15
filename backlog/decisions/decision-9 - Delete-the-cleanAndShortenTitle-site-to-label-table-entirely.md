---
id: decision-9
title: Delete the cleanAndShortenTitle site-to-label table entirely
date: '2026-08-15 11:16'
status: accepted
---
## Context

cleanAndShortenTitle in background/tab-organizer.js held a hardcoded synonym table that rewrote every LLM-produced title: Air Fryer Buy became Shop, Piano Theory became Music, Tokyo Trip became Travel. mergeDuplicateGroups then keyed on the rewritten label and merged everything that collapsed to it. A correct subject-based plan was flattened into site buckets before it was ever displayed.

## Decision

Delete the table entirely. Replace it with a non-destructive sanitizer whose only permitted operations are removal (emojis, control characters, whitespace) and word-boundary truncation.

## Consequences

The single highest-impact change in the P0 epic. Until it lands, no prompt or model work can change the output. mergeDuplicateGroups must be rewritten to merge only on normalized title equality; semantic overlap moves to the validator in TASK-1.7. Implemented by TASK-1.1.
