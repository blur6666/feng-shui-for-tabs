/**
 * Background Service Worker
 * Central event router, SidePanel coordinator, and task orchestrator.
 */

import { DEFAULT_SETTINGS, MESSAGE_TYPES, SYSTEM_PROMPT, estimateTokens } from '../shared/constants.js';
import { collectAllTabs } from './tab-collector.js';
import { distillTabsForPrompt, constructClusteringPrompt } from './content-distiller.js';
import { labelTabsInBatches } from './tab-labeler.js';
import { LLMAdapter } from './llm-adapter.js';
import { TabOrganizer, validateGroupingPlan } from './tab-organizer.js';

// Helper to strip Origin header on requests to local LLMs (bypasses Ollama 403 Forbidden check)
async function setupDNRRules() {
  if (!chrome.declarativeNetRequest) return;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1001, 1002, 1003, 1004],
      addRules: [
        {
          id: 1001,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'origin', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: '||localhost:11434',
            resourceTypes: ['xmlhttprequest']
          }
        },
        {
          id: 1002,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'origin', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: '||127.0.0.1:11434',
            resourceTypes: ['xmlhttprequest']
          }
        },
        {
          id: 1003,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'origin', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: '||localhost:1234',
            resourceTypes: ['xmlhttprequest']
          }
        },
        {
          id: 1004,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'origin', operation: 'remove' }
            ]
          },
          condition: {
            urlFilter: '||127.0.0.1:1234',
            resourceTypes: ['xmlhttprequest']
          }
        }
      ]
    });
  } catch (err) {
    console.warn('Could not set dynamic rules:', err);
  }
}

// 1. Initialize Extension Settings, DNR Rules & Side Panel Behavior on Install / Startup
chrome.runtime.onInstalled.addListener(async () => {
  await setupDNRRules();
  const existing = await chrome.storage.local.get('settings');
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Configure Side Panel to open upon clicking the action icon
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (err) {
      console.warn('Could not set side panel behavior:', err);
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await setupDNRRules();
});

// Fallback action click listener in case setPanelBehavior is unsupported
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.warn('Could not open side panel on click:', err);
    }
  }
});

// Active analysis cancellation tracker
let activeAbortController = null;

// 2. Message Bus Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { type, payload } = message || {};

      switch (type) {
        // Quick preview of open tabs
        case MESSAGE_TYPES.GET_TABS_PREVIEW: {
          const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
          const data = await collectAllTabs({
            scope: payload?.scope || settings.grouping?.scope || 'all_windows',
            extractReadability: false
          });
          sendResponse({ success: true, data });
          break;
        }

        // Check LLM Health / Model list
        case MESSAGE_TYPES.CHECK_LLM_HEALTH: {
          const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
          const currentSettings = payload?.settings || settings;
          const health = await LLMAdapter.testConnection(currentSettings);
          sendResponse(health);
          break;
        }

        // Full Tab Analysis Pipeline
        case MESSAGE_TYPES.ANALYZE_TABS: {
          const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
          const mergedSettings = { ...settings, ...(payload?.settings || {}) };

          // Step 1: Collect Tabs & Deep Content
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
            payload: { stage: 'collecting', message: 'Extracting semantic metadata from open tabs...' }
          }).catch(() => {});

          const tabData = await collectAllTabs({
            scope: mergedSettings.grouping?.scope || 'all_windows',
            privacyBlocklist: mergedSettings.privacyBlocklist || [],
            extractReadability: mergedSettings.grouping?.extractReadability !== false,
            skipPinned: false
          }, (completed, total) => {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
              payload: { stage: 'collecting', completed, total, message: `Harvested content from ${completed}/${total} tabs...` }
            }).catch(() => {});
          });

          if (tabData.tabs.length === 0) {
            sendResponse({ success: false, error: 'No open tabs found to analyze.' });
            return;
          }

          // Step 2: Distill Data
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
            payload: { stage: 'distilling', message: 'Distilling content from open tabs...' }
          }).catch(() => {});

          const distilled = distillTabsForPrompt(tabData.tabs, { maxSnippetLength: 220 });

          // Step 3: Pass 1 - Batched Semantic Labeling
          const { labeledTabs, junkActions, redundancyActions } = await labelTabsInBatches(
            distilled,
            mergedSettings,
            (progress) => {
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
                payload: progress
              }).catch(() => {});
            }
          );

          // Step 4: Pass 2 - Synthesize & Cluster Clean Labeled Tabs
          let plan;
          if (labeledTabs.length > 0) {
            const clusterPrompt = constructClusteringPrompt(labeledTabs, payload?.customInstructions || '', payload?.granularity || 'balanced');
            const estimatedTokens = estimateTokens(clusterPrompt + '\n' + (SYSTEM_PROMPT || ''));
            const maxContext = Number(mergedSettings.ollama?.num_ctx) || 32768;

            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
              payload: {
                stage: 'thinking',
                estimatedTokens,
                maxContext,
                message: `Pass 2/2: Clustering ${labeledTabs.length} semantic topics (~ ${estimatedTokens} / ${maxContext} ctx tokens)...`
              }
            }).catch(() => {});

            plan = await LLMAdapter.generateGroupingPlan(clusterPrompt, mergedSettings, (tokenChunk, accumulatedText) => {
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
                payload: { stage: 'streaming', chunk: tokenChunk, accumulatedText }
              }).catch(() => {});
            });

            // Guardrail validation check (TASK-1.7)
            let validation = validateGroupingPlan(plan, labeledTabs);
            if (!validation.valid) {
              console.warn('[ServiceWorker] Grouping plan violated taxonomy rules:', validation.violations);
              const retryPrompt = `${clusterPrompt}\n\nCORRECTION REQUIRED:\nThe previous attempt had the following errors:\n- ${validation.violations.join('\n- ')}\n\nPlease fix these mistakes and re-group strictly by subject theme without naming groups after websites or creating duplicate themes.`;

              try {
                chrome.runtime.sendMessage({
                  type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
                  payload: {
                    stage: 'thinking',
                    message: 'Refining grouping plan to fix site/duplicate violations...'
                  }
                }).catch(() => {});

                const retryPlan = await LLMAdapter.generateGroupingPlan(retryPrompt, mergedSettings);
                const retryValidation = validateGroupingPlan(retryPlan, labeledTabs);

                if (retryValidation.valid || retryValidation.violations.length < validation.violations.length) {
                  plan = retryPlan;
                  validation = retryValidation;
                }
              } catch (retryErr) {
                console.warn('[ServiceWorker] Retry grouping call failed:', retryErr.message);
              }

              if (!validation.valid) {
                plan.warning = `Note: Some groups may require review: ${validation.violations.join('; ')}`;
              }
            }
          } else {
            plan = { summary: 'All open tabs categorized as operational or duplicates.', groups: [] };
          }

          // Step 5: Reconcile and guarantee 100% tab grouping coverage
          const completePlan = TabOrganizer.reconcilePlanWithRawTabs(plan, tabData.tabs, payload?.granularity || 'balanced');

          // Merge suggested actions: junk tabs, duplicates, and semantic redundancies (deduplicated by tabId)
          const combinedActions = [
            ...(completePlan.suggestedActions || []),
            ...(junkActions || []),
            ...(redundancyActions || []),
            ...(tabData.duplicateActions || [])
          ];
          const seenActionTabs = new Set();
          completePlan.suggestedActions = combinedActions.filter(act => {
            if (!act.tabId) return true;
            if (seenActionTabs.has(act.tabId)) return false;
            seenActionTabs.add(act.tabId);
            return true;
          });

          // Send final response
          sendResponse({
            success: true,
            plan: completePlan,
            rawTabs: tabData.tabs,
            totalTabs: tabData.totalTabs,
            shieldedTabs: tabData.shieldedTabs || 0
          });
          break;
        }

        // Apply Tab Groups Plan
        case MESSAGE_TYPES.APPLY_GROUPS: {
          const { plan, options } = payload;
          const applyOptions = {
            ...(options || {}),
            granularity: options?.granularity || payload?.granularity || plan?.granularity || 'balanced'
          };
          const result = await TabOrganizer.applyGroupingPlan(plan, applyOptions);
          sendResponse(result);
          break;
        }

        // 1-Click Undo
        case MESSAGE_TYPES.UNDO_GROUPS: {
          const result = await TabOrganizer.restoreLastSnapshot();
          sendResponse(result);
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown message type: ${type}` });
          break;
      }
    } catch (err) {
      console.error('Service Worker Error handling message:', err);
      sendResponse({ success: false, error: err.message || 'Internal service worker error' });
    }
  })();

  // Keep message channel open for async response
  return true;
});
