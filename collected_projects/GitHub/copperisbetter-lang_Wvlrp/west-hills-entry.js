/* Entry sign fixed to the West Hills side path beside the deer.
   Anchored to a spherical bearing, not the visitor's screen. */
(()=>{
  if(document.getElementById('westHillsEntry'))return;
  const style=document.createElement('style');
  style.textContent=`
  #westHillsEntry{
   position:fixed;z-index:16;display:flex;justify-content:center;align-items:center;
   min-width:110px;min-height:40px;transform:translate(-50%,-50%);
   box-sizing:border-box;padding:7px 21px 7px 12px;
   color:#eddfc4;text-align:center;text-decoration:none;letter-spacing:.04em;
   font:700 16px/1 Georgia,serif;text-shadow:0 1px 2px #120a06;
   background:repeating-linear-gradient(177deg,transparent 0 5px,#160e0929 6px 8px,transparent 9px 13px),
   linear-gradient(#81613f,#624529 55%,#4b331c);
   border:2px solid #302012;border-radius:2px 10px 10px 2px;
   box-shadow:inset 0 1px #d8af7759,inset 0 -4px 5px #24160b88,0 6px 8px #030806a6;
   cursor:pointer;white-space:nowrap;touch-action:manipulation;
  }
  #westHillsEntry:before{content:"";position:absolute;width:11px;height:75px;top:calc(100% - 1px);
    left:48%;background:repeating-linear-gradient(90deg,#392719 0 2px,#795638 3px 5px,#483019 7px 11px);
    border:1px solid #28180c;box-shadow:3px 3px 4px #0006;pointer-events:none}
  #westHillsEntry:after{content:"→";position:absolute;right:5px;font:700 22px Georgia,serif;color:#efdca9}
  #westHillsEntry:focus-visible{outline:3px solid #ffdf94;outline-offset:4px}
  #westHillsEntry[hidden]{display:none!important}
  @media(max-width:600px){#westHillsEntry{font-size:13px}}
  `;
  document.head.appendChild(style);
  const a=document.createElement('a');a.id='westHillsEntry';a.href='west-hills.html?v=20261007-community-route';
  a.setAttribute('aria-label','Follow the West Hills sign to the three-way forest junction');
  a.textContent='WEST HILLS';a.title='Follow the West Hills trail';
  document.body.appendChild(a);
  const u=.522,v=.505;
  function place(){
    const view=window.WVLRP_QUEST_VIEW?.();
    if(view){
      const {yaw,pitch,fov}=view,lat=(.5-v)*Math.PI,delta=u*Math.PI*2-yaw;
      const x=Math.cos(lat)*Math.sin(delta),wy=Math.sin(lat),wz=Math.cos(lat)*Math.cos(delta);
      const y=wy*Math.cos(pitch)-wz*Math.sin(pitch),z=wy*Math.sin(pitch)+wz*Math.cos(pitch);
      const focal=innerHeight/(2*Math.tan(fov/2));
      const sx=innerWidth/2+focal*x/Math.max(z,.001),sy=innerHeight/2-focal*y/Math.max(z,.001);
      const w=Math.min(300,Math.max(110,focal*.28/Math.max(z,.2)));
      a.hidden=z<.22||sx< -w||sx>innerWidth+w||sy< -80||sy>innerHeight+90;
      if(!a.hidden){a.style.left=sx+'px';a.style.top=sy+'px';a.style.width=w+'px';a.style.height=Math.max(42,w*.29)+'px';}
    }
    requestAnimationFrame(place);
  }
  a.addEventListener('click',e=>{
    if(e.button!==0||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;
    if(window.WVLRPTravel?.busy){e.preventDefault();return}
    if(!window.WVLRPTravel?.go||!window.WVLRP_QUEST_VIEW)return;
    e.preventDefault();let state=window.WVLRP_QUEST_VIEW();
    window.WVLRPTravel.go({url:'west-hills.html?v=20261007-community-route',from:state,
      to:{yaw:u*2*Math.PI,pitch:(.5-v)*Math.PI,fov:Math.max(.65,state.fov*.78)},
      render:next=>window.WVLRP_SET_VIEW?.(next)});
  });
  requestAnimationFrame(place);
})();
