function parse(value) {
  const clean = String(value).trim().replace(/−/g,'-').replace(/^x\s*=\s*/i,'').replace(/\s/g,'');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?\d+)?$/.test(clean)) return null;
  const [n,d='1'] = clean.split('/').map(Number);
  return d && Number.isFinite(n/d) ? { value:n/d, numerator:n, denominator:d, fraction:clean.includes('/') } : null;
}
const gcd = (a,b) => b ? gcd(b,a%b) : a;
export function checkAnswer(input, answer, simplify = false) {
  if (!String(input).trim()) return 'blank';
  const actual = parse(input), expected = parse(answer);
  if (!actual || !expected || Math.abs(actual.value-expected.value)>1e-9) return 'incorrect';
  if (simplify && actual.fraction && gcd(Math.abs(actual.numerator),Math.abs(actual.denominator))>1) return 'simplify';
  return 'correct';
}
