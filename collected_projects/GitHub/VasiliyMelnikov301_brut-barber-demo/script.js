'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = $('#site-menu');
const booking = $('.booking-dialog');
const lightbox = $('.photo-dialog');
const menuButton = $('.menu-toggle');
const dialogs = [menu, booking, lightbox];
const returnFocus = new WeakMap();
const closing = new WeakMap();
const services = [
  {name:'Мужская стрижка', price:'2 000 ₽', duration:'60 минут', description:'Консультация, подбор формы, мытьё и укладка.'},
  {name:'Моделирование бороды', price:'1 200 ₽', duration:'30 минут', description:'Выбор длины, моделирование, точный контур и уход.'},
  {name:'Стрижка + борода', price:'2 900 ₽', duration:'90 минут', description:'Мужская стрижка и моделирование бороды в одном ритуале.'},
  {name:'Стрижка машинкой', price:'1 000 ₽', duration:'30 минут', description:'Короткая длина, аккуратные переходы и чистый контур.'}
];
const serviceChoice = $('#service-choice');
const dateInput = $('#booking-date');
const timeInput = $('#booking-time');
const result = $('#booking-result');
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function syncDate() { dateInput.min = localDate(); }
function updateBooking() {
  const service = services[Number(serviceChoice.value)];
  $('#service-description').textContent = service.description;
  $('.booking-summary').textContent = `${service.duration} / ${service.price}`;
  $$('.service').forEach(link => link.classList.toggle('selected',link.dataset.service === serviceChoice.value));
  result.hidden = true;
  dateInput.setCustomValidity('');
}
function openDialog(dialog, opener = document.activeElement) {
  if (dialog.open) return;
  returnFocus.set(dialog, opener);
  dialog.classList.remove('closing');
  dialog.showModal();
  document.body.classList.add('dialog-open');
  if (dialog === menu) menuButton.setAttribute('aria-expanded','true');
  if (dialog === booking) {syncDate(); updateBooking();}
}
function closeDialog(dialog, restore = true) {
  if (closing.has(dialog)) return closing.get(dialog);
  if (!dialog.open) return Promise.resolve();
  dialog.classList.add('closing');
  const promise = new Promise(resolve => setTimeout(() => {
    dialog.close();
    dialog.classList.remove('closing');
    closing.delete(dialog);
    menuButton.setAttribute('aria-expanded','false');
    if (!dialogs.some(item=>item.open)) document.body.classList.remove('dialog-open');
    if (restore) returnFocus.get(dialog)?.focus({preventScroll:true});
    resolve();
  }, reducedMotion.matches ? 0 : 220));
  closing.set(dialog,promise);
  return promise;
}
if (typeof menu.showModal === 'function') {
  document.body.classList.add('enhanced');
  menuButton.hidden = false;
  menuButton.addEventListener('click',()=>openDialog(menu));
  dialogs.forEach(dialog=>{
    $('.close-dialog',dialog).addEventListener('click',()=>closeDialog(dialog));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
    dialog.addEventListener('click',event=>{if(event.target===dialog) closeDialog(dialog);});
  });
  $$('a[href^="#"]').forEach(link=>link.addEventListener('click',async event=>{
    const hash = link.getAttribute('href');
    if (hash === '#booking') {
      event.preventDefault();
      if (link.dataset.service !== undefined) serviceChoice.value = link.dataset.service;
      const opener = menu.open ? menuButton : link;
      if (menu.open) await closeDialog(menu,false);
      openDialog(booking,opener);
    } else if(menu.open) {
      event.preventDefault();
      await closeDialog(menu,false);
      const target = document.getElementById(hash.slice(1));
      if(target){
        history.pushState(null,'',hash);
        target.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});
        target.tabIndex = -1;
        target.focus({preventScroll:true});
      }
    }
  }));
  if(location.hash === '#booking') openDialog(booking,$('.header-cta'));
}
[serviceChoice,dateInput,timeInput].forEach(input=>input.addEventListener('change',updateBooking));
$('#booking-form').addEventListener('submit',event=>{
  event.preventDefault();
  syncDate();
  if(dateInput.value < dateInput.min){dateInput.setCustomValidity('Выбери сегодняшнюю или будущую дату.');dateInput.reportValidity();return;}
  const selected = services[Number(serviceChoice.value)];
  const date = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  result.textContent = `Твой выбор: ${selected.name}, ${date}, ${timeInput.value}. ${selected.duration}, ${selected.price}. Это демонстрация — запись НЕ создана и время НЕ забронировано.`;
  result.hidden = false;
  result.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest'});
});
syncDate(); updateBooking();
// Gallery: bounded state, native dialog focus trap, keyboard and touch controls.
const photos = $$('.photo-open');
const photoImage = $('.lightbox-stage img');
let photoIndex = 0;
let photoTimer;
function showPhoto(index, animate = true) {
  photoIndex = (index + photos.length) % photos.length;
  clearTimeout(photoTimer);
  const item = photos[photoIndex];
  if(animate && !reducedMotion.matches) photoImage.classList.add('changing');
  photoTimer = setTimeout(()=>{
    photoImage.src = item.dataset.photo;
    photoImage.alt = $('img',item).alt;
    $('.lightbox-count').textContent = `${String(photoIndex+1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}`;
    $('.lightbox-caption p').textContent = item.dataset.caption;
    $('.lightbox-caption span').textContent = item.dataset.author;
    const reveal = ()=>photoImage.classList.remove('changing');
    photoImage.onload = reveal;
    photoImage.onerror = ()=>{reveal();$('.lightbox-caption p').textContent='Фото не загрузилось. Переключись на следующий снимок.';};
    if(photoImage.complete) reveal();
  },animate && !reducedMotion.matches ? 150 : 0);
}
photos.forEach((button,index)=>button.addEventListener('click',()=>{showPhoto(index,false);openDialog(lightbox,button);}));
$('.photo-prev').addEventListener('click',()=>showPhoto(photoIndex-1));
$('.photo-next').addEventListener('click',()=>showPhoto(photoIndex+1));
lightbox.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();showPhoto(photoIndex+1);}
  if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(photoIndex-1);}
});
let touchX = null;
photoImage.addEventListener('touchstart',event=>{touchX=event.touches.length===1?event.touches[0].clientX:null;},{passive:true});
photoImage.addEventListener('touchend',event=>{if(touchX!==null){const dx=event.changedTouches[0].clientX-touchX;if(Math.abs(dx)>60)showPhoto(photoIndex+(dx<0?1:-1));}touchX=null;},{passive:true});
// Sections remain visible when JS or IntersectionObserver isn't available.
if('IntersectionObserver' in window){
  if(!reducedMotion.matches)document.body.classList.add('js-motion');
  const reveal = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');reveal.unobserve(entry.target);}}),{threshold:.08});
  $$('.reveal').forEach(element=>reveal.observe(element));
  const navObserver = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){$$('.navigation a').forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}}),{rootMargin:'-15% 0px -55% 0px'});
  $$('main>section[id]').forEach(section=>navObserver.observe(section));
}
