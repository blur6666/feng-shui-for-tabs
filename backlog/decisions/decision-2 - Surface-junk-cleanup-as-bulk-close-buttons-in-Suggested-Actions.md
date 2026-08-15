---
id: decision-2
title: Surface junk cleanup as bulk-close buttons in Suggested Actions
date: '2026-08-15 11:16'
status: accepted
---
## Context

Once junk is identified it has to be actioned somewhere. The options were a dedicated cleanup screen, inline per-tab controls, or reusing the existing post-analysis surface.

## Decision

Surface junk as bulk-close buttons in the existing Suggested Actions section, shown after analysis completes.

## Consequences

No new top-level UI surface to design or maintain. Cleanup is tied to an analysis run rather than being available at any time. Implemented by TASK-2.3.
