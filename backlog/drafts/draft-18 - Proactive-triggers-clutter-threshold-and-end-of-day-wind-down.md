---
id: DRAFT-18
title: 'Proactive triggers: clutter threshold and end-of-day wind down'
status: Draft
assignee: []
created_date: '2026-08-15 11:08'
labels:
  - ideas
  - automation
dependencies: []
references:
  - ideas3.md#10
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the extension from purely on-demand to proactive. Clutter Threshold Alert: when ungrouped tabs exceed a user-set count (default 15), offer a cleanup prompt rather than waiting to be opened. End-of-Day Wind Down: an optional prompt at a configurable time (default 5-6 PM) offering to organize, archive or bookmark the day tabs for a clean start tomorrow. Needs the notifications permission and a chrome.alarms schedule; the service worker is non-persistent under MV3, so the alarm has to survive worker termination. Both must be opt-in and easy to silence - an extension that nags on a threshold the user did not choose is worse than one that stays quiet.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Threshold alert fires only above a user-configured count of ungrouped tabs and is off by default
- [ ] #2 End-of-day prompt fires at a user-configured time and survives service worker termination
- [ ] #3 Both triggers can be disabled independently, and dismissing one does not re-prompt the same day
<!-- AC:END -->
