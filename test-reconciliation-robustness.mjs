import assert from 'node:assert/strict';
import { TabOrganizer, consolidateSmallGroups, normalizePlanGroups } from './background/tab-organizer.js';

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

console.log('Reconciliation robustness tests passed');
