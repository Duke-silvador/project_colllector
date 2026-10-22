(()=>{const h=document.getElementById('hatch-roamer');if(!h)return;
/* Keep the approved Hatch art, but stop translating a static upright pose.
   The gait compresses/rocks the body toward the ground and uses four visible
   contact feet that alternate diagonally, giving Hatch a planted crawl. */
h.innerHTML='<span class="approved-hatch"></span><i class="foot fl"></i><i class="foot fr"></i><i class="foot rl"></i><i class="foot rr"></i>';
const s=document.createElement('style');s.id='hatch-roamer-approved-fix';s.textContent=`
#hatch-roamer{width:138px!important;height:88px!important;background:none!important;filter:drop-shadow(0 5px 5px #0008)!important;transform-origin:50% 62%!important;perspective:220px}
#hatch-roamer .approved-hatch{display:block!important;position:absolute;inset:0;background-image:var(--hatch-mascot)!important;background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;transform-origin:50% 62%}
#hatch-roamer .foot{display:block!important;position:absolute;width:18px;height:7px;border-radius:60%;background:#35552b;opacity:.96;transform-origin:center;z-index:-1}
#hatch-roamer .fl{left:82px;top:20px}.fr{left:82px;top:61px}.rl{left:43px;top:20px}.rr{left:43px;top:61px}
#hatch-roamer.run .approved-hatch{animation:hatchBodyCrawl .30s ease-in-out infinite!important}
#hatch-roamer.run .fl,#hatch-roamer.run .rr{animation:hatchStepA .30s ease-in-out infinite!important}
#hatch-roamer.run .fr,#hatch-roamer.run .rl{animation:hatchStepB .30s ease-in-out infinite!important}
#hatch-roamer.left{transform:scaleX(-1)}
#hatch-roamer.laugh{animation:hatchApprovedRoll .62s ease-out forwards!important}
#hatch-roamer.getup{animation:hatchApprovedGetup .5s ease-in forwards!important}
@keyframes hatchBodyCrawl{0%,100%{transform:perspective(220px) rotateX(57deg) rotateZ(-2deg) translateY(2px)}50%{transform:perspective(220px) rotateX(57deg) rotateZ(2deg) translateY(2px)}}
@keyframes hatchStepA{0%,100%{transform:translate(-7px,3px) rotate(-18deg)}50%{transform:translate(8px,-2px) rotate(18deg)}}
@keyframes hatchStepB{0%,100%{transform:translate(8px,-2px) rotate(18deg)}50%{transform:translate(-7px,3px) rotate(-18deg)}}
@keyframes hatchApprovedRoll{0%{transform:rotate(0deg)}45%{transform:rotate(-90deg)}100%{transform:rotate(-180deg)}}
@keyframes hatchApprovedGetup{from{transform:rotate(-180deg)}to{transform:rotate(-360deg)}}
@media(max-width:600px){#hatch-roamer{width:120px!important;height:78px!important}}
`;document.head.appendChild(s);
})();