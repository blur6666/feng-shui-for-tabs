---
id: decision-8
title: Middle-click closes the real Chrome tab immediately with no confirmation
date: '2026-08-15 11:16'
status: accepted
---
## Context

Middle-click closing a tab from the list is destructive. A confirmation dialog would make it safe but would defeat the speed that makes the gesture worth having.

## Decision

Middle-click closes the real Chrome tab immediately, with no confirmation.

## Consequences

Fast, and matches native browser behaviour. Not undoable: restoreLastSnapshot does not restore closed tabs, so the limitation must be discoverable in the row tooltip. Deliberately different from bulk destructive actions, which do confirm. Implemented by TASK-2.2.
