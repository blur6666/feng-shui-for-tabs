#!/usr/bin/env node
/**
 * Lightweight regression checks for latency-profile core behavior.
 * Run with: node test-latency-profiles.mjs
 */

import assert from 'node:assert/strict';
import { LABELING_JSON_SCHEMA, LABELING_SYSTEM_PROMPT } from './shared/constants.js';
import { constructLabelingPrompt } from './background/content-distiller.js';
import { AUTO_QUALITY_MAX_TABS, getRequestContextBudget, planAdaptivePass1Batches, resolveAnalysisProfile } from './background/analysis-profile.js';
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
    assert.equal(requests[0].options.responseSchema, LABELING_JSON_SCHEMA);
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
      responseSchema: LABELING_JSON_SCHEMA,
      numCtx: 4096,
      outputReserve: 128,
      numPredict: 128,
      keepAlive: '10m'
    });
    assert.deepEqual(payload.format, LABELING_JSON_SCHEMA);
    assert.equal(payload.options.num_ctx, 4096);
    assert.equal(payload.options.num_predict, 128);
    assert.equal(payload.keep_alive, '10m');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await testAdaptivePackingAndProfiles();
await testAutoProfileSelection();
await testPrefilterAndCoverageRetry();
await testOllamaRequestBounds();
console.log('Latency profile regression checks passed');
