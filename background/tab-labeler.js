/**
 * Tab Labeler Engine (Pass 1 of Two-Pass Pipeline)
 * Batches distilled tabs, extracts subject/entity/intent/junkType via LLM,
 * retries missing tab IDs, and routes junk tabs directly to Suggested Actions.
 */

import { LABELING_SYSTEM_PROMPT } from '../shared/constants.js';
import { constructLabelingPrompt } from './content-distiller.js';
import { detectJunk } from '../shared/junk-rules.js';
import { LLMAdapter } from './llm-adapter.js';
import { planAdaptivePass1Batches, resolveAnalysisProfile } from './analysis-profile.js';

function createJunkAction(tab, junkType) {
  return {
    action: 'close_junk',
    tabId: tab.id,
    junkType,
    reason: `${junkType.replace(/_/g, ' ')}: ${tab.title || tab.domain}`
  };
}

function classifyFailure(error) {
  const message = error?.message || 'Unknown request failure';
  if (/cancel/i.test(message)) return 'cancelled';
  if (/deadline|no response activity|timed out/i.test(message)) return 'timeout';
  if (/parse|json|schema/i.test(message)) return 'parse';
  return 'request';
}

function readLabels(result, allowedIds, target) {
  const rawList = result?.value?.tabs || (Array.isArray(result?.value) ? result.value : []);
  for (const item of rawList) {
    if (item && allowedIds.has(item.id)) target.set(item.id, item);
  }
}

function requestOptionsForBatch({ profile, descriptor, batchIndex, totalBatches, attempt, retryReason, runOptions }) {
  return {
    systemPrompt: LABELING_SYSTEM_PROMPT,
    // Plain json mode, not the strict LABELING_JSON_SCHEMA: schema-constrained
    // decoding forces every declared field to be emitted verbatim rather than
    // letting the model terminate early (measured 6.8x slower, doc-5). Coverage
    // is instead protected by the prompt's explicit "every ID exactly once"
    // instruction plus the existing missing-ID retry below.
    phase: 'pass1',
    batchIndex,
    totalBatches,
    attempt,
    // Streaming lets the adapter refresh the inactivity deadline for every
    // Ollama NDJSON chunk, distinguishing slow progress from a true stall.
    stream: true,
    signal: runOptions.signal,
    timeoutMs: runOptions.timeoutMs ?? profile.requestTimeoutMs,
    stallTimeoutMs: runOptions.stallTimeoutMs ?? profile.stallTimeoutMs,
    numCtx: descriptor.contextLimit,
    outputReserve: descriptor.outputReserve,
    numPredict: descriptor.outputReserve,
    keepAlive: profile.keepAlive,
    onMetrics: metrics => runOptions.onMetrics?.({ ...metrics, retryReason })
  };
}

/**
 * Executes Pass 1: deterministic junk filtering followed by token-budgeted
 * semantic labeling. Fast mode sends compact evidence in larger batches;
 * Quality keeps richer evidence and conservative batches.
 */
export async function labelTabsInBatches(distilledTabs, settings, onProgress = null, runOptions = {}) {
  if (!distilledTabs?.length) {
    return { labeledTabs: [], junkActions: [], redundancyActions: [], locallySkipped: 0 };
  }

  const profile = runOptions.profile || resolveAnalysisProfile(settings);
  const allCleanLabeled = [];
  const allJunkActions = [];
  const candidates = [];

  // Known operational tabs do not need expensive semantic inference. Ambiguous
  // pages still reach the model, which may independently classify them as junk.
  for (const tab of distilledTabs) {
    const localJunk = tab.localJunk || detectJunk(tab);
    if (localJunk) {
      allJunkActions.push(createJunkAction(tab, localJunk));
    } else {
      candidates.push(tab);
    }
  }

  const locallySkippedCount = allJunkActions.length;

  if (onProgress && locallySkippedCount > 0) {
    onProgress({
      stage: 'thinking',
      completed: 0,
      total: candidates.length,
      locallySkipped: locallySkippedCount,
      profile: profile.id,
      message: `Pass 1/2: Routed ${allJunkActions.length} known operational tabs locally.`
    });
  }

  if (candidates.length === 0) {
    return {
      labeledTabs: [],
      junkActions: allJunkActions,
      redundancyActions: [],
      locallySkipped: locallySkippedCount
    };
  }

  const batches = planAdaptivePass1Batches(candidates, {
    settings,
    profile,
    createPrompt: constructLabelingPrompt,
    systemPrompt: LABELING_SYSTEM_PROMPT
  });
  const totalBatches = batches.length;
  let completed = 0;

  for (let index = 0; index < totalBatches; index++) {
    const descriptor = batches[index];
    const batch = descriptor.tabs;
    const batchIndex = index + 1;
    const batchIds = new Set(batch.map(tab => tab.id));
    const batchLabelsMap = new Map();
    let latestMetrics = null;
    let retryCount = 0;
    let retryReason = null;
    let initialFailure = null;

    onProgress?.({
      stage: 'thinking',
      batchIndex,
      totalBatches,
      completed,
      total: candidates.length,
      locallySkipped: locallySkippedCount,
      profile: profile.id,
      estimatedTokens: descriptor.estimatedPromptTokens,
      maxContext: descriptor.contextLimit,
      message: `Pass 1/2: Labeling ${batch.length} semantic tabs (batch ${batchIndex}/${totalBatches})...`
    });

    try {
      const result = await LLMAdapter.generateGroupingPlan(
        constructLabelingPrompt(batch, profile),
        settings,
        requestOptionsForBatch({ profile, descriptor, batchIndex, totalBatches, attempt: 1, runOptions })
      );
      latestMetrics = result.metrics;
      readLabels(result, batchIds, batchLabelsMap);
    } catch (error) {
      if (runOptions.signal?.aborted) throw error;
      initialFailure = error;
      console.warn(`[TabLabeler] Batch ${batchIndex} labeling failed:`, error.message);
    }

    const missingTabs = batch.filter(tab => !batchLabelsMap.has(tab.id));
    const parsedPartialResult = batchLabelsMap.size > 0;
    const mayRetry = missingTabs.length > 0 && (parsedPartialResult || profile.retryFullBatch);

    if (mayRetry) {
      retryCount = 1;
      retryReason = parsedPartialResult ? 'coverage' : classifyFailure(initialFailure);
      console.log(`[TabLabeler] Retrying ${missingTabs.length} ${retryReason} tab labels for batch ${batchIndex}...`);
      try {
        const retryDescriptor = {
          ...descriptor,
          tabs: missingTabs,
          outputReserve: Math.min(descriptor.outputReserve, Math.max(96, missingTabs.length * profile.pass1OutputTokensPerTab + 64))
        };
        const retryResult = await LLMAdapter.generateGroupingPlan(
          constructLabelingPrompt(missingTabs, profile),
          settings,
          requestOptionsForBatch({
            profile,
            descriptor: retryDescriptor,
            batchIndex,
            totalBatches,
            attempt: 2,
            retryReason,
            runOptions
          })
        );
        latestMetrics = retryResult.metrics;
        readLabels(retryResult, new Set(missingTabs.map(tab => tab.id)), batchLabelsMap);
      } catch (error) {
        if (runOptions.signal?.aborted) throw error;
        console.warn(`[TabLabeler] ${retryReason} retry failed for batch ${batchIndex}:`, error.message);
      }
    }

    let fallbackCount = 0;
    for (const tab of batch) {
      const labelData = batchLabelsMap.get(tab.id);
      if (!labelData) fallbackCount++;
      const resolved = labelData || {
        id: tab.id,
        subject: tab.title || tab.domain || 'Reference',
        entity: tab.schemaName || tab.domain || '',
        intent: 'reference',
        junkType: null
      };

      if (resolved.junkType) {
        allJunkActions.push(createJunkAction(tab, resolved.junkType));
      } else {
        allCleanLabeled.push({
          id: tab.id,
          subject: resolved.subject || tab.title || 'Topic',
          entity: resolved.entity || tab.schemaName || '',
          intent: resolved.intent || 'reference'
        });
      }
    }

    completed += batch.length;
    onProgress?.({
      stage: 'thinking',
      batchIndex,
      totalBatches,
      completed,
      total: candidates.length,
      locallySkipped: locallySkippedCount,
      retryCount,
      retryReason,
      fallbackCount,
      profile: profile.id,
      metrics: latestMetrics,
      message: `Pass 1/2: Completed batch ${batchIndex}/${totalBatches}${retryCount ? ` after ${retryReason} retry` : ''}.`
    });
  }

  const redundancyActions = detectSemanticRedundancies(allCleanLabeled);
  return {
    labeledTabs: allCleanLabeled,
    junkActions: allJunkActions,
    redundancyActions,
    locallySkipped: locallySkippedCount
  };
}

// Subjects too generic to imply redundancy when no entity is present.
const GENERIC_SUBJECTS = new Set(['reference', 'home', 'login', 'sign in', 'signin', 'new tab', 'untitled', 'about']);

const MIN_EMPTY_ENTITY_SUBJECT_LENGTH = 12;

// Words ending in 's' that are not simple plurals (false-positive guard for near-match).
const NON_PLURAL_S_WORDS = new Set(['news', 'lens', 'series', 'species', 'does', 'goes', 'chaos']);

/**
 * Normalizes a label for near-match comparison (trim, lowercase, conservative singularization).
 * Only strips a plural 's' where it is safe; irregular and false-positive forms are left intact
 * so distinct labels ('news' vs 'new', 'class' vs 'clas', 'analysis' vs 'analysi') never collapse.
 * @param {string} value
 * @returns {string}
 */
function normalizeLabel(value) {
  const normalized = (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length <= 3) return normalized;
  if (NON_PLURAL_S_WORDS.has(normalized)) return normalized;
  if (/(ss|us|is|as)$/.test(normalized)) return normalized;
  if (/(x|ch|sh|ss|z|o)es$/.test(normalized)) return normalized.slice(0, -2);
  if (normalized.endsWith('s')) return normalized.slice(0, -1);
  return normalized;
}

/**
 * Detects semantic redundancy across labeled tabs without additional LLM calls.
 * Flags tabs that share the same entity and near-identical subjects, plus
 * specific subject-only matches when the entity is empty but the subject is
 * specific enough to avoid generic false positives.
 * @param {Array<object>} labeledTabs
 * @returns {Array<object>} redundancyActions
 */
export function detectSemanticRedundancies(labeledTabs = []) {
  const redundancyActions = [];
  const seenMap = new Map();

  for (const tab of labeledTabs) {
    const normSub = normalizeLabel(tab.subject);
    const normEnt = normalizeLabel(tab.entity);
    if (!normSub && !normEnt) continue;

    let isRedundant = false;
    let matchedTabId = null;
    let matchKey = null;

    if (normEnt) {
      matchKey = `ent:${normEnt}:::sub:${normSub}`;
      if (seenMap.has(matchKey)) {
        isRedundant = true;
        matchedTabId = seenMap.get(matchKey);
      }
    } else if (normSub.length >= MIN_EMPTY_ENTITY_SUBJECT_LENGTH && !GENERIC_SUBJECTS.has(normSub)) {
      matchKey = `sub:${normSub}`;
      if (seenMap.has(matchKey)) {
        isRedundant = true;
        matchedTabId = seenMap.get(matchKey);
      }
    }

    if (isRedundant && matchedTabId !== null && matchKey !== null) {
      redundancyActions.push({
        action: 'semantic_redundancy',
        tabId: tab.id,
        targetTabId: matchedTabId,
        junkType: 'redundant',
        reason: `Redundant content: "${tab.subject || tab.entity}" (matches Tab #${matchedTabId})`
      });
    } else if (matchKey !== null) {
      seenMap.set(matchKey, tab.id);
    }
  }

  return redundancyActions;
}
