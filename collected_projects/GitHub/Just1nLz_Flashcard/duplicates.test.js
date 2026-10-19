import test from 'node:test';
import assert from 'node:assert/strict';
import {consolidateCards} from './duplicates.js';

const duplicateCard = (term, definition) => ({term, definition});

test('matching stems merge source-faithful answers despite different appended choices', () => {
  const cards = [
    duplicateCard('“The Article” by An Author, which of the following statements is the most correct? Choice one. Choice two.', 'First source answer.'),
    duplicateCard('"The Article" by An Author, which of the following statements is the most accurate? Choice three. Choice four.', 'Second source answer with a typo: methematical.'),
    duplicateCard('A separate question?', 'Another answer')
  ];
  const result = consolidateCards(cards);
  assert.equal(result.cards.length, 2);
  assert.deepEqual(result.cards[0], {
    term:'“The Article” by An Author, which of the following statements are correct? Select all that apply.',
    definition:'First source answer.\nSecond source answer with a typo: methematical.',
    type:'multi', answers:['First source answer.', 'Second source answer with a typo: methematical.']
  });
  assert.deepEqual(result.groups, [[0, 1], [2]]);
  assert.deepEqual(result.oldToNew, [0, 0, 1]);
  assert.equal(result.mergedCount, 1);
  assert.equal(result.changed, true);
  assert.deepEqual(result.warnings, []);
});

test('generic singular most-correct and most-accurate questions become plural Select all', () => {
  const result = consolidateCards([
    duplicateCard('"Interaction Between Ethics and Technology" by Shakib and Layton, which statement below is the most correct?', 'Consumers influence businesses.'),
    duplicateCard('"Interaction Between Ethics and Technology" by Shakib and Layton, which statement below is the most accurate?', 'There is no universal ethics.')
  ]);
  assert.equal(result.cards[0].term, '"Interaction Between Ethics and Technology" by Shakib and Layton, which statements below are correct? Select all that apply.');
  assert.deepEqual(result.cards[0].answers, ['Consumers influence businesses.', 'There is no universal ethics.']);
});

test('only explicit boilerplate video-paper wrappers are ignored', () => {
  const result = consolidateCards([
    duplicateCard('In the video regarding the paper "Title" by Author, what is recommended? Original options.', 'Answer one'),
    duplicateCard('"Title" by Author, what is recommended? Other options.', 'Answer two'),
    duplicateCard('Regarding the video about the paper on "Second Title," which statement below is the most accurate?', 'Third answer'),
    duplicateCard('"Second Title," which statement below is the most correct?', 'Fourth answer'),
    duplicateCard('In a different video "Title" by Author, what is recommended?', 'Fifth answer')
  ]);
  assert.deepEqual(result.groups, [[0, 1], [2, 3], [4]]);
});

test('same article with genuinely different questions or authors remains separate', () => {
  const cards = [
    duplicateCard('"Article" by Author A, what is recommended?', 'Answer one'),
    duplicateCard('"Article" by Author A, what is the conclusion?', 'Answer two'),
    duplicateCard('"Article" by Author B, what is recommended?', 'Answer three'),
    duplicateCard('"Article," what is recommended?', 'Answer four'),
    duplicateCard('"Article" by Author A, what is?', 'Answer five'),
    duplicateCard('"The Most Accurate Model," which statement below is the most correct?', 'Answer six'),
    duplicateCard('"The Most Correct Model," which statement below is the most correct?', 'Answer seven')
  ];
  assert.deepEqual(consolidateCards(cards).cards, cards);
});

test('quoted question mark in an article title does not cut off the actual question', () => {
  const result = consolidateCards([
    duplicateCard('"Which Lines Should Not be Crossed?," which of the following statements is the most correct? Choice A.', 'Source A'),
    duplicateCard('"Which Lines Should Not be Crossed?," which of the following statements is the most correct? Choice B.', 'Source B')
  ]);
  assert.equal(result.cards[0].term, '"Which Lines Should Not be Crossed?," which of the following statements are correct? Select all that apply.');
});

test('conflicting true-false and ambiguous All answers remain separate with warnings and stable order', () => {
  const cards = [
    duplicateCard('A statement. T/F', 'T'),
    duplicateCard('Other question?', 'Another answer'),
    duplicateCard('A statement. T/F', 'F'),
    duplicateCard('Choose options? Option one.', 'All'),
    duplicateCard('A last question?', 'Last answer'),
    duplicateCard('Choose options? Option two.', 'Only option two')
  ];
  const result = consolidateCards(cards);
  assert.deepEqual(result.cards, cards);
  assert.deepEqual(result.groups, [[0], [1], [2], [3], [4], [5]]);
  assert.deepEqual(result.oldToNew, [0, 1, 2, 3, 4, 5]);
  assert.equal(result.changed, false);
  assert.equal(result.mergedCount, 0);
  assert.equal(result.warnings.length, 2);
});

test('identical answer duplicates collapse into a normal card without invented extra answers', () => {
  const first = duplicateCard('A question? Original options.', 'The source answer');
  const result = consolidateCards([first, duplicateCard('A question? Different options.', 'The source answer')]);
  assert.deepEqual(result.cards, [first]);
  assert.deepEqual(result.groups, [[0, 1]]);
});

test('existing multi answer arrays flatten, preserve explicit options, and remain idempotent', () => {
  const result = consolidateCards([
    {term:'A question? Select all that apply.', definition:'A\nB', type:'multi', answers:['A', 'B'], options:['A', 'B', 'Wrong']},
    duplicateCard('A question? A different original choice paragraph.', 'C'),
    duplicateCard('A question? Yet more choices.', 'A')
  ]);
  assert.deepEqual(result.cards[0].answers, ['A', 'B', 'C']);
  assert.deepEqual(result.cards[0].options, ['A', 'B', 'C', 'Wrong']);
  assert.equal(result.cards[0].definition, 'A\nB\nC');
  assert.deepEqual(consolidateCards(result.cards).cards, result.cards);
  assert.equal(consolidateCards(result.cards).changed, false);
});

test('different original answer capitalization and punctuation is preserved without editorial corrections', () => {
  const result = consolidateCards([
    duplicateCard('Which label?', 'US'),
    duplicateCard('Which label?', 'us'),
    duplicateCard('Which label?', 'US.')
  ]);
  assert.deepEqual(result.cards[0].answers, ['US', 'us', 'US.']);
});

