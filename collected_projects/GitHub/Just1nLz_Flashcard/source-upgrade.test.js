import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareStudyCards} from './source-upgrade.js';

const auditedOriginal = JSON.parse(readFileSync(new URL('./source-deck.json', import.meta.url), 'utf8'));
const auditedPairs = [[2,3],[4,5],[7,8],[9,10],[14,15],[21,22],[30,34],[57,58],[59,60],[66,68],[69,70],[72,73],[84,85],[86,87]];
const explicitSelectAll = [36,42,63,74,93];

test('the audited 94-card source becomes 80 cards with exactly the identified pairs', () => {
  assert.equal(auditedOriginal.cards.length, 94);
  const before = JSON.stringify(auditedOriginal);
  const plan = prepareStudyCards(auditedOriginal.cards);
  assert.equal(plan.cards.length, 80);
  assert.equal(plan.mergedCount, 14);
  assert.deepEqual(plan.groups.filter(group => group.length > 1).map(group => group.map(id => id + 1)), auditedPairs);
  assert.deepEqual(plan.warnings, []);
  assert.equal(JSON.stringify(auditedOriginal), before, 'original source records must remain unchanged');
});

test('all five explicit Select all source questions retain audited answer boundaries and options', () => {
  const plan = prepareStudyCards(auditedOriginal.cards);
  const counts = [3,3,4,3,4];
  explicitSelectAll.forEach((number, index) => {
    const card = plan.cards[plan.oldToNew[number - 1]];
    assert.equal(card.type, 'multi');
    assert.equal(card.answers.length, counts[index]);
    assert.equal(card.definition, card.answers.join('\n'));
    assert.ok(card.term.endsWith('Select all that apply.'));
    assert.ok(card.answers.every(answer => card.options.includes(answer)));
    assert.ok(card.answers.every(answer => auditedOriginal.cards[number - 1].term.includes(answer)), 'answer items must come directly from source option text');
  });
  const durlak = plan.cards[plan.oldToNew[41]];
  assert.deepEqual(durlak.answers, ['intimacy','solitude','reserve']);
  assert.ok(durlak.options.includes('iron cage'));
  assert.ok(!durlak.answers.includes('iron cage'));
  assert.deepEqual(plan.cards[plan.oldToNew[92]].answers, ['credit card fraud','spam','viruses','botnet']);
});

test('source formatting upgrades count as changes without duplicate consolidation', () => {
  const input = [auditedOriginal.cards[41]];
  const plan = prepareStudyCards(input);
  assert.equal(plan.changed, true);
  assert.equal(plan.mergedCount, 0);
  assert.equal(plan.upgradedCount, 1);
  assert.deepEqual(plan.sourceUpgrades, [42]);
});

test('source answer wording is preserved except the PDF typo corroborated by its correct option', () => {
  const plan = prepareStudyCards(auditedOriginal.cards);
  const structured = new Set(explicitSelectAll);
  auditedOriginal.cards.forEach((original, id) => {
    if (structured.has(id + 1)) return;
    const card = plan.cards[plan.oldToNew[id]];
    const expectedAnswer = id === 14 ? original.definition.slice(0, -1) : original.definition;
    if (card.type === 'multi') assert.ok(card.answers.includes(expectedAnswer), `source answer ${id + 1} must be preserved`);
    else assert.equal(card.definition, expectedAnswer);
  });
  const original = auditedOriginal.cards[14];
  assert.ok(original.definition.endsWith('accidents.q'));
  assert.ok(original.term.includes(original.definition.slice(0, -1)), 'the PDF question options corroborate the corrected ending');
});

test('audited source upgrades require exact original term and definition matches', () => {
  const original = auditedOriginal.cards[41];
  const modifiedTerm = prepareStudyCards([{...original, term:original.term.replace('Durlak', 'Someone else')}]);
  const modifiedAnswer = prepareStudyCards([{...original, definition:'intimacy solitude'}]);
  assert.equal(modifiedTerm.cards[0].type, undefined);
  assert.equal(modifiedAnswer.cards[0].type, undefined);
  assert.equal(modifiedTerm.upgradedCount, 0);
  assert.equal(modifiedAnswer.upgradedCount, 0);
  const unrelated = prepareStudyCards([{term:'What is recommended? Select all that apply. red blue green', definition:'all'}]);
  assert.equal(unrelated.cards[0].type, undefined, 'arbitrary “all” answer keys must not be guessed');
});

test('genuinely different questions, the truncated prompt, and unlabelled lists remain distinct', () => {
  const plan = prepareStudyCards(auditedOriginal.cards);
  [16,17,18,23,24,31,32,33,35,77,79,80,81,82].forEach(number => {
    const target = plan.oldToNew[number - 1];
    assert.deepEqual(plan.groups[target], [number - 1]);
    assert.deepEqual(plan.cards[target], auditedOriginal.cards[number - 1]);
  });
  assert.notEqual(plan.oldToNew[20], plan.oldToNew[29], 'different author attribution is retained conservatively');
});

test('preparation is idempotent on the already upgraded collection', () => {
  const first = prepareStudyCards(auditedOriginal.cards);
  const second = prepareStudyCards(first.cards);
  assert.equal(second.cards.length, 80);
  assert.deepEqual(second.cards, first.cards);
  assert.equal(second.changed, false);
  assert.equal(second.upgradedCount, 0);
  assert.equal(second.mergedCount, 0);
});
