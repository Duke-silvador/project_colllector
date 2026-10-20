// ATEA Parfums, logika tampilan. Data produk & keranjang datang dari PHP (database MySQL).
const A = window.ATEA;
const products = A.products || [];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rupiah = n => "Rp " + new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);
const page = document.body.dataset.page || "";

// gambar sementara bila produk belum punya foto (kolom produk.gambar kosong)
const fallbackBottle = (name, index) => {
 const colors = ["#e5c4b0","#c3b1d0","#d4ad75","#9bb7b0","#c5a2a2","#7f8c9a","#d9b2c0","#c9c5a7","#b8a18c"];
 const c = colors[(index-1)%colors.length];
 const safeName = name.replace(/[<>&"]/g,"");
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient><linearGradient id="gold"><stop stop-color="#8c623b"/><stop offset=".5" stop-color="#f7df9b"/><stop offset="1" stop-color="#9a6b35"/></linearGradient></defs><ellipse cx="250" cy="555" rx="130" ry="18" fill="#b9aaa0" opacity=".22"/><rect x="205" y="65" width="90" height="75" rx="8" fill="url(#gold)"/><rect x="185" y="128" width="130" height="30" rx="8" fill="url(#gold)"/><path d="M135 185 Q135 160 165 160 H335 Q365 160 365 185 L390 460 Q392 510 345 520 H155 Q108 510 110 460Z" fill="url(#g)" stroke="#c5a88d" stroke-width="5"/><path d="M150 190 H350 L370 455 Q372 490 340 495 H160 Q128 490 130 455Z" fill="${c}" opacity=".18"/><rect x="155" y="285" width="190" height="105" rx="2" fill="#f7f0e5" opacity=".8"/><text x="250" y="335" text-anchor="middle" font-family="Georgia,serif" font-size="${safeName.length>8?26:34}" fill="#35251d">${safeName.toUpperCase()}</text><text x="250" y="360" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="2" fill="#72543a">ATEA PARFUMS</text><path d="M145 195 Q150 178 170 178 M355 195 Q350 178 330 178" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/></svg>`;
 return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};
const fallbackBox = (name,index) => {
 const colors=["#e5c4b0","#c3b1d0","#d4ad75","#9bb7b0","#c5a2a2","#7f8c9a","#d9b2c0","#c9c5a7","#b8a18c"];
 const c=colors[(index-1)%colors.length], safeName=name.replace(/[<>&"]/g,"");
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620"><defs><linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f7e6d5"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><ellipse cx="250" cy="555" rx="170" ry="17" fill="#b9aaa0" opacity=".2"/><path d="M85 105 L350 65 L420 105 L420 495 L155 535 L85 495Z" fill="${c}" stroke="#b89b7e" stroke-width="3"/><path d="M85 105 L350 65 L350 455 L85 495Z" fill="url(#box)" stroke="#c5a88d" stroke-width="2"/><path d="M350 65 L420 105 L420 495 L350 455Z" fill="#9d7760" opacity=".5"/><rect x="110" y="135" width="215" height="290" fill="none" stroke="#b38b56" stroke-width="2"/><text x="217" y="220" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#8b6239">A</text><text x="217" y="275" text-anchor="middle" font-family="Georgia,serif" font-size="${safeName.length>8?23:30}" fill="#6d492b">${safeName.toUpperCase()}</text><text x="217" y="300" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-style="italic" fill="#8b6239">Parfums</text><text x="217" y="370" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="#72543a">EAU DE PARFUM</text></svg>`;
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
};

const bottleSrc = p => p.image || fallbackBottle(p.name,p.id);
const boxSrc = p => p.box || fallbackBox(p.name,p.id);
const minPrice = p => Math.min(...p.variants.map(v=>v.price));
const sizesLabel = p => p.variants.map(v=>v.size).join(" / ") + " ML";
const snippet = (t,n=90) => { t=(t||"").trim(); return t.length>n ? t.slice(0,n).replace(/\s+\S*$/,"")+"…" : t; };

let toastTimer;
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800);}

async function api(path, body){
 const opt = {credentials:"same-origin", headers:{"X-CSRF-Token":A.csrf}};
 if(body){ opt.method="POST"; opt.headers["Content-Type"]="application/json"; opt.body=JSON.stringify(body); }
 const res = await fetch(A.base+path, opt);
 let data = {}; try{ data = await res.json(); }catch(e){}
 if(!res.ok && !data.error) data.error = "Terjadi kesalahan ("+res.status+").";
 data._status = res.status;
 return data;
}

// ===== KERANJANG (tersimpan di tabel carts / cart_items) =====
let cart = {items:[],total:0,count:0};
function renderCart(){
 $("bagCount").textContent = cart.count; $("bottomBagCount").textContent = cart.count;
 $("bagCount").style.display = cart.count ? "grid" : "none";
 const body = $("cartBody");
 $("cartFoot").hidden = !(A.user && cart.items.length);
 if(!A.user){
  body.innerHTML = `<div class="cart-empty"><p>Login dulu untuk menyimpan dan melihat keranjangmu.</p><a class="outline-link" href="${esc(A.loginUrl)}">LOGIN <span>↗</span></a></div>`;
  return;
 }
 if(!cart.items.length){
  body.innerHTML = `<div class="cart-empty"><p>Keranjang kamu masih kosong.</p><a class="outline-link" href="${esc(A.lineupUrl)}">LIHAT KOLEKSI <span>↗</span></a></div>`;
  return;
 }
 body.innerHTML = cart.items.map(it=>`<div class="cart-item">
   <img src="${esc(it.image || fallbackBottle(it.name,it.variant))}" alt="${esc(it.name)}">
   <div class="cart-item-info">
    <h3>${esc(it.name.toUpperCase())}</h3>
    <span class="cart-item-size">${it.size} ML · ${esc(it.type)}</span>
    <strong>${rupiah(it.price)}</strong>
    <div class="cart-item-row">
     <div class="qty" aria-label="Jumlah">
      <button data-act="dec" data-id="${it.id}" aria-label="Kurangi">−</button><span>${it.qty}</span><button data-act="inc" data-id="${it.id}" aria-label="Tambah">+</button>
     </div>
     <button class="remove-link" data-act="rm" data-id="${it.id}">Remove</button>
    </div>
   </div>
  </div>`).join("");
 $("checkoutTotal").textContent = rupiah(cart.total);
}
async function loadCart(){
 if(!A.user){ cart={items:[],total:0,count:0}; renderCart(); return; }
 const d = await api("api/cart.php");
 if(d.items) cart = d;
 renderCart();
}
async function cartAction(body){
 const d = await api("api/cart.php", body);
 if(d.error && d._status!==200){ showToast(d.error); if(d.items) {cart=d;renderCart();} return false; }
 cart = d; renderCart(); return true;
}
$("cartBody").addEventListener("click",async e=>{
 const b = e.target.closest("button[data-act]"); if(!b) return;
 const id = Number(b.dataset.id), it = cart.items.find(x=>x.id===id); if(!it) return;
 if(b.dataset.act==="inc"){ if(it.qty>=it.stock){ showToast("Stok tersisa "+it.stock+"."); return; } await cartAction({action:"update",id,qty:it.qty+1}); }
 if(b.dataset.act==="dec") await cartAction(it.qty<=1 ? {action:"remove",id} : {action:"update",id,qty:it.qty-1});
 if(b.dataset.act==="rm") await cartAction({action:"remove",id});
});
function openCart(){ $("cartDrawer").classList.add("open"); $("drawerOverlay").classList.add("open"); $("cartDrawer").setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; loadCart(); }
function closeCart(){ $("cartDrawer").classList.remove("open"); $("drawerOverlay").classList.remove("open"); $("cartDrawer").setAttribute("aria-hidden","true"); if(!$("productModal").classList.contains("open")) document.body.style.overflow=""; }
$("cartClose").addEventListener("click",closeCart);
$("drawerOverlay").addEventListener("click",closeCart);
$("bagButton").addEventListener("click",openCart);
$("bottomBag").addEventListener("click",openCart);

// ===== KARTU PRODUK =====
const modal = $("productModal");
let activeProduct = null, activeVariant = null;
function cardHTML(p){
 return `<article class="product-card" tabindex="0" role="button" aria-label="Lihat detail ${esc(p.name)}" data-id="${p.id}">
 <div class="product-image"><img class="bottle-image" src="${esc(bottleSrc(p))}" alt="${esc(p.name)} perfume bottle" loading="lazy"><img class="box-image" src="${esc(boxSrc(p))}" alt="${esc(p.name)} perfume with box" loading="lazy"><span class="quick-view">DISCOVER FRAGRANCE ↗</span></div>
 <div class="product-meta"><div><h3 class="product-name">${esc(p.name)}</h3><span class="product-type">${esc(p.type.toUpperCase())} · ${sizesLabel(p)}</span></div><span class="product-price"><small>From</small> ${rupiah(minPrice(p))}</span></div>
 <p class="product-description">${esc(snippet(p.desc))}</p></article>`;
}
function bindCards(root){
 root.querySelectorAll(".product-card").forEach(card=>{
  const open=()=>openProduct(Number(card.dataset.id));
  card.addEventListener("click",open);
  card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
 });
}
function renderLineup(){
 const grid=$("productGrid"); if(!grid) return;
 const query=($("searchInput").value||"").trim().toLowerCase();
 const sort=$("sortSelect").value;
 let list=products.filter(p=>(p.name+" "+p.desc+" "+p.type+" "+p.category).toLowerCase().includes(query));
 if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));
 if(sort==="za")list.sort((a,b)=>b.name.localeCompare(a.name));
 if(sort==="price-low")list.sort((a,b)=>minPrice(a)-minPrice(b));
 if(sort==="price-high")list.sort((a,b)=>minPrice(b)-minPrice(a));
 if(sort==="featured")list.sort((a,b)=>a.id-b.id);
 $("resultCount").textContent=`${list.length} FRAGRANCE${list.length===1?"":"S"}`;
 $("emptyState").hidden=!!list.length;
 grid.innerHTML=list.map(cardHTML).join("");
 bindCards(grid);
}

// ===== DETAIL PRODUK: ukuran, harga, stok, review =====
function renderSize(){
 const p=activeProduct, v=activeVariant;
 $("sizeOptions").innerHTML=p.variants.map(x=>`<button type="button" role="radio" aria-checked="${x.id===v.id}" class="size-btn ${x.id===v.id?"active":""}" data-id="${x.id}" ${x.stock<1?"disabled":""}><b>${x.size} ML</b><span>${x.stock<1?"Habis":rupiah(x.price)}</span></button>`).join("");
 $("detailPrice").textContent=rupiah(v.price);
 $("stockNote").textContent = v.stock<1 ? "Stok habis." : (v.stock<=5 ? `Sisa ${v.stock} item.` : "");
 $("addToBag").disabled = v.stock<1;
}
$("sizeOptions").addEventListener("click",e=>{
 const b=e.target.closest(".size-btn"); if(!b||b.disabled) return;
 activeVariant=activeProduct.variants.find(x=>x.id===Number(b.dataset.id)); renderSize();
});
const stars = n => "★".repeat(n)+"☆".repeat(5-n);
function renderRating(p){
 $("detailRating").textContent = p.rating.count ? `★ ${p.rating.avg} · ${p.rating.count} review` : "Belum ada review";
}
async function loadReviews(p){
 const list=$("reviewList"); list.innerHTML='<p class="muted">Memuat…</p>';
 const d = await api("api/review.php?produk="+p.id);
 if(activeProduct!==p) return;
 list.innerHTML = (d.reviews&&d.reviews.length) ? d.reviews.map(r=>`<div class="review"><b>${esc(r.name)}</b> <span class="stars">${stars(r.rating)}</span> <small>${esc(r.date)}</small>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("") : '<p class="muted">Jadilah yang pertama menulis review.</p>';
 if(d.mine){ $("reviewRating").value=d.mine.rating; $("reviewText").value=d.mine.komentar||""; }
}
function openProduct(id){
 activeProduct=products.find(p=>p.id===id); if(!activeProduct) return;
 const p=activeProduct;
 activeVariant = p.variants.find(v=>v.size===100&&v.stock>0) || p.variants.find(v=>v.stock>0) || p.variants[p.variants.length-1];
 $("detailName").textContent=p.name; $("detailType").textContent=(p.type+" · "+p.category).toUpperCase();
 $("detailDescription").textContent=p.desc;
 $("detailTop").textContent=p.notes.top.join(", ")||"-"; $("detailMiddle").textContent=p.notes.middle.join(", ")||"-"; $("detailBase").textContent=p.notes.base.join(", ")||"-";
 renderRating(p); renderSize();
 const image=$("detailImage"); image.src=bottleSrc(p); image.alt=`${p.name} perfume`;
 $("detailThumbs").innerHTML=[{src:bottleSrc(p),alt:"Bottle"},{src:boxSrc(p),alt:"Bottle and box"}]
  .map((t,i)=>`<button class="detail-thumb ${i===0?"active":""}" data-src="${esc(t.src)}" aria-label="Lihat ${t.alt}"><img src="${esc(t.src)}" alt=""></button>`).join("");
 document.querySelectorAll(".detail-thumb").forEach(btn=>btn.addEventListener("click",()=>{
  image.src=btn.dataset.src;
  document.querySelectorAll(".detail-thumb").forEach(b=>b.classList.toggle("active",b===btn));
 }));
 $("reviewForm").hidden=!A.user; $("reviewLogin").hidden=!!A.user;
 $("reviewForm").reset(); loadReviews(p);
 modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
 modal.querySelector(".product-detail").scrollTop=0;
}
function closeProduct(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");if(!$("cartDrawer").classList.contains("open"))document.body.style.overflow="";}
$("addToBag").addEventListener("click",async()=>{
 if(!A.user){ showToast("Login dulu untuk menambah ke keranjang."); setTimeout(()=>location.href=A.loginUrl,700); return; }
 const btn=$("addToBag"); btn.disabled=true;
 const ok = await cartAction({action:"add",variant:activeVariant.id,qty:1});
 btn.disabled=false;
 if(ok){ closeProduct(); openCart(); }
});
$("reviewForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const d = await api("api/review.php",{produk:activeProduct.id,rating:Number($("reviewRating").value),komentar:$("reviewText").value});
 if(d.error){ showToast(d.error); return; }
 showToast("Terima kasih, review kamu tersimpan. Muat ulang halaman untuk melihat rata-rata terbaru.");
 loadReviews(activeProduct);
});
$("modalClose").addEventListener("click",closeProduct);
modal.addEventListener("click",e=>{if(e.target===modal)closeProduct();});

// ===== PENCARIAN, MENU, AKUN =====
function toggleSearch(){const panel=$("searchPanel");panel.classList.toggle("open");if(panel.classList.contains("open"))$("searchInput").focus();}
$("searchToggle").addEventListener("click",toggleSearch);
$("bottomSearch").addEventListener("click",()=>{if(!$("searchPanel").classList.contains("open"))toggleSearch();window.scrollTo({top:0,behavior:"smooth"});});
$("closeSearch").addEventListener("click",()=>$("searchPanel").classList.remove("open"));
$("searchPanel").addEventListener("submit",e=>{
 e.preventDefault();
 if(page!=="lineup") location.href=A.lineupUrl+"?q="+encodeURIComponent($("searchInput").value.trim());
});
$("searchInput").addEventListener("input",()=>{ if(page==="lineup") renderLineup(); });
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeProduct();closeCart();$("navLeft").classList.remove("open");const m=$("accountMenu");if(m)m.classList.remove("open");}});
$("mobileMenu").addEventListener("click",()=>$("navLeft").classList.toggle("open"));
const accBtn=$("accountBtn");
if(accBtn){
 accBtn.addEventListener("click",e=>{e.stopPropagation();const m=$("accountMenu");const o=m.classList.toggle("open");accBtn.setAttribute("aria-expanded",o);});
 document.addEventListener("click",e=>{const m=$("accountMenu");if(m&&!m.contains(e.target))m.classList.remove("open");});
}
$("newsletterForm").addEventListener("submit",e=>{e.preventDefault();$("newsletterMessage").textContent="Terima kasih! Form ini masih demo.";e.target.reset();});

// ===== INISIALISASI =====
if(page==="lineup"){
 const q=new URLSearchParams(location.search).get("q");
 if(q){ $("searchInput").value=q; $("searchPanel").classList.add("open"); }
 $("sortSelect").addEventListener("change",renderLineup);
 renderLineup();
}
if(page==="home"){
 const fg=$("featuredGrid");
 fg.innerHTML=products.slice(0,4).map(cardHTML).join(""); bindCards(fg);
}
loadCart();
if(new URLSearchParams(location.search).get("cart")==="1") openCart();
