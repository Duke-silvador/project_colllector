import { checkAnswer } from './marking.js';
import { generateWorksheet, topics } from './generator.js';
const form = document.querySelector('#generator');
const list = document.querySelector('#questions');
const answerButton = document.querySelector('#answers');
let revealed = false;
let currentQuestions = [];
let currentTopic;
let lastResults = [];
function render() {
  try {
    const data = new FormData(form), topic = data.get('topic'), difficulty = data.get('difficulty'), count = Number(data.get('count'));
    const questions = generateWorksheet(topic,difficulty,count);
    currentQuestions = questions; currentTopic = topic; lastResults = [];
    document.querySelector("#score").hidden = true; document.querySelector("#retry").hidden = true;
    document.querySelector("#mark").textContent = "Mark my answers ✓";
    list.replaceChildren();
    for (const [index, question] of questions.entries()) {
      const item = document.createElement('li');
      const number = document.createElement('span'); number.className = 'question-number'; number.textContent = String(index+1).padStart(2,'0');
      const body = document.createElement('div'); body.className = 'question-body';
      const prompt = document.createElement('p'); prompt.textContent = question.prompt;
      const space = document.createElement('div'); space.className = 'working-space'; space.setAttribute('aria-hidden','true');
      const answer = document.createElement('div'); answer.className = 'answer'; answer.hidden = true;
      const result = document.createElement('strong'); result.textContent = question.answer;
      const explanation = document.createElement('p'); explanation.textContent = question.explanation;
      const input = document.createElement('input'); input.className = 'student-answer'; input.type = 'text'; input.autocomplete = 'off'; input.placeholder = topic === 'fractions' ? 'e.g. 3/4' : 'Your answer'; input.setAttribute('aria-label', `Your answer to question ${index+1}`);
      const feedback = document.createElement('p'); feedback.className = 'feedback'; feedback.id = `feedback-${index}`; input.setAttribute('aria-describedby',feedback.id);
      input.addEventListener('input', () => { feedback.textContent = ''; item.removeAttribute('data-result'); document.querySelector('#score').hidden = true; document.querySelector('#retry').hidden = true; });
      answer.append(result,explanation); body.append(prompt,space,input,feedback,answer); item.append(number,body); list.append(item);
    }
    revealed = false; answerButton.textContent = 'Show answers'; answerButton.setAttribute('aria-pressed','false');
    document.querySelector('#worksheet-title').textContent = `${topics[topic]}, one step at a time.`;
    document.querySelector('#summary').textContent = `${count} questions · ${difficulty[0].toUpperCase()+difficulty.slice(1)} level`;
    document.querySelector('#announcement').textContent = `Generated ${count} ${difficulty} ${topics[topic].toLowerCase()} questions.`;
    document.querySelector('#error').textContent = '';
  } catch (error) { document.querySelector('#error').textContent = error.message; }
}
form.addEventListener('submit', event => { event.preventDefault(); render(); });
answerButton.addEventListener('click', () => {
  revealed = !revealed;
  document.querySelectorAll('.answer').forEach(answer => answer.hidden = !revealed);
  answerButton.textContent = revealed ? 'Hide answers' : 'Show answers'; answerButton.setAttribute('aria-pressed',String(revealed));
});
document.querySelector('#print').addEventListener('click', () => window.print());
render();

document.querySelector('#mark').addEventListener('click', () => {
  const items = [...list.children];
  lastResults = items.map((item,index) => {
    const result = checkAnswer(item.querySelector('input').value,currentQuestions[index].answer,currentTopic === 'fractions');
    item.dataset.result = result;
    item.querySelector('.feedback').textContent = {correct:'✓ Correct — nicely done!',incorrect:'↻ Not quite. Try again or check the worked answer.',blank:'Add an answer to this question.',simplify:'Almost! Your value is right; simplify your fraction.'}[result];
    return result;
  });
  const correct = lastResults.filter(result => result === 'correct').length;
  const score = document.querySelector('#score'); score.hidden = false;
  score.textContent = `${correct} / ${items.length} correct · ${Math.round(correct/items.length*100)}%. ${correct === items.length ? 'Great work! Generate a new worksheet or stretch yourself with a harder level.' : 'Use the feedback below each question, then retry the ones you missed.'}${revealed ? ' Answers are visible — this is a practice check.' : ''}`;
  document.querySelector('#retry').hidden = correct === items.length;
});
document.querySelector('#retry').addEventListener('click', () => {
  let first;
  [...list.children].forEach((item,index) => {
    if (lastResults[index] !== 'correct') {
      const input = item.querySelector('input'); input.value = ''; first ??= input;
      item.querySelector('.feedback').textContent = ''; item.removeAttribute('data-result');
    }
    item.querySelector('.answer').hidden = true;
  });
  revealed = false; answerButton.textContent = 'Show answers'; answerButton.setAttribute('aria-pressed','false');
  document.querySelector('#score').hidden = true; document.querySelector('#retry').hidden = true;
  document.querySelector('#mark').textContent = 'Check my answers again ✓';
  first?.focus();
});
