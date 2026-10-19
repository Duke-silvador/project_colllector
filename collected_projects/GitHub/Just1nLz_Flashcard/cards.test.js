import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCards} from './cards.js';
test('Quizlet TSV imports definitions including additional tabs',()=>assert.deepEqual(parseCards('Ethics\tMoral principles\r\nPrivacy\tControl\tof information'),[{term:'Ethics',definition:'Moral principles'},{term:'Privacy',definition:'Control\tof information'}]));
test('backup JSON round trips multiline definitions',()=>{const cards=[{term:'Ethics',definition:'Line one\nLine two'}];assert.deepEqual(parseCards(JSON.stringify({cards})),cards);});
test('plain text supports explicit separator',()=>assert.deepEqual(parseCards('Duty :: An obligation :: to act'),[{term:'Duty',definition:'An obligation :: to act'}]));
test('invalid imports fail without silently dropping cards',()=>{for(const text of ['', 'No separator', 'Term\t', '{"cards":[]}', '[{"term":123,"definition":"x"}]'])assert.throws(()=>parseCards(text));});
test('Select all JSON preserves answer arrays and explicit options through a round trip',()=>{
  const cards=[{term:'Which statements are correct? Select all that apply.',definition:'First\nSecond',type:'multi',answers:['First','Second'],options:['First','Second','Incorrect']}];
  assert.deepEqual(parseCards(JSON.stringify({cards})),cards);
  assert.deepEqual(parseCards(JSON.stringify(cards)),cards);
});
test('Select all definitions are recomputed from unique trimmed source answers',()=>{
  assert.deepEqual(parseCards(JSON.stringify([{term:' Which statements? ',definition:'Inconsistent display',type:'multi',answers:[' First ','Second','First '],options:[' First ','Second','Wrong','Wrong']}]))[0],{term:'Which statements?',definition:'First\nSecond',type:'multi',answers:['First','Second'],options:['First','Second','Wrong']});
});
test('Select all rejects missing or malformed keys and options without silently downgrading to one answer',()=>{
  for(const answers of [undefined,[],['One'],['One','One'],['One',' '],['One',3]]) assert.throws(()=>parseCards(JSON.stringify([{term:'Question?',definition:'Answer',type:'multi',answers}])));
  for(const options of [null,'One',['One',' '],['One',3],['One','Wrong']]) assert.throws(()=>parseCards(JSON.stringify([{term:'Question?',definition:'Answer',type:'multi',answers:['One','Two'],options}])));
});
import {readFileSync} from 'node:fs';
test('original PDF source preserves all 94 complete cards and page-break continuations',()=>{const cards=parseCards(readFileSync(new URL('./source-deck.json',import.meta.url),'utf8'));assert.equal(cards.length,94);assert.equal(cards[0].definition,'Technology has no ethics');assert.match(cards[8].term,/Multimedia, Cyberspace, and Ethics/);assert.match(cards[17].term,/judged by the future/);assert.match(cards[73].term,/moral development/);assert.match(cards[93].term,/secret data collection/);assert(!JSON.stringify(cards).includes('\ufffd'));});
test('bundled consolidated deck contains 80 cards including 19 usable Select all questions',()=>{
  const cards=parseCards(readFileSync(new URL('./deck.json',import.meta.url),'utf8'));
  assert.equal(cards.length,80);
  assert.equal(cards.filter(card=>card.type==='multi').length,19);
  for(const card of cards.filter(card=>card.type==='multi')) {
    assert.equal(card.definition,card.answers.join('\n'));
    assert(card.answers.length>=2);
    assert.match(card.term,/select all/i);
    if(card.options) assert(card.answers.every(answer=>card.options.includes(answer)));
  }
});
