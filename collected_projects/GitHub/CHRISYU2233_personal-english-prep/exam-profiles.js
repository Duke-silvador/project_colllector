// Exam selection and portable AI-content format. No network or credentials.
export const EXAMS = Object.freeze({
  cet4: '大学英语四级', cet6: '大学英语六级', ielts: '雅思',
  toefl: '托福', det: '多邻国英语测试', other: '其他英语考试'
});

export function createStudyPrompt({ exam, goal = '', minutes = 90 }) {
  if (!Object.hasOwn(EXAMS, exam)) throw new Error('请选择考试');
  const duration = Number(minutes);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) throw new Error('学习时间应为 5–480 分钟');
  const target = String(goal).trim().slice(0, 200) || '循序渐进地提高英语能力';
  return `请为${EXAMS[exam]}考生生成原创英语学习材料。学习目标：${target}。每日时间：${duration}分钟。不要声称材料是官方真题或保证成绩。仅返回 JSON 对象，不要 Markdown，字段为 title（字符串）、plan（字符串数组）、vocabulary（数组，每项包含 word、meaning、example、translation 四个字符串）、listening（对象，包含 transcript 和 question 两个字符串）、reading（对象，包含 passage 和 question 两个字符串）、writing（字符串）、translation（中文翻译练习字符串）。所有材料需适合考生且避免照搬受版权保护的真题。`;
}

export function parseStudyContent(input) {
  let value;
  try { value = JSON.parse(String(input).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')); }
  catch { throw new Error('内容不是有效 JSON，请检查后重试。'); }
  const str = (x, max = 5000) => typeof x === 'string' ? x.trim().slice(0, max) : '';
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('内容格式不正确。');
  const vocabulary = Array.isArray(value.vocabulary) ? value.vocabulary.slice(0, 100).map(w => ({word:str(w?.word,100),meaning:str(w?.meaning,500),example:str(w?.example,1000),translation:str(w?.translation,1000)})).filter(w => /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(w.word) && w.meaning) : [];
  const reading = { passage: str(value.reading?.passage, 10000), question: str(value.reading?.question, 2000) };
  const listening = { transcript: str(value.listening?.transcript, 10000), question: str(value.listening?.question, 2000) };
  const plan = Array.isArray(value.plan) ? value.plan.map(x => str(x, 500)).filter(Boolean).slice(0, 20) : [];
  const result = { title:str(value.title,200), plan, vocabulary, listening, reading, writing:str(value.writing,3000), translation:str(value.translation,3000) };
  if (!result.title && !vocabulary.length && !reading.passage && !listening.transcript && !listening.question && !result.writing && !result.translation && !plan.length) throw new Error('没有可导入的学习内容。');
  return result;
}
