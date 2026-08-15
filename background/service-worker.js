/**
 * Background Service Worker
 * Central event router, SidePanel coordinator, and task orchestrator.
 */

import { DEFAULT_SETTINGS, JSON_SCHEMA, MESSAGE_TYPES, SYSTEM_PROMPT } from '../shared/constants.js';
import { collectAllTabs } from './tab-collector.js';
import { distillTabsForPrompt, constructClusteringPrompt } from './content-distiller.js';
import { labelTabsInBatches } from './tab-labeler.js';
import { LLMAdapter } from './llm-adapter.js';
import { planPass2Budget, resolveAnalysisProfile } from './analysis-profile.js';
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
let activeAnalysisId = null;

const DEFAULT_ANALYSIS_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_ANALYSIS_STALL_TIMEOUT_MS = 90 * 1000;

function createAnalysisId() {
  return globalThis.crypto?.randomUUID?.() || `analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function throwIfCancelled(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error('Analysis cancelled.');
}

function safeRequestMetrics(metrics = {}) {
  const allowedFields = [
    'provider', 'phase', 'batchIndex', 'totalBatches', 'attempt', 'elapsedMs',
    'totalDurationMs', 'loadDurationMs', 'promptEvalCount', 'promptEvalDurationMs',
    'promptTokensPerSecond', 'evalCount', 'evalDurationMs', 'outputTokensPerSecond',
    'estimatedPromptTokens', 'effectiveNumCtx', 'model', 'retryReason'
  ];
  return allowedFields.reduce((safe, field) => {
    if (metrics[field] !== undefined && metrics[field] !== null) safe[field] = metrics[field];
    return safe;
  }, {});
}

function summarizeDiagnostics(diagnostics) {
  const requests = diagnostics.requests || [];
  return {
    analysisId: diagnostics.analysisId,
    profile: diagnostics.profile || null,
    elapsedMs: Date.now() - diagnostics.startedAt,
    collectionMs: diagnostics.collectionMs || null,
    requestCount: requests.length,
    retryCount: requests.filter(request => Number(request.attempt) > 1).length,
    requests
  };
}

function mergeAnalysisSettings(saved = {}, requested = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...saved, ...requested };
  const nestedKeys = ['gemini', 'claude', 'openai', 'openrouter', 'groq', 'ollama', 'geminiNano', 'lmStudio', 'grouping'];
  for (const key of nestedKeys) {
    merged[key] = { ...DEFAULT_SETTINGS[key], ...(saved[key] || {}), ...(requested[key] || {}) };
  }
  merged.privacyBlocklist = Array.isArray(requested.privacyBlocklist)
    ? requested.privacyBlocklist
    : (Array.isArray(saved.privacyBlocklist) ? saved.privacyBlocklist : DEFAULT_SETTINGS.privacyBlocklist);
  return merged;
}

function sendAnalysisProgress(analysisId, payload) {
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.ANALYSIS_PROGRESS,
    payload: { analysisId, ...payload }
  }).catch(() => {});
}

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

        // Stop the active run without making any tab changes.
        case MESSAGE_TYPES.CANCEL_ANALYSIS: {
          if (!activeAbortController) {
            sendResponse({ success: true, cancelled: false, message: 'No analysis is currently running.' });
            break;
          }
          if (payload?.analysisId && activeAnalysisId && payload.analysisId !== activeAnalysisId) {
            sendResponse({ success: false, error: 'The requested analysis is no longer active.' });
            break;
          }
          activeAbortController.abort(new Error('Analysis cancelled by user.'));
          sendAnalysisProgress(activeAnalysisId, {
            stage: 'cancelled',
            message: 'Cancelling analysis and queued model requests...'
          });
          sendResponse({ success: true, cancelled: true, analysisId: activeAnalysisId });
          break;
        }

        // Full Tab Analysis Pipeline
        case MESSAGE_TYPES.ANALYZE_TABS: {
          if (activeAbortController) {
            sendResponse({ success: false, error: 'An analysis is already running. Cancel it before starting another one.' });
            break;
          }

          const analysisId = createAnalysisId();
          const runController = new AbortController();
          const diagnostics = { analysisId, startedAt: Date.now(), requests: [] };
          activeAbortController = runController;
          activeAnalysisId = analysisId;

          const emitProgress = progress => sendAnalysisProgress(analysisId, progress);
          const onMetrics = metrics => {
            const safeMetrics = safeRequestMetrics(metrics);
            diagnostics.requests.push(safeMetrics);
            emitProgress({
              stage: 'metrics',
              metrics: safeMetrics,
              message: `${safeMetrics.phase || 'LLM'} request completed in ${safeMetrics.elapsedMs || 0}ms.`
            });
          };
          const baseRequestOptions = {
            signal: runController.signal,
            timeoutMs: DEFAULT_ANALYSIS_REQUEST_TIMEOUT_MS,
            stallTimeoutMs: DEFAULT_ANALYSIS_STALL_TIMEOUT_MS,
            onMetrics
          };

          try {
            const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
            const mergedSettings = mergeAnalysisSettings(settings, payload?.settings || {});
            let profile = resolveAnalysisProfile(mergedSettings);
            diagnostics.profile = profile.id;
            const requestOptions = {
              ...baseRequestOptions,
              timeoutMs: profile.requestTimeoutMs,
              stallTimeoutMs: profile.stallTimeoutMs,
              keepAlive: profile.keepAlive
            };
            const warmupPromise = (mergedSettings.provider || 'ollama') === 'ollama'
              ? LLMAdapter.warmOllama(mergedSettings, {
                ...requestOptions,
                phase: 'warming',
                numCtx: Math.min(Number(mergedSettings.ollama?.num_ctx) || profile.contextCeiling, profile.contextCeiling),
                keepAlive: profile.keepAlive
              }).catch(error => {
                if (!runController.signal.aborted) {
                  console.warn('[ServiceWorker] Ollama warm-up failed; continuing with analysis:', error.message);
                }
                return null;
              })
              : Promise.resolve(null);

            // Step 1: Collect Tabs & Deep Content
            emitProgress({ stage: 'collecting', message: 'Extracting semantic metadata from open tabs...' });
            const collectionStartedAt = Date.now();
            const tabData = await collectAllTabs({
              scope: mergedSettings.grouping?.scope || 'all_windows',
              privacyBlocklist: mergedSettings.privacyBlocklist || [],
              extractReadability: mergedSettings.grouping?.extractReadability !== false,
              skipPinned: false,
              signal: runController.signal
            }, (completed, total) => {
              emitProgress({
                stage: 'collecting',
                completed,
                total,
                message: `Harvested content from ${completed}/${total} tabs...`
              });
            });
            diagnostics.collectionMs = Date.now() - collectionStartedAt;
            throwIfCancelled(runController.signal);

            if (tabData.tabs.length === 0) {
              sendResponse({ success: false, error: 'No open tabs found to analyze.', diagnostics: summarizeDiagnostics(diagnostics) });
              break;
            }

            // Auto mode: choose the profile from the authoritative tab count
            // once collection is done. The pre-collection profile only sized
            // the concurrent warm-up request.
            const resolvedProfile = resolveAnalysisProfile(mergedSettings, tabData.tabs.length);
            if (resolvedProfile.id !== profile.id) {
              profile = resolvedProfile;
              diagnostics.profile = profile.id;
              requestOptions.timeoutMs = profile.requestTimeoutMs;
              requestOptions.stallTimeoutMs = profile.stallTimeoutMs;
              requestOptions.keepAlive = profile.keepAlive;
            }

            await warmupPromise;
            throwIfCancelled(runController.signal);

            // Step 2: Distill Data
            emitProgress({ stage: 'distilling', message: 'Distilling content from open tabs...' });
            const distilled = distillTabsForPrompt(tabData.tabs, {
              maxSnippetLength: profile.maxSnippetLength,
              profile
            });
            throwIfCancelled(runController.signal);

            // Step 3: Pass 1 - Batched Semantic Labeling
            const { labeledTabs, junkActions, redundancyActions } = await labelTabsInBatches(
              distilled,
              mergedSettings,
              progress => emitProgress(progress),
              { ...requestOptions, profile }
            );
            throwIfCancelled(runController.signal);

            // Step 4: Pass 2 - Synthesize & Cluster Clean Labeled Tabs
            let plan;
            if (labeledTabs.length > 0) {
              const clusterPrompt = constructClusteringPrompt(
                labeledTabs,
                payload?.customInstructions || '',
                payload?.granularity || 'balanced',
                profile
              );
              const pass2Budget = planPass2Budget(clusterPrompt, mergedSettings, profile, SYSTEM_PROMPT, labeledTabs.length);
              if (!pass2Budget.fits) {
                throw new Error(`Pass 2 cannot fit ${pass2Budget.estimatedPromptTokens} prompt tokens plus ${pass2Budget.outputReserve} reserved output tokens within the ${pass2Budget.configuredCap} token ${profile.label} context cap.`);
              }

              emitProgress({
                stage: 'thinking',
                profile: profile.id,
                estimatedTokens: pass2Budget.estimatedPromptTokens,
                maxContext: pass2Budget.contextLimit,
                message: `Pass 2/2: Clustering ${labeledTabs.length} semantic topics (~ ${pass2Budget.estimatedPromptTokens} / ${pass2Budget.contextLimit} ctx tokens, ${profile.label})...`
              });

              const pass2Options = {
                ...requestOptions,
                systemPrompt: SYSTEM_PROMPT,
                responseSchema: JSON_SCHEMA,
                phase: 'pass2',
                stream: true,
                numCtx: pass2Budget.contextLimit,
                outputReserve: pass2Budget.outputReserve,
                numPredict: pass2Budget.outputReserve,
                keepAlive: profile.keepAlive,
                onTokenChunk: tokenChunk => emitProgress({ stage: 'streaming', chunk: tokenChunk, profile: profile.id })
              };

              try {
                const groupingResult = await LLMAdapter.generateGroupingPlan(clusterPrompt, mergedSettings, pass2Options);
                plan = groupingResult.value;
              } catch (groupingError) {
                if (runController.signal.aborted) throw groupingError;
                console.warn('[ServiceWorker] Pass 2 LLM grouping failed, building semantic fallback groups:', groupingError.message);
                // Build a fallback plan directly from the Pass 1 labeled subjects and entities
                const fallbackGroupsMap = new Map();
                for (const t of labeledTabs) {
                  const key = (t.entity || t.subject || 'Reference').trim();
                  if (!fallbackGroupsMap.has(key)) fallbackGroupsMap.set(key, []);
                  fallbackGroupsMap.get(key).push(t.id);
                }
                const fallbackGroups = Array.from(fallbackGroupsMap.entries()).map(([title, ids]) => ({
                  title,
                  label: title,
                  color: 'blue',
                  rationale: `Grouped by semantic topic (${title})`,
                  tabIds: ids
                }));
                plan = {
                  summary: 'Tabs organized from semantic topic analysis.',
                  groups: fallbackGroups,
                  warning: `Note: Pass 2 clustering recovered from a model formatting error (${groupingError.message}).`
                };
              }
              throwIfCancelled(runController.signal);

              // Quality mode preserves the existing correction retry. Fast mode
              // reports the warning immediately instead of paying for a second
              // full grouping generation.
              let validation = validateGroupingPlan(plan, labeledTabs);
              if (!validation.valid) {
                console.warn('[ServiceWorker] Grouping plan violated taxonomy rules:', validation.violations);
                if (profile.retryValidation) {
                  const retryPrompt = `${clusterPrompt}\n\nCORRECTION REQUIRED:\nThe previous attempt had the following errors:\n- ${validation.violations.join('\n- ')}\n\nPlease fix these mistakes and re-group strictly by subject theme without naming groups after websites or creating duplicate themes.`;

                  try {
                    emitProgress({ stage: 'thinking', profile: profile.id, message: 'Refining grouping plan to fix site/duplicate violations...' });
                    const retryResult = await LLMAdapter.generateGroupingPlan(retryPrompt, mergedSettings, {
                      ...pass2Options,
                      attempt: 2,
                      stream: false,
                      onMetrics: metrics => onMetrics({ ...metrics, retryReason: 'validation' })
                    });
                    const retryPlan = retryResult.value;
                    const retryValidation = validateGroupingPlan(retryPlan, labeledTabs);

                    if (retryValidation.valid || retryValidation.violations.length < validation.violations.length) {
                      plan = retryPlan;
                      validation = retryValidation;
                    }
                  } catch (retryErr) {
                    if (runController.signal.aborted) throw retryErr;
                    console.warn('[ServiceWorker] Retry grouping call failed:', retryErr.message);
                  }
                }

                if (!validation.valid) {
                  const isSevereCollapse = validation.violations.some(v =>
                    v.includes('collapsed') || v.includes('hallucinated') || v.includes('concentrated')
                  );
                  if (isSevereCollapse && labeledTabs.length >= 6) {
                    console.warn('[ServiceWorker] Model returned degenerate grouping plan; falling back to Pass-1 topic clusters');
                    const fallbackGroupsMap = new Map();
                    for (const t of labeledTabs) {
                      const key = (t.entity || t.subject || 'Reference').trim();
                      if (!fallbackGroupsMap.has(key)) fallbackGroupsMap.set(key, []);
                      fallbackGroupsMap.get(key).push(t.id);
                    }
                    plan = {
                      summary: 'Tabs organized into semantic topic clusters.',
                      groups: Array.from(fallbackGroupsMap.entries()).map(([title, ids]) => ({
                        title,
                        label: title,
                        color: 'blue',
                        rationale: `Grouped by semantic topic (${title})`,
                        tabIds: ids
                      })),
                      warning: `Note: Grouping plan was adjusted to prevent topic collapse (${validation.violations[0]}).`
                    };
                  } else {
                    plan.warning = `Note: Some groups may require review: ${validation.violations.join('; ')}`;
                  }
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

            sendResponse({
              success: true,
              analysisId,
              plan: completePlan,
              rawTabs: tabData.tabs,
              totalTabs: tabData.totalTabs,
              shieldedTabs: tabData.shieldedTabs || 0,
              diagnostics: summarizeDiagnostics(diagnostics)
            });
          } catch (err) {
            const cancelled = runController.signal.aborted;
            const error = err?.message || (cancelled ? 'Analysis cancelled.' : 'Internal analysis error.');
            console.warn('[ServiceWorker] Analysis failed:', error);
            sendResponse({
              success: false,
              cancelled,
              analysisId,
              error,
              diagnostics: summarizeDiagnostics(diagnostics)
            });
          } finally {
            if (activeAbortController === runController) {
              activeAbortController = null;
              activeAnalysisId = null;
            }
          }
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
