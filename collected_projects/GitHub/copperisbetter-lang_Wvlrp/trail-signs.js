/* Photo-textured wayfinding shared by added trail signs. */
(()=>{
const style=document.createElement('style');
style.textContent=`
.wooden-wayfinding,#westHillsEntry{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;color:transparent!important;text-shadow:none!important;padding:0!important;min-width:0!important;max-width:none!important;max-height:none!important;overflow:visible!important}
.wooden-wayfinding:before,.wooden-wayfinding:after,#westHillsEntry:before,#westHillsEntry:after{display:none!important}
.wvlrp-trail-art{position:absolute;left:0;top:50%;transform:translateY(-34%);width:100%;height:auto;pointer-events:none;filter:drop-shadow(2px 4px 2px #0005)}
.wooden-wayfinding:focus-visible,#westHillsEntry:focus-visible{outline:3px solid #ffdf94!important;outline-offset:4px}
`;document.head.append(style);
const source=new Image();let art;
function paint(target){
 if(target.querySelector('.wvlrp-trail-art'))return;
 const img=document.createElement('img');img.className='wvlrp-trail-art';img.alt='';img.draggable=false;img.src=target.id==='westHillsEntry'?art.right:art.ahead;target.append(img);
}
fetch('assets/trail-sign-blank-v1.b64').then(r=>{if(!r.ok)throw Error('Trail sign unavailable');return r.text()}).then(b=>source.src='data:image/webp;base64,'+b.trim()).catch(console.error);
source.onload=()=>{
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(source.width*.085)+'px Georgia,serif';
 ctx.fillStyle='#eadab2';ctx.shadowColor='#1c1009';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
 ctx.fillText('West Hills',source.width*.5,source.height*.34,source.width*.67);
 ctx.font='bold '+Math.round(source.width*.08)+'px Georgia,serif';
 ctx.fillText('↑',source.width*.85,source.height*.34);
 const ahead=canvas.toDataURL('image/webp',.94);
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.drawImage(source,0,0);ctx.shadowBlur=2;ctx.shadowOffsetY=2;
 ctx.font='bold '+Math.round(source.width*.085)+'px Georgia,serif';ctx.fillText('West Hills',source.width*.5,source.height*.34,source.width*.67);
 ctx.font='bold '+Math.round(source.width*.08)+'px Georgia,serif';ctx.fillText('→',source.width*.85,source.height*.34);
 art={ahead,right:canvas.toDataURL('image/webp',.94)};scan();
};
function scan(){if(art)document.querySelectorAll('.wooden-wayfinding,#westHillsEntry').forEach(paint)}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();