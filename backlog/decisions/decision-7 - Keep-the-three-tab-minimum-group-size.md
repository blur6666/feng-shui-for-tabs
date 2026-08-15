---
id: decision-7
title: Keep the three-tab minimum group size
date: '2026-08-15 11:16'
status: accepted
---
## Context

Very small groups clutter the tab strip as much as ungrouped tabs do. A minimum size forces marginal tabs elsewhere.

## Decision

Keep the existing three-tab minimum for a group to be created.

## Consequences

Tabs below the threshold fall through to an Other group. Combined with send-everything (decision-1) this created a tension where twelve New Tabs could still form a group, resolved in decision-13.
