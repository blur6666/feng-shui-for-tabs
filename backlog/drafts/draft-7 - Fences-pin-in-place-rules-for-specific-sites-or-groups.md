---
id: DRAFT-7
title: 'Fences: pin-in-place rules for specific sites or groups'
status: Draft
assignee: []
created_date: '2026-08-15 11:06'
labels:
  - ideas
  - personalization
  - rules
dependencies: []
references:
  - ideas3.md#3
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User-defined rules that constrain the organizer rather than guiding it. Examples: always keep reddit.com in a group called Downtime; never group Google Meet tabs. These are hard constraints applied deterministically, not prompt hints, so a fence must hold even when the LLM proposes otherwise. Strong overlap with DRAFT-1 (interactive refinement with durable rules) - both need a persisted rules store in chrome.storage.local and a rules-list UI with delete. Whoever builds either one should build the shared rules infrastructure once. Consider merging the two drafts at review time.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 User can create a rule pinning a domain to a named group, and a rule excluding a domain from grouping entirely
- [ ] #2 Fences are applied deterministically after the LLM plan is returned, and override it
- [ ] #3 Rules persist in chrome.storage.local and are listed in a UI with a per-rule delete action
- [ ] #4 A fenced tab never appears in any other group
<!-- AC:END -->
