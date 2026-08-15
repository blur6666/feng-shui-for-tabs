---
id: TASK-1.6
title: Prompt rewrite - remove site-name examples
status: To Do
assignee: []
created_date: '2026-08-15 10:48'
updated_date: '2026-08-15 11:42'
labels:
  - grouping
milestone: m-0
dependencies:
  - TASK-1.5
modified_files:
  - shared/constants.js
  - background/content-distiller.js
parent_task_id: TASK-1
priority: high
type: task
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SYSTEM_PROMPT in shared/constants.js (lines 167-177) and constructAnalysisPrompt() in background/content-distiller.js (lines 58-82) both instruct the model to produce titles 'e.g. Wiki, Reddit, Music, Code, Docs, Shop' - the examples are the site taxonomy the model is copying. Split into the two prompts required by TASK-1.5 (labeling / clustering) and add an explicit anti-site rule with a worked example.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every site-name example (Wiki, Reddit, Music, Code, Docs, Shop, Gaming, News, Video, Social) is removed from both prompt-construction sites
- [ ] #2 The prompt explicitly states: group by what the page is about, not where it is hosted, with a worked contrast example - an r/airfryer thread, a Mercado Livre air fryer listing, and a YouTube air fryer review belong in one group; two unrelated Wikipedia articles belong in different groups
- [ ] #3 Prompt is split into a labeling prompt and a clustering prompt matching the TASK-1.5 two-pass design
- [ ] #4 Existing hard rules are preserved: no emojis, titles <=12 chars, minimum 3 tabs per group, every tab id assigned exactly once
- [ ] #5 grep -in for 'wiki'/'reddit'/'docs' as prompt examples in shared/constants.js and background/content-distiller.js returns nothing
<!-- AC:END -->
