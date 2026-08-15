#!/usr/bin/env node
/**
 * Lightweight DOM-free sidepanel regression check.
 * Run with: node test-sidepanel-profiles.mjs
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
  grouping: { scope: 'all_windows', consolidation: 'in_place', analysisProfile: 'fast' },
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

await import('./sidepanel/app.js');
await documentListeners.DOMContentLoaded();

const profile = elements.get('select-analysis-profile');
profile.value = 'quality';
await profile.listeners.change[0]({ target: profile });
assert.equal(savedSettings.at(-1).settings.grouping.analysisProfile, 'quality');

const running = elements.get('btn-analyze').listeners.click[0]();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(messages.at(-1).type, 'ANALYZE_TABS');
assert.equal(messages.at(-1).payload.settings.grouping.analysisProfile, 'quality');

progressListener({
  type: 'ANALYSIS_PROGRESS',
  payload: {
    analysisId: 'run-1', stage: 'thinking', profile: 'quality', batchIndex: 1,
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
  diagnostics: { profile: 'quality', elapsedMs: 1200, collectionMs: 100, requestCount: 2, retryCount: 1, requests: [] }
});
await running;
assert.equal(elements.get('analysis-diagnostics-card').classList.contains('hidden'), false);
assert.match(elements.get('analysis-diagnostics').textContent, /Status: Cancelled/);
assert.match(elements.get('progress-message').textContent, /No tab changes were applied/);

console.log('Sidepanel profile, progress, throttling, cancellation, and diagnostics checks passed');
