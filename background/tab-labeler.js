/**
 * Tab Labeler Engine (Pass 1 of Two-Pass Pipeline)
 * Batches distilled tabs, extracts subject/entity/intent/junkType via LLM,
 * retries missing tab IDs, and routes junk tabs directly to Suggested Actions.
 */

import { LABELING_SYSTEM_PROMPT } from '../shared/constants.js';
import { constructLabelingPrompt } from './content-distiller.js';
import { detectJunk } from '../shared/junk-rules.js';
import { LLMAdapter } from './llm-adapter.js';

export const PASS1_BATCH_SIZE = 20;

/**
 * Executes Pass 1: Batched Semantic Labeling
 * @param {Array<object>} distilledTabs
 * @param {object} settings
 * @param {Function} onProgress
 * @returns {Promise<{ labeledTabs: Array<object>, junkActions: Array<object> }>}
 */
export async function labelTabsInBatches(distilledTabs, settings, onProgress = null) {
  if (!distilledTabs || distilledTabs.length === 0) {
    return { labeledTabs: [], junkActions: [] };
  }

  const allCleanLabeled = [];
  const allJunkActions = [];
  const totalTabs = distilledTabs.length;

  const totalBatches = Math.ceil(totalTabs / PASS1_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const startIdx = i * PASS1_BATCH_SIZE;
    const endIdx = Math.min(startIdx + PASS1_BATCH_SIZE, totalTabs);
    const batch = distilledTabs.slice(startIdx, endIdx);

    if (onProgress) {
      onProgress({
        stage: 'thinking',
        batchIndex: i + 1,
        totalBatches,
        completed: startIdx,
        total: totalTabs,
        message: `Pass 1/2: Labeling semantic subjects (batch ${i + 1}/${totalBatches})...`
      });
    }

    let batchLabelsMap = new Map();

    try {
      const prompt = constructLabelingPrompt(batch);
      const res = await LLMAdapter.generateGroupingPlan(prompt, settings, null, LABELING_SYSTEM_PROMPT);
      const rawList = res?.tabs || (Array.isArray(res) ? res : []);

      for (const item of rawList) {
        if (item && item.id !== undefined) {
          batchLabelsMap.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn(`[TabLabeler] Batch ${i + 1} labeling failed, will retry missing tabs:`, err.message);
    }

    // Identify missing tabs in batch
    const missingTabs = batch.filter(t => !batchLabelsMap.has(t.id));

    if (missingTabs.length > 0) {
      console.log(`[TabLabeler] Retrying ${missingTabs.length} missing tabs for batch ${i + 1}...`);
      try {
        const retryPrompt = constructLabelingPrompt(missingTabs);
        const retryRes = await LLMAdapter.generateGroupingPlan(retryPrompt, settings, null, LABELING_SYSTEM_PROMPT);
        const retryList = retryRes?.tabs || (Array.isArray(retryRes) ? retryRes : []);

        for (const item of retryList) {
          if (item && item.id !== undefined) {
            batchLabelsMap.set(item.id, item);
          }
        }
      } catch (retryErr) {
        console.warn(`[TabLabeler] Retry failed for missing tabs:`, retryErr.message);
      }
    }

    // Process all tabs in current batch with fallbacks
    for (const tab of batch) {
      const localJunk = tab.localJunk || detectJunk(tab);
      const labelData = batchLabelsMap.get(tab.id) || {
        id: tab.id,
        subject: tab.title || tab.domain || 'Reference',
        entity: tab.schemaName || tab.domain || '',
        intent: 'reference',
        junkType: localJunk
      };

      const finalJunkType = localJunk || labelData.junkType || null;

      if (finalJunkType) {
        // Tagged as junk -> route directly to suggestedActions
        allJunkActions.push({
          action: 'close_junk',
          tabId: tab.id,
          junkType: finalJunkType,
          reason: `${finalJunkType.replace(/_/g, ' ')}: ${tab.title || tab.domain}`
        });
      } else {
        // Valuable tab -> include in Pass 2 clustering payload
        allCleanLabeled.push({
          id: tab.id,
          subject: labelData.subject || tab.title || 'Topic',
          entity: labelData.entity || tab.schemaName || '',
          intent: labelData.intent || 'reference'
        });
      }
    }
  }

  const redundancyActions = detectSemanticRedundancies(allCleanLabeled);

  return {
    labeledTabs: allCleanLabeled,
    junkActions: allJunkActions,
    redundancyActions
  };
}

// Subjects too generic to imply redundancy when no entity is present.
const GENERIC_SUBJECTS = new Set(['reference', 'home', 'login', 'sign in', 'signin', 'new tab', 'untitled', 'about']);

const MIN_EMPTY_ENTITY_SUBJECT_LENGTH = 12;

/**
 * Normalizes a label for near-match comparison (trim, lowercase, singular form).
 * @param {string} value
 * @returns {string}
 */
function normalizeLabel(value) {
  const normalized = (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length > 1 && normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
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
      // Entity present: subject near-match + exact entity is strong signal.
      matchKey = `ent:${normEnt}:::sub:${normSub}`;
      if (seenMap.has(matchKey)) {
        isRedundant = true;
        matchedTabId = seenMap.get(matchKey);
      }
    } else {
      // Empty entity: only flag specific subjects, never generic fallbacks.
      if (normSub.length >= MIN_EMPTY_ENTITY_SUBJECT_LENGTH && !GENERIC_SUBJECTS.has(normSub)) {
        matchKey = `sub:${normSub}`;
        if (seenMap.has(matchKey)) {
          isRedundant = true;
          matchedTabId = seenMap.get(matchKey);
        }
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
