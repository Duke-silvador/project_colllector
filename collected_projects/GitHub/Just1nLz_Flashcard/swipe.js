export function isNextCardSwipe(dx,dy,duration){
 return [dx,dy,duration].every(Number.isFinite)&&dx<=-72&&Math.abs(dx)>=Math.abs(dy)*1.5&&duration>=0&&duration<=1600;
}
export function installLearnSwipe(element,{canAdvance,getToken,onNext}){
 let gesture=null,suppressClick=false;
 function reset(){
  gesture=null;element.style.removeProperty('--swipe-offset');element.classList.remove('swipe-preview');
 }
 function down(event){
  suppressClick=false;
  if(!element.contains(event.target)){reset();return;}
  if(event.isPrimary===false){reset();return;}
  if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
  if(event.clientX<24||event.clientX>window.innerWidth-24)return;
  if(event.target.closest('input,textarea,select,a,summary,[data-no-swipe],button:not(.learn-option)'))return;
  reset();gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp,enabled:canAdvance(),token:getToken(),horizontal:false,option:event.target.closest('button.learn-option')};
 }
 function move(event){
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.horizontal&&Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){reset();return;}
  if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(dy)*1.5){
   gesture.horizontal=true;suppressClick=true;
   if(gesture.enabled&&canAdvance()){
    element.classList.add('swipe-preview');element.style.setProperty('--swipe-offset',`${Math.max(-55,Math.min(0,dx*.35))}px`);
   }
  }
 }
 function up(event){
  if(!gesture||event.pointerId!==gesture.id)return;
  const start=gesture,dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(dy)*1.5)suppressClick=true;
  const advance=start.enabled&&canAdvance()&&start.token===getToken()&&isNextCardSwipe(dx,dy,event.timeStamp-start.time);
  const tap=start.option&&!start.enabled&&!canAdvance()&&start.token===getToken()&&Math.abs(dx)<10&&Math.abs(dy)<10&&event.timeStamp-start.time<700&&start.option.isConnected&&!start.option.disabled;
  reset();
  if(advance)onNext();
  else if(tap){
   // Activate taps directly: mobile browsers can suppress the compatibility
   // click after a preceding drag. Block its later native duplicate instead.
   suppressClick=true;start.option.click();
  }
 }
 function cancel(event){if(gesture&&event.pointerId===gesture.id)reset();}
 function click(event){if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}}
 document.addEventListener('pointerdown',down,true);
 document.addEventListener('pointermove',move,{capture:true,passive:true});
 document.addEventListener('pointerup',up,true);
 document.addEventListener('pointercancel',cancel,true);
 document.addEventListener('click',click,true);
 return {reset,destroy(){reset();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('click',click,true);}};
}
