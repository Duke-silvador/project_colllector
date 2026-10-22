/* West Hills: build a distinct 4096x2048 equirectangular junction from the
   existing local HD woodland photography. All drawing occurs in the browser;
   this keeps the woodland texture crisp without adding external image requests. */
window.WVLRPBuildWestHills=function(source){
  const width=4096,height=2048;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  // Reverse the background bearing and shift its natural greens to distinguish
  // West Hills from the original Woodland Trail panorama.
  ctx.save();ctx.translate(width,0);ctx.scale(-1,1);
  ctx.filter='saturate(1.13) contrast(1.06) hue-rotate(-6deg)';
  ctx.drawImage(source,0,0,width,height);ctx.restore();ctx.filter='none';
  // Filtered afternoon daylight; opacity is deliberately restrained to keep
  // the background realistic and preserve fine photographic texture.
  const sun=ctx.createRadialGradient(2320,340,120,2320,480,1550);
  sun.addColorStop(0,'rgba(245,223,148,.15)');
  sun.addColorStop(.55,'rgba(207,199,119,.045)');
  sun.addColorStop(1,'rgba(10,31,21,0)');
  ctx.fillStyle=sun;ctx.fillRect(0,0,width,height);
  // Three branching narrow trails, joining under the photographer's feet.
  // Equirectangular positions match the left / straight / right sign bearings.
  function branch(points,colors,seed){
    const poly=new Path2D();
    poly.moveTo(points[0][0]-points[0][2],points[0][1]);
    for(let i=1;i<points.length;i++)poly.lineTo(points[i][0]-points[i][2],points[i][1]);
    for(let i=points.length-1;i>=0;i--)poly.lineTo(points[i][0]+points[i][2],points[i][1]);
    poly.closePath();
    ctx.save();ctx.shadowBlur=24;ctx.shadowColor='rgba(81,64,40,.25)';
    const dirt=ctx.createLinearGradient(0,1050,0,2048);
    dirt.addColorStop(0,colors[0]);dirt.addColorStop(.63,colors[1]);dirt.addColorStop(1,colors[2]);
    ctx.fillStyle=dirt;ctx.fill(poly);ctx.shadowBlur=0;
    ctx.clip(poly);
    let state=seed>>>0;
    function random(){state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296}
    for(let i=0;i<1400;i++){
      const y=1100+random()*950,t=(y-1100)/950;
      let seg=0;while(seg<points.length-2&&y>points[seg+1][1])seg++;
      const q=Math.max(0,Math.min(1,(y-points[seg][1])/(points[seg+1][1]-points[seg][1])));
      const x=points[seg][0]+(points[seg+1][0]-points[seg][0])*q;
      const spread=points[seg][2]+(points[seg+1][2]-points[seg][2])*q;
      const px=x+(random()*2-1)*spread,rr=.5+random()*(1+t*3.5);
      ctx.beginPath();ctx.ellipse(px,y,rr*(.7+random()),rr*.35*(.6+random()),random()*3,0,Math.PI*2);
      ctx.fillStyle=random()<.51?'rgba(54,48,32,.32)':random()<.7?'rgba(241,213,143,.25)':'rgba(89,72,46,.28)';ctx.fill();
    }
    // A few narrow furrows and scuffed edges imply use without looking paved.
    for(let k=0;k<12;k++){
      const y=1180+random()*800,x=points[0][0]+(points[points.length-1][0]-points[0][0])*(y-1100)/940;
      ctx.strokeStyle='rgba(64,49,30,.075)';ctx.lineWidth=1+random()*3;
      ctx.beginPath();ctx.moveTo(x-160,y);ctx.lineTo(x+160,y+12);ctx.stroke();
    }
    ctx.restore();
  }
  // Trail branches exist in the lower hemisphere of the 360 image. The
  // center route climbs West Hills; right curves toward Stacey Lake.
  branch([[1710,1115,32],[1800,1360,86],[1940,1630,144],[2050,2048,235]],
    ['rgba(141,117,77,.31)','rgba(145,118,75,.49)','rgba(132,108,77,.60)'],101);
  branch([[2050,1065,33],[2046,1380,92],[2050,1720,146],[2050,2048,237]],
    ['rgba(140,117,83,.33)','rgba(156,130,86,.48)','rgba(131,108,72,.62)'],202);
  branch([[2380,1115,29],[2310,1410,86],[2170,1650,142],[2050,2048,235]],
    ['rgba(146,115,78,.34)','rgba(153,124,82,.48)','rgba(135,107,72,.59)'],303);
  return canvas;
};
