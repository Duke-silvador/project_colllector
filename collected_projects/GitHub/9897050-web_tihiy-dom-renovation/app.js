'use strict';
const $ = id => document.getElementById(id);
const formats = {
  'Обновить': ['Подготовка и отделка стен', 'Обновление напольных покрытий', 'Свет, плинтусы и детали'],
  'Переосмыслить': ['Демонтаж и подготовка основания', 'Электрика и сантехника', 'Черновая и чистовая отделка'],
  'Создать с нуля': ['План работ для новостройки', 'Подготовка инженерных систем', 'Отделка по выбранной концепции']
};
let selected = 'Переосмыслить';
const money = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0}).format(value) + ' ₽';
function state() {
  const area = Number($('area').value), labor = Number($('labor').value), materials = Number($('materials').value), reserve = Number($('reserve').value);
  const valid = $('plan-form').checkValidity();
  const hasRates = $('labor').value !== '' && $('materials').value !== '';
  const base = area * (labor + materials);
  const scope = [...formats[selected]];
  if ($('bathroom').checked) scope.push('Санузел включён в задание');
  if ($('design').checked) scope.push('Помощь с интерьерной концепцией');
  return {area,labor,materials,reserve,valid,hasRates,base,total:base*(1+reserve/100),scope};
}
function update() {
  const s = state();
  $('summary-format').textContent = selected;
  $('summary-home').textContent = `${s.valid ? s.area : '—'} м² · ${$('condition').value}`;
  $('scope').replaceChildren(...s.scope.map(text => {const li = document.createElement('li'); li.textContent=text;return li;}));
  $('total').textContent = !s.valid ? 'Проверьте значения' : s.hasRates ? money(s.total) : 'Укажите ставки';
  $('breakdown').textContent = !s.valid ? 'Площадь: от 10 до 500 м². Ставки: от 0 до 1 000 000 ₽/м².' : s.hasRates ? `Работы: ${money(s.area*s.labor)} · Материалы: ${money(s.area*s.materials)} · Резерв ${s.reserve}%: ${money(s.base*s.reserve/100)}` : 'Укажите обе ставки. Если материалы не нужны, введите 0.';
  document.querySelectorAll('.choices [data-format]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.format === selected)));
  $('plan-status').textContent='';
}
function planText() {
  const s=state();
  return `Здравствуйте! Хочу обсудить ремонт квартиры.\n\nПлощадь: ${s.area} м²\nСостояние: ${$('condition').value}\nФормат: ${selected}\n\nПредварительный состав:\n${s.scope.map(x=>'• '+x).join('\n')}\n\n${s.hasRates ? `Мой сценарий бюджета (не смета компании):\nРаботы: ${money(s.labor)}/м² × ${s.area} = ${money(s.area*s.labor)}\nМатериалы: ${money(s.materials)}/м² × ${s.area} = ${money(s.area*s.materials)}\nРезерв: ${s.reserve}%\nИтого: ${money(s.total)}\nМебель, техника, доставка и вывоз мусора не включены.` : 'Бюджет: требуется индивидуальный расчёт.'}\n\nПожелания: ${$('wishes').value.trim() || 'Обсудим при знакомстве.'}\n\nПлан подготовлен на демонстрационном сайте «Квадратный вопрос». Он не отправлен компании. Состав, стоимость, сроки и условия требуют согласования.`;
}
function validate() { if (!$('plan-form').reportValidity()) return false; return true; }
document.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.format;update();if(!button.closest('#plan-form')) $('planner').scrollIntoView({behavior:'smooth'});}));
$('plan-form').addEventListener('input',update);
$('plan-form').addEventListener('change',update);
$('plan-form').addEventListener('submit',e=>e.preventDefault());
$('prepare').addEventListener('click',()=>{if(!validate())return;$('request-text').value=planText();$('copy-status').textContent='';$('request-dialog').showModal();});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('request-text').value);$('copy-status').textContent='Текст скопирован. Вы можете вставить его в сообщение.';}catch{$('request-text').focus();$('request-text').select();$('copy-status').textContent='Выделен весь текст. Нажмите Ctrl+C или выберите «Копировать».';}});
$('download').addEventListener('click',()=>{if(!validate())return;const blob=new Blob(['\uFEFF'+planText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='kvadratny-vopros-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('plan-status').textContent='Файл плана подготовлен для скачивания.';});
$('privacy').addEventListener('click',()=>$('privacy-dialog').showModal());
document.querySelectorAll('dialog .close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
const menu=document.querySelector('.menu'),nav=document.querySelector('nav');
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');}));
update();
