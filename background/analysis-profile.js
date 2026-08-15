/**
 * Analysis profile policy and token-budget batch planning.
 *
 * Profiles deliberately constrain request shape rather than increasing model
 * context blindly. All values are safe local defaults; an explicit user
 * num_ctx remains the upper bound for Ollama requests.
 */

import { estimateTokens } from '../shared/constants.js';

const CONTEXT_STEP = 1024;

export const ANALYSIS_PROFILES = Object.freeze({
  fast: Object.freeze({
    id: 'fast',
    label: 'Fast',
    maxPass1Tabs: 50,
    contextCeiling: 8192,
    minimumContext: 4096,
    // Keep one profile-effective context for every request in a run. Ollama
    // can create a new runner when num_ctx changes, which defeats keep-alive.
    reuseContext: true,
    maxSnippetLength: 0,
    richEvidence: false,
    // Fifty strict JSON labels need more than a terse prose estimate; reserve
    // enough tokens to avoid truncating the closing array/object mid-response.
    pass1BaseOutputTokens: 160,
    pass1OutputTokensPerTab: 44,
    pass2OutputTokens: 1800,
    requestTimeoutMs: 2 * 60 * 1000,
    stallTimeoutMs: 45 * 1000,
    keepAlive: '10m',
    retryFullBatch: false,
    retryValidation: false
  }),
  quality: Object.freeze({
    id: 'quality',
    label: 'Quality',
    maxPass1Tabs: 20,
    contextCeiling: Number.POSITIVE_INFINITY,
    minimumContext: 8192,
    reuseContext: true,
    maxSnippetLength: 220,
    richEvidence: true,
    pass1BaseOutputTokens: 160,
    pass1OutputTokensPerTab: 44,
    pass2OutputTokens: 1600,
    requestTimeoutMs: 5 * 60 * 1000,
    stallTimeoutMs: 90 * 1000,
    keepAlive: '15m',
    retryFullBatch: true,
    retryValidation: true
  })
});

/**
 * Auto mode: Quality is affordable (single 20-tab batch) for small tab sets
 * and gives richer evidence; larger sets switch to Fast for bounded latency.
 */
export const AUTO_QUALITY_MAX_TABS = 20;

export function resolveAnalysisProfile(settings = {}, tabCount = 0) {
  const requested = settings.grouping?.analysisProfile;
  if (requested === 'quality') return ANALYSIS_PROFILES.quality;
  if (requested === 'fast') return ANALYSIS_PROFILES.fast;
  // auto / missing / legacy values: choose by tab count without user input.
  return tabCount > 0 && tabCount <= AUTO_QUALITY_MAX_TABS
    ? ANALYSIS_PROFILES.quality
    : ANALYSIS_PROFILES.fast;
}

function roundContext(value) {
  return Math.ceil(value / CONTEXT_STEP) * CONTEXT_STEP;
}

function configuredContextCap(settings, profile) {
  const configured = Number(settings.ollama?.num_ctx);
  const fallback = Number.isFinite(profile.contextCeiling) ? profile.contextCeiling : 32768;
  const userCap = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  return Math.min(userCap, profile.contextCeiling);
}

export function estimatePass1OutputTokens(tabCount, profile) {
  return profile.pass1BaseOutputTokens + (Math.max(1, tabCount) * profile.pass1OutputTokensPerTab);
}

export function getRequestContextBudget({ estimatedPromptTokens, outputReserve, settings, profile }) {
  const cap = configuredContextCap(settings, profile);
  const required = Math.ceil((estimatedPromptTokens + outputReserve) * 1.12);
  const preferred = Math.max(profile.minimumContext, roundContext(required));
  const contextLimit = profile.reuseContext ? cap : Math.min(cap, preferred);

  return {
    configuredCap: cap,
    contextLimit,
    requiredContext: required,
    fits: required <= cap
  };
}

/**
 * Packs records into deterministic Pass-1 batches. The prompt builder is
 * injected so the planner measures the exact serialized evidence that will be
 * sent to the model.
 */
export function planAdaptivePass1Batches(records, { settings, profile, createPrompt, systemPrompt }) {
  const batches = [];
  let current = [];

  const describe = tabs => {
    const prompt = createPrompt(tabs, profile);
    const estimatedPromptTokens = estimateTokens(`${prompt}\n${systemPrompt || ''}`);
    const outputReserve = estimatePass1OutputTokens(tabs.length, profile);
    const context = getRequestContextBudget({ estimatedPromptTokens, outputReserve, settings, profile });
    return {
      tabs,
      estimatedPromptTokens,
      outputReserve,
      ...context
    };
  };

  const flush = () => {
    if (current.length === 0) return;
    batches.push(describe(current));
    current = [];
  };

  for (const record of records) {
    const candidate = [...current, record];
    const descriptor = describe(candidate);
    const exceedsTabLimit = candidate.length > profile.maxPass1Tabs;

    if (current.length > 0 && (exceedsTabLimit || !descriptor.fits)) {
      flush();
    }
    current.push(record);
  }
  flush();

  return batches;
}

export function planPass2Budget(prompt, settings, profile, systemPrompt = '', tabCount = 0) {
  const estimatedPromptTokens = estimateTokens(`${prompt}\n${systemPrompt || ''}`);
  const scaledOutput = tabCount > 0
    ? Math.max(profile.pass2OutputTokens, Math.min(3500, Math.ceil(tabCount * 22) + 800))
    : profile.pass2OutputTokens;
  const outputReserve = scaledOutput;
  return {
    estimatedPromptTokens,
    outputReserve,
    ...getRequestContextBudget({ estimatedPromptTokens, outputReserve, settings, profile })
  };
}
