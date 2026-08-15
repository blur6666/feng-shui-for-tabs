import assert from 'node:assert/strict';
import { extractJsonFromResponse, repairTruncatedJson } from './background/llm-adapter.js';
import { planPass2Budget, resolveAnalysisProfile } from './background/analysis-profile.js';

// Test 1: Truncated mid-string in groups array
const truncatedStringJson = `
{
  "summary": "Partial analysis",
  "groups": [
    {
      "title": "Air Fryer",
      "label": "Air Fryer Reviews",
      "color": "blue",
      "rationale": "Product listings",
      "tabIds": [1, 2, 3]
    },
    {
      "title": "React Doc
`;
const repaired1 = extractJsonFromResponse(truncatedStringJson);
assert.ok(Array.isArray(repaired1.groups));
assert.equal(repaired1.groups[0].title, 'Air Fryer');
assert.deepEqual(repaired1.groups[0].tabIds, [1, 2, 3]);

// Test 2: Truncated mid-array in tabIds
const truncatedArrayJson = `
{
  "summary": "Development",
  "groups": [
    {
      "title": "React",
      "label": "React Docs",
      "color": "green",
      "rationale": "Learning",
      "tabIds": [10, 11, 12]
    },
    {
      "title": "Vue",
      "label": "Vue Pinia",
      "color": "orange",
      "rationale": "State management",
      "tabIds": [13, 14
`;
const repaired2 = extractJsonFromResponse(truncatedArrayJson);
assert.equal(repaired2.groups.length, 2);
assert.deepEqual(repaired2.groups[1].tabIds, [13, 14]);

// Test 3: Truncated dangling key and colon
const truncatedKeyJson = `
{
  "summary": "Shopping",
  "groups": [
    {
      "title": "Shoes",
      "label": "Running Shoes",
      "color": "red",
      "rationale": "Reviews",
      "tabIds": [100, 101]
    },
    {
      "title": "Keyboards",
      "label":
`;
const repaired3 = extractJsonFromResponse(truncatedKeyJson);
assert.ok(Array.isArray(repaired3.groups));
assert.equal(repaired3.groups[0].title, 'Shoes');

// Test 4: Dynamic Pass 2 output scaling for large tab sets
const settings = { ollama: { num_ctx: 32768 }, grouping: { analysisProfile: 'fast' } };
const profile = resolveAnalysisProfile(settings);
const budgetSmall = planPass2Budget('prompt', settings, profile, '', 20);
const budgetLarge = planPass2Budget('prompt', settings, profile, '', 112);
assert.ok(budgetLarge.outputReserve > budgetSmall.outputReserve);
assert.ok(budgetLarge.outputReserve >= 3000);

console.log('JSON auto-repair and output scaling regression tests passed');
