import assert from 'node:assert/strict';
import { TabOrganizer, consolidateSmallGroups, normalizePlanGroups } from '../background/tab-organizer.js';

// Case 1: String IDs from LLM
const stringIdPlan = {
  summary: 'String IDs',
  groups: [
    { title: 'Research', label: 'Research', color: 'blue', rationale: 'docs', tabIds: ['1', '2', '3'] },
    { title: 'Shopping', label: 'Shopping', color: 'green', rationale: 'buy', tabs: ['4', '5', '6'] }
  ]
};
const rawTabs = [1, 2, 3, 4, 5, 6].map(id => ({ tabId: id, title: `Tab ${id}`, url: `https://test.com/${id}` }));
const reconciled1 = TabOrganizer.reconcilePlanWithRawTabs(stringIdPlan, rawTabs, 'balanced');
assert.equal(reconciled1.groups.length, 2);
assert.deepEqual(reconciled1.groups[0].tabIds, [1, 2, 3]);
assert.deepEqual(reconciled1.groups[1].tabIds, [4, 5, 6]);

// Case 2: Object array IDs from LLM [{ id: 1 }, { id: 2 }]
const objectIdPlan = {
  summary: 'Object IDs',
  groups: [
    { title: 'Coding', label: 'Coding', color: 'blue', rationale: 'code', tabIds: [{ id: 1 }, { id: 2 }, { id: 3 }] }
  ]
};
const reconciled2 = TabOrganizer.reconcilePlanWithRawTabs(objectIdPlan, rawTabs.slice(0, 3), 'balanced');
assert.equal(reconciled2.groups.length, 1);
assert.deepEqual(reconciled2.groups[0].tabIds, [1, 2, 3]);

// Case 3: Groups as dictionary object { "Coding": [1, 2, 3], "Shopping": [4, 5, 6] }
const dictPlan = {
  groups: {
    Coding: [1, 2, 3],
    Shopping: [4, 5, 6]
  }
};
const reconciled3 = TabOrganizer.reconcilePlanWithRawTabs(dictPlan, rawTabs, 'balanced');
assert.equal(reconciled3.groups.length, 2);

// Case 4: 112 tabs where LLM created pairs (2 tabs each)
const pairTabs = Array.from({ length: 112 }, (_, i) => ({ tabId: i + 1, title: `Tab ${i + 1}`, url: `https://test${Math.floor(i / 2)}.com/page` }));
const pairGroups = Array.from({ length: 56 }, (_, i) => ({
  title: `Topic ${i + 1}`,
  tabIds: [i * 2 + 1, i * 2 + 2]
}));
const reconciled4 = TabOrganizer.reconcilePlanWithRawTabs({ groups: pairGroups }, pairTabs, 'balanced');
// Should NOT collapse all 112 tabs into 1 single "Other" group
assert.ok(reconciled4.groups.length > 1, `Expected multiple groups, got ${reconciled4.groups.length}`);
assert.notEqual(reconciled4.groups[0]?.title, 'Other');

// Case 5: Hallucinated tab IDs in plan (e.g. LLM invents ID 999, 1000)
const hallucinatedPlan = {
  summary: 'Plan with hallucinated IDs',
  groups: [
    { title: 'Research', label: 'Research', color: 'blue', rationale: 'docs', tabIds: [1, 2, 999, 1000] },
    { title: 'Shopping', label: 'Shopping', color: 'green', rationale: 'buy', tabIds: [3, 4] }
  ]
};
const realRawTabs = [1, 2, 3, 4].map(id => ({ tabId: id, title: `Tab ${id}`, url: `https://test.com/${id}` }));
const reconciled5 = TabOrganizer.reconcilePlanWithRawTabs(hallucinatedPlan, realRawTabs, 'balanced');
assert.ok(!reconciled5.groups.some(g => g.tabIds.includes(999) || g.tabIds.includes(1000)), 'Hallucinated IDs must be filtered from final groups');

// Case 6: validateGroupingPlan flags hallucinated tab IDs
import { validateGroupingPlan } from '../background/tab-organizer.js';
const labeledTabs = [
  { id: 1, domain: 'wiki.org', subject: 'Quantum Physics' },
  { id: 2, domain: 'wiki.org', subject: 'Machine Learning' },
  { id: 3, domain: 'shop.com', subject: 'Air Fryer' },
  { id: 4, domain: 'shop.com', subject: 'Toaster' }
];
const validationWithHallucination = validateGroupingPlan({
  groups: [
    { title: 'Science', tabIds: [1, 2, 999] },
    { title: 'Appliances', tabIds: [3, 4] }
  ]
}, labeledTabs);
assert.equal(validationWithHallucination.valid, false);
assert.ok(validationWithHallucination.violations.some(v => v.includes('hallucinated tab ID')));

// Case 7: validateGroupingPlan flags single-group collapse
const multiTabs = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  domain: `site${i}.com`,
  subject: `Subject ${i}`
}));
const validationSingleGroup = validateGroupingPlan({
  groups: [{ title: 'All Tabs', tabIds: multiTabs.map(t => t.id) }]
}, multiTabs);
assert.equal(validationSingleGroup.valid, false);
assert.ok(validationSingleGroup.violations.some(v => v.includes('collapsed all 12 tabs')));

// Case 8: validateGroupingPlan flags single-domain group spanning distinct subjects
const domainTabs = [
  { id: 1, domain: 'wikipedia.org', subject: 'Quantum Physics' },
  { id: 2, domain: 'wikipedia.org', subject: 'Renaissance Art' },
  { id: 3, domain: 'wikipedia.org', subject: 'Cooking Recipes' },
  { id: 4, domain: 'wikipedia.org', subject: 'Automotive Engines' }
];
const validationDomainGroup = validateGroupingPlan({
  groups: [{ title: 'Wikipedia Articles', tabIds: [1, 2, 3, 4] }]
}, domainTabs);
assert.equal(validationDomainGroup.valid, false);
assert.ok(validationDomainGroup.violations.some(v => v.includes('wikipedia.org') && v.includes('distinct subjects')));

// Case 9: Unassigned tabs with keywords matching existing group titles (e.g. Codex tabs matching OpenCodex)
const initialCodexPlan = {
  summary: 'AI tools',
  groups: [
    { title: 'Claude Code', label: 'Claude Code CLI', tabIds: [1, 2] },
    { title: 'OpenCodex', label: 'OpenCodex Provider', tabIds: [3, 4] },
    { title: 'ChatGPT', label: 'ChatGPT Tools', tabIds: [5, 6] }
  ]
};

const fullTabSet = [
  { tabId: 1, title: 'Am I using Claude Code wrong', url: 'https://reddit.com/r/claude' },
  { tabId: 2, title: 'Claude Code | opencodex', url: 'https://opencodex.me' },
  { tabId: 3, title: 'opencodex not loading on claude cli - Kagi Search', url: 'https://kagi.com/search' },
  { tabId: 4, title: 'lidge-jun/opencodex: Universal provider proxy for OpenAI Codex', url: 'https://github.com/opencodex' },
  { tabId: 5, title: 'Codex in ChatGPT | AI Coding Agents for Software Engineering', url: 'https://chatgpt.com/g/codex' },
  { tabId: 6, title: 'Permissions | ChatGPT Learn', url: 'https://learn.chatgpt.com' },
  { tabId: 7, title: 'Extensions', url: 'chrome://extensions' },
  { tabId: 8, title: 'Beat The Meatles', url: 'https://reddit.com/r/music' },
  { tabId: 9, title: 'API keys | Google AI Studio', url: 'https://aistudio.google.com' },
  { tabId: 10, title: 'PSA: Low Latency Profile on Windows', url: 'https://reddit.com/r/windows' },
  { tabId: 11, title: 'How do I make original music : r/musicproduction', url: 'https://reddit.com/r/musicproduction' },
  { tabId: 12, title: 'Windows: Codex CLI integration fails with spawnSync codex ENOENT', url: 'https://github.com/issue/12' },
  { tabId: 13, title: 'codex getting started - Kagi Search', url: 'https://kagi.com/search?q=codex' },
  { tabId: 14, title: 'Complete Beginners Guide to OpenAIs Codex App', url: 'https://getpushtoprod.substack.com/p/codex' }
];

const reconciledCodex = TabOrganizer.reconcilePlanWithRawTabs(initialCodexPlan, fullTabSet, 'balanced');
const openCodexGroup = reconciledCodex.groups.find(g => g.title.toLowerCase().includes('opencodex') || g.title.toLowerCase().includes('codex'));
assert.ok(openCodexGroup, 'OpenCodex group must exist');
assert.ok(openCodexGroup.tabIds.includes(12), 'Tab 12 (Codex CLI ENOENT) must be merged into OpenCodex group');
assert.ok(openCodexGroup.tabIds.includes(13), 'Tab 13 (codex getting started) must be merged into OpenCodex group');
assert.ok(openCodexGroup.tabIds.includes(14), 'Tab 14 (Codex App) must be merged into OpenCodex group');

// Case 10: Unassigned tabs sharing a topic (Music tabs 8 and 11) form a topic group
const musicGroup = reconciledCodex.groups.find(g => g.title.toLowerCase().includes('music'));
assert.ok(musicGroup, 'A topic group for Music must be created for tabs 8 & 11 rather than dumping them into Other');
assert.ok(musicGroup.tabIds.includes(8) || musicGroup.tabIds.includes(11));

const otherGroup = reconciledCodex.groups.find(g => g.title === 'Other');
const otherCount = otherGroup ? otherGroup.tabIds.length : 0;
assert.ok(otherCount < 5, `Expected fewer than 5 tabs in Other, got ${otherCount}`);

console.log('Reconciliation robustness tests passed');
