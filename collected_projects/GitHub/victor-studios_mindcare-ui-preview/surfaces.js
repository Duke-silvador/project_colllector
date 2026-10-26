/* Two product designs, one shared visual language. This remains an HTML design prototype. */
const surfaceQuery=new URLSearchParams(location.search);
Object.assign(S,{
  surface:surfaceQuery.get('surface')==='app'?'app':'web',
  webViewport:surfaceQuery.get('viewport')==='mobile'?'mobile':'desktop',
  platform:surfaceQuery.get('platform')==='android'?'android':'ios',
  preferredName:'',
});
labels.profile='Profile';labels.tests='Screening';
Object.assign(translations,{Profile:'پروفائل',Screening:'جائزہ','Web app':'ویب ایپ','Mobile app':'موبائل ایپ'});
const destinations=()=>[
  {key:'chat',label:U('Chat','گفتگو'),icon:'chat'},
  {key:'tests',label:U('Screening','جائزہ'),icon:'check'},
  {key:'records',label:U('Records','ریکارڈ'),icon:'file'},
  {key:'profile',label:U('Profile','پروفائل'),icon:'person'}
];
function selectedDestination(){
  if(['chat','active','history'].includes(S.screen))return 'chat';
  if(['tests','question','result'].includes(S.screen))return 'tests';
  if(['records','upload'].includes(S.screen))return 'records';
  if(['profile','settings','intake'].includes(S.screen))return 'profile';
  return null;
}
function destinationButtons(){return destinations().map(d=>`<button type="button" data-action="${d.key}" class="${selectedDestination()===d.key?'active':''}" ${selectedDestination()===d.key?'aria-current="page"':''}>${I(d.icon)}<span>${d.label}</span></button>`).join('')}
sidebar=()=>{
  $('#sidebar').innerHTML=`<div class="brand">${I('logo')}<bdi>MindCare</bdi></div>
  ${B(U('New chat','نئی گفتگو'),'new','newchat','plus')}
  <nav class="side-nav" aria-label="${U('Main menu','مرکزی مینو')}">${destinationButtons()}</nav>
  <div class="recent"><span class="eyebrow">${U('Recent conversations','حالیہ گفتگو')}</span>${B(U('A moment to reflect','سوچنے کا ایک لمحہ'),'active')}${B(U('Finding a little balance','توازن کی تلاش'),'active')}${B(U('All conversations','تمام گفتگو'),'history','','search')}</div>
  <div class="side-footer">${B(U('Get urgent help','فوری مدد'),'urgent','','chat')}<div class="sidebar-footnote">${U('Your space. Your pace.','آپ کی جگہ۔ آپ کی رفتار۔')}</div></div>`;
};
nav=()=>{
  const n=$('#bottomnav');n.innerHTML=destinationButtons();
  n.setAttribute('aria-label',U('Main menu','مرکزی مینو'));
  n.hidden=S.device==='mobile'||['patients','patient'].includes(S.screen);
};
const surfaceContent=content;
content=()=>{
  if(S.screen!=='profile')return surfaceContent();
  const displayName=S.preferredName||U('Your space','آپ کی جگہ');
  return page(U('Your profile.','آپ کی پروفائل۔'),U('A few preferences to make MindCare feel like your space.','MindCare کو اپنی سہولت کے مطابق بنانے کے لیے چند ترجیحات۔'),`
    <div class="profile-identity"><span class="profile-avatar">${I('person')}</span><div class="identity-copy"><h2 dir="auto">${E(displayName)}</h2><p>${U('Personal details and preferences','ذاتی معلومات اور ترجیحات')}</p></div>${B(U('Edit','ترمیم'),'intake','profile-edit')}</div>
    <div class="profile-grid"><section><h2 class="settings-label">${U('LANGUAGE','زبان')}</h2><div class="settings-group">
      ${row(U('App language','ایپ کی زبان'),S.lang==='en'?'English':'اردو','language','globe')}
      ${row(U('Chat & call language','گفتگو اور کال کی زبان'),languageName(),'replylanguage','wave')}
    </div></section><section><h2 class="settings-label">${U('COMFORT & ACCESS','سہولت اور رسائی')}</h2><div class="settings-group">
      ${row(U('Reading size','تحریر کا سائز'),S.large?U('Larger text','بڑی تحریر'):U('Standard','معمول کے مطابق'),'textsize','settings')}
      ${row(U('Voice & sound','آواز کی ترتیبات'),U('Playback and live calls','جواب سننا اور صوتی کال'),'audio','volume')}
    </div></section></div>
    <h2 class="settings-label">${U('PRIVACY & SUPPORT','رازداری اور مدد')}</h2><div class="settings-group">
      ${row(U('Privacy & sharing','رازداری اور اشتراک'),U('Understand access to your information','اپنی معلومات تک رسائی سمجھیں'),'privacy','file')}
      ${row(U('Get urgent help','فوری مدد'),U('Find human support when you need it','ضرورت کے وقت انسانی مدد حاصل کریں'),'urgent','chat')}
    </div><p class="profile-note">${U('App language changes the interface. Chat and call language follows your separate preference.','ایپ کی زبان سے مینو اور صفحات بدلتے ہیں۔ گفتگو اور کال کی زبان آپ کی الگ ترجیح کے مطابق ہوتی ہے۔')}</p>
  `,'profile-page');
};
actions.profile=()=>go('profile');
actions.settings=()=>go('profile');
// Capture optional details in memory only; never persist personal information in this prototype.
document.addEventListener('submit',e=>{
  if(e.target.id!=='intakeForm')return;
  e.preventDefault();e.stopImmediatePropagation();
  S.preferredName=e.target.querySelector('input')?.value.trim()||'';
  go('profile');notify(U('Preview updated. Personal details are not saved.','نمونہ بدل گیا ہے۔ ذاتی تفصیلات محفوظ نہیں ہوتیں۔'));
},true);
const profileScreen=screens.findIndex(([,k])=>k==='settings');
if(profileScreen!==-1)screens[profileScreen]=['Profile','profile'];
const surfaceRender=render;
function surfaceCaption(){return S.surface==='web'
  ?U(`Responsive web app · ${S.device==='desktop'?'Desktop':'Mobile browser'}`,`ویب ایپ · ${S.device==='desktop'?'کمپیوٹر':'موبائل براؤزر'}`)
  :U(`Mobile app · Shared Flutter design · ${S.platform==='ios'?'iPhone 18 Pro Max':'Samsung Galaxy S26 Ultra'}`,`موبائل ایپ · مشترکہ Flutter ڈیزائن · ${S.platform==='ios'?'iPhone 18 Pro Max':'Samsung Galaxy S26 Ultra'}`);
}
function renderSurfaceTools(){
  $('.previewbar>div:first-child span').textContent=surfaceCaption();
  $('.previewtools').innerHTML=`<div class="product-switch" role="group" aria-label="${U('Design surface','ڈیزائن کی قسم')}">
    <button type="button" data-surface="web" aria-pressed="${S.surface==='web'}">${U('Web app','ویب ایپ')}</button>
    <button type="button" data-surface="app" aria-pressed="${S.surface==='app'}">${U('Mobile app','موبائل ایپ')}</button>
  </div><div class="format-switch" role="group" aria-label="${U('Preview format','نمونے کی شکل')}">
  ${S.surface==='web'
    ?`<button type="button" data-web-viewport="desktop" aria-pressed="${S.webViewport==='desktop'}">${U('Desktop','کمپیوٹر')}</button><button type="button" data-web-viewport="mobile" aria-pressed="${S.webViewport==='mobile'}">${U('Mobile','موبائل')}</button>`
    :`<button type="button" data-platform="ios" aria-pressed="${S.platform==='ios'}">iPhone 18 Pro Max</button><button type="button" data-platform="android" aria-pressed="${S.platform==='android'}">Galaxy S26 Ultra</button>`}
  </div><button type="button" id="viewMenu" aria-expanded="${!$('#screenMenu').hidden}">${U('Screens ⌄','صفحات ⌄')}</button>`;
  $('#viewMenu').onclick=()=>{$('#screenMenu').hidden=!$('#screenMenu').hidden;$('#viewMenu').setAttribute('aria-expanded',String(!$('#screenMenu').hidden))};
}
function renderDeviceFrame(){
  const app=$('#app');
  let shell=$('#deviceShell');
  if(!shell){shell=document.createElement('div');shell.id='deviceShell';app.before(shell);shell.append(app);}
  shell.className=S.surface==='app'?`device-shell ${S.platform}-mockup`:'device-shell web-frame';
  shell.querySelectorAll(':scope>.hardware-key').forEach(el=>el.remove());
  if(S.surface==='app'){
    // Design viewports preserve the published panel aspect ratios, not physical pixels.
    const width=S.platform==='ios'?440:432,height=S.platform==='ios'?956:936,edge=S.platform==='ios'?13:12;
    const toolbar=$('.previewbar').getBoundingClientRect().height;
    const scale=Math.min(1,(window.innerHeight-toolbar-40)/(height+20),(window.innerWidth-42)/(width+edge*2));
    shell.style.setProperty('--device-scale',Math.max(.35,scale));
    shell.style.setProperty('--frame-edge',`${edge}px`);
    shell.style.setProperty('--screen-width',`${width}px`);shell.style.setProperty('--screen-height',`${height}px`);
    for(const key of (S.platform==='ios'?['power','volume-up','volume-down','action-key','camera-key']:['power','volume-up'])){const el=document.createElement('i');el.className=`hardware-key ${key}`;el.setAttribute('aria-hidden','true');shell.append(el);}
  }
  app.querySelectorAll(':scope>.surface-chrome,:scope>.gesture-bar,:scope>.camera-cutout').forEach(el=>el.remove());
  if(S.device!=='mobile')return;
  const chrome=document.createElement('div');chrome.className='surface-chrome';chrome.setAttribute('aria-hidden','true');
  if(S.surface==='app'){
    chrome.classList.add('native-status');chrome.innerHTML='<span>9:41</span><div class="status-indicators"><span class="signal-bars"><i></i><i></i><i></i><i></i></span><svg viewBox="0 0 24 16" width="22" height="14"><rect x="1" y="2" width="18" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3.5" y="4.5" width="12" height="7" rx="1" fill="currentColor"/><path d="M21 6v4" stroke="currentColor" stroke-width="2"/></svg></div>';
    const gesture=document.createElement('div');gesture.className='gesture-bar';app.append(gesture);
    const camera=document.createElement('div');camera.className='camera-cutout';camera.setAttribute('aria-hidden','true');app.append(camera);
  }else{chrome.classList.add('browser-caption');chrome.innerHTML=`${I('globe')}<span>${U('MindCare · Web preview','MindCare · ویب نمونہ')}</span>`;}
  app.prepend(chrome);
}
render=()=>{
  S.device=S.surface==='app'||S.webViewport==='mobile'||window.innerWidth<760?'mobile':'desktop';
  const app=$('#app');app.classList.toggle('web-surface',S.surface==='web');app.classList.toggle('native-surface',S.surface==='app');app.classList.toggle('ios-surface',S.surface==='app'&&S.platform==='ios');app.classList.toggle('android-surface',S.surface==='app'&&S.platform==='android');
  document.body.dataset.surface=S.surface;
  surfaceRender();
  renderSurfaceTools();renderDeviceFrame();
  $('#header [data-action=settings]')?.setAttribute('aria-label',U('Profile','پروفائل'));
  if(S.screen==='intake'){
    const input=$('#intakeForm input');input.value=S.preferredName;
    $('#intakeForm [type=submit]').textContent=U('Update preview','نمونہ بدلیں');
    const extra=document.createElement('p');extra.className='demo-caption';extra.textContent=U('Design preview only. These details stay in memory until the page reloads.','یہ صرف ڈیزائن کا نمونہ ہے۔ صفحہ دوبارہ کھلنے تک تفصیلات عارضی طور پر رہتی ہیں۔');$('#intakeForm').append(extra);
  }
};
function changeSurface(){
  if($('#dialog').open)$('#dialog').close();
  $('#screenMenu').hidden=true;$('#sidebar').classList.remove('open');$('#shade').hidden=true;
  const params=new URLSearchParams(location.search);params.set('surface',S.surface);
  if(S.surface==='web'){params.set('viewport',S.webViewport);params.delete('platform')}else{params.set('platform',S.platform);params.delete('viewport')}
  history.replaceState(null,'',`${location.pathname}?${params}`);render();
}
document.addEventListener('click',e=>{
  const surface=e.target.closest('button[data-surface]');if(surface){S.surface=surface.dataset.surface;changeSurface();return}
  const viewport=e.target.closest('[data-web-viewport]');if(viewport){S.webViewport=viewport.dataset.webViewport;changeSurface();return}
  const platform=e.target.closest('[data-platform]');if(platform){S.platform=platform.dataset.platform;changeSurface()}
});
let surfaceResize;
window.addEventListener('resize',()=>{clearTimeout(surfaceResize);surfaceResize=setTimeout(()=>{const shouldMobile=S.surface==='app'||S.webViewport==='mobile'||window.innerWidth<760;if((S.device==='mobile')!==shouldMobile)render();else if(S.surface==='app')renderDeviceFrame()},120)});
render();
