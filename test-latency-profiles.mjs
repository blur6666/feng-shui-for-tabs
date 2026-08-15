#!/usr/bin/env node
/**
 * Lightweight regression checks for latency-profile core behavior.
 * Run with: node test-latency-profiles.mjs
 */

import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, LABELING_SYSTEM_PROMPT, PROVIDER_METADATA, PROVIDERS, estimateTokens } from './shared/constants.js';
import { constructLabelingPrompt } from './background/content-distiller.js';
import { ANALYSIS_PROFILES, AUTO_QUALITY_MAX_TABS, getRequestContextBudget, planAdaptivePass1Batches, resolveAnalysisProfile } from './background/analysis-profile.js';
import { labelTabsInBatches } from './background/tab-labeler.js';
import { LLMAdapter } from './background/llm-adapter.js';

function readPromptInputs(prompt) {
  const encoded = prompt.slice(prompt.indexOf('TABS=') + 5, prompt.indexOf('\n\nRules'));
  return JSON.parse(encoded);
}

function makeTabs(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Topic ${index + 1}`,
    domain: 'example.test',
    description: 'A compact test description.'
  }));
}

async function testAdaptivePackingAndProfiles() {
  const tabs = makeTabs(100);
  const fastSettings = { ollama: { num_ctx: 32768 }, grouping: { analysisProfile: 'fast' } };
  const fast = resolveAnalysisProfile(fastSettings);
  const fastBatches = planAdaptivePass1Batches(tabs, {
    settings: fastSettings,
    profile: fast,
    createPrompt: constructLabelingPrompt,
    systemPrompt: LABELING_SYSTEM_PROMPT
  });
  assert.deepEqual(fastBatches.map(batch => batch.tabs.length), [50, 50]);
  assert.ok(fastBatches.every(batch => batch.fits && batch.contextLimit <= 8192));

  const qualitySettings = { ollama: { num_ctx: 32768 }, grouping: { analysisProfile: 'quality' } };
  const quality = resolveAnalysisProfile(qualitySettings);
  const qualityBatches = planAdaptivePass1Batches(makeTabs(21), {
    settings: qualitySettings,
    profile: quality,
    createPrompt: constructLabelingPrompt,
    systemPrompt: LABELING_SYSTEM_PROMPT
  });
  assert.deepEqual(qualityBatches.map(batch => batch.tabs.length), [20, 1]);
  assert.equal(quality.richEvidence, true);

  const fastBudget = getRequestContextBudget({ estimatedPromptTokens: 5000, outputReserve: 1000, settings: fastSettings, profile: fast });
  const qualityBudget = getRequestContextBudget({ estimatedPromptTokens: 12000, outputReserve: 2000, settings: qualitySettings, profile: quality });
  assert.ok(fastBudget.contextLimit <= 8192);
  assert.ok(qualityBudget.contextLimit > 8192);
}

async function testAutoProfileSelection() {
  const autoSettings = { grouping: { analysisProfile: 'auto' } };
  const storedFastSettings = { grouping: { analysisProfile: 'fast' } };
  const storedQualitySettings = { grouping: { analysisProfile: 'quality' } };

  // Auto: small sets -> Quality, large sets -> Fast
  assert.equal(resolveAnalysisProfile(autoSettings, 10).id, 'quality');
  assert.equal(resolveAnalysisProfile(autoSettings, AUTO_QUALITY_MAX_TABS).id, 'quality');
  assert.equal(resolveAnalysisProfile(autoSettings, AUTO_QUALITY_MAX_TABS + 1).id, 'fast');
  assert.equal(resolveAnalysisProfile(autoSettings, 112).id, 'fast');
  // No tab count yet -> Fast (safe default)
  assert.equal(resolveAnalysisProfile(autoSettings).id, 'fast');

  // Stored explicit values are always honored
  assert.equal(resolveAnalysisProfile(storedFastSettings, 10).id, 'fast');
  assert.equal(resolveAnalysisProfile(storedQualitySettings, 112).id, 'quality');
}

async function testPrefilterAndCoverageRetry() {
  const originalGenerate = LLMAdapter.generateGroupingPlan;
  const settings = { provider: 'ollama', ollama: { num_ctx: 8192 }, grouping: { analysisProfile: 'fast' } };
  const profile = resolveAnalysisProfile(settings);
  const requests = [];
  let calls = 0;

  LLMAdapter.generateGroupingPlan = async (prompt, _settings, options) => {
    const inputs = readPromptInputs(prompt);
    requests.push({ ids: inputs.map(item => item.i), options });
    calls++;
    const returned = calls === 1 ? inputs.slice(0, -1) : inputs;
    return {
      value: {
        tabs: returned.map(item => ({
          id: item.i,
          subject: item.t,
          entity: '',
          intent: 'reference',
          junkType: null
        }))
      },
      metrics: { phase: 'pass1', attempt: options.attempt, elapsedMs: 1 }
    };
  };

  try {
    const result = await labelTabsInBatches([
      { id: 999, title: 'New Tab', localJunk: 'new_tab' },
      ...makeTabs(3)
    ], settings, null, { profile });
    assert.equal(result.locallySkipped, 1);
    assert.equal(result.junkActions.length, 1);
    assert.equal(result.labeledTabs.length, 3);
    assert.deepEqual(requests.map(request => request.ids), [[1, 2, 3], [3]]);
    assert.equal(requests[0].options.responseSchema, undefined, 'Pass 1 must use plain json mode rather than the strict labeling schema');
    assert.equal(profile.pass1OutputTokensPerTab, 26, 'Pass 1 output budget must use the reduced per-tab reserve');
  } finally {
    LLMAdapter.generateGroupingPlan = originalGenerate;
  }
}

async function testOllamaRequestBounds() {
  const originalFetch = globalThis.fetch;
  let payload;
  try {
    globalThis.fetch = async (_url, init) => {
      payload = JSON.parse(init.body);
      return new Response(JSON.stringify({ response: JSON.stringify({ tabs: [] }), done: true }), { status: 200 });
    };
    await LLMAdapter.generateGroupingPlan('small prompt', {
      provider: 'ollama',
      ollama: { endpoint: 'http://test', model: 'test', num_ctx: 32768 }
    }, {
      systemPrompt: 'system',
      phase: 'pass1',
      stream: false,
      responseSchema: undefined,
      numCtx: 4096,
      outputReserve: 128,
      numPredict: 128,
      keepAlive: '10m'
    });
    assert.equal(payload.format, 'json', 'An omitted response schema must request Ollama plain json mode');
    assert.equal(payload.options.num_ctx, 4096);
    assert.equal(payload.options.num_predict, 128);
    assert.equal(payload.keep_alive, '10m');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// TASK-18.4: JSON payloads are denser than the old chars/4 approximation.
// Keep this deliberately simple invariant near the policy so an accidental
// rollback cannot cause the batch planner to over-pack the model context.
async function testConservativeTokenEstimate() {
  const jsonHeavyPayload = JSON.stringify(makeTabs(50));
  assert.equal(estimateTokens(jsonHeavyPayload), Math.ceil(jsonHeavyPayload.length / 3.5));
  assert.ok(estimateTokens(jsonHeavyPayload) > Math.ceil(jsonHeavyPayload.length / 4), 'Token estimate must be more conservative than chars/4 for JSON payloads');
}

// TASK-18.4: a progressing NDJSON response must refresh the stall timer while
// a stream with no body activity must still be aborted at that deadline.
async function testOllamaStreamingStallControl() {
  const originalFetch = globalThis.fetch;
  const encoder = new TextEncoder();
  const settings = { provider: 'ollama', ollama: { endpoint: 'http://test', model: 'test', num_ctx: 4096 } };

  try {
    globalThis.fetch = async () => new Response(new ReadableStream({
      start(controller) {
        setTimeout(() => controller.enqueue(encoder.encode('{"response":"{\\"tabs\\":[", "done":false}\n')), 10);
        setTimeout(() => controller.enqueue(encoder.encode('{"response":"{\\"id\\":1,\\"subject\\":\\"Topic\\"}]}", "done":false}\n')), 25);
        setTimeout(() => {
          controller.enqueue(encoder.encode('{"response":"", "done":true, "done_reason":"stop", "eval_count":12}\n'));
          controller.close();
        }, 40);
      }
    }), { status: 200 });

    const progressing = await LLMAdapter.generateGroupingPlan('small prompt', settings, {
      systemPrompt: 'system', phase: 'pass1', stream: true, timeoutMs: 200, stallTimeoutMs: 20, numCtx: 4096, numPredict: 128
    });
    assert.equal(progressing.value.tabs[0].id, 1);
    assert.equal(progressing.metrics.doneReason, 'stop');

    globalThis.fetch = async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        // A real fetch rejects its body reader when AbortController fires.
        // Mirror that behavior so this regression test cannot leave its
        // deliberately quiet stream pending forever.
        init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true });
      }
    }), { status: 200 });
    await assert.rejects(
      LLMAdapter.generateGroupingPlan('small prompt', settings, {
        systemPrompt: 'system', phase: 'pass1', stream: true, timeoutMs: 200, stallTimeoutMs: 20, numCtx: 4096, numPredict: 128
      }),
      /no response activity/i,
      'A stream with no chunks must still respect the stall deadline'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// TASK-18.1 regression: service-worker.js re-resolves the profile after tab
// collection (auto mode guesses Fast pre-collection, since tab count is 0).
// A <=20-tab run must re-resolve to Quality post-collection without throwing
// "Assignment to constant variable", and every downstream request option
// (timeouts, keep-alive) must reflect the re-resolved profile, not the guess.
async function testSmallTabSetProfileReresolutionDoesNotCrash() {
  const originalGenerate = LLMAdapter.generateGroupingPlan;
  const originalWarm = LLMAdapter.warmOllama;
  const originalChrome = globalThis.chrome;

  let capturedPass1Options = null;
  let messageListener;

  const TAB_COUNT = 10; // <= AUTO_QUALITY_MAX_TABS: auto mode must land on Quality.
  const tabs = Array.from({ length: TAB_COUNT }, (_, i) => ({
    id: i + 1,
    windowId: 1,
    url: `https://example${i % 5}.test/page-${i + 1}`,
    title: `Tab ${i + 1}`,
    pinned: false,
    discarded: false,
    index: i,
    groupId: -1
  }));

  const storedSettings = {
    provider: 'ollama',
    ollama: { endpoint: 'http://test', model: 'test', num_ctx: 32768 },
    grouping: { scope: 'all_windows', analysisProfile: 'auto', extractReadability: false },
    privacyBlocklist: []
  };

  globalThis.chrome = {
    runtime: {
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: listener => { messageListener = listener; } },
      sendMessage: async () => {}
    },
    action: { onClicked: { addListener: () => {} } },
    storage: {
      local: { get: async () => ({ settings: storedSettings }) }
    },
    windows: {
      getAll: async () => ([{ id: 1, focused: true, type: 'normal', tabs }])
    },
    scripting: {
      executeScript: async () => ([{ result: null }])
    }
  };

  LLMAdapter.warmOllama = async () => ({ value: true, metrics: {} });
  LLMAdapter.generateGroupingPlan = async (prompt, _settings, options) => {
    if (options.phase === 'pass1') {
      if (!capturedPass1Options) capturedPass1Options = options;
      const inputs = readPromptInputs(prompt);
      // Quality profile sends rich tab records (key "id"); Fast sends compact
      // records (key "i"). Support both so this mock never spuriously misses
      // coverage regardless of which profile actually ran.
      return {
        value: {
          tabs: inputs.map(item => ({
            id: item.id ?? item.i,
            subject: item.title ?? item.t ?? 'Topic',
            entity: '',
            intent: 'reference',
            junkType: null
          }))
        },
        metrics: { phase: 'pass1', attempt: options.attempt, elapsedMs: 1 }
      };
    }
    return {
      value: {
        summary: 'test summary',
        groups: [{ title: 'Test', label: 'Test Group', color: 'blue', rationale: 'grouped', tabIds: tabs.map(t => t.id) }]
      },
      metrics: { phase: 'pass2', attempt: options.attempt, elapsedMs: 1 }
    };
  };

  try {
    // Fresh module registry entry per run: append a cache-busting query so
    // repeated suite runs still register a listener against the current mocks.
    const serviceWorkerModule = await import(`./background/service-worker.js?t=${Date.now()}`);
    void serviceWorkerModule;
    assert.ok(messageListener, 'service worker must register an onMessage listener');

    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ANALYZE_TABS did not respond within 5s')), 5000);
      const keptChannelOpen = messageListener({ type: 'ANALYZE_TABS', payload: {} }, {}, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      assert.equal(keptChannelOpen, true, 'onMessage listener must keep the channel open for the async response');
    });

    assert.equal(response.success, true, `Analysis must not crash for a ${TAB_COUNT}-tab set: ${response.error}`);
    assert.equal(response.diagnostics.profile, 'quality', 'auto mode must re-resolve to Quality once the real tab count is known');
    assert.ok(capturedPass1Options, 'Pass 1 must have been invoked');
    assert.equal(capturedPass1Options.timeoutMs, ANALYSIS_PROFILES.quality.requestTimeoutMs, 'Pass 1 request timeout must reflect the re-resolved Quality profile');
    assert.equal(capturedPass1Options.stallTimeoutMs, ANALYSIS_PROFILES.quality.stallTimeoutMs, 'Pass 1 stall timeout must reflect the re-resolved Quality profile');
    assert.equal(capturedPass1Options.keepAlive, ANALYSIS_PROFILES.quality.keepAlive, 'Pass 1 keep-alive must reflect the re-resolved Quality profile');
  } finally {
    LLMAdapter.generateGroupingPlan = originalGenerate;
    LLMAdapter.warmOllama = originalWarm;
    globalThis.chrome = originalChrome;
  }
}

// TASK-18.2: DEFAULT_SETTINGS and PROVIDER_METADATA must agree on the Ollama
// default model (qwen2.5:3b), and onInstalled/mergeSettings-style merge logic
// must never overwrite an already-stored model on upgrade.
async function testOllamaDefaultModelAgreementAndNoOverwrite() {
  assert.equal(DEFAULT_SETTINGS.ollama.model, 'qwen2.5:3b', 'DEFAULT_SETTINGS.ollama.model must be qwen2.5:3b');
  assert.equal(PROVIDER_METADATA[PROVIDERS.OLLAMA].defaultModel, 'qwen2.5:3b', 'PROVIDER_METADATA Ollama defaultModel must be qwen2.5:3b');
  assert.equal(DEFAULT_SETTINGS.ollama.model, PROVIDER_METADATA[PROVIDERS.OLLAMA].defaultModel, 'DEFAULT_SETTINGS and PROVIDER_METADATA must agree on the Ollama default model');

  // Simulate the onInstalled merge shape used by service-worker.js: it writes
  // DEFAULT_SETTINGS only when no settings are stored at all. Once settings
  // exist, an already-configured model must never be replaced, regardless of
  // what DEFAULT_SETTINGS says.
  const existingUserSettings = {
    provider: 'ollama',
    ollama: { endpoint: 'http://localhost:11434', model: 'llama3.1:8b', num_ctx: 16384, temperature: 0.2 }
  };
  const simulatedOnInstalled = (existing) => (existing ? existing : DEFAULT_SETTINGS);
  const afterUpgrade = simulatedOnInstalled(existingUserSettings);
  assert.equal(afterUpgrade.ollama.model, 'llama3.1:8b', 'An already-stored model must survive an upgrade untouched');

  // A genuinely fresh install (no stored settings at all) gets the new default.
  const afterFreshInstall = simulatedOnInstalled(null);
  assert.equal(afterFreshInstall.ollama.model, 'qwen2.5:3b', 'A fresh install must default to qwen2.5:3b');

  // The sidepanel's nested-merge helper (mergeSettings in sidepanel/app.js) also
  // must preserve a present ollama.model rather than falling back to the default.
  const nestedMerge = (stored = {}) => ({
    ...DEFAULT_SETTINGS,
    ...stored,
    ollama: { ...DEFAULT_SETTINGS.ollama, ...(stored.ollama || {}) }
  });
  const mergedForExistingUser = nestedMerge(existingUserSettings);
  assert.equal(mergedForExistingUser.ollama.model, 'llama3.1:8b', 'Nested settings merge must preserve an existing stored model');
}

await testAdaptivePackingAndProfiles();
await testAutoProfileSelection();
await testPrefilterAndCoverageRetry();
await testOllamaRequestBounds();
await testConservativeTokenEstimate();
await testOllamaStreamingStallControl();
await testSmallTabSetProfileReresolutionDoesNotCrash();
await testOllamaDefaultModelAgreementAndNoOverwrite();
console.log('Latency profile regression checks passed');
