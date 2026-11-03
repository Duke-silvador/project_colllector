
async function loadPhones(){const r=await fetch('phones.json');return r.json()}
const RATES={PKR:1,INR:0.342859,BDT:0.449533,AED:0.01327,SAR:0.01355,QAR:0.013152,KWD:0.001119,OMR:0.001389,BHD:0.001359,USD:0.003614,GBP:0.002695,EUR:0.003229,TRY:0.180652,CNY:0.024058,JPY:0.570698,KRW:4.86269,RUB:0.292402,CAD:0.005054,AUD:0.005161,SGD:0.004623,MYR:0.014709,IDR:65.561311,THB:0.121968,PHP:0.228747,ZAR:0.060115,NGN:4.85541,KES:0.469038,EGP:0.200337,LKR:1.201172,NPR:0.548572,AFN:0.233409,ILS:0.011359,CHF:0.002962,VND:93.041694,MMK:7.584721,KHR:14.844538,UZS:43.104459,KZT:1.638417,TZS:9.557823,GHS:0.042218,MAD:0.035488,IQD:5.485564,JOD:0.002562,AZN:0.006144,GEL:0.009383};
const SYM={PKR:'Rs ',INR:'₹',BDT:'৳',AED:'AED ',SAR:'SAR ',QAR:'QAR ',KWD:'KWD ',OMR:'OMR ',BHD:'BHD ',USD:'$',GBP:'£',EUR:'€',TRY:'₺',CNY:'¥',JPY:'¥',KRW:'₩',RUB:'₽',CAD:'CA$',AUD:'A$',SGD:'S$',MYR:'RM ',IDR:'Rp ',THB:'฿',PHP:'₱',ZAR:'R ',NGN:'₦',KES:'KSh ',EGP:'E£ ',LKR:'Rs ',NPR:'Rs ',AFN:'؋',ILS:'₪',CHF:'CHF ',VND:'₫',MMK:'Ks ',KHR:'៛',UZS:'UZS ',KZT:'₸',TZS:'TSh ',GHS:'GH₵',MAD:'MAD ',IQD:'IQD ',JOD:'JOD ',AZN:'₼',GEL:'₾'};
function fmtCur(pkrAmt,cur){const v=pkrAmt*RATES[cur];const dec=v>=100?0:(v>=1?2:3);return SYM[cur]+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function curSel(){return localStorage.getItem('cur')||'PKR'}
function applyCur(){const cur=curSel();const sel=document.getElementById('cursel');if(sel)sel.value=cur;if(cur==='PKR')return;document.querySelectorAll('[data-pkr]').forEach(el=>{const amt=parseFloat(el.getAttribute('data-pkr'));if(isNaN(amt))return;el.innerHTML='<b class="pkrv">'+fmtCur(amt,cur)+'</b> <span class="usdv">Rs '+amt.toLocaleString('en-US')+'</span>'})}
document.addEventListener('DOMContentLoaded',()=>{applyCur();const sel=document.getElementById('cursel');if(sel)sel.addEventListener('change',()=>{localStorage.setItem('cur',sel.value);if(document.getElementById('cmp')){location.reload()}else{applyCur()}})});
function pkr(p){if(p.price_pkr==null)return 'Price not announced';const cur=curSel();if(cur!=='PKR'&&RATES[cur])return fmtCur(p.price_pkr,cur)+' · Rs '+p.price_pkr.toLocaleString('en-PK');return 'Rs '+p.price_pkr.toLocaleString('en-PK')+' · $'+p.price.toLocaleString('en-US')}
function doSearch(q){q=(q||'').toLowerCase();document.querySelectorAll('.card').forEach(c=>{c.style.display=c.dataset.name.includes(q)?'':'none'})}
document.addEventListener('click',e=>{const b=e.target.closest('.tabbtn');if(!b)return;document.querySelectorAll('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tpanel').forEach(p=>p.classList.toggle('on',p.id===b.dataset.t))});
function heroSearch(e){e.preventDefault();const q=document.getElementById('hq').value;doSearch(q);const t=document.getElementById('allmodels');if(t)t.scrollIntoView({behavior:'smooth'});return false}
document.addEventListener('DOMContentLoaded',()=>{const q=new URLSearchParams(location.search).get('q');const h=document.getElementById('hq');if(q&&h){h.value=q;doSearch(q)}});
async function initCompare(){
 const selA=document.getElementById('selA'),selB=document.getElementById('selB');if(!selA)return;
 const brandA=document.getElementById('brandA'),brandB=document.getElementById('brandB');
 const phones=await loadPhones();
 const brands=[...new Set(phones.map(p=>p.brand))].sort();
 const fillBrands=s=>{brands.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;s.appendChild(o)})};
 const fillModels=(s,brand,val)=>{s.innerHTML='';phones.filter(p=>p.brand===brand).forEach(p=>{const o=document.createElement('option');o.value=p.slug;o.textContent=p.name+' ('+p.cat+')';s.appendChild(o)});if(val)s.value=val};
 fillBrands(brandA);fillBrands(brandB);
 const qs=new URLSearchParams(location.search);
 const pa=phones.find(p=>p.slug===qs.get('a'))||phones[0];
 const pb=phones.find(p=>p.slug===qs.get('b'))||phones.find(p=>p.brand!==pa.brand)||phones[1]||phones[0];
 brandA.value=pa.brand;brandB.value=pb.brand;
 fillModels(selA,pa.brand,pa.slug);fillModels(selB,pb.brand,pb.slug);
 brandA.onchange=()=>{fillModels(selA,brandA.value);render()};
 brandB.onchange=()=>{fillModels(selB,brandB.value);render()};
 function render(){const a=phones.find(p=>p.slug===selA.value),b=phones.find(p=>p.slug===selB.value);if(!a||!b)return;
  const keys=['Price','Brand','Category'];
  [a,b].forEach(p=>Object.keys(p.specs).forEach(k=>{if(!keys.includes(k))keys.push(k)}));
  const val=(p,k)=>k==='Price'?pkr(p):k==='Brand'?p.brand:k==='Category'?p.cat:(p.specs[k]||'-');
  document.getElementById('cmp').innerHTML=keys.map(k=>{const va=val(a,k),vb=val(b,k);return `<tr class="${va!==vb?'diff':''}"><th>${k}</th><td>${va}</td><td>${vb}</td></tr>`}).join('');
  document.getElementById('cmpHead').innerHTML=`<tr><th></th><th>${a.name}</th><th>${b.name}</th></tr>`;}
 selA.onchange=render;selB.onchange=render;render();}
document.addEventListener('DOMContentLoaded',initCompare);
function initFilters(){const grid=document.getElementById('catgrid');if(!grid)return;const fb=document.getElementById('fbrand'),fs=document.getElementById('fsort'),fc=document.getElementById('fcount');const cards=[...grid.children];
 function apply(){const b=fb.value;let vis=cards.filter(c=>!b||c.dataset.brand===b);const s=fs.value;const pv=c=>parseFloat(c.dataset.price)||Infinity;const arr=[...grid.children];
  arr.forEach(c=>c.style.display=vis.includes(c)?'':'none');
  const sorted=[...vis].sort((x,y)=>s==='plo'?pv(x)-pv(y):s==='phi'?pv(y)-pv(x):s==='az'?x.dataset.name.localeCompare(y.dataset.name):(parseInt(y.dataset.year)||0)-(parseInt(x.dataset.year)||0));
  sorted.forEach(c=>grid.appendChild(c));if(fc)fc.textContent=vis.length+' models';}
 fb.addEventListener('change',apply);fs.addEventListener('change',apply);apply();}
document.addEventListener('DOMContentLoaded',initFilters);
