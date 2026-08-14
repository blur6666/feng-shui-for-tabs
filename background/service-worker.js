/**
 * Background Service Worker
 * Central event router, SidePanel coordinator, and task orchestrator.
 */

import { DEFAULT_SETTINGS, MESSAGE_TYPES } from '../shared/constants.js';
import { collectAllTabs } from './tab-collector.js';
import { distillTabsForPrompt, constructAnalysisPrompt } from './content-distiller.js';
import { LLMAdapter } from './llm-adapter.js';
import { TabOrganizer } from './tab-organizer.js';

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

          // Step 2: Distill Data & Token Budgeting
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
            payload: { stage: 'distilling', message: 'Distilling content and building context window payload...' }
          }).catch(() => {});

          const distilled = distillTabsForPrompt(tabData.tabs, { maxSnippetLength: 220 });
          const prompt = constructAnalysisPrompt(distilled, payload?.customInstructions || '');

          // Step 3: Stream to Local LLM
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
            payload: { stage: 'thinking', message: `Synthesizing ${tabData.tabs.length} tabs with ${mergedSettings.provider.toUpperCase()}...` }
          }).catch(() => {});

          const plan = await LLMAdapter.generateGroupingPlan(prompt, mergedSettings, (tokenChunk, accumulatedText) => {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
              payload: { stage: 'streaming', chunk: tokenChunk, accumulatedText }
            }).catch(() => {});
          });

          // Step 4: Reconcile and guarantee 100% tab grouping coverage
          const completePlan = TabOrganizer.reconcilePlanWithRawTabs(plan, tabData.tabs);

          // Merge duplicate detection actions from collector if any
          if (tabData.duplicateActions && tabData.duplicateActions.length > 0) {
            completePlan.suggestedActions = [...(completePlan.suggestedActions || []), ...tabData.duplicateActions];
          }

          // Send final response
          sendResponse({
            success: true,
            plan: completePlan,
            rawTabs: tabData.tabs,
            totalTabs: tabData.totalTabs
          });
          break;
        }

        // Apply Tab Groups Plan
        case MESSAGE_TYPES.APPLY_GROUPS: {
          const { plan, options } = payload;
          const result = await TabOrganizer.applyGroupingPlan(plan, options);
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
