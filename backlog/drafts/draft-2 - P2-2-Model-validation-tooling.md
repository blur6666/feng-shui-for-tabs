---
id: DRAFT-2
title: 'P2-2: Model validation tooling'
status: Draft
assignee: []
created_date: '2026-08-15 10:49'
labels:
  - models
  - p2
  - deferred
dependencies: []
modified_files:
  - background/llm-adapter.js
  - sidepanel/app.js
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Model validation itself is a human task; gemma 12B via Ollama is the reference model used to judge every P0 change. This ticket is for optional tooling to support that: curated model dropdowns per provider instead of free-text model fields, and a real 'Test Connection' that runs a mini-grouping and validates the JSON response. testConnection() in background/llm-adapter.js (lines 59-168) currently only checks GET /api/tags for Ollama, which proves the server is reachable but nothing about whether the selected model can return valid JSON - likely why model validation has felt unreliable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Provider settings offer a curated dropdown of known-good models instead of a free-text field
- [ ] #2 Test Connection runs a real mini-grouping request against the selected model and validates that the response parses as the expected JSON shape, not just a bare connectivity ping
<!-- AC:END -->
