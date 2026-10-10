const REPO="SpeedForStreet/speedforstreet.github.io", BRANCH="main";
let token="", cars=[], news=[], carSha="", newsSha="";
const $=s=>document.querySelector(s);
async function api(path,options={}){const r=await fetch("https://api.github.com/repos/"+REPO+"/contents/"+path,{...options,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"Content-Type":"application/json",...(options.headers||{})}});if(!r.ok)throw new Error((await r.json()).message||r.status);return r.json();}
async function load(){const [c,n]=await Promise.all([api("data/cars.json?ref="+BRANCH),api("data/news.json?ref="+BRANCH)]);carSha=c.sha;newsSha=n.sha;cars=JSON.parse(decodeURIComponent(escape(atob(c.content.replace(/\n/g,"")))));news=JSON.parse(decodeURIComponent(escape(atob(n.content.replace(/\n/g,"")))));renderLists();$("#saveStatus").textContent="Данные загружены.";}
function enc(s){return btoa(unescape(encodeURIComponent(s)));}
async function saveFile(path,data,sha,message){await api(path,{method:"PUT",body:JSON.stringify({message,content:enc(JSON.stringify(data,null,2)+"\n"),sha,branch:BRANCH})});}
function renderLists(){renderCars();renderNews();}
function renderCars(){$("#carList").innerHTML=cars.map((c,i)=>`<div class="item"><div><small>${c.category.toUpperCase()}</small><h3>${c.title}</h3><div class="hint">${c.engine} • ${c.drive}</div></div><div class="item-actions"><button onclick="editCar(${i})">РЕДАКТИРОВАТЬ</button><button class="danger" onclick="deleteCar(${i})">УДАЛИТЬ</button></div></div>`).join("");}
function renderNews(){$("#newsList").innerHTML=news.map((n,i)=>`<div class="item"><div><small>${n.date} • ${n.tag}</small><h3>${n.title}</h3><div class="hint">${n.published===false?"СКРЫТА С САЙТА":"НА САЙТЕ"} • ${n.telegram===true?"TELEGRAM: ДА":"TELEGRAM: НЕТ"}</div></div><div class="item-actions"><button onclick="editNews(${i})">РЕДАКТИРОВАТЬ</button><button class="danger" onclick="deleteNews(${i})">УДАЛИТЬ</button></div></div>`).join("");}
function carForm(c={},i=-1){$("#carEditor").classList.remove("hidden");$("#carEditor").innerHTML=`<h3 style="font-family:Oswald">${i<0?"НОВАЯ МАШИНА":"РЕДАКТИРОВАНИЕ"}</h3><div class="form-grid">
<div class="field"><label>ID</label><input id="c_id" value="${c.id||""}"></div><div class="field"><label>КАТЕГОРИЯ</label><select id="c_category"><option ${c.category==="street"?"selected":""}>street</option><option ${c.category==="performance"?"selected":""}>performance</option><option ${c.category==="garage"?"selected":""}>garage</option></select></div>
<div class="field"><label>НАДПИСЬ</label><input id="c_kicker" value="${c.kicker||""}"></div><div class="field"><label>НАЗВАНИЕ</label><input id="c_title" value="${c.title||""}"></div>
<div class="field"><label>ДВИГАТЕЛЬ</label><input id="c_engine" value="${c.engine||""}"></div><div class="field"><label>ПРИВОД</label><input id="c_drive" value="${c.drive||""}"></div>
<div class="field"><label>ТЮНИНГ</label><input id="c_tune" value="${c.tune||""}"></div><div class="field"><label>ПУТЬ К КАРТИНКЕ</label><input id="c_image" value="${c.image||""}" placeholder="assets/car-01.jpg"></div></div>
<div class="field"><label>ОПИСАНИЕ</label><textarea id="c_desc">${c.desc||""}</textarea></div><div class="top-actions"><button class="primary" id="saveCar">СОХРАНИТЬ</button><button onclick="closeEditor('carEditor')">ОТМЕНА</button></div>`;
$("#saveCar").onclick=async()=>{const x={id:$("#c_id").value.trim(),category:$("#c_category").value,kicker:$("#c_kicker").value.trim(),title:$("#c_title").value.trim(),desc:$("#c_desc").value.trim(),engine:$("#c_engine").value.trim(),drive:$("#c_drive").value.trim(),tune:$("#c_tune").value.trim(),image:$("#c_image").value.trim()};if(!x.id||!x.title)return alert("Заполни ID и название.");if(i<0)cars.push(x);else cars[i]=x;await persistCars();$("#carEditor").classList.add("hidden");renderCars();};}
function escapeHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function editorHtml(v){const s=String(v||"");return /<\/?[a-z][^>]*>/i.test(s)?s:escapeHtml(s).replace(/\n/g,"<br>");}
function richEditor(id,value,placeholder){
  return `<div class="rich-editor"><div class="rich-toolbar" data-editor="${id}">
    <button type="button" data-cmd="bold"><b>B</b></button>
    <button type="button" data-cmd="italic"><i>I</i></button>
    <button type="button" data-cmd="formatBlock" data-value="h3">H3</button>
    <button type="button" data-cmd="formatBlock" data-value="blockquote">❝</button>
    <button type="button" data-cmd="insertUnorderedList">• Список</button>
    <button type="button" data-cmd="insertOrderedList">1. Список</button>
    <button type="button" data-cmd="createLink">🔗 Ссылка</button>
    <button type="button" data-cmd="removeFormat">Очистить</button>
  </div><div id="${id}" class="rich-content" contenteditable="true" data-placeholder="${escapeHtml(placeholder)}">${editorHtml(value)}</div></div>`;
}
function initRichEditors(){
  document.querySelectorAll(".rich-toolbar").forEach(toolbar=>{
    toolbar.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      const editor=document.getElementById(toolbar.dataset.editor); if(!editor)return;
      editor.focus();
      const cmd=btn.dataset.cmd;
      if(cmd==="createLink"){const url=prompt("Вставь ссылку:","https://");if(url)document.execCommand("createLink",false,url);}
      else if(cmd==="formatBlock")document.execCommand(cmd,false,btn.dataset.value);
      else document.execCommand(cmd,false,null);
    }));
  });
}
function newsForm(n={},i=-1){
  $("#newsEditor").classList.remove("hidden");
  $("#newsEditor").innerHTML=`<h3 style="font-family:Oswald">${i<0?"НОВАЯ НОВОСТЬ":"РЕДАКТИРОВАНИЕ"}</h3><div class="form-grid">
<div class="field"><label>ID</label><input id="n_id" value="${escapeHtml(n.id)}"></div><div class="field"><label>ДАТА / МЕТКА</label><input id="n_date" value="${escapeHtml(n.date)}"></div>
<div class="field"><label>РАЗДЕЛ</label><input id="n_tag" value="${escapeHtml(n.tag)}"></div><div class="field"><label>ССЫЛКА</label><input id="n_link" value="${escapeHtml(n.link||"#devlog")}"></div>
<div class="field" style="grid-column:1/-1"><label>ЗАГОЛОВОК</label><input id="n_title" value="${escapeHtml(n.title)}"></div>
<div class="field" style="grid-column:1/-1"><label>ПУТЬ К КАРТИНКЕ</label><input id="n_image" value="${escapeHtml(n.image)}" placeholder="assets/world-clean.jpg"></div></div>
<div class="publish-box"><label class="publish-option"><input id="n_published" type="checkbox" ${n.published!==false?"checked":""}> ОПУБЛИКОВАТЬ НА САЙТЕ</label><label class="publish-option"><input id="n_telegram" type="checkbox" ${n.telegram===true?"checked":""}> ОТПРАВИТЬ В TELEGRAM</label></div>
<div class="hint">Telegram отправляется автоматически после сохранения новости. Если галочка Telegram включена, бот отправит эту новость подписчикам один раз.</div>
<div class="field"><label>КОРОТКОЕ ОПИСАНИЕ <small style="color:#777">(карточка на главной)</small></label>${richEditor("n_short",n.shortDescription||n.text||"","Напиши короткое описание новости...")}</div>
<div class="field"><label>ПОЛНОЕ ОПИСАНИЕ <small style="color:#777">(открывается по «ЧИТАТЬ ДАЛЬШЕ»)</small></label>${richEditor("n_text",n.fullDescription||n.text||"","Напиши полную статью...")}</div>
<div class="top-actions"><button class="primary" id="saveNews">СОХРАНИТЬ</button><button type="button" onclick="closeEditor('newsEditor')">ОТМЕНА</button></div>`;
  initRichEditors();
  $("#saveNews").onclick=async()=>{
    const fullDescription=$("#n_text").innerHTML.trim(),shortDescription=$("#n_short").innerHTML.trim();
    const x={id:$("#n_id").value.trim(),date:$("#n_date").value.trim(),tag:$("#n_tag").value.trim(),title:$("#n_title").value.trim(),shortDescription,fullDescription,text:fullDescription,image:$("#n_image").value.trim(),link:$("#n_link").value.trim(),published:$("#n_published").checked,telegram:$("#n_telegram").checked};
    if(!x.id||!x.title)return alert("Заполни ID и заголовок.");
    if(i<0)news.unshift(x);else news[i]=x;
    await persistNews();$("#newsEditor").classList.add("hidden");renderNews();
  };
}
async function persistCars(){const r=await api("data/cars.json?ref="+BRANCH);await saveFile("data/cars.json",cars,r.sha,"Update car catalog");const fresh=await api("data/cars.json?ref="+BRANCH);carSha=fresh.sha;$("#saveStatus").textContent="Автомобиль сохранён.";}
async function persistNews(){const r=await api("data/news.json?ref="+BRANCH);await saveFile("data/news.json",news,r.sha,"Update development news");const fresh=await api("data/news.json?ref="+BRANCH);newsSha=fresh.sha;$("#saveStatus").textContent="Новость сохранена. Telegram проверит её автоматически в течение минуты.";}
window.editCar=i=>carForm(cars[i],i);window.deleteCar=async i=>{if(confirm("Удалить автомобиль?")){cars.splice(i,1);await persistCars();renderCars();}};
window.editNews=i=>newsForm(news[i],i);window.deleteNews=async i=>{if(confirm("Удалить новость?")){news.splice(i,1);await persistNews();renderNews();}};
window.closeEditor=id=>$("#"+id).classList.add("hidden");
function initAdmin(){
 const connect=$("#connect");
 if(!connect){document.body.innerHTML+="<div style="+"\"position:fixed;bottom:20px;left:20px;right:20px;padding:15px;background:#321015;color:#fff;z-index:9999\""+">Ошибка запуска админ-панели: кнопка подключения не найдена.</div>";return;}
 connect.addEventListener("click",async()=>{const status=$("#authStatus");connect.disabled=true;connect.textContent="ПРОВЕРКА…";status.textContent="Проверяем токен и подключение к GitHub…";token=$("#token").value.trim();if(!token){status.textContent="Ошибка: введи GitHub token.";connect.disabled=false;connect.textContent="ПОДКЛЮЧИТЬСЯ";return;}try{await load();$("#auth").classList.add("hidden");$("#workspace").classList.remove("hidden");status.textContent="Подключено.";}catch(e){console.error("SpeedForStreet Admin:",e);status.textContent="Ошибка подключения: "+(e.message||"неизвестная ошибка");token="";}finally{connect.disabled=false;connect.textContent="ПОДКЛЮЧИТЬСЯ";}});
 $("#reload").onclick=load;$("#newCar").onclick=()=>carForm();$("#newNews").onclick=()=>newsForm();
 document.querySelectorAll(".top-actions button[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#carsTab").classList.toggle("hidden",b.dataset.tab!=="cars");$("#newsTab").classList.toggle("hidden",b.dataset.tab!=="news");});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initAdmin);else initAdmin();