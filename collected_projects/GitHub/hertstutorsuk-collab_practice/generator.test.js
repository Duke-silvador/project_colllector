import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateWorksheet, topics } from './generator.js';
function seeded(seed=12345) { return () => ((seed = (seed*1664525+1013904223)>>>0)/4294967296); }
for (const topic of Object.keys(topics)) for (const level of ['easy','medium','hard']) {
  test(`${topic} ${level}: 20 unique questions with correct answers`, () => {
    const questions = generateWorksheet(topic,level,20,seeded());
    assert.equal(questions.length,20);
    assert.equal(new Set(questions.map(q=>q.prompt)).size,20);
    for (const q of questions) {
      assert.ok(q.explanation.length>20);
      if(topic==='fractions') {
        const [,a,b,op,c,d] = q.prompt.match(/(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
        const [n,den=1] = q.answer.split('/').map(Number);
        assert.ok(Math.abs(n/den-(Number(a)/b+(op==='+'?1:-1)*Number(c)/d))<1e-10);
      } else if(topic==='percentages') {
        const [,p,b] = q.prompt.match(/(\d+)% of (\d+)/);
        assert.equal(Number(q.answer),p*b/100);
      } else {
        const [,coefficient,offset,right] = q.prompt.match(/Solve: (\d*)x \+ (\d+) = (\d+)/);
        const x = Number(q.answer.split(' = ')[1]);
        assert.equal(Number(coefficient||1)*x+Number(offset),Number(right));
      }
    }
  });
}
test('rejects invalid input and handles exhausted randomness', () => {
  assert.throws(()=>generateWorksheet('fractions','easy',0));
  assert.throws(()=>generateQuestion('unknown'));
  assert.throws(()=>generateQuestion('algebra','unknown'));
  assert.throws(()=>generateWorksheet('algebra','easy',5,()=>0));
});
