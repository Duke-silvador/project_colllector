const $=i=>document.getElementById(i);let on=false,tg;
const E='section h2,section h3,section p,section li,section b,section span,section small,section figcaption,section .lk,#hero h1,#hero p,.tag,.logo,footer p';
function edit(v){on=v;document.body.classList.toggle('ed',v);document.querySelectorAll(E).forEach(e=>v?e.setAttribute('contenteditable','true'):e.removeAttribute('contenteditable'))}
function save(fin){const p=on;edit(false);const d=document.documentElement.cloneNode(true);d.querySelector('body').classList.remove('ed');
if(fin){d.querySelector('#tools').remove();d.querySelector('#editor').remove()}
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['<!DOCTYPE html>\n'+d.outerHTML],{type:'text/html'}));
a.download=fin?'portafolio-final.html':'portafolio-editable.html';a.click();edit(p)}
const fi=document.createElement('input');fi.type='file';fi.accept='image/*';
fi.onchange=()=>{const f=fi.files[0];if(!f)return;const im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);tg.style.backgroundImage='url('+c.toDataURL('image/jpeg',.82)+')';tg.classList.add('has')};im.src=URL.createObjectURL(f);fi.value=''};
document.addEventListener('click',e=>{if(!on||e.target.closest('#tools'))return;const a=e.target.closest('a');if(a){e.preventDefault();if(a.classList.contains('lk')||a.classList.contains('btn')){const u=prompt('Pega aquí el enlace (URL):',a.getAttribute('href'));if(u)a.setAttribute('href',u)}return}const p=e.target.closest('.ph');if(p){tg=p;fi.click()}});
document.addEventListener('paste',e=>{if(!on)return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))});
$('b1').onclick=()=>edit(true);$('b2').onclick=()=>edit(false);$('b3').onclick=()=>save(false);$('b4').onclick=()=>save(true);
const video = document.getElementById('miVideo');
function alternarReproduccion() { if (video.paused) {video.play();} else {video.pause();}}
const modal = document.getElementById('modalVideo');
const video = document.getElementById('reproductorLocal');function abrirVideo(ruta) {video.src = ruta;modal.style.display = 'flex';video.play();}function cerrarVideo() {video.pause();video.src = ""; // Detiene la carga del videomodal.style.display = 'none';
}