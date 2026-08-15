---
id: doc-5
title: Latency profiling 150-tab analysis on gemma4-12b
type: other
created_date: '2026-08-15 18:32'
updated_date: '2026-08-15 20:10'
---
# Latency profiling: 150-tab analysis

Measured on the reference machine (Windows 11, local Ollama), 2026-08-15. The original symptom was a 15+ minute 150-tab analysis that often never completed; the target is under one minute.

## Original Pass-1 baseline

| Model | Pass-1 total | Output rate | Retries triggered |
| --- | --- | --- | --- |
| gemma4:12b (former default) | 104.7s | 62 tok/s | 2 coverage retries (+19.8s) |
| qwen2.5:3b | 39.7s | 186 tok/s | none |

The former default was about 3x slower per output token and lost labels. The shipped fresh-install default is now qwen2.5:3b; existing stored model settings are preserved and no model is downloaded automatically.

## Changes validated

- Pass 1 uses Ollama plain json mode rather than the strict label schema. In the original 25-tab comparison, strict schema used 872 output tokens/16.4s versus plain json at 87 tokens/2.4s.
- Labels require only id and a short subject; entity, intent, and junk type are optional. The Pass-1 reserve is 26 tokens per tab plus the existing base reserve.
- Pass 1 streams Ollama NDJSON so every received chunk refreshes the stall deadline. A silent request still times out.
- JSON-heavy prompt budgeting uses a conservative chars/3.5 estimate rather than chars/4.

## Post-change end-to-end benchmark

Command:

```bash
node benchmark-analysis-profiles.mjs fast qwen2.5:3b 150
```

| Metric | Result |
| --- | --- |
| Input tabs | 150 |
| Profile / model | Fast / qwen2.5:3b |
| Pass 1 | 11.876s |
| Pass 2 | 9.613s |
| End to end | **21.698s** |
| Pass-1 coverage / fallbacks | 100% / 0 |
| Pass-1 retries | 0 |
| Pass-1 stop reasons | stop, stop, stop |
| Pass-1 prompt tokens (Ollama) | 2,704–2,863 |
| Pass-1 output rate | 201–204 tok/s |

This is 82.5% faster than the 104.7s former Pass-1 baseline and is below the 60-second end-to-end target. The Fast profile generated three 50-tab Pass-1 batches with no request or stall timeout. Pass 2 completed within its request deadline; its output reached the configured output cap, a separate grouping-quality issue tracked in TASK-19.

## Parallelism

Sequential 4x30 was 28.9s versus parallel 4x30 at 27.2s. The GPU is already saturated, so the extension intentionally keeps one local Ollama generation in flight.
