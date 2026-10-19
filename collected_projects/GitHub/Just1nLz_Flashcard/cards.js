export function parseCards(text) {
  if (!text.trim()) throw new Error('Paste or select some cards first.');
  let cards;
  if (/^[\[{]/.test(text.trim())) {
    const data = JSON.parse(text);
    cards = Array.isArray(data) ? data : data.cards;
    if (!Array.isArray(cards)) throw new Error('JSON must contain a cards array.');
  } else {
    cards = text.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
      const separator = line.includes('\t') ? '\t' : '::';
      const split = line.indexOf(separator);
      if (split < 0) throw new Error(`Line ${index + 1} needs a tab or :: between term and definition.`);
      return {term: line.slice(0, split), definition: line.slice(split + separator.length)};
    });
  }
  if (!cards.length) throw new Error('The collection has no cards.');
  return cards.map((card, index) => {
    if (!card || typeof card.term !== 'string' || typeof card.definition !== 'string' || !card.term.trim() || !card.definition.trim()) throw new Error(`Card ${index + 1} needs both a term and a definition.`);
    if (card.type === 'multi') {
      if (!Array.isArray(card.answers) || card.answers.some(answer => typeof answer !== 'string' || !answer.trim())) throw new Error(`Card ${index + 1} needs at least two different answers for Select all.`);
      const answers = [...new Set(card.answers.map(answer => answer.trim()))];
      if (answers.length < 2) throw new Error(`Card ${index + 1} needs at least two different answers for Select all.`);
      const result = {term:card.term.trim(),definition:answers.join('\n'),type:'multi',answers};
      if (card.options !== undefined) {
        if (!Array.isArray(card.options) || card.options.some(option => typeof option !== 'string' || !option.trim())) throw new Error(`Card ${index + 1} has invalid Select all options.`);
        const options = [...new Set(card.options.map(option => option.trim()))];
        if (answers.some(answer => !options.includes(answer))) throw new Error(`Card ${index + 1} must include every answer in its Select all options.`);
        result.options = options;
      }
      return result;
    }
    return {term:card.term.trim(),definition:card.definition.trim()};
  });
}
