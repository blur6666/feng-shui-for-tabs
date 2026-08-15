---
id: decision-12
title: >-
  Treat model validation as a human task with gemma 12B on Ollama as the
  reference
date: '2026-08-15 11:16'
status: accepted
---
## Context

Provider and model behaviour varies widely. Free Groq fails at around 60 tabs while gemma 12B local via Ollama handles 250 or more. Automated evaluation of grouping quality is itself a hard problem.

## Decision

Treat model validation as a human task. gemma 12B on Ollama is the reference environment, and every change is judged against it.

## Consequences

No automated quality gate exists, and this repo has no test suite, so validation is manual against the reference session documented in backlog/docs. Optional tooling is tracked in DRAFT-2. All design targets a local mid-size model rather than a frontier cloud model.
