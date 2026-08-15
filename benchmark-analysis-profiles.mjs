#!/usr/bin/env node
/**
 * Reproducible local Ollama benchmark for the two-pass tab analysis pipeline.
 * Usage: node benchmark-analysis-profiles.mjs [fast|quality] [model] [tabCount]
 * Example: node benchmark-analysis-profiles.mjs fast qwen2.5:3b 150
 */

import { JSON_SCHEMA, SYSTEM_PROMPT } from './shared/constants.js';
import { constructClusteringPrompt } from './background/content-distiller.js';
import { labelTabsInBatches } from './background/tab-labeler.js';
import { planPass2Budget, resolveAnalysisProfile } from './background/analysis-profile.js';
import { LLMAdapter } from './background/llm-adapter.js';

const profileName = process.argv[2] === 'quality' ? 'quality' : 'fast';
const model = process.argv[3] || 'qwen2.5:3b';
const requestedTabCount = Number(process.argv[4] || 150);
const tabCount = Number.isInteger(requestedTabCount) && requestedTabCount > 0 ? requestedTabCount : 150;
const settings = {
  provider: 'ollama',
  ollama: {
    endpoint: 'http://localhost:11434',
    model,
    num_ctx: profileName === 'fast' ? 8192 : 32768
  },
  grouping: { analysisProfile: profileName }
};
const profile = resolveAnalysisProfile(settings);
const requestMetrics = [];
const progress = [];

function metricRecorder(metrics) {
  requestMetrics.push(metrics);
}

function makeSyntheticTabs(count) {
  const topics = [
    ['Air Fryer', 'shopping'], ['TypeScript', 'development'], ['Tokyo Travel', 'travel'],
    ['Home Office', 'shopping'], ['Strength Training', 'fitness'], ['Coffee Brewing', 'research'],
    ['Financial Planning', 'finance'], ['Garden Design', 'research'], ['Photography', 'learning'],
    ['Recipe Planning', 'cooking']
  ];

  return Array.from({ length: count }, (_, index) => {
    const [topic, intent] = topics[index % topics.length];
    const ordinal = Math.floor(index / topics.length) + 1;
    return {
      id: index + 1,
      title: `${topic} ${ordinal}: guide and comparison`,
      domain: `${topic.toLowerCase().replace(/\s+/g, '-')}.example.test`,
      path: `/reference/${ordinal}`,
      description: `A concise ${topic.toLowerCase()} resource for ${intent}.`,
      schemaName: topic,
      headings: [`${topic} overview`],
      keywords: [topic.toLowerCase(), intent],
      snippet: `Synthetic evidence for ${topic}. `.repeat(12)
    };
  });
}

const startedAt = Date.now();
const tabs = makeSyntheticTabs(tabCount);
let warmMetrics = null;
try {
  const warm = await LLMAdapter.warmOllama(settings, {
    phase: 'warming',
    numCtx: profileName === 'fast' ? 8192 : 32768,
    keepAlive: profile.keepAlive,
    timeoutMs: profile.requestTimeoutMs,
    stallTimeoutMs: profile.stallTimeoutMs
  });
  warmMetrics = warm.metrics;

  const pass1StartedAt = Date.now();
  const { labeledTabs, junkActions, redundancyActions, locallySkipped } = await labelTabsInBatches(
    tabs,
    settings,
    event => progress.push(event),
    { profile, onMetrics: metricRecorder }
  );
  const pass1ElapsedMs = Date.now() - pass1StartedAt;

  const clusterPrompt = constructClusteringPrompt(labeledTabs, '', 'balanced', profile);
  const pass2Budget = planPass2Budget(clusterPrompt, settings, profile, SYSTEM_PROMPT);
  if (!pass2Budget.fits) {
    throw new Error(`Pass 2 exceeds the effective ${pass2Budget.configuredCap} token context cap.`);
  }

  const pass2StartedAt = Date.now();
  const pass2 = await LLMAdapter.generateGroupingPlan(clusterPrompt, settings, {
    systemPrompt: SYSTEM_PROMPT,
    responseSchema: JSON_SCHEMA,
    phase: 'pass2',
    stream: false,
    timeoutMs: profile.requestTimeoutMs,
    stallTimeoutMs: profile.stallTimeoutMs,
    numCtx: pass2Budget.contextLimit,
    outputReserve: pass2Budget.outputReserve,
    numPredict: pass2Budget.outputReserve,
    keepAlive: profile.keepAlive,
    onMetrics: metricRecorder
  });
  const pass2ElapsedMs = Date.now() - pass2StartedAt;

  const report = {
    profile: profile.id,
    model,
    inputTabs: tabs.length,
    labeledTabs: labeledTabs.length,
    suggestedActions: junkActions.length + redundancyActions.length,
    locallySkipped,
    pass1ElapsedMs,
    pass2ElapsedMs,
    totalElapsedMs: Date.now() - startedAt,
    pass1Coverage: (labeledTabs.length + junkActions.length) / tabs.length,
    pass1FallbackCount: progress.reduce((total, event) => total + (event.fallbackCount || 0), 0),
    pass1RetryBatches: progress.filter(event => event.retryCount > 0).length,
    pass1DoneReasons: requestMetrics
      .filter(metrics => metrics.phase === 'pass1')
      .map(metrics => metrics.doneReason || null),
    pass1BatchEvents: progress.filter(event => event.stage === 'thinking' && event.metrics).map(event => ({
      batchIndex: event.batchIndex,
      totalBatches: event.totalBatches,
      completed: event.completed,
      retryCount: event.retryCount || 0,
      fallbackCount: event.fallbackCount || 0,
      metrics: event.metrics || null
    })),
    pass2GroupCount: pass2.value?.groups?.length || 0,
    warmMetrics,
    requestMetrics
  };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    profile: profile.id,
    model,
    failedAfterMs: Date.now() - startedAt,
    error: error.message,
    requestMetrics
  }, null, 2));
  process.exitCode = 1;
}
