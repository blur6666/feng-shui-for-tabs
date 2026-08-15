---
id: TASK-9
title: Wire canonical junk taxonomy into prompts and schema
status: Done
assignee:
  - '@agent'
created_date: '2026-08-15 14:35'
updated_date: '2026-08-15 14:42'
labels:
  - review
  - grouping
  - consistency
milestone: m-0
dependencies:
  - TASK-6
priority: medium
type: bug
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the remaining PR #2 review consistency finding: JUNK_TYPES exists in shared/junk-rules.js, but labeling prompts and LABELING_JSON_SCHEMA duplicate the strings rather than reference one canonical enum. Define JUNK_TYPES in shared/constants.js, import it from shared/junk-rules.js, and use it to derive Pass 1 prompt vocabulary and schema constraints.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 JUNK_TYPES has one canonical declaration in shared/constants.js
- [x] #2 shared/junk-rules.js imports JUNK_TYPES rather than declaring a duplicate list
- [x] #3 LABELING_SYSTEM_PROMPT and constructLabelingPrompt derive their listed junk types from JUNK_TYPES
- [x] #4 LABELING_JSON_SCHEMA restricts non-null junkType values to JUNK_TYPES
- [x] #5 Automated tests verify all consumers expose the same taxonomy
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move JUNK_TYPES into shared/constants.js as the sole canonical taxonomy and expose a prompt-friendly derived list
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved JUNK_TYPES to shared/constants.js as the sole canonical frozen array, added JUNK_TYPE_LIST for prompt interpolation, made shared/junk-rules.js import/re-export it, and derived both Pass 1 prompts and LABELING_JSON_SCHEMA from it. Verification: node --check passed for all three changed modules; focused Node contract test passed canonical identity, prompt vocabulary, schema enum, and all local rule output cases.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Canonicalized junk taxonomy across local rules, Pass 1 prompts, and LABELING_JSON_SCHEMA; verified by syntax and module contract tests.
<!-- SECTION:FINAL_SUMMARY:END -->
