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

console.log('Reconciliation robustness tests passed');
