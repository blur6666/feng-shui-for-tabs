---
id: decision-13
title: >-
  Resolve the send-everything versus minimum-group-size tension by routing junk
  locally
date: '2026-08-15 11:16'
status: accepted
---
## Context

Sending everything to the LLM (decision-1) combined with a three-tab minimum (decision-7) means twelve New Tabs can still satisfy the threshold and form a New Tabs group, which is exactly the junk grouping the epic exists to remove.

## Decision

Pass 1 tags each tab with a junkType. Tagged tabs are pulled out locally, converted into Suggested Actions entries, and excluded from pass 2 clustering entirely.

## Consequences

The LLM still decides what is junk, it just never gets to name a group after it. Junk routing is deterministic and local, so no junk group can be created regardless of model behaviour. Depends on the two-pass split in decision-4.
