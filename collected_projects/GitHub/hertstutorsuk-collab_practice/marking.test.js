import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAnswer} from './marking.js';
test('marks numeric, fractional and algebra answers without evaluating code',()=>{
  for(const [input,expected] of [[' x = 12 ','x = 12'],['.5','1/2'],['−2/3','-2/3'],['0','0'],['4.0','4']]) assert.equal(checkAnswer(input,expected),'correct');
  for(const input of ['1/0','Infinity','alert(1)','3abc','1+2']) assert.equal(checkAnswer(input,'3'),'incorrect');
  assert.equal(checkAnswer('','2'),'blank');
  assert.equal(checkAnswer('3','2'),'incorrect');
});
test('requires simplified fractions when requested',()=>{
  assert.equal(checkAnswer('2/4','1/2',true),'simplify');
  assert.equal(checkAnswer('1/2','1/2',true),'correct');
  assert.equal(checkAnswer('0/4','0',true),'simplify');
  assert.equal(checkAnswer('0','0',true),'correct');
});
