const SUPABASE_URL="https://twfbmjwwqzxdxvclxbun.supabase.co";
const $=id=>document.getElementById(id);
let key=null,token=null,tenantId=null,master=[],selections=new Map(),selected=new Set(),categoryFilter="",branchFilter="",manufacturerFilter="",searchTerm="",page=1;
const pageSize=100;

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c))}
function msg(t,type=""){const e=$("message");if(e){e.textContent=t||"";e.className="message "+type}}
async function api(path,options={}){
 const h=new Headers(options.headers||{});h.set("apikey",key);h.set("Authorization","Bearer "+token);
 if(options.body)h.set("Content-Type","application/json");
 const r=await fetch(SUPABASE_URL+path,{...options,headers:h});
 const text=await r.text();let b=null;try{b=text?JSON.parse(text):null}catch{b=text}
 if(!r.ok)throw Error(b?.message||b?.msg||b?.error||text||("HTTP "+r.status));
 return b;
}
async function init(){
 try{
  const auth=await window.tradeflowSubscriberAuthReady;
  if(!auth?.session?.access_token||!auth.tenantId)throw Error("Subscriber sign-in required.");
  key=auth.key;token=auth.session.access_token;tenantId=auth.tenantId;
  $("business-name").textContent=auth.tenants?.[tenantId]||"Catalogue & Categories";
  await loadMaster();
 }catch(e){msg(e.message||String(e),"error");$("catalogue-status").textContent="Catalogue unavailable";$("catalogue-status").classList.add("pill")}
}
async function loadMaster(){
 msg("Loading the TradeFlow master catalogue…");
 const rows=await api("/rest/v1/rpc/get_master_catalogue_for_selection",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId})});
 master=Array.isArray(rows)?rows:[];
 const current=await api("/rest/v1/tenant_catalogue_selections?select=master_product_id,buying_enabled,selling_enabled,active&tenant_id=eq."+encodeURIComponent(tenantId));
 selections=new Map((current||[]).map(x=>[x.master_product_id,x]));
 populateFilters();
 $("catalogue-status").textContent=master.length+" master products available";
 $("catalogue-status").classList.add("live");
 renderCategories();renderBranches();renderProducts();
 msg("Catalogue loaded. Select products to activate them for your business.","success");
}
function categories(){
 const map=new Map();
 master.forEach(p=>{if(!map.has(p.category_id))map.set(p.category_id,{id:p.category_id,name:p.category_name,count:0});map.get(p.category_id).count++});
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function branches(){
 const map=new Map();
 master.filter(p=>!categoryFilter||p.category_id===categoryFilter).forEach(p=>{if(p.branch_id&&!map.has(p.branch_id))map.set(p.branch_id,{id:p.branch_id,name:p.branch_name,count:0});if(p.branch_id)map.get(p.branch_id).count++});
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function manufacturers(){
 const map=new Map();
 master.filter(p=>!categoryFilter||p.category_id===categoryFilter).filter(p=>!branchFilter||p.branch_id===branchFilter).forEach(p=>map.set(p.manufacturer_id,{id:p.manufacturer_id,name:p.manufacturer_name}));
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function populateFilters(){
 $("category-filter").innerHTML='<option value="">All categories</option>'+categories().map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+" ("+c.count+")</option>").join("");
 populateBranchFilter();populateManufacturerFilter();
}
function populateBranchFilter(){
 const valid=branches();
 if(branchFilter&&!valid.some(b=>b.id===branchFilter))branchFilter="";
 $("branch-filter").innerHTML='<option value="">All branches</option>'+valid.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.name)+" ("+b.count+")</option>").join("");
 $("branch-filter").value=branchFilter;
}
function populateManufacturerFilter(){
 const valid=manufacturers();
 if(manufacturerFilter&&!valid.some(m=>m.id===manufacturerFilter))manufacturerFilter="";
 $("manufacturer-filter").innerHTML='<option value="">All manufacturers</option>'+valid.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+"</option>").join("");
 $("manufacturer-filter").value=manufacturerFilter;
}
function renderCategories(){
 const box=$("category-list");const cats=categories();
 box.innerHTML='<div class="cat-item '+(!categoryFilter?"active":"")+'"><button data-cat=""><div class="cat-name">All categories</div><div class="cat-meta">'+master.length+" products</div></button></div>"+cats.map(c=>'<div class="cat-item '+(c.id===categoryFilter?"active":"")+'"><button data-cat="'+esc(c.id)+'"><div class="cat-name">'+esc(c.name)+'</div><div class="cat-meta">'+c.count+" products</div></button></div>").join("");
 box.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{categoryFilter=b.dataset.cat;branchFilter="";manufacturerFilter="";page=1;populateBranchFilter();populateManufacturerFilter();renderCategories();renderBranches();renderProducts()});
}
function renderBranches(){
 const box=$("branch-strip");const bs=branches();
 box.innerHTML='<button class="branch '+(!branchFilter?"active":"")+'" data-branch="">All branches</button>'+bs.map(b=>'<button class="branch '+(b.id===branchFilter?"active":"")+'" data-branch="'+esc(b.id)+'">'+esc(b.name)+' <span>('+b.count+')</span></button>').join("");
 box.querySelectorAll("[data-branch]").forEach(b=>b.onclick=()=>{branchFilter=b.dataset.branch;manufacturerFilter="";page=1;populateManufacturerFilter();renderBranches();renderProducts()});
}
function filtered(){
 const q=searchTerm.toLowerCase();
 return master.filter(p=>
  (!categoryFilter||p.category_id===categoryFilter)&&
  (!branchFilter||p.branch_id===branchFilter)&&
  (!manufacturerFilter||p.manufacturer_id===manufacturerFilter)&&
  (!q||[p.model,p.package_name,p.catalogue_category,p.main_category,p.product_type,p.manufacturer_name,p.branch_name,p.category_name].some(v=>String(v||"").toLowerCase().includes(q)))
 );
}
function state(p){return selections.get(p.product_id)||{buying_enabled:false,selling_enabled:false,active:false}}
function renderProducts(){
 const rows=filtered(),totalPages=Math.max(1,Math.ceil(rows.length/pageSize));if(page>totalPages)page=totalPages;
 const start=(page-1)*pageSize,visible=rows.slice(start,start+pageSize);
 $("result-count").textContent=rows.length+" matching products · page "+page+" of "+totalPages;
 $("catalogue-title").textContent=categoryFilter?(categories().find(c=>c.id===categoryFilter)?.name||"Catalogue")+" products":"Master products";
 $("product-body").innerHTML=visible.length?visible.map(p=>{const s=state(p);return '<tr><td><input class="product-check" type="checkbox" data-product="'+p.product_id+'" '+(selected.has(p.product_id)?"checked":"")+'></td><td class="product-name"><strong>'+esc(p.manufacturer_name+" "+p.model)+'</strong><small>'+esc(p.package_name)+(p.product_type?" · "+esc(p.product_type):"")+'</small></td><td>'+esc(p.category_name)+(p.branch_name?"<br><small>"+esc(p.branch_name)+"</small>":"")+'</td><td>'+esc(p.manufacturer_name)+'</td><td><label class="toggle '+(s.buying_enabled?"live-buy":"")+'"><input class="buy-toggle" type="checkbox" data-product="'+p.product_id+'" '+(s.buying_enabled?"checked":"")+'> '+(s.buying_enabled?"Live":"Off")+'</label></td><td><label class="toggle '+(s.selling_enabled?"live-sell":"")+'"><input class="sell-toggle" type="checkbox" data-product="'+p.product_id+'" '+(s.selling_enabled?"checked":"")+'> '+(s.selling_enabled?"Live":"Off")+'</label></td></tr>'}).join(""):'<tr><td colspan="6" class="empty">No catalogue products match these filters.</td></tr>';
 document.querySelectorAll(".product-check").forEach(i=>i.onchange=()=>{i.checked?selected.add(i.dataset.product):selected.delete(i.dataset.product);updateSelectionCount()});
 document.querySelectorAll(".buy-toggle").forEach(i=>i.onchange=()=>toggleOne(i.dataset.product,i.checked,(state(master.find(p=>p.product_id===i.dataset.product))).selling_enabled));
 document.querySelectorAll(".sell-toggle").forEach(i=>i.onchange=()=>toggleOne(i.dataset.product,(state(master.find(p=>p.product_id===i.dataset.product))).buying_enabled,i.checked));
 $("page-info").textContent="Showing "+(visible.length?start+1:0)+"–"+(start+visible.length)+" of "+rows.length;
 $("prev-page").disabled=page<=1;$("next-page").disabled=page>=totalPages;
 updateSelectionCount();
}
function updateSelectionCount(){ $("select-visible").textContent=selected.size?"Select all visible ("+selected.size+")":"Select visible"; }
async function toggleOne(id,buy,sell){
 try{await applySelection([id],buy,sell)}catch(e){renderProducts();msg(e.message||String(e),"error")}
}
async function applySelection(ids,buy,sell){
 if(!ids.length)return msg("Select at least one product first.","error");
 const result=await api("/rest/v1/rpc/activate_master_catalogue_products",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_ids:ids,p_buying_enabled:!!buy,p_selling_enabled:!!sell})});
 ids.forEach(id=>selections.set(id,{master_product_id:id,buying_enabled:!!buy,selling_enabled:!!sell,active:true}));
 renderCategories();renderBranches();renderProducts();
 msg((result?.products||ids.length)+" catalogue product"+((result?.products||ids.length)===1?"":"s")+" updated. Required categories and branches were created automatically.","success");
}
function visibleIds(){return filtered().map(p=>p.product_id)}
$("select-visible").onclick=()=>{visibleIds().forEach(id=>selected.add(id));renderProducts()};
$("clear-selected").onclick=()=>{selected.clear();renderProducts()};
$("select-all").onchange=e=>{e.target.checked?visibleIds().forEach(id=>selected.add(id)):visibleIds().forEach(id=>selected.delete(id));renderProducts()};
$("enable-buying").onclick=()=>applySelection([...selected],true,false);
$("enable-selling").onclick=()=>applySelection([...selected],false,true);
$("enable-both").onclick=()=>applySelection([...selected],true,true);
$("disable-both").onclick=()=>applySelection([...selected],false,false);
$("category-filter").onchange=e=>{categoryFilter=e.target.value;branchFilter="";manufacturerFilter="";page=1;populateBranchFilter();populateManufacturerFilter();renderCategories();renderBranches();renderProducts()};
$("branch-filter").onchange=e=>{branchFilter=e.target.value;manufacturerFilter="";page=1;populateManufacturerFilter();renderBranches();renderProducts()};
$("manufacturer-filter").onchange=e=>{manufacturerFilter=e.target.value;page=1;renderProducts()};
$("model-search").oninput=e=>{searchTerm=e.target.value.trim();page=1;renderProducts()};
$("prev-page").onclick=()=>{if(page>1){page--;renderProducts()}};
$("next-page").onclick=()=>{if(page<Math.ceil(filtered().length/pageSize)){page++;renderProducts()}};
$("custom-category-form").onsubmit=async e=>{
 e.preventDefault();
 try{
  const name=$("custom-category-name").value.trim();if(!name)throw Error("Category name is required.");
  await api("/rest/v1/categories",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({tenant_id:tenantId,name,slug:name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""),description:$("custom-category-description").value.trim()||null,active:true,buying_enabled:false,selling_enabled:false,sort_order:9999})});
  $("custom-category-name").value="";$("custom-category-description").value="";
  msg("Custom category created. Add its branch and properties from the category structure tools when required.","success");
 }catch(e){msg(e.message||String(e),"error")}
};
$("sign-out").onclick=()=>{if(window.tradeflowSubscriberSignOut)window.tradeflowSubscriberSignOut();else location.href="subscriber-login.html"};
if(window.tradeflowSubscriberAuthReady)window.tradeflowSubscriberAuthReady.then(init).catch(e=>msg(e.message||String(e),"error"));else msg("Subscriber authentication layer did not load.","error");