---
id: DRAFT-8
title: 'Privacy shield: ignored domains never sent to the LLM'
status: Draft
assignee: []
created_date: '2026-08-15 11:06'
labels:
  - ideas
  - privacy
  - personalization
dependencies: []
references:
  - ideas3.md#3
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent sensitive pages from ever leaving the machine or being regrouped. A user-maintained blocklist (bank.com, local file:// URLs, health portals, internal company hosts) that excludes matching tabs from the distilled payload entirely and locks them in place in the tab strip. Distinct from Fences: a fence controls WHERE a tab is grouped, the privacy shield controls WHETHER its content is ever read or transmitted. This matters more with cloud providers than with local Ollama, but should behave identically for both so the guarantee is simple to state. Touches the tab collector and content distiller, upstream of every LLM call. Worth noting the extension already has an isScriptableUrl gate in background/tab-collector.js that this can extend rather than duplicate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Blocked tabs are excluded from the distilled payload before any provider call, verified by logging the payload
- [ ] #2 Blocked tabs are never moved or regrouped when a plan is applied
- [ ] #3 Blocklist supports domain patterns and the file:// scheme
- [ ] #4 Behaviour is identical for local and cloud providers
<!-- AC:END -->
