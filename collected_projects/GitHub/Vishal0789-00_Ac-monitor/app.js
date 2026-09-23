let DATA=[], MAP={}, POS={}, selected=null;
const $=x=>document.getElementById(x);
const norm=x=>String(x??'').trim().toUpperCase();
const deskNum=v=>{const m=String(v??'').match(/(\d{1,3})\s*$/);return m?String(Number(m[1])):null};
const parseDate=v=>{if(v instanceof Date&&!isNaN(v))return v;if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return d?new Date(d.y,d.m-1,d.d):null}const d=new Date(v);return isNaN(d)?null:d};
const month=d=>d?d.toISOString().slice(0,7):'Unknown';
async function init(){const m=await fetch('mapping.json').then(r=>r.json());MAP=m.desk_to_ac;POS=m.ac_positions_percent||{
"4.4.00":[31,23],"4.3.02":[50,10],"4.3.13":[63,16],"4.3.01":[75,21],"4.3.12":[87,31],
"4.3.11":[51,36],"4.2.13":[64,36],"4.2.12":[31,48],"4.2.09":[49,55],"4.2.08":[59,55],
"4.3.07":[71,59],"4.2.07":[88,59],"4.3.08":[32,64],"4.3.10":[15,59],"4.3.04":[14,87],
"4.2.05":[33,87],"4.3.05":[49,87],"4.2.06":[71,87],"4.3.06":[88,87]};fillAC();render()}
function fillAC(){$('acFilter').innerHTML='<option value="ALL">All ACs</option>'+Object.keys(POS).map(a=>`<option>${a}</option>`).join('')}
function findCol(hs,arr){return hs.find(h=>arr.some(p=>norm(h).replace(/[^A-Z0-9]/g,'').includes(p)))}
function ingest(rows){
 if(!rows.length)return alert('The Excel sheet has no data rows.');
 const hs=Object.keys(rows[0]);
 const dc=findCol(hs,['DESK']), fc=findCol(hs,['HOTCOLD','FEELING','TEMPERATURE','TEMP']), dt=findCol(hs,['DATE']), tm=findCol(hs,['TIME']), nm=findCol(hs,['NAME','EMPLOYEE']);
 if(!dc||!dt)return alert('Required columns not found. This dashboard expects: date, time, zone, desk, NAME, HOT/COLD.');
 DATA=rows.map((r,i)=>{const d=deskNum(r[dc]), ac=d?MAP[d]:null, date=parseDate(r[dt]);let f=norm(r[fc]);if(f.includes('HOT'))f='HOT';else if(f.includes('COLD'))f='COLD';return{row:i+2,desk:d,ac,feel:f,date,time:r[tm]??'',name:r[nm]??'',zone:r.zone??''}}).filter(x=>x.desk&&x.date);
 const months=[...new Set(DATA.map(x=>month(x.date)))].sort().reverse();$('monthFilter').innerHTML='<option value="ALL">All</option>'+months.map(x=>`<option>${x}</option>`).join('');
 render();
}
function filtered(){let m=$('monthFilter').value,f=$('feelingFilter').value,a=$('acFilter').value;return DATA.filter(x=>(m==='ALL'||month(x.date)===m)&&(f==='ALL'||x.feel===f)&&(a==='ALL'||x.ac===a))}
function stats(){const rows=filtered(), unm=rows.filter(x=>!x.ac);return{rows,unm}}
function acCounts(rows){const c={};Object.keys(POS).forEach(a=>c[a]={total:0,hot:0,cold:0,desks:{}});rows.filter(x=>x.ac).forEach(x=>{let o=c[x.ac];o.total++;if(x.feel==='HOT')o.hot++;if(x.feel==='COLD')o.cold++;o.desks[x.desk]=(o.desks[x.desk]||0)+1});return c}
function render(){const s=stats(),c=acCounts(s.rows);$('total').textContent=s.rows.length;$('hot').textContent=s.rows.filter(x=>x.feel==='HOT').length;$('cold').textContent=s.rows.filter(x=>x.feel==='COLD').length;$('active').textContent=Object.values(c).filter(o=>o.total).length;$('unmapped').textContent=s.unm.length;
 const w=$('warning');if(s.unm.length){const desks=[...new Set(s.unm.map(x=>x.desk))];w.classList.remove('hidden');w.innerHTML=`<b>${s.unm.length} complaint(s) could not be mapped to an AC.</b> Unmapped desk numbers: ${desks.map(d=>'2A'+String(d).padStart(3,'0')).join(', ')}. Update mapping.json after checking the drawing.`}else{w.classList.add('hidden')}
 $('markers').innerHTML='';Object.entries(POS).forEach(([a,p])=>{const o=c[a],b=document.createElement('button');b.className='marker '+(o.total>=15?'high':o.total>=8?'warn':'');if(selected===a)b.classList.add('selected');b.style.left=p[0]+'%';b.style.top=p[1]+'%';b.innerHTML=`${a}<strong>${o.total}</strong>`;b.onclick=()=>{selected=a;render();detail(a,c)};$('markers').appendChild(b)});
 $('tbody').innerHTML=Object.entries(c).sort((a,b)=>b[1].total-a[1].total).map(([a,o])=>{let t=Object.entries(o.desks).sort((x,y)=>y[1]-x[1])[0];return `<tr><td><b>${a}</b></td><td>${o.total}</td><td>${o.hot}</td><td>${o.cold}</td><td>${Object.keys(o.desks).length}</td><td>${t?t[0]+' ('+t[1]+')':'—'}</td></tr>`}).join('');
 if(selected)detail(selected,c)}
function detail(a,c){const o=c[a],r=filtered().filter(x=>x.ac===a),ds=Object.entries(o.desks).sort((x,y)=>y[1]-x[1]).map(([d,n])=>`<li>2A${String(d).padStart(3,'0')} — <b>${n}</b></li>`).join('');$('detailTitle').textContent=a;$('detail').innerHTML=`<div class="grid"><div>Total<b>${o.total}</b></div><div>Desks<b>${Object.keys(o.desks).length}</b></div><div>Hot<b>${o.hot}</b></div><div>Cold<b>${o.cold}</b></div></div><h3>Affected desks</h3><ol>${ds||'<li>None</li>'}</ol>`}
$('fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];ingest(XLSX.utils.sheet_to_json(ws,{defval:''}))};r.readAsArrayBuffer(f)};
['monthFilter','feelingFilter','acFilter'].forEach(id=>$(id).onchange=render);
$('resetBtn').onclick=()=>{DATA=[];selected=null;$('monthFilter').innerHTML='<option value="ALL">All</option>';render()};
$('exportBtn').onclick=()=>{const r=filtered().map(x=>({Date:x.date?.toISOString().slice(0,10),Time:x.time,Employee:x.name,Desk:'2A'+String(x.desk).padStart(3,'0'),AC:x.ac||'UNMAPPED',Feeling:x.feel}));if(!r.length)return alert('Nothing to export');const ws=XLSX.utils.json_to_sheet(r),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Filtered');XLSX.writeFile(wb,'ac_complaints_filtered.xlsx')};
init();