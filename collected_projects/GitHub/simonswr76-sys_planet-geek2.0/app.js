(() => {
const modal=document.getElementById('game-modal'), close=document.getElementById('close-modal');
let current='racer';
function openGame(game){current=game;window.currentGame=game;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';PlanetGames.launch(game);}
function shut(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';document.getElementById('game-host').innerHTML='';}
document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
close.addEventListener('click',shut);modal.addEventListener('click',e=>{if(e.target===modal)shut();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')shut();});
document.getElementById('restart-game').addEventListener('click',()=>{window.currentGame=current;PlanetGames.launch(current);});
const search=document.getElementById('search'),filters=[...document.querySelectorAll('.filter')],cards=[...document.querySelectorAll('.game-card')];
let category='Tous';
function update(){let q=search.value.toLocaleLowerCase('fr');let visible=0;cards.forEach(c=>{let ok=(category==='Tous'||c.dataset.category===category)&&c.dataset.name.toLocaleLowerCase('fr').includes(q);c.hidden=!ok;if(ok)visible++;});document.getElementById('visible-count').textContent=visible;document.getElementById('empty').hidden=visible!==0;}
search.addEventListener('input',update);filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(f=>f.classList.toggle('active',f===b));category=b.dataset.category;update();}));
document.getElementById('year').textContent=new Date().getFullYear();
})();