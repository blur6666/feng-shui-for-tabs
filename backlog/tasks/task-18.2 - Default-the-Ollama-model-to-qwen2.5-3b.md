---
id: TASK-18.2
title: 'Default the Ollama model to qwen2.5:3b'
status: Done
assignee:
  - '@claude'
created_date: '2026-08-15 18:33'
updated_date: '2026-08-15 18:57'
labels:
  - performance
dependencies: []
modified_files:
  - shared/constants.js
  - sidepanel/app.js
  - sidepanel/index.html
  - background/llm-adapter.js
  - README.md
  - test-latency-profiles.mjs
parent_task_id: TASK-18
priority: high
type: task
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
DEFAULT_SETTINGS.ollama.model is gemma4:12b while PROVIDER_METADATA already advertises qwen2.5:3b as the Ollama default, so the two disagree. Measured on the reference machine against the real Pass-1 pipeline with 150 realistic tabs: gemma4:12b takes 104.7s at 62 tok/s and triggers two coverage retries, qwen2.5:3b takes 39.7s at 186 tok/s with no retries. This is a one-line default change with the largest single payoff. It must not alter any model the user has already configured, and must not trigger a model pull.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A fresh install defaults the Ollama model to qwen2.5:3b
- [x] #2 An existing stored model setting is preserved and never overwritten on upgrade
- [x] #3 The extension never pulls or downloads a model automatically
- [x] #4 DEFAULT_SETTINGS and PROVIDER_METADATA agree on the Ollama default model
- [x] #5 README reflects the new default
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change shared/constants.js:128 DEFAULT_SETTINGS.ollama.model from 'gemma4:12b' to 'qwen2.5:3b' so it agrees with PROVIDER_METADATA.OLLAMA.defaultModel (already 'qwen2.5:3b').
2. Verify no-overwrite guarantee: chrome.runtime.onInstalled in service-worker.js only writes DEFAULT_SETTINGS when chrome.storage.local.get('settings') returns nothing at all (existing.settings falsy) -- it never merges into or overwrites a partially-stored settings object, so an existing installed user's ollama.model is preserved untouched. mergeAnalysisSettings/mergeSettings on the sidepanel also only fall back to DEFAULT_SETTINGS for missing nested keys, never overwriting a present model. No migration/merge codepath touches an existing model value, so leave this logic untouched -- only the DEFAULT_SETTINGS literal changes.
3. Grep for other 'gemma4:12b' fallback literals used as placeholder/UI defaults (sidepanel/app.js:162 display fallback, :371 save fallback; background/llm-adapter.js:512 warmOllama fallback, :720 _callOllama fallback) -- these are last-resort fallbacks only reached if ollama.model is somehow empty/undefined at runtime (which won't happen for a fresh install once DEFAULT_SETTINGS is fixed, and never happens for upgraded users since their stored model is always present). Decide whether to update these secondary fallbacks to 'qwen2.5:3b' for consistency (low risk, no pull is ever triggered by any of these paths -- they only set the 'model' field in an Ollama /api/generate request body).
4. Confirm no code path calls Ollama's /api/pull or /api/create endpoints (grep confirms none exist in the codebase) -- changing the default model string can never trigger a download.
5. Update README.md to reflect qwen2.5:3b as the Ollama default (the 'Choosing a local model' and Option A sections currently reference llama3.1:8b/qwen2.5:7b as install-time suggestions, not stated defaults -- add an explicit statement of the shipped default).
6. Run all four test suites; add/adjust an assertion if an existing test hardcodes 'gemma4:12b' as an expected default.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed DEFAULT_SETTINGS.ollama.model from 'gemma4:12b' to 'qwen2.5:3b' in shared/constants.js:128, matching PROVIDER_METADATA.OLLAMA.defaultModel (already qwen2.5:3b, unchanged). Measured payoff from doc-5: gemma4:12b 104.7s/62 tok-s/2 retries vs qwen2.5:3b 39.7s/186 tok-s/0 retries on the real 150-tab Pass-1 pipeline.

Also updated four secondary 'gemma4:12b' fallback literals for consistency (none of these can ever trigger a pull; they only populate the 'model' field of an Ollama /api/generate request body, and are only reached if ollama.model is somehow empty at runtime, which never happens once a settings object exists):
- sidepanel/app.js:162 (display fallback when rendering the settings modal)
- sidepanel/app.js:371 (save fallback when persisting settings)
- sidepanel/index.html:371-372 (static input value/placeholder)
- background/llm-adapter.js:512 (warmOllama fallback)
- background/llm-adapter.js:720 (_callOllama fallback)

No-overwrite verification: chrome.runtime.onInstalled (service-worker.js:85-90) only calls chrome.storage.local.set({settings: DEFAULT_SETTINGS}) when 'existing.settings' is falsy, i.e. no settings object exists in storage at all -- it is a plain existence check, not a field-level merge, so it can never touch an already-stored ollama.model. The sidepanel's mergeSettings() (sidepanel/app.js:108-123) and the service worker's mergeAnalysisSettings() (service-worker.js:159-169) both spread DEFAULT_SETTINGS.ollama first and the stored/requested ollama object second, so a present stored model always wins. No pull/download code path exists anywhere in the codebase (grepped for api/pull, api/create -- zero matches); every Ollama call only ever hits /api/generate or /api/tags.

Updated README.md: Option A install instructions now state qwen2.5:3b is the shipped default and pull instruction, and explicitly restate the extension never auto-pulls; the 'Choosing a local model' Fast bullet now calls out qwen2.5:3b as the shipped default and that an existing stored model is never migrated/overwritten.

Added test-latency-profiles.mjs::testOllamaDefaultModelAgreementAndNoOverwrite, asserting: DEFAULT_SETTINGS.ollama.model === PROVIDER_METADATA[OLLAMA].defaultModel === 'qwen2.5:3b'; a simulated onInstalled existence-check preserves an existing stored model ('llama3.1:8b') untouched on 'upgrade' while a genuinely fresh install (no stored settings) gets 'qwen2.5:3b'; and the nested-nested-nested settings merge pattern used by the sidepanel preserves a present ollama.model rather than falling back to default.

All four suites pass: test-latency-profiles.mjs, test-sidepanel-profiles.mjs, test-json-repair-and-fallback.mjs, test-reconciliation-robustness.mjs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
DEFAULT_SETTINGS.ollama.model changed from gemma4:12b to qwen2.5:3b (shared/constants.js:128), now matching PROVIDER_METADATA.OLLAMA.defaultModel. Verified with test-latency-profiles.mjs::testOllamaDefaultModelAgreementAndNoOverwrite that the two agree, that chrome.runtime.onInstalled's existence-only check (never a field merge) preserves an already-stored model on upgrade, and that the sidepanel's nested settings-merge pattern preserves a present ollama.model. Confirmed via grep that no code path calls Ollama's /api/pull or /api/create -- only /api/generate and /api/tags are ever hit, so the default change can never trigger a model download. Updated four secondary UI/fallback literals (sidepanel/app.js, sidepanel/index.html, background/llm-adapter.js) to qwen2.5:3b for consistency; these are unreachable defensive fallbacks reached only if ollama.model were empty at runtime, which cannot happen once any settings object exists. Updated README.md install and model-selection guidance to state qwen2.5:3b as the shipped default and reaffirm no auto-pull/no model migration. All four suites pass (test-latency-profiles.mjs, test-sidepanel-profiles.mjs, test-json-repair-and-fallback.mjs, test-reconciliation-robustness.mjs).
<!-- SECTION:FINAL_SUMMARY:END -->
