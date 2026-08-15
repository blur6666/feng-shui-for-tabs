---
id: decision-3
title: Detect junk with local rules for obvious cases plus LLM for ambiguous ones
date: '2026-08-15 11:16'
status: accepted
---
## Context

Junk detection can be done locally with URL and title patterns, or delegated entirely to the LLM. Pure local rules miss ambiguous cases; pure LLM detection wastes calls on cases a regex settles.

## Decision

Use local rules for the obvious cases (chrome:// and extension URLs, 404 titles, auth and thank-you paths) and let the LLM classify the ambiguous remainder via a junkType field.

## Consequences

Two code paths that must be kept in agreement. Local rules must be pure functions so they are unit-testable, and they double as the fallback when the LLM omits junkType. Implemented by TASK-2.1 feeding TASK-1.5.
