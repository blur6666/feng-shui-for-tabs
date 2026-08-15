---
id: DRAFT-19
title: >-
  Hybrid Pre-Clustering: Deterministic BM25 Token Grouping with LLM Semantic
  Synthesis
status: Draft
assignee: []
created_date: '2026-08-15 22:23'
labels:
  - architecture
  - performance
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract obvious keyword clusters (BM25 / TF-IDF token overlap on subreddits, repos, queries) before invoking the LLM. Only send ambiguous singletons and cross-domain candidates to the LLM for synthesis, cutting token usage by 50% and eliminating obvious-group fragmentation.
<!-- SECTION:DESCRIPTION:END -->
