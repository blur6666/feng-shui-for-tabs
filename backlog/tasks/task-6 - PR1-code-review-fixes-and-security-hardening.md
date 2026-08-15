---
id: TASK-6
title: PR1 code review fixes and security hardening
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 14:12'
updated_date: '2026-08-15 14:15'
labels:
  - grouping
  - security
  - review
milestone: m-0
dependencies: []
priority: high
type: bug
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address all actionable feedback from PR #1 code review: URL-based junk pre-tagging, guardrail warning UI banner, XSS sanitization for tab titles, unified junkType taxonomy, Gemini Nano systemPrompt forwarding, Other group isolation, and group.label UI tooltip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 detectJunk is executed on raw tabs with full URLs during collection and attached to distilled tabs so Pass 1 local junk rules fire reliably
- [x] #2 plan.warning is visibly rendered in sidepanel/app.js when guardrail violations survive retry
- [x] #3 Tab titles and user strings in sidepanel/app.js are safely escaped against XSS/HTML injection
- [x] #4 junkType taxonomy is standardized on canonical enum ['new_tab', 'extension', 'internal', 'error', 'auth_or_transactional'] across prompts and rules
- [x] #5 LLMAdapter._callGeminiNano accepts and threads systemPrompt into session creation
- [x] #6 consolidateSmallGroups preserves Other group without merging its leftover tabs into thematic clusters
- [x] #7 group.label is rendered as a descriptive tooltip on group card headers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In tab-collector.js & content-distiller.js: Run detectJunk on raw tab records with URL intact, attaching localJunk to distilled items so tab-labeler.js receives accurate local junk classification
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented all PR #1 review fixes: pre-tagging localJunk on raw tabs in content-distiller.js, adding results warning banner in sidepanel/app.js & style.css, HTML-escaping tab titles against XSS, unifying junkType taxonomy across rules/prompts, threading systemPrompt in Gemini Nano, isolating Other group in consolidateSmallGroups, rendering group.label tooltips, and updating JSDoc comments. Verified with automated test runner.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented all code review fixes and security hardening for PR #1 (Milestone m-0).
<!-- SECTION:FINAL_SUMMARY:END -->
