/* Yoshi.Lab v19: visual-only rank emblems; no XP/rank calculations changed. */
(()=>{
 const names=['bronze','silver','gold','platinum','diamond','master','radiant'];
 const jp=['ブロンズ','シルバー','ゴールド','プラチナ','ダイヤモンド','マスター','レディアント'];
 const src=i=>'./yoshi-rank-'+names[Math.max(0,Math.min(6,i))]+'-v19.svg';
 const idx=s=>{s=String(s||'');let i=jp.findIndex(x=>s.includes(x));return i<0?0:i};
 function img(i,cls){const e=document.createElement('img');e.className=cls||'yoshi-v19-icon';e.src=src(i);e.alt='';e.setAttribute('aria-hidden','true');return e}
 function update(){
  document.querySelectorAll('.gem').forEach(el=>{
   if(el.dataset.v19)return;
   const m=el.className.match(/gem-(\d)/);
   if(!m)return;
   el.dataset.v19='1';el.classList.add('yoshi-v19-gem');el.replaceChildren(img(Number(m[1])));
  });
  document.querySelectorAll('.yoshi-home-rank .yoshi-rank-gem').forEach(el=>{
   const parent=el.closest('.yoshi-home-rank');const i=idx(parent?.querySelector('.yoshi-rank-name')?.textContent);
   if(el.dataset.v19===String(i))return;
   el.dataset.v19=String(i);el.classList.add('yoshi-v19-home-icon');el.replaceChildren(img(i));
  });
  document.querySelectorAll('.student-rank').forEach(el=>{
   const i=idx(el.title||el.textContent);
   if(el.dataset.v19===String(i))return;
   el.dataset.v19=String(i);
   const spark=el.querySelector('.rank-spark');if(spark){spark.replaceWith(img(i,'yoshi-v19-inline-icon'))}
   else {const old=el.querySelector('.yoshi-v19-inline-icon');if(old)old.src=src(i)}
  });
  document.querySelectorAll('.winner').forEach(el=>{
   const rank=el.querySelector('.student-rank');
   const medal=el.querySelector('.medal');
   if(!medal||!rank)return;
   const i=idx(rank.title||rank.textContent);
   if(medal.dataset.v19===String(i))return;
   medal.dataset.v19=String(i);
   const pos=el.classList.contains('first')?1:el.classList.contains('third')?3:2;
   medal.classList.add('yoshi-v19-winner-emblem');
   const n=document.createElement('span');n.className='yoshi-v19-position';n.textContent=pos+'位';
   medal.replaceChildren(n,img(i));
  });
  const my=document.getElementById('mySeasonRank');
  if(my&&my.textContent.trim()!=='—'){
   const i=idx(my.textContent);const holder=my.parentElement;
   let icon=holder.querySelector('.yoshi-v19-mypage-icon');
   if(!icon){icon=img(i,'yoshi-v19-mypage-icon');holder.insertBefore(icon,my)}
   else if(icon.dataset.rank!==String(i))icon.src=src(i);
   icon.dataset.rank=String(i);
  }
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}
 document.addEventListener('DOMContentLoaded',()=>{update();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})});
})();
