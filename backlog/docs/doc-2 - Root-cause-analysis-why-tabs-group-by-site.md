---
id: doc-2
title: 'Root cause analysis: why tabs group by site'
type: specification
created_date: '2026-08-15 11:19'
updated_date: '2026-08-15 11:48'
tags:
  - analysis
---
Why the extension groups tabs by *site* instead of *subject*. Read this before starting any task under TASK-1.

The models were mostly innocent. Three layers force site-based grouping, and the last two **override whatever the LLM returns**.

## Layer 1 — The prompt teaches the site taxonomy

`shared/constants.js:173` and `background/content-distiller.js:75` instruct the model to produce
titles "e.g. `Wiki`, `Reddit`, `Music`, `Code`, `Docs`, `Shop`". The examples *are* the site
taxonomy. Addressed by TASK-1.6.

## Layer 2 — cleanAndShortenTitle rewrites correct output

`background/tab-organizer.js:24-62` holds a hardcoded site-to-label table applied to every title
the LLM produces:

- `"Air Fryer Buy"` becomes `Shop` (matches `buy`)
- `"Piano Theory"` becomes `Music` (matches `theory`)
- `"Tokyo Trip"` becomes `Travel` (matches `trip`)

`mergeDuplicateGroups()` (`tab-organizer.js:67-100`) then keys on that canonical label and
**merges** every group that collapsed to it. A perfect subject-based plan is flattened back into
site buckets before it is ever displayed. This is the highest-impact defect in the codebase.
Addressed by TASK-1.1 and decision-9.

## Layer 3 — Hostname fallback clustering

`background/tab-organizer.js:405-448` (`reconcilePlanWithRawTabs`). Every tab the LLM did not
assign is clustered **by hostname**, explicitly minting `Reddit`, `Wiki`, `Code` and `Video`
groups. Addressed by TASK-1.2.

## Co-cause — silent context truncation

`_callOllama` hardcodes `num_ctx: 16384` (`background/llm-adapter.js:396`). 250 tabs distill to
roughly 35-45k tokens (about 120-180 tokens per tab: title, domain, path, description, three
headings, a 220-character snippet). Ollama silently drops the overflow, so gemma never sees most
of the tab list, leaves those tabs unassigned, and layer 3 domain-clusters them. No error is
surfaced anywhere.

This is why the two failures compound: truncation creates unassigned tabs, and layer 3 turns
unassigned tabs into site groups. Addressed by TASK-1.4 and decision-10.

## Wasted signal

`content/extractor.js` already extracts `schemaName`, `keywords` and `siteName` — the strongest
subject signals available. A Mercado Livre product page yields `schemaName: "Air Fryer Philips
5000"`. `distillTabsForPrompt` (`background/content-distiller.js:31-42`) discards all three
before building the payload. Addressed by TASK-1.3.
