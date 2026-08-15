---
id: doc-1
title: Reference validation session
type: guide
created_date: '2026-08-15 11:19'
updated_date: '2026-08-15 11:19'
tags:
  - validation
  - testing
---
There is no automated test suite in this repo. Validation is manual, against gemma 12B on Ollama (see decision-12). This document is the reference test plan that every P0 and P1 task validates against.

## Set up a deliberate test session

Open a browser session containing all of the following:

- An r/airfryer thread, a Mercado Livre air fryer listing, and a YouTube air fryer review.
  These must end up in **one** group. This is the core subject-over-site check.
- Two unrelated Wikipedia articles. These must end up in **different** groups.
  This is the inverse check: a shared host must not imply a shared subject.
- 12 New Tabs plus one "thank you for logging in" page. These must produce **zero** junk groups.
- 3 exact duplicate URLs. These must appear in the Duplicates bucket in Suggested Actions.
- Scale up to a real session of roughly 250 tabs for the context-budget check.

## Pass / fail criteria

1. **Baseline first.** Screenshot the current build's groups before changing anything.
   This is the "makes no sense" reference that changes have to beat.
2. Fail on sight: any group named `Wiki`, `Reddit`, `Video`, `Code`, `Docs`, or `Shop`.
3. The three air-fryer tabs are grouped together; the two Wikipedia articles are not.
4. No junk groups. Junk appears in Suggested Actions with working bulk-close.
5. No two groups share a theme, and no two groups overlap tab ids.
6. All titles are 12 characters or fewer, none truncated mid-word, and the full label
   is visible on hover.
7. Middle-click closes the real Chrome tab.
8. Apply, then Undo, restores the previous grouping. Apply on its own closes no tabs.

## Notes

- Run the 250-tab check before and after the context-budget fix (TASK-1.4), logging estimated
  payload tokens against `num_ctx` both times, so the overflow is confirmed to be real rather
  than assumed.
- The two-pass pipeline (TASK-1.5) should be run at 30, 120 and 250 tabs to confirm it completes
  at all three sizes, and the pass-1 output inspected for a handful of tabs: the `subject` field
  must read like a topic, not a website.
