/* A quiet foraging cycle with quick pecks and longer alert pauses. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const beats=[
    [0,.28],[1,.10],[2,.09],[3,.08],[4,.07],[5,.08],[6,.13],
    [5,.08],[4,.07],[3,.08],[2,.09],[1,.11],[0,.22],
    [1,.09],[2,.08],[3,.08],[4,.07],[5,.08],[6,.16],
    [7,.11],[8,.13],[9,.18],[10,.55],[11,.75],
    [12,.85],[13,.70],[14,.35],[15,.25]
  ];
  const length=beats.reduce((sum,beat)=>sum+beat[1],0);
  window.WVLRPHen={pose(seconds){
    if(reduced.matches)return [10,10,0];
    let phase=seconds%length;
    for(let i=0;i<beats.length;i++){
      const [frame,duration]=beats[i];
      if(phase<duration){
        const next=beats[(i+1)%beats.length][0];
        const t=phase/duration;
        return [frame,next,t*t*(3-2*t)];
      }
      phase-=duration;
    }
    return [0,0,0];
  }};
})();
