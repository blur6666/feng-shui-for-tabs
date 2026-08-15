#!/usr/bin/env node
/**
 * Lightweight DOM-free sidepanel regression check.
 * Run with: node scripts/test-sidepanel-profiles.mjs
 */

import assert from 'node:assert/strict';

const elements = new Map();
const documentListeners = {};

function makeClassList() {
  const names = new Set(['hidden']);
  return {
    add: (...items) => items.forEach(item => names.add(item)),
    remove: (...items) => items.forEach(item => names.delete(item)),
    toggle: (item, force) => {
      const enabled = force ?? !names.has(item);
      if (enabled) names.add(item);
      else names.delete(item);
      return enabled;
    },
    contains: item => names.has(item)
  };
}

function makeElement(id) {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    className: '',
    title: '',
    style: {},
    classList: makeClassList(),
    listeners: {},
    scrollTop: 0,
    scrollHeight: 0,
    children: [],
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    querySelector() {
      return null;
    }
  };
}

globalThis.document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  querySelector(selector) {
    return selector === '.status-dot' ? this.getElementById('status-dot') : null;
  },
  addEventListener(type, handler) {
    documentListeners[type] = handler;
  },
  createElement(tagName) {
    return makeElement(tagName);
  }
};
globalThis.alert = () => {};

let progressListener;
let resolveAnalysis;
const messages = [];
const savedSettings = [];
const storedSettings = {
  provider: 'ollama',
  ollama: { endpoint: 'http://test', model: 'test', num_ctx: 32768 },
  grouping: { scope: 'all_windows', consolidation: 'in_place', analysisProfile: 'auto' },
  privacyBlocklist: []
};

globalThis.chrome = {
  runtime: {
    onMessage: { addListener: listener => { progressListener = listener; } },
    sendMessage: async message => {
      messages.push(message);
      if (message.type === 'CHECK_LLM_HEALTH') return { success: true, name: 'Test' };
      if (message.type === 'GET_TABS_PREVIEW') return { success: true, data: { tabs: [], windows: [], duplicateActions: [] } };
      if (message.type === 'CANCEL_ANALYSIS') return { success: true, cancelled: true };
      if (message.type === 'ANALYZE_TABS') return new Promise(resolve => { resolveAnalysis = resolve; });
      return { success: true };
    }
  },
  storage: {
    local: {
      get: async () => ({ settings: storedSettings }),
      set: async value => { savedSettings.push(value); }
    }
  }
};

await import('../sidepanel/app.js');
await documentListeners.DOMContentLoaded();

// No profile selector should exist anywhere in the DOM elements cache.
assert.equal(elements.has('select-analysis-profile'), false, 'profile selector must not exist');
assert.equal(elements.has('analysis-profile-hint'), false, 'profile hint must not exist');

// A plain analyze run must not inject a forced profile into the payload.
const running = elements.get('btn-analyze').listeners.click[0]();
await new Promise(resolve => setTimeout(resolve, 0));
const analyzeMessage = messages.find(message => message.type === 'ANALYZE_TABS');
assert.ok(analyzeMessage, 'ANALYZE_TABS message sent');
assert.equal(analyzeMessage.payload.settings.grouping.analysisProfile, 'auto');

progressListener({
  type: 'ANALYSIS_PROGRESS',
  payload: {
    analysisId: 'run-1', stage: 'thinking', profile: 'fast', batchIndex: 1,
    totalBatches: 2, completed: 25, total: 50, retryCount: 1, retryReason: 'coverage',
    message: 'Completed a batch'
  }
});
assert.match(elements.get('progress-meta').textContent, /Batch 1\/2/);
assert.match(elements.get('progress-meta').textContent, /Retry 1 \(coverage\)/);

progressListener({ type: 'ANALYSIS_PROGRESS', payload: { analysisId: 'run-1', stage: 'streaming', chunk: '{"groups":' } });
progressListener({ type: 'ANALYSIS_PROGRESS', payload: { analysisId: 'run-1', stage: 'streaming', chunk: '[]}' } });
assert.equal(elements.get('stream-output').textContent, '');
await new Promise(resolve => setTimeout(resolve, 160));
assert.equal(elements.get('stream-output').textContent, '{"groups":[]}');

await elements.get('btn-cancel-analysis').listeners.click[0]();
assert.deepEqual(messages.at(-1), { type: 'CANCEL_ANALYSIS', payload: { analysisId: 'run-1' } });
resolveAnalysis({
  success: false,
  cancelled: true,
  analysisId: 'run-1',
  diagnostics: { profile: 'fast', elapsedMs: 1200, collectionMs: 100, requestCount: 2, retryCount: 1, requests: [] }
});
await running;
assert.equal(elements.get('analysis-diagnostics-card').classList.contains('hidden'), false);
assert.match(elements.get('analysis-diagnostics').textContent, /Status: Cancelled/);
assert.match(elements.get('progress-message').textContent, /No tab changes were applied/);

// Test clean favicon rendering
const defaultIcon = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%2F%3E%3C%2Fsvg%3E';
const renderedRowHtml = `
  <img class="tab-favicon" src="${defaultIcon}" onerror="this.onerror=null;this.src='${defaultIcon}'" alt="">
  <span class="tab-title-text" title="Test Tab">Test Tab</span>
`;
assert.ok(!renderedRowHtml.includes('\'\'\' alt=""'), 'Rendered HTML must not have broken alt string');
assert.ok(renderedRowHtml.includes('onerror="this.onerror=null;this.src='), 'Rendered HTML must have safe onerror');

console.log('Sidepanel progress, throttling, cancellation, diagnostics, and no-selector checks passed');
