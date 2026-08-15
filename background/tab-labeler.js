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
      const localJunk = detectJunk(tab);
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

  return {
    labeledTabs: allCleanLabeled,
    junkActions: allJunkActions
  };
}
