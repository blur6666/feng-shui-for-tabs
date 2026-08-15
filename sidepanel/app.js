/**
 * Tab Intelligence - Side Panel Application Controller
 * Supports Google Gemini, Anthropic Claude, OpenAI, OpenRouter, Groq, Ollama, Gemini Nano, and LM Studio.
 */

import { CHROME_TAB_COLORS, DEFAULT_SETTINGS, MESSAGE_TYPES, PROVIDERS, PROVIDER_METADATA } from '../shared/constants.js';

// Application State
let appState = {
  settings: DEFAULT_SETTINGS,
  isAnalyzing: false,
  plan: null,
  rawTabsMap: new Map(),
  totalTabs: 0,
  windowsCount: 0,
  duplicatesCount: 0
};

// DOM Elements Cache
const elements = {
  statTabs: document.getElementById('stat-tabs'),
  statWindows: document.getElementById('stat-windows'),
  statDuplicates: document.getElementById('stat-duplicates'),
  btnRefreshStats: document.getElementById('btn-refresh-stats'),
  btnHealth: document.getElementById('btn-health'),
  providerLabel: document.getElementById('provider-label'),
  statusDot: document.querySelector('.status-dot'),
  btnSettings: document.getElementById('btn-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  settingsModal: document.getElementById('settings-modal'),
  selectGranularity: document.getElementById('select-granularity'),
  selectScope: document.getElementById('select-scope'),
  selectConsolidation: document.getElementById('select-consolidation'),
  inputInstructions: document.getElementById('input-instructions'),
  btnAnalyze: document.getElementById('btn-analyze'),
  progressCard: document.getElementById('progress-card'),
  progressStage: document.getElementById('progress-stage'),
  progressMessage: document.getElementById('progress-message'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  streamOutput: document.getElementById('stream-output'),
  resultsContainer: document.getElementById('results-container'),
  resultsSummary: document.getElementById('results-summary'),
  actionsSection: document.getElementById('actions-section'),
  actionsList: document.getElementById('actions-list'),
  groupsList: document.getElementById('groups-list'),
  footerActions: document.getElementById('footer-actions'),
  btnApply: document.getElementById('btn-apply'),
  btnUndo: document.getElementById('btn-undo'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnTestConnection: document.getElementById('btn-test-connection'),
  testFeedback: document.getElementById('test-feedback'),
  selectProvider: document.getElementById('select-provider'),

  // Cloud Panels & Inputs
  panelGemini: document.getElementById('settings-panel-gemini'),
  cfgGeminiKey: document.getElementById('cfg-gemini-key'),
  cfgGeminiModel: document.getElementById('cfg-gemini-model'),

  panelClaude: document.getElementById('settings-panel-claude'),
  cfgClaudeKey: document.getElementById('cfg-claude-key'),
  cfgClaudeModel: document.getElementById('cfg-claude-model'),

  panelOpenAI: document.getElementById('settings-panel-openai'),
  cfgOpenAIKey: document.getElementById('cfg-openai-key'),
  cfgOpenAIModel: document.getElementById('cfg-openai-model'),

  panelOpenRouter: document.getElementById('settings-panel-openrouter'),
  cfgOpenRouterKey: document.getElementById('cfg-openrouter-key'),
  cfgOpenRouterModel: document.getElementById('cfg-openrouter-model'),

  panelGroq: document.getElementById('settings-panel-groq'),
  cfgGroqKey: document.getElementById('cfg-groq-key'),
  cfgGroqModel: document.getElementById('cfg-groq-model'),

  // Local Panels & Inputs
  panelOllama: document.getElementById('settings-panel-ollama'),
  cfgOllamaEndpoint: document.getElementById('cfg-ollama-endpoint'),
  cfgOllamaModel: document.getElementById('cfg-ollama-model'),
  cfgOllamaNumCtx: document.getElementById('cfg-ollama-num-ctx'),

  panelNano: document.getElementById('settings-panel-gemini_nano'),

  panelLmStudio: document.getElementById('settings-panel-lm_studio'),
  cfgLmStudioEndpoint: document.getElementById('cfg-lmstudio-endpoint'),
  cfgLmStudioModel: document.getElementById('cfg-lmstudio-model'),
  cfgLmStudioKey: document.getElementById('cfg-lmstudio-key')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await refreshTabStats();
  await checkHealth();
  setupEventListeners();
  setupMessageListener();
});

// Load Settings from Storage
async function loadSettings() {
  const data = await chrome.storage.local.get(['settings', 'granularity']);
  if (data.settings) {
    appState.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  }
  if (data.granularity && elements.selectGranularity) {
    elements.selectGranularity.value = data.granularity;
  }
  updateSettingsUI();
  updateMainUIState();
}

// Update Settings Modal UI
function updateSettingsUI() {
  const { provider, gemini, claude, openai, openrouter, groq, ollama, lmStudio } = appState.settings;

  if (elements.selectProvider) {
    elements.selectProvider.value = provider || '';
  }

  // Populate Cloud Inputs
  if (elements.cfgGeminiKey) elements.cfgGeminiKey.value = gemini?.apiKey || '';
  if (elements.cfgGeminiModel) elements.cfgGeminiModel.value = gemini?.model || 'gemini-2.0-flash';

  if (elements.cfgClaudeKey) elements.cfgClaudeKey.value = claude?.apiKey || '';
  if (elements.cfgClaudeModel) elements.cfgClaudeModel.value = claude?.model || 'claude-3-5-haiku-20241022';

  if (elements.cfgOpenAIKey) elements.cfgOpenAIKey.value = openai?.apiKey || '';
  if (elements.cfgOpenAIModel) elements.cfgOpenAIModel.value = openai?.model || 'gpt-4o-mini';

  if (elements.cfgOpenRouterKey) elements.cfgOpenRouterKey.value = openrouter?.apiKey || '';
  if (elements.cfgOpenRouterModel) elements.cfgOpenRouterModel.value = openrouter?.model || 'meta-llama/llama-3.3-70b-instruct';

  if (elements.cfgGroqKey) elements.cfgGroqKey.value = groq?.apiKey || '';
  if (elements.cfgGroqModel) elements.cfgGroqModel.value = groq?.model || 'llama-3.3-70b-versatile';

  // Populate Local Inputs
  if (elements.cfgOllamaEndpoint) elements.cfgOllamaEndpoint.value = ollama?.endpoint || 'http://localhost:11434';
  if (elements.cfgOllamaModel) elements.cfgOllamaModel.value = ollama?.model || 'gemma4:12b';
  if (elements.cfgOllamaNumCtx) elements.cfgOllamaNumCtx.value = ollama?.num_ctx || 32768;

  if (elements.cfgLmStudioEndpoint) elements.cfgLmStudioEndpoint.value = lmStudio?.endpoint || 'http://localhost:1234';
  if (elements.cfgLmStudioModel) elements.cfgLmStudioModel.value = lmStudio?.model || 'local-model';
  if (elements.cfgLmStudioKey) elements.cfgLmStudioKey.value = lmStudio?.apiKey || '';

  updateProviderPanels(provider || '');
  updateProviderBadge(provider || '');
}

function updateProviderBadge(provider) {
  const meta = PROVIDER_METADATA[provider];
  elements.providerLabel.textContent = meta ? meta.name : (provider || 'First Select AI ➜ ');
  if (!provider) {
    elements.btnHealth.classList.add('unconfigured');
  } else {
    elements.btnHealth.classList.remove('unconfigured');
  }
}

function updateProviderPanels(selectedProvider) {
  if (elements.panelGemini) elements.panelGemini.classList.toggle('hidden', selectedProvider !== PROVIDERS.GEMINI);
  if (elements.panelClaude) elements.panelClaude.classList.toggle('hidden', selectedProvider !== PROVIDERS.CLAUDE);
  if (elements.panelOpenAI) elements.panelOpenAI.classList.toggle('hidden', selectedProvider !== PROVIDERS.OPENAI);
  if (elements.panelOpenRouter) elements.panelOpenRouter.classList.toggle('hidden', selectedProvider !== PROVIDERS.OPENROUTER);
  if (elements.panelGroq) elements.panelGroq.classList.toggle('hidden', selectedProvider !== PROVIDERS.GROQ);
  if (elements.panelOllama) elements.panelOllama.classList.toggle('hidden', selectedProvider !== PROVIDERS.OLLAMA);
  if (elements.panelNano) elements.panelNano.classList.toggle('hidden', selectedProvider !== PROVIDERS.GEMINI_NANO);
  if (elements.panelLmStudio) elements.panelLmStudio.classList.toggle('hidden', selectedProvider !== PROVIDERS.LM_STUDIO);
}

function updateMainUIState() {
  const hasProvider = !!appState.settings.provider;
  if (elements.selectScope) elements.selectScope.disabled = !hasProvider;
  if (elements.selectConsolidation) elements.selectConsolidation.disabled = !hasProvider;
  if (elements.inputInstructions) elements.inputInstructions.disabled = !hasProvider;
  if (elements.btnAnalyze) elements.btnAnalyze.disabled = !hasProvider;
  if (elements.btnRefreshStats) elements.btnRefreshStats.disabled = !hasProvider;
}

// Check LLM Health Status
async function checkHealth() {
  if (!appState.settings.provider) {
    elements.statusDot.className = 'status-dot';
    elements.providerLabel.textContent = 'First Select AI ➜ ';
    elements.btnHealth.title = 'Choose your local or remote LLM in the gear icon';
    elements.btnHealth.classList.add('unconfigured');
    return;
  }
  elements.btnHealth.classList.remove('unconfigured');
  try {
    elements.statusDot.className = 'status-dot';
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CHECK_LLM_HEALTH,
      payload: { settings: appState.settings }
    });

    if (response && response.success) {
      elements.statusDot.classList.add('online');
      elements.btnHealth.title = `Connected to ${response.name || 'AI Engine'}`;
    } else {
      elements.statusDot.classList.add('error');
      elements.btnHealth.title = response?.error || 'Cannot connect to AI Provider';
    }
  } catch (err) {
    elements.statusDot.className = 'status-dot error';
    elements.btnHealth.title = 'Error checking provider connection';
  }
}

// Refresh Open Tab Counts
async function refreshTabStats() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_TABS_PREVIEW,
      payload: { scope: elements.selectScope.value }
    });

    if (res && res.success && res.data) {
      const { tabs, windows, duplicateActions } = res.data;
      appState.totalTabs = tabs.length;
      appState.windowsCount = windows.length;
      appState.duplicatesCount = duplicateActions.length;

      // Populate rawTabsMap
      appState.rawTabsMap.clear();
      tabs.forEach(t => appState.rawTabsMap.set(t.tabId, t));

      elements.statTabs.textContent = tabs.length;
      elements.statWindows.textContent = windows.length;
      elements.statDuplicates.textContent = duplicateActions.length;
    }
  } catch (err) {
    console.error('Failed to refresh stats:', err);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  elements.btnRefreshStats.addEventListener('click', refreshTabStats);
  elements.btnHealth.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });

  elements.btnSettings.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });

  elements.btnCloseSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  // Granularity change listener
  if (elements.selectGranularity) {
    elements.selectGranularity.addEventListener('change', (e) => {
      chrome.storage.local.set({ granularity: e.target.value });
    });
  }

  // Dropdown provider change
  if (elements.selectProvider) {
    elements.selectProvider.addEventListener('change', (e) => {
      updateProviderPanels(e.target.value);
    });
  }

  // Test Connection
  elements.btnTestConnection.addEventListener('click', async () => {
    const testSettings = collectSettingsFromModal();
    if (!testSettings.provider) {
      elements.testFeedback.textContent = 'Please choose an AI Engine first.';
      elements.testFeedback.className = 'test-feedback error';
      return;
    }

    elements.testFeedback.textContent = 'Testing connection...';
    elements.testFeedback.className = 'test-feedback';

    const result = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CHECK_LLM_HEALTH,
      payload: { settings: testSettings }
    });

    if (result && result.success) {
      elements.testFeedback.textContent = `✓ ${result.name || 'API'} connected!`;
      elements.testFeedback.classList.add('success');
    } else {
      elements.testFeedback.textContent = `✗ ${result?.error || 'Connection failed'}`;
      elements.testFeedback.classList.add('error');
    }
  });

  // Save Settings
  elements.btnSaveSettings.addEventListener('click', async () => {
    const newSettings = collectSettingsFromModal();
    if (!newSettings.provider) {
      elements.testFeedback.textContent = 'Please choose an AI Engine first.';
      elements.testFeedback.className = 'test-feedback error';
      return;
    }
    appState.settings = newSettings;
    await chrome.storage.local.set({ settings: newSettings });
    updateSettingsUI();
    updateMainUIState();
    elements.settingsModal.classList.add('hidden');
    await checkHealth();
  });

  // Analyze Button
  elements.btnAnalyze.addEventListener('click', startAnalysis);

  // Apply Groups Button
  elements.btnApply.addEventListener('click', applyTabGroups);

  // Undo Button
  elements.btnUndo.addEventListener('click', undoTabGroups);
}

function collectSettingsFromModal() {
  const selectedProvider = elements.selectProvider?.value || '';
  return {
    ...appState.settings,
    provider: selectedProvider,
    gemini: {
      apiKey: elements.cfgGeminiKey?.value.trim() || '',
      model: elements.cfgGeminiModel?.value.trim() || 'gemini-2.0-flash'
    },
    claude: {
      apiKey: elements.cfgClaudeKey?.value.trim() || '',
      model: elements.cfgClaudeModel?.value.trim() || 'claude-3-5-haiku-20241022'
    },
    openai: {
      apiKey: elements.cfgOpenAIKey?.value.trim() || '',
      model: elements.cfgOpenAIModel?.value.trim() || 'gpt-4o-mini'
    },
    openrouter: {
      apiKey: elements.cfgOpenRouterKey?.value.trim() || '',
      model: elements.cfgOpenRouterModel?.value.trim() || 'meta-llama/llama-3.3-70b-instruct'
    },
    groq: {
      apiKey: elements.cfgGroqKey?.value.trim() || '',
      model: elements.cfgGroqModel?.value.trim() || 'llama-3.3-70b-versatile'
    },
    ollama: {
      endpoint: elements.cfgOllamaEndpoint?.value.trim() || 'http://localhost:11434',
      model: elements.cfgOllamaModel?.value.trim() || 'gemma4:12b',
      num_ctx: Number(elements.cfgOllamaNumCtx?.value) || 32768,
      temperature: 0.2
    },
    lmStudio: {
      endpoint: elements.cfgLmStudioEndpoint?.value.trim() || 'http://localhost:1234',
      model: elements.cfgLmStudioModel?.value.trim() || 'local-model',
      apiKey: elements.cfgLmStudioKey?.value.trim() || '',
      temperature: 0.2
    },
    grouping: {
      ...appState.settings.grouping,
      scope: elements.selectScope.value,
      consolidation: elements.selectConsolidation.value
    }
  };
}

// Background Message Listener for Streaming Progress
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.ANALYSIS_PROGRESS) {
      handleProgressEvent(message.payload);
    }
  });
}

function handleProgressEvent(payload) {
  const { stage, message, completed, total, chunk } = payload;
  elements.progressCard.classList.remove('hidden');

  if (stage === 'collecting') {
    elements.progressStage.textContent = 'Harvesting Tabs';
    elements.progressMessage.textContent = message;
    if (total) {
      const pct = Math.round((completed / total) * 40); // 0-40%
      elements.progressBarFill.style.width = `${pct}%`;
    }
  } else if (stage === 'distilling') {
    elements.progressStage.textContent = 'Distilling Content';
    elements.progressMessage.textContent = message;
    elements.progressBarFill.style.width = '55%';
  } else if (stage === 'thinking') {
    elements.progressStage.textContent = 'LLM Reasoning';
    elements.progressMessage.textContent = message;
    elements.progressBarFill.style.width = '75%';
  } else if (stage === 'streaming') {
    elements.progressBarFill.style.width = '90%';
    if (chunk) {
      elements.streamOutput.textContent += chunk;
      elements.streamOutput.scrollTop = elements.streamOutput.scrollHeight;
    }
  }
}

// Trigger Analysis
async function startAnalysis() {
  if (appState.isAnalyzing) return;

  if (!appState.settings.provider) {
    elements.settingsModal.classList.remove('hidden');
    elements.testFeedback.textContent = 'Please select and configure an AI Engine first.';
    elements.testFeedback.className = 'test-feedback error';
    return;
  }

  appState.isAnalyzing = true;
  elements.btnAnalyze.disabled = true;
  elements.streamOutput.textContent = '';
  elements.progressCard.classList.remove('hidden');
  elements.resultsContainer.classList.add('hidden');
  elements.footerActions.classList.add('hidden');

  try {
    const customInstructions = elements.inputInstructions.value.trim();
    const settings = {
      ...appState.settings,
      grouping: {
        ...appState.settings.grouping,
        scope: elements.selectScope.value,
        consolidation: elements.selectConsolidation.value
      }
    };

    const granularity = elements.selectGranularity ? elements.selectGranularity.value : 'balanced';
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ANALYZE_TABS,
      payload: { customInstructions, settings, granularity }
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to complete analysis.');
    }

    // Cache Raw Tabs Map
    appState.rawTabsMap.clear();
    (response.rawTabs || []).forEach(t => appState.rawTabsMap.set(t.tabId, t));

    appState.plan = response.plan;
    renderResults(response.plan);
  } catch (err) {
    alert(`Analysis Failed: ${err.message}`);
  } finally {
    appState.isAnalyzing = false;
    elements.btnAnalyze.disabled = false;
    elements.progressCard.classList.add('hidden');
  }
}

// HTML escaping helper to prevent XSS / HTML injection from external page titles
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Categorizes suggested actions into structured cleanup buckets
function categorizeActions(actions) {
  const buckets = {
    duplicates: { label: 'Duplicates', icon: '👯', items: [] },
    new_tabs: { label: 'New Tabs', icon: '📄', items: [] },
    auth: { label: 'Auth & Thank-you', icon: '🔒', items: [] },
    errors: { label: 'Errors', icon: '⚠️', items: [] },
    other: { label: 'Other Cleanup', icon: '🧹', items: [] }
  };

  actions.forEach(act => {
    const actType = (act.action || '').toLowerCase();
    const junkType = (act.junkType || '').toLowerCase();
    const reason = (act.reason || act.title || '').toLowerCase();

    if (actType === 'close_duplicate' || junkType === 'duplicate' || reason.includes('duplicate')) {
      buckets.duplicates.items.push(act);
    } else if (junkType === 'new_tab' || reason.includes('new tab') || reason.includes('chrome://newtab')) {
      buckets.new_tabs.items.push(act);
    } else if (junkType === 'auth_or_transactional' || junkType === 'auth' || reason.includes('login') || reason.includes('oauth') || reason.includes('thank') || reason.includes('confirm') || reason.includes('auth')) {
      buckets.auth.items.push(act);
    } else if (junkType === 'error' || reason.includes('error') || reason.includes('404') || reason.includes('500') || reason.includes('not found')) {
      buckets.errors.items.push(act);
    } else {
      buckets.other.items.push(act);
    }
  });

  return Object.entries(buckets).filter(([, b]) => b.items.length > 0);
}

// Render Results & Diff Preview
function renderResults(plan) {
  elements.resultsContainer.classList.remove('hidden');
  elements.footerActions.classList.remove('hidden');

  // 1. Summary
  elements.resultsSummary.textContent = plan.summary || 'Tabs organized into coherent semantic clusters.';

  // Render Warning Banner if guardrail violations occurred (Feedback Item 2)
  const existingWarn = elements.resultsContainer.querySelector('.results-warning-banner');
  if (existingWarn) existingWarn.remove();

  if (plan.warning) {
    const warnEl = document.createElement('div');
    warnEl.className = 'results-warning-banner';
    warnEl.innerHTML = `<span>⚠️ ${escapeHtml(plan.warning)}</span>`;
    elements.resultsSummary.parentNode.insertBefore(warnEl, elements.resultsSummary.nextSibling);
  }

  // 2. Suggested Actions Buckets (Duplicates, New Tabs, Auth, Errors)
  const actions = plan.suggestedActions || [];
  if (actions.length > 0) {
    elements.actionsSection.classList.remove('hidden');
    elements.actionsList.innerHTML = '';

    const populatedBuckets = categorizeActions(actions);

    populatedBuckets.forEach(([bucketKey, bucket]) => {
      const bucketEl = document.createElement('details');
      bucketEl.className = 'action-bucket-card';
      bucketEl.open = false; // Expandable

      const summaryEl = document.createElement('summary');
      summaryEl.className = 'action-bucket-summary';
      summaryEl.innerHTML = `
        <div class="bucket-header-info">
          <span class="bucket-icon">${bucket.icon}</span>
          <span class="bucket-label">${escapeHtml(bucket.label)}</span>
          <span class="bucket-badge">${bucket.items.length}</span>
        </div>
        <button class="btn-bucket-close" title="Close all ${bucket.items.length} tabs in this category">Close all (${bucket.items.length})</button>
      `;

      // Close all tabs in this bucket
      const closeAllBtn = summaryEl.querySelector('.btn-bucket-close');
      closeAllBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        const tabIdsToClose = bucket.items.map(it => it.tabId).filter(Boolean);
        if (tabIdsToClose.length > 0) {
          try {
            await chrome.tabs.remove(tabIdsToClose);
          } catch {}
          tabIdsToClose.forEach(id => appState.rawTabsMap.delete(id));
        }

        // Remove from plan.suggestedActions
        plan.suggestedActions = (plan.suggestedActions || []).filter(act => !tabIdsToClose.includes(act.tabId));
        bucketEl.remove();

        if (elements.actionsList.children.length === 0) {
          elements.actionsSection.classList.add('hidden');
        }

        await refreshTabStats();
      });

      // Tab list inside bucket
      const itemsListEl = document.createElement('div');
      itemsListEl.className = 'bucket-items-list';

      bucket.items.forEach(act => {
        const itemEl = document.createElement('div');
        itemEl.className = 'action-item';

        const tabData = appState.rawTabsMap.get(act.tabId) || { id: act.tabId, title: act.reason || `Tab #${act.tabId}` };
        const safeTabTitle = escapeHtml(tabData.title || `Tab #${act.tabId}`);
        const safeReason = escapeHtml(act.reason || '');
        const safeTabId = escapeHtml(act.tabId);
        itemEl.innerHTML = `
          <div class="action-item-info">
            <span class="action-item-title" title="${safeTabTitle}">${safeTabTitle}</span>
            <span class="action-item-reason">${safeReason}</span>
          </div>
          <button class="btn-mini-danger" title="Close this tab" data-tab-id="${safeTabId}">✕</button>
        `;

        itemEl.querySelector('.btn-mini-danger').addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await chrome.tabs.remove(act.tabId);
          } catch {}
          appState.rawTabsMap.delete(act.tabId);
          plan.suggestedActions = (plan.suggestedActions || []).filter(a => a.tabId !== act.tabId);
          bucket.items = bucket.items.filter(a => a.tabId !== act.tabId);
          itemEl.remove();

          if (bucket.items.length === 0) {
            bucketEl.remove();
            if (elements.actionsList.children.length === 0) {
              elements.actionsSection.classList.add('hidden');
            }
          } else {
            summaryEl.querySelector('.bucket-badge').textContent = bucket.items.length;
            closeAllBtn.textContent = `Close all (${bucket.items.length})`;
          }

          await refreshTabStats();
        });

        itemsListEl.appendChild(itemEl);
      });

      bucketEl.appendChild(summaryEl);
      bucketEl.appendChild(itemsListEl);
      elements.actionsList.appendChild(bucketEl);
    });
  } else {
    elements.actionsSection.classList.add('hidden');
  }

  // 3. Render Groups
  renderGroupsList(plan.groups || []);
}

function renderGroupsList(groups) {
  elements.groupsList.innerHTML = '';

  groups.forEach((group, index) => {
    const card = document.createElement('div');
    card.className = `group-card color-${group.color || 'grey'}`;
    card.dataset.index = index;

    // Header
    const header = document.createElement('div');
    header.className = 'group-card-header';
    const labelTooltip = group.label ? `Topic: ${group.label}\n` : '';
    header.title = `${labelTooltip}Middle-click header to close all tabs in this group immediately (Undo does not restore closed tabs)`;

    // Suppress autoscroll cursor on middle-click
    header.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    // Middle-click to close all tabs in group
    header.addEventListener('auxclick', async (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const idsToClose = [...(group.tabIds || [])];
      if (idsToClose.length > 0) {
        try {
          await chrome.tabs.remove(idsToClose);
        } catch {}
        idsToClose.forEach(id => appState.rawTabsMap.delete(id));
      }
      group.tabIds = [];
      card.remove();
      await refreshTabStats();
    });

    const titleArea = document.createElement('div');
    titleArea.className = 'group-card-title-area';

    const colorDot = document.createElement('span');
    colorDot.className = 'group-color-dot';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'group-title-input';
    titleInput.maxLength = 12;
    titleInput.value = group.title || 'Untitled';
    titleInput.addEventListener('input', (e) => {
      group.title = e.target.value;
    });

    const badge = document.createElement('span');
    badge.className = 'group-count-badge';
    badge.textContent = `${group.tabIds?.length || 0} tabs`;

    titleArea.appendChild(colorDot);
    titleArea.appendChild(titleInput);
    titleArea.appendChild(badge);

    // Color Selector
    const colorSelect = document.createElement('select');
    colorSelect.className = 'group-color-select';
    CHROME_TAB_COLORS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
      if (c === group.color) opt.selected = true;
      colorSelect.appendChild(opt);
    });

    colorSelect.addEventListener('change', (e) => {
      group.color = e.target.value;
      card.className = `group-card color-${e.target.value}`;
    });

    header.appendChild(titleArea);
    header.appendChild(colorSelect);

    // Tabs List
    const tabsListEl = document.createElement('div');
    tabsListEl.className = 'group-tabs-list';

    (group.tabIds || []).forEach(tabId => {
      const tabData = appState.rawTabsMap.get(tabId) || { id: tabId, title: `Tab #${tabId}`, url: '' };

      let domain = '';
      try {
        if (tabData.url) domain = new URL(tabData.url).hostname.replace('www.', '');
      } catch {
        domain = '';
      }

      const row = document.createElement('div');
      row.className = 'tab-item-row';
      row.title = `${tabData.title}\n(Middle-click to close tab immediately; Undo does not restore closed tabs)`;

      // Suppress autoscroll cursor on middle-click
      row.addEventListener('mousedown', (e) => {
        if (e.button === 1) e.preventDefault();
      });

      // Middle-click to close individual tab
      row.addEventListener('auxclick', async (e) => {
        if (e.button !== 1) return;
        e.preventDefault();

        try {
          await chrome.tabs.remove(tabId);
        } catch {}

        appState.rawTabsMap.delete(tabId);
        group.tabIds = (group.tabIds || []).filter(id => id !== tabId);
        row.remove();
        badge.textContent = `${group.tabIds.length} tabs`;

        if (group.tabIds.length === 0) {
          card.remove();
        }

        await refreshTabStats();
      });

      const defaultIcon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      const iconUrl = tabData.favIconUrl && !tabData.favIconUrl.startsWith('chrome://') ? tabData.favIconUrl : defaultIcon;

      const safeTitle = escapeHtml(tabData.title);
      const safeDomain = escapeHtml(domain);

      row.innerHTML = `
        <img class="tab-favicon" src="${escapeHtml(iconUrl)}" onerror="this.src='${defaultIcon}'" alt="">
        <span class="tab-title-text" title="${safeTitle}">${safeTitle}</span>
        ${safeDomain ? `<span class="tab-domain-tag">${safeDomain}</span>` : ''}
      `;

      tabsListEl.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(tabsListEl);
    elements.groupsList.appendChild(card);
  });
}

// Apply Tab Groups to Chrome
async function applyTabGroups() {
  if (!appState.plan) return;

  elements.btnApply.disabled = true;
  elements.btnApply.textContent = 'Applying...';

  try {
    const consolidation = elements.selectConsolidation.value;
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.APPLY_GROUPS,
      payload: {
        plan: appState.plan,
        options: { consolidation, closeDuplicates: false }
      }
    });

    if (response && response.success) {
      elements.btnApply.textContent = '✓ Groups Applied!';
      setTimeout(() => {
        elements.btnApply.textContent = 'Apply Groups';
        elements.btnApply.disabled = false;
      }, 2500);
      await refreshTabStats();
    } else {
      throw new Error(response?.error || 'Failed to apply groups');
    }
  } catch (err) {
    alert(`Error applying groups: ${err.message}`);
    elements.btnApply.disabled = false;
    elements.btnApply.textContent = 'Apply Groups';
  }
}

// Undo Last Grouping
async function undoTabGroups() {
  elements.btnUndo.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UNDO_GROUPS
    });

    if (response && response.success) {
      alert('✓ Previous tab organization restored.');
      await refreshTabStats();
    } else {
      throw new Error(response?.error || 'No snapshot found to undo');
    }
  } catch (err) {
    alert(`Cannot Undo: ${err.message}`);
  } finally {
    elements.btnUndo.disabled = false;
  }
}
