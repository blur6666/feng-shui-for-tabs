---
id: decision-5
title: Keep the 12-character group title limit with aggressive abbreviation
date: '2026-08-15 11:16'
status: accepted
---
## Context

Chrome tab group titles are shown in a narrow strip. Longer titles are more descriptive but push the strip toward uselessness.

## Decision

Keep the 12-character limit and rely on aggressive abbreviation to stay informative.

## Consequences

Requires good abbreviations, which is why decision-6 moves that job to the LLM. Truncation must respect word boundaries; the previous implementation cut mid-word, producing titles like Air Fryer Sh. The full name is preserved separately in a label field for tooltips.
