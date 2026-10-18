(()=>{"use strict";
if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const init=()=>{
 const header=$("header");if(header)header.classList.add("motion-intro-header");
 const intro=$(".product-detail-root,main>section,main .page-main,main .section-wrap,.checkout-state");if(intro)intro.classList.add("motion-intro-section");
 const items=$$("main section,main article,main h1,main h2,main .store-section-head,main .store-box-card,main .calm-product-card,main .product-card,main .faq-list details,main .store-faq-grid details,main .store-closing-band,main .store-accordion-list details,main .checkout-state").filter(e=>!e.closest(".product-detail-root")&&!e.classList.contains("motion-intro-section"));
 const groups=new Map;
 items.forEach(e=>{if(e.getBoundingClientRect().top<innerHeight*.82)return;const p=e.parentElement,n=groups.get(p)||0;groups.set(p,n+1);e.style.transitionDelay=Math.min(n,4)*60+"ms";e.classList.add("motion-reveal")});
 let sticky=null,mainBuy=null;
 const io=new IntersectionObserver(entries=>entries.forEach(x=>{
  const e=x.target;if(e.classList.contains("motion-observe-buy")){if(sticky){const r=e.getBoundingClientRect();sticky.classList.toggle("is-visible",r.bottom<=0||r.top>=innerHeight)}return}
  if(!x.isIntersecting)return;e.style.willChange="transform,opacity";e.classList.add("is-visible");io.unobserve(e);
  e.addEventListener("transitionend",()=>{e.style.willChange="";e.style.transitionDelay=""},{once:true})
 }),{rootMargin:"0px 0px 160px 0px",threshold:.01});
 $$(".motion-reveal").forEach(e=>io.observe(e));
 const setupSticky=()=>{if(sticky||!matchMedia("(max-width:760px)").matches)return;mainBuy=$(".detail-add-cart");if(!mainBuy||mainBuy.disabled||/unavailable|sold out/i.test(mainBuy.textContent))return;sticky=document.createElement("button");sticky.type="button";sticky.className="motion-sticky-add";sticky.textContent="Add to bag";sticky.setAttribute("aria-label","Add product to bag");document.body.append(sticky);sticky.addEventListener("click",()=>mainBuy.click());mainBuy.classList.add("motion-observe-buy");io.observe(mainBuy)};
 setupSticky();
 let raf=0;const syncScroll=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=$(".store-global-header,header");if(h)h.classList.toggle("motion-scrolled",scrollY>8);if(sticky&&mainBuy){const r=mainBuy.getBoundingClientRect();sticky.classList.toggle("is-visible",r.bottom<=0||r.top>=innerHeight)}})};addEventListener("scroll",syncScroll,{passive:true});syncScroll();
 document.addEventListener("click",e=>{const add=e.target.closest("[data-add],.detail-add-cart");if(add){add.classList.add("is-added");setTimeout(()=>add.classList.remove("is-added"),1200)}const thumb=e.target.closest("[data-gallery-index]");if(thumb){const img=$("#detailMainImage,.detail-photo img");if(img){img.classList.remove("motion-image-change");requestAnimationFrame(()=>img.classList.add("motion-image-change"));setTimeout(()=>img.classList.remove("motion-image-change"),220)} }});
 const pulse=el=>{el.classList.remove("motion-pulse");requestAnimationFrame(()=>el.classList.add("motion-pulse"));el.addEventListener("animationend",()=>el.classList.remove("motion-pulse"),{once:true})};
 const countObserver=new MutationObserver(ms=>{ms.forEach(m=>{const n=m.target.nodeType===3?m.target.parentElement:m.target,el=n?.closest?.("[data-bag-count],[data-drawer-count]");if(el)pulse(el)});setupSticky();syncScroll()});
 countObserver.observe(document.body,{childList:true,characterData:true,subtree:true});
 addEventListener("resize",setupSticky,{passive:true});
 const grid=$("#productGrid");if(grid){const loading=()=>grid.classList.toggle("motion-loading",/^loading(?: products)?…?$/i.test(grid.textContent.trim()));new MutationObserver(loading).observe(grid,{childList:true,subtree:true,characterData:true});loading()}
 $$("details").forEach(d=>{const s=$("summary",d);if(!s||s.querySelector(".motion-plus"))return;const icon=document.createElement("span");icon.className="motion-plus";icon.setAttribute("aria-hidden","true");s.append(icon)});
 document.documentElement.classList.add("js-motion");
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();