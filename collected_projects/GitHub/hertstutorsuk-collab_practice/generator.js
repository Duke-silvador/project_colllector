export const topics = { fractions: 'Fractions', percentages: 'Percentages', algebra: 'Algebra' };
const gcd = (a,b) => b ? gcd(b,a%b) : a;
export function generateQuestion(topic, difficulty = 'medium', random = Math.random) {
  if (!Object.hasOwn(topics, topic) || !['easy','medium','hard'].includes(difficulty)) throw new Error('Choose a valid topic and difficulty');
  const pick = (a,b) => a + Math.floor(random() * (b-a+1));
  const level = ['easy','medium','hard'].indexOf(difficulty);
  if (topic === 'fractions') {
    const b = pick(2,level ? 12 : 6), d = level === 0 ? b : pick(2,12);
    const a = pick(1,b-1), c = pick(1,d-1), subtract = level === 2;
    let n = subtract ? a*d-c*b : a*d+c*b, denominator = b*d;
    const factor = gcd(Math.abs(n),denominator); n /= factor; denominator /= factor;
    return { prompt: `Simplify: ${a}/${b} ${subtract ? '−' : '+'} ${c}/${d}`, answer: denominator === 1 ? `${n}` : `${n}/${denominator}`, explanation: `Use a common denominator of ${b*d}: ${a*d}/${b*d} ${subtract ? '−' : '+'} ${c*b}/${b*d}. Combine the numerators, then simplify.` };
  }
  if (topic === 'percentages') {
    const percent = [ [10,25,50], [5,15,20,30,75], [12,18,35,65,85] ][level][pick(0,level === 0 ? 2 : 4)];
    const base = pick(2,20)*20;
    const result = base*percent/100;
    return { prompt: `What is ${percent}% of ${base}?`, answer: `${result}`, explanation: `${percent}% means ${percent} ÷ 100. Calculate ${base} × ${percent} ÷ 100 = ${result}.` };
  }
  const x = pick(1,level === 2 ? 20 : 12), coefficient = level === 0 ? 1 : pick(2,level === 2 ? 12 : 6), offset = pick(1,20);
  const right = coefficient*x+offset;
  return { prompt: `Solve: ${coefficient === 1 ? '' : coefficient}x + ${offset} = ${right}`, answer: `x = ${x}`, explanation: `Subtract ${offset} from both sides${coefficient === 1 ? '' : `, then divide by ${coefficient}`}: x = ${x}.` };
}
export function generateWorksheet(topic,difficulty,count,random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error('Choose between 1 and 30 questions');
  const questions = [], seen = new Set();
  for (let attempt=0; questions.length<count && attempt<1000; attempt++) {
    const question = generateQuestion(topic,difficulty,random);
    if (!seen.has(question.prompt)) { seen.add(question.prompt); questions.push(question); }
  }
  if (questions.length !== count) throw new Error('Could not create enough unique questions. Please try again.');
  return questions;
}
