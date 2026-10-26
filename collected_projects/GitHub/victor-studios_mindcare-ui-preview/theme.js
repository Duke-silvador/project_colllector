/* Appearance preferences only; switching theme never reconstructs the conversation. */
try{S.theme=localStorage.getItem('mindcare-theme')==='dark'?'dark':'light'}catch{S.theme='light'}
const themeLabel=()=>S.theme==='dark'?U('Dark','گہرا'):U('Light','روشن');
function applyTheme(){document.documentElement.dataset.theme=S.theme;document.documentElement.style.colorScheme=S.theme;}
function themeControls(){
  $('#themeToggle')?.remove();
  const button=document.createElement('button');button.id='themeToggle';button.type='button';button.dataset.action='toggletheme';button.className='theme-toggle';
  button.setAttribute('aria-label',S.theme==='dark'?U('Switch to light mode','روشن تھیم منتخب کریں'):U('Switch to dark mode','گہری تھیم منتخب کریں'));
  button.title=button.getAttribute('aria-label');button.innerHTML=I(S.theme==='dark'?'sun':'moon');
  $('.previewtools').insertBefore(button,$('#viewMenu'));
  $('#appearanceRow')?.remove();
  if(S.screen==='profile'){
    const group=$('.profile-grid section:nth-child(2) .settings-group');
    const holder=document.createElement('div');holder.id='appearanceRow';holder.innerHTML=row(U('Appearance','ظاہری انداز'),themeLabel(),'appearance',S.theme==='dark'?'moon':'sun');group?.prepend(holder);
  }
}
function appearanceDialog(){
  openDialog(U('Appearance','ظاہری انداز'),`<p>${U('Choose the look that feels comfortable for you.','وہ انداز منتخب کریں جو آپ کے لیے آرام دہ ہو۔')}</p><div class="theme-choices">${['light','dark'].map(t=>`<button type="button" class="theme-choice ${S.theme===t?'selected':''}" data-action="theme${t}" aria-pressed="${S.theme===t}"><span class="theme-sample ${t}" aria-hidden="true"><i></i><i></i><i></i></span><span>${I(t==='light'?'sun':'moon')}${t==='light'?U('Light','روشن'):U('Dark','گہرا')}${S.theme===t?I('check'):''}</span></button>`).join('')}</div>`,B(U('Done','مکمل'),'close','primary'));
}
function setTheme(theme){S.theme=theme;try{localStorage.setItem('mindcare-theme',theme)}catch{}applyTheme();themeControls();}
actions.appearance=appearanceDialog;
actions.toggletheme=()=>{setTheme(S.theme==='dark'?'light':'dark');$('#themeToggle').focus()};
for(const theme of ['light','dark'])actions[`theme${theme}`]=()=>{setTheme(theme);appearanceDialog();$(`#dialog [data-action=theme${theme}]`).focus()};
const appearanceRender=render;
render=()=>{applyTheme();appearanceRender();themeControls();};
applyTheme();themeControls();
