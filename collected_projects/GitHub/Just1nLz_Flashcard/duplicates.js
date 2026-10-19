import {parseCards} from './cards.js';

function duplicateStem(term) {
  const withoutInstruction = term.replace(/\bselect\s+all\s+(?:that\s+apply|correct\s+answers)\b\s*[.!:]?/gi, '').trim();
  const questionEnd = withoutInstruction.lastIndexOf('?');
  return (questionEnd < 0 ? withoutInstruction : withoutInstruction.slice(0, questionEnd + 1)).trim();
}

function duplicateQuestionKey(term) {
  return duplicateStem(term).normalize('NFKC')
    .replace(/^(?:in the video regarding the paper|regarding the video about the paper on)\s+/i, '')
    .replace(/[\u2018\u2019\u201b\u2032'\u201c\u201d\u201f\u2033"]/g, '')
    .replace(/\bwhich\s+statement\s+below\s+is\s+(?:the\s+)?most\s+(?:correct|accurate)\b(?=\s*\??\s*$)/gi, 'which statements below are correct')
    .replace(/\bwhich\s+of\s+the\s+following\s+statements\s+(?:is|in)\s+(?:the\s+)?most\s+(?:correct|accurate)\b(?=\s*\??\s*$)/gi, 'which of the following statements are correct')
    .replace(/^[\s.,:;!?]+|[\s.,:;!?]+$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function duplicateAnswerKey(answer) {
  return answer.normalize('NFKC').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').trim().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function duplicateMultiTerm(term) {
  const stem = duplicateStem(term)
    .replace(/\bwhich\s+statement\s+below\s+is\s+(?:the\s+)?most\s+(?:correct|accurate)\b/gi, 'which statements below are correct')
    .replace(/\bwhich\s+of\s+the\s+following\s+statements\s+(?:is|in)\s+(?:the\s+)?most\s+(?:correct|accurate)\b/gi, 'which of the following statements are correct')
    .replace(/[\s.!]+$/g, '');
  return `${stem}${stem.endsWith('?') ? '' : '?'} Select all that apply.`;
}

/** Merge only matching question stems; keep original answer text and card order. */
export function consolidateCards(inputCards) {
  const original = parseCards(JSON.stringify(inputCards));
  const byStem = new Map();
  original.forEach((card, id) => {
    const key = duplicateQuestionKey(card.term);
    if (!byStem.has(key)) byStem.set(key, []);
    byStem.get(key).push(id);
  });
  const cards = [], groups = [], oldToNew = Array(original.length), warnings = [];
  for (const ids of byStem.values()) {
    const answerTexts = [], answerKeys = new Set();
    ids.forEach(id => {
      const card = original[id];
      (card.type === 'multi' ? card.answers : [card.definition]).forEach(answer => {
        const key = answer.trim();
        if (!answerKeys.has(key)) {
          answerKeys.add(key);
          answerTexts.push(answer);
        }
      });
    });
    const normalizedKeys = [...answerKeys].map(duplicateAnswerKey);
    const hasBooleanAnswer = normalizedKeys.some(key => /^(?:t|f|true|false)$/.test(key));
    const hasAllAnswer = normalizedKeys.some(key => /^(?:all|all of (?:the )?above)$/.test(key));
    if (ids.length > 1 && answerTexts.length > 1 && (hasBooleanAnswer || hasAllAnswer)) {
      warnings.push(`Cards ${ids.map(id => id + 1).join(', ')} share a question but have an ambiguous ${hasBooleanAnswer ? 'true/false' : '“All”'} answer key. They were kept separate.`);
      ids.forEach(id => {
        oldToNew[id] = cards.length;
        cards.push(original[id]);
        groups.push([id]);
      });
      continue;
    }
    const first = original[ids[0]];
    const merged = ids.length > 1 && answerTexts.length > 1
      ? {term:duplicateMultiTerm(first.term),definition:answerTexts.join('\n'),type:'multi',answers:answerTexts}
      : first;
    if (merged.type === 'multi' && ids.length > 1) {
      const suppliedOptions = ids.flatMap(id => original[id].type === 'multi' ? (original[id].options || []) : []);
      if (suppliedOptions.length) merged.options = [...new Set([...answerTexts, ...suppliedOptions])];
    }
    ids.forEach(id => { oldToNew[id] = cards.length; });
    cards.push(merged);
    groups.push(ids);
  }
  // Ambiguous groups can contain nonadjacent cards. Keep first-occurrence order.
  const ordered = groups.map((group, index) => ({group, card:cards[index]})).sort((left, right) => left.group[0] - right.group[0]);
  ordered.forEach(({group}, id) => group.forEach(old => { oldToNew[old] = id; }));
  const resultCards = ordered.map(entry => entry.card);
  return {cards:resultCards, groups:ordered.map(entry => entry.group), oldToNew,
    changed:JSON.stringify(original) !== JSON.stringify(resultCards), mergedCount:original.length - resultCards.length, warnings};
}
