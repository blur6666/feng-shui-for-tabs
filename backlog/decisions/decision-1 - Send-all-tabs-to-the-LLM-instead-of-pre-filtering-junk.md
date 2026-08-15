---
id: decision-1
title: Send all tabs to the LLM instead of pre-filtering junk
date: '2026-08-15 11:16'
status: accepted
---
## Context

Sessions contain a large share of pages that are not worth organizing: new tabs, extension pages, auth flows, error pages, thank-you pages. A local pre-filter could strip these before the LLM sees them, saving tokens.

## Decision

Send every tab to the LLM and let it decide what is junk. No pre-filter that hides tabs from the model.

## Consequences

Costs tokens on tabs that will be discarded, which matters on the reference environment (gemma 12B local, 250+ tabs). Accepted because a local pre-filter would silently hide pages the model might have grouped usefully, and misclassification would be invisible. See decision-3 for how detection is still assisted by local rules, and decision-13 for how junk is kept out of group names.
