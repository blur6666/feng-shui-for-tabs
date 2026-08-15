---
id: decision-6
title: 'Generate abbreviations in the LLM clustering pass, not with a local table'
date: '2026-08-15 11:16'
status: accepted
---
## Context

Fitting a subject into 12 characters needs abbreviation (Mercado Livre becomes ML). This could be a local lookup table or produced by the model.

## Decision

Have the LLM generate the abbreviation during the clustering pass, returning both a short title and a full label.

## Consequences

Avoids reintroducing a hardcoded substitution table, which is the exact mechanism that caused the original bug (decision-9). Abbreviation quality now depends on the model. Requires adding label to the JSON schema in shared/constants.js.
