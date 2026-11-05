/* AimRoutine V14 visual interactions: chapter navigation and sample timeline.
 * No APIs, accounts, persistent storage, or external requests. */
(function () {
  "use strict";
  const chapterLinks=[...document.querySelectorAll(".v14-chapters-links [data-v14-section]")];
  const chapters=chapterLinks.map(link=>({
    link,section:document.getElementById(link.dataset.v14Section)
  })).filter(item=>item.section);
  if(chapters.length){
    let scheduled=false;
    const paint=()=>{
      scheduled=false;
      const header=document.querySelector(".v5-header");
      const rail=document.querySelector(".v14-chapters");
      const cutoff=(header?.offsetHeight||0)+(rail?.offsetHeight||0)+52;
      let current=chapters[0];
      for(const candidate of chapters){
        if(candidate.section.getBoundingClientRect().top<=cutoff){
          current=candidate;
        } else break;
      }
      for(const item of chapters){
        if(item===current)item.link.setAttribute("aria-current","location");
        else item.link.removeAttribute("aria-current");
      }
    };
    const schedule=()=>{
      if(!scheduled){
        scheduled=true;
        window.requestAnimationFrame(paint);
      }
    };
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule,{passive:true});
    window.addEventListener("hashchange",schedule);
    schedule();
  }
  const root=document.getElementById("routine");
  if(!root)return;
  const dur=root.querySelector("[data-exp-duration]");
  const pace=root.querySelector("[data-exp-pace]");
  const total=root.querySelector("[data-v14-allocation]");
  const segments=[...root.querySelectorAll("[data-v14-part]")];
  const track=root.querySelector(".v14-timeline-track");
  if(!dur||!pace||!total||!track||segments.length!==3)return;
  function update(){
    const min=Number(dur.value)||30;
    const isWarmup=pace.value==="warmup";
    const splits=isWarmup?
      (min===15?[3,5,7]:min===30?[7,10,13]:[10,15,20]):
      (min===15?[4,5,6]:min===30?[8,10,12]:[12,15,18]);
    const fr=document.documentElement.lang==="fr";
    const labels=fr?["Exercice 1","Exercice 2","Exercice 3"]:["Drill 1","Drill 2","Drill 3"];
    const readable=splits.map((value,i)=>labels[i]+": "+value+" min").join(", ");
    for(let i=0;i<segments.length;i++){
      segments[i].style.flexGrow=String(splits[i]);
      segments[i].title=labels[i]+": "+splits[i]+" min";
    }
    total.textContent=min+" MIN";
    track.setAttribute("aria-label",(fr?"Répartition fictive de la séance : ":"Fictional session allocation: ")+readable);
  }
  dur.addEventListener("change",update);
  pace.addEventListener("change",update);
  root.querySelector("[data-exp-reset]")?.addEventListener("click",update);
  document.querySelectorAll("[data-switch-lang]").forEach(button=>button.addEventListener("click",update));
  update();
})();