const SUPABASE_URL="https://twfbmjwwqzxdxvclxbun.supabase.co";
const $=id=>document.getElementById(id);
let key=null,token=null,tenantId=null;
let master=[],facets={categories:[],branches:[],manufacturers:[]};
let masterPage=1,totalProducts=0;
const pageSize=50;
let searchTimer=null;
let buyingSelectionAllMatching=false;
let catalogueView="my";
const collapsedPricing=new Set();
const pendingAutomatic=new Set();

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c))}
function money(v,c="GBP"){if(v===null||v===undefined||v==="")return"—";try{return new Intl.NumberFormat("en-GB",{style:"currency",currency:c||"GBP"}).format(Number(v))}catch{return(c||"")+" "+v}}
function msg(t,type=""){const e=$("message");if(e){e.textContent=t||"";e.className="message "+type}}
async function api(path,options={}){
 const h=new Headers(options.headers||{});h.set("apikey",key);h.set("Authorization","Bearer "+token);
 if(options.body)h.set("Content-Type","application/json");
 const timeoutMs=Number(options.timeoutMs)||30000,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetch(SUPABASE_URL+path,{...options,headers:h,signal:controller.signal});
  const text=await r.text();let b=null;try{b=text?JSON.parse(text):null}catch{b=text}
  if(!r.ok){const detail=b?.message||b?.msg||b?.error||text||("HTTP "+r.status);throw Error("Catalogue request failed ("+r.status+") at "+path+": "+detail)}
  return b;
 }catch(e){if(e.name==="AbortError")throw Error("TradeFlow catalogue request timed out. Please refresh and try again.");throw e}
 finally{clearTimeout(timer)}
}
window.buyingSelected=new Set();
async function init(){
 try{
  const auth=await window.tradeflowSubscriberAuthReady;
  if(!auth?.session?.access_token||!auth.tenantId)throw Error("Subscriber sign-in required.");
  key=auth.key;token=auth.session.access_token;tenantId=auth.tenantId;
  $("business-name").textContent=auth.tenants?.[tenantId]||"Buying Pricing";
  await loadCatalogue();
 }catch(e){msg(e.message||String(e),"error")}
}
async function loadStatusCounts(){
 try{
  const data=await api("/rest/v1/rpc/get_buying_catalogue_status_counts",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId})});
  $("count-inactive").textContent=Number(data?.inactive||0);
  $("count-live").textContent=Number(data?.live||0);
  $("count-automatic").textContent=Number(data?.automatic||0);
  $("count-manual").textContent=Number(data?.manual_valuation||0);
  $("count-available").textContent=Number(data?.available||0);
 }catch(e){
  ["count-inactive","count-live","count-automatic","count-manual","count-available"].forEach(id=>{if($(id))$(id).textContent="—"});
 }
}
async function loadCatalogue(){
 msg("Loading catalogue filters…");
 await loadFacets();
 await loadPage();await loadStatusCounts();
 await loadStatusCounts();
 msg(catalogueView==="my"?"Your Buying Catalogue is ready.":"Master catalogue ready. Select products to add them to your Buying Catalogue.","success");
}
async function loadFacets(){
 const cat=$("master-category").value||null,branch=$("master-branch").value||null;
 const data=await api("/rest/v1/rpc/get_master_buying_catalogue_facets",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_category_id:cat,p_branch_id:branch})});
 facets=data||{categories:[],branches:[],manufacturers:[]};
 populateFilters();
}
async function loadPage(){
 const cat=$("master-category").value||null,branch=$("master-branch").value||null,man=$("master-manufacturer").value||null,q=($("master-search").value||"").trim()||null;
 const hideAdded=catalogueView==="master" ? ($("master-hide-added")?.checked!==false) : false;
 if(catalogueView==="master"&&!man&&!q){
  master=[];totalProducts=0;
  $("catalogue-status").textContent="Choose a manufacturer or search";
  $("catalogue-status").classList.remove("live");
  $("catalogue-help").textContent="No master product records are downloaded until you choose a manufacturer or enter a product search.";
  renderMaster();return;
 }
 const rpc=catalogueView==="my"?"/rest/v1/rpc/get_tenant_buying_catalogue_page":"/rest/v1/rpc/get_master_buying_catalogue_page_filtered";
 const data=await api(rpc,{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_category_id:cat,p_branch_id:branch,p_manufacturer_id:man,p_search:q,p_page:masterPage,p_page_size:pageSize,...(catalogueView==="master"?{p_hide_added:hideAdded}:{} )}),timeoutMs:45000});
 master=Array.isArray(data?.products)?data.products:[];
 totalProducts=Number(data?.total||0);
 const pages=Math.max(1,Math.ceil(totalProducts/pageSize));if(masterPage>pages){masterPage=pages;return loadPage()}
 $("catalogue-status").textContent=totalProducts+(catalogueView==="my"?" products in your Buying Catalogue":(hideAdded?" available master products":" matching master products"));
 $("catalogue-status").classList.add("live");
 $("catalogue-help").textContent=catalogueView==="my"?"These are the products currently in your Buying Catalogue. Use the Master Catalogue to add more.":(hideAdded?"Already-added Buying products are hidden. Turn off 'Hide already added' if you need to review them.":"TradeFlow is showing all matching master products, including ones already in this subscriber's Buying Catalogue."); updateMasterVisibilityControl();
 renderMaster();
}
function updateMasterVisibilityControl(){
 const e=$("master-hide-added"); if(e)e.disabled=catalogueView!=="master";
}
function fillSelect(id,items,placeholder,old){
 const e=$(id);e.innerHTML='<option value="">'+placeholder+"</option>"+(items||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+" ("+x.count+")</option>").join("");
 if((items||[]).some(x=>String(x.id)===String(old)))e.value=old;
}
function populateFilters(){
 const cat=$("master-category").value||"",branch=$("master-branch").value||"",man=$("master-manufacturer").value||"";
 fillSelect("master-category",facets.categories,"All categories",cat);
 fillSelect("master-branch",facets.branches,"All branches",branch);
 fillSelect("master-manufacturer",facets.manufacturers,"All manufacturers",man);
}
function stateFor(p){
 let s;
 if(catalogueView==="master"){
  if(p?.selection_active&&p?.buying_enabled)s={key:"added",label:"Already added",product:p,rule:p?.rule_id?true:null};
  else s={key:"available",label:"Available to add",product:p,rule:null};
 } else if(!p?.buying_enabled||!p?.selection_active||!p?.buying_product_active)s={key:"inactive",label:"Inactive",product:p,rule:p?.rule_id?true:null};
 else if(p.manual_offer_price!==null&&p.manual_offer_price!==undefined)s={key:"manual",label:"Manual price / override",product:p,rule:p.rule_id?true:null};
 else if(p.rule_id)s={key:"auto",label:"Automatic pricing",product:p,rule:p};
 else s={key:"valuation",label:"Manual valuation",product:p,rule:null};
 if(p?.website_visible===false)return {...s,websiteHidden:true,label:"Hidden from website"};
 return s;
}
function researchText(p,type){
 const isNew=type==="uk_new";
 const price=isNew?p.uk_new_research_price:p.uk_used_research_price;
 const source=isNew?p.uk_new_research_source:p.uk_used_research_source;
 const url=isNew?p.uk_new_research_url:p.uk_used_research_url;
 const checked=isNew?p.uk_new_research_checked_at:p.uk_used_research_checked_at;
 if(price===null||price===undefined||price==="")return "No research";
 const label=isNew?"UK New":"UK Used";
 const when=checked?" · "+new Date(checked).toLocaleDateString("en-GB"):"";
 const sourceLink=source?(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(source)+'</a>':esc(source)):"Research source";
 return label+" "+money(price)+when+" · "+sourceLink;
}
function researchOption(ref){return ref==="uk_used"?"UK Used":"UK New"}
function researchInlineHtml(p){
 return '<div class="research-inline"><strong>Research:</strong> <span>UK New: '+researchText(p,"uk_new")+'</span> <span>UK Used: '+researchText(p,"uk_used")+'</span></div>';
}
function conditionAutoAmount(p,ref,pct){
 const base=ref==="uk_new"?p.uk_new_research_price:p.uk_used_research_price;
 return pct!==null&&pct!==undefined&&pct!==""&&base!==null&&base!==undefined?Number(base)*Number(pct)/100:null;
}
function refSummary(p){
 if(!p||stateFor(p).key==="inactive")return researchInlineHtml(p||{})+'<div class="ref-summary">Not active for Buying. Select the product to add it.</div>';
 if(p.manual_offer_price!==null&&p.manual_offer_price!==undefined)return researchInlineHtml(p)+'<div class="ref-summary"><strong>Manual price / override:</strong> '+money(p.manual_offer_price)+(p.rule_id?'<br><span class="muted">Automatic rule retained as fallback.</span>':'')+'</div>';
 if(p.rule_id)return researchInlineHtml(p)+'<div class="ref-summary"><strong>Automatic rule:</strong> '+(p.sealed_percentage??"—")+"% new · "+(p.opened_never_used_percentage??"—")+"% new · "+(p.excellent_percentage??"—")+"% new · "+(p.good_percentage??"—")+"% new · "+(p.poor_percentage??"—")+"% new</div>";
 return researchInlineHtml(p)+'<div class="ref-summary">Manual valuation — no fixed price or automatic rule configured.</div>';
}
function editorHtml(p,s){
 if(s.key==="inactive")return '<button class="save-price add-product" data-add-product="'+p.product_id+'">Add to Buying Catalogue</button><div class="price-help">Selecting this product automatically creates/links its category, branch and manufacturer for this subscriber.</div>';
 if(s.key==="manual")return '<div class="price-editor"><label class="price-help">Buying price / override (£)</label><input class="manual-input" data-master="'+p.product_id+'" type="number" min="0" step="0.01" value="'+esc(p.manual_offer_price??"")+'" placeholder="Enter price you are willing to pay"><button class="save-price" data-save-manual="'+p.product_id+'">Save price</button><div class="price-help">This fixed price overrides automatic pricing for this product.</div></div>';
 if(s.key==="auto"){
  const conditions=[
   ["Sealed","sealed_percentage","sealed_manual_price"],
   ["Opened","opened_never_used_percentage","opened_never_used_manual_price"],
   ["Excellent","excellent_percentage","excellent_manual_price"],
   ["Good","good_percentage","good_manual_price"],
   ["Poor","poor_percentage","poor_manual_price"]
  ];
  return '<div class="price-editor">'+
   '<div class="automatic-note"><strong>How automatic pricing works:</strong> all conditions are calculated from the product’s latest UK New research price. Set the percentage you are willing to purchase at for each condition. UK Used research is shown for reference only and is never used for automatic pricing. For example, 70% of a £599 UK New research price produces an automatic buying price of £419.30. If research is not available yet, the rule can still be saved and will calculate when research is added.</div>'+
   '<div class="research-basis"><strong>Available research:</strong> <span>'+researchText(p,"uk_new")+'</span> <span>'+researchText(p,"uk_used")+'</span></div>'+
   '<div class="condition-grid">'+conditions.map(([l,pct,ov])=>{
    const amount=conditionAutoAmount(p,"uk_new",p[pct]);
    return '<div class="condition-row"><strong>'+l+'</strong><span class="basis-price">UK New</span><label>%<input class="auto-input" data-master="'+p.product_id+'" data-field="'+pct+'" type="number" min="0" max="100" step="0.01" value="'+esc(p[pct]??"")+'" placeholder="%"></label><span class="calculated-price">Auto: '+(amount!==null?money(amount):"No research")+'</span><label>Override £<input class="condition-override-input" data-master="'+p.product_id+'" data-field="'+ov+'" type="number" min="0" step="0.01" value="'+esc(p[ov]??"")+'" placeholder="Auto"></label></div>';
   }).join("")+'</div>'+
   '<button class="save-price" data-save-auto="'+p.product_id+'">Save automatic rule</button><div class="price-help">All five conditions use UK New research only. UK Used research remains visible for reference and is not used to calculate automatic buying prices. If there is no UK New research, the automatic valuation falls back to manual valuation.</div></div>';
 }
 return "";
}
function renderMaster(){
 const isMy=catalogueView==="my";
 $("bulk-toolbar").hidden=false;
 updateBulkControls(isMy);
 const pages=Math.max(1,Math.ceil(totalProducts/pageSize));
 const selectableIds=isMy?master.map(p=>p.product_id):master.filter(p=>stateFor(p).key==="available").map(p=>p.product_id);
 const selectedIds=window.buyingSelected||new Set();
 const selectableCount=selectableIds.length;
 const selectedCount=selectableIds.filter(id=>selectedIds.has(id)).length;
 const bulkAll=buyingSelectionAllMatching;
 const selectAll=$("select-all-products");
 if(selectAll){
  selectAll.disabled=selectableCount===0;
  selectAll.checked=bulkAll||(selectableCount>0&&selectedCount===selectableCount);
  selectAll.indeterminate=!bulkAll&&selectedCount>0&&selectedCount<selectableCount;
 }
 $("selected-count").textContent=bulkAll?"All "+totalProducts+" matching products selected":(selectedCount?selectedCount+" selected":"");
 $("bulk-add").disabled=!(bulkAll||selectedCount>0);
 const allMatching=$("select-all-matching");
 if(allMatching){allMatching.textContent=bulkAll?"Clear all matching":"Select all "+totalProducts+" matching ("+Math.max(1,Math.ceil(totalProducts/pageSize))+" pages)";allMatching.disabled=totalProducts===0;}

 $("master-count").textContent=totalProducts+(isMy?" products in your Buying Catalogue":" matching products");
 const start=(masterPage-1)*pageSize;
 $("page-info").textContent="Showing "+(master.length?start+1:0)+"–"+(start+master.length)+" of "+totalProducts+" · page "+masterPage+" of "+pages; $("top-page-summary").textContent=totalProducts?("Showing "+(master.length?start+1:0)+"–"+(start+master.length)+" of "+totalProducts+" · Page "+masterPage+" of "+pages):"No products to show";
 $("master-body").innerHTML=master.length?master.map(p=>{
  const s=stateFor(p);
  const editingAuto=pendingAutomatic.has(p.product_id);
  const displayState=editingAuto?{...s,key:"auto",label:"Automatic pricing — not active until saved"}:s;
  const mode=displayState.key==="inactive"?"":'<div class="mode-actions" role="group" aria-label="Pricing mode"><button type="button" class="mode-btn '+(s.key==="manual"||s.key==="valuation"?"selected":"")+'" data-mode-product="'+p.product_id+'" data-mode-value="manual">Manual</button><button type="button" class="mode-btn '+(s.key==="auto"?"selected":"")+'" data-mode-product="'+p.product_id+'" data-mode-value="automatic">Automatic</button>'+(displayState.key==="auto"?'<button type="button" class="collapse-btn" data-collapse-product="'+p.product_id+'">'+(collapsedPricing.has(p.product_id)?"Show pricing":"Collapse pricing")+'</button>':"")+'</div>';
  return '<tr class="status-'+(editingAuto?"auto-pending":s.key)+'">'+
   '<td class="select-cell">'+((isMy||s.key==="available")?'<input type="checkbox" class="product-select" data-product-id="'+p.product_id+'" '+(selectedIds.has(p.product_id)?"checked":"")+' aria-label="Select '+esc(p.manufacturer_name+" "+p.model+" "+(p.package_name||""))+'">':'<input type="checkbox" class="product-select added-checkbox" checked disabled aria-label="Already added">')+'</td>'+
   '<td class="product-name"><strong>'+esc(p.model)+'</strong><span class="package-name">'+esc(p.package_name||"Standard / base configuration")+'</span><small>'+esc(p.product_type||"")+(p.notes?"<br>"+esc(p.notes):"")+'</small>'+researchInlineHtml(p)+(s.key==="available"?"":'<span class="added-badge">Already added</span>')+'</td>'+
   '<td>'+esc(p.category_name)+'</td><td>'+esc(p.branch_name||"—")+'</td><td>'+esc(p.manufacturer_name)+'</td>'+
   '<td><div class="state '+(editingAuto?"auto-pending":(s.websiteHidden?"inactive":displayState.key))+'">'+esc(displayState.label)+'</div>'+mode+((displayState.key==="auto"&&collapsedPricing.has(p.product_id))?'<div class="collapsed-pricing-note">Automatic pricing configured · click <strong>Show pricing</strong> to edit</div>':editorHtml(p,displayState))+(isMy?'<div class="visibility-actions"><button type="button" class="visibility-btn '+(s.websiteHidden?"show":"hide")+'" data-visibility-product="'+p.product_id+'" data-visibility="'+(s.websiteHidden?"true":"false")+'">'+(s.websiteHidden?"Show on website":"Hide from website")+'</button></div>'+((s.key!=="inactive")?'<button class="reset-link" data-reset="'+p.product_id+'">Reset / turn off</button>':""):"")+'</td></tr>';
 }).join(""):'<tr><td colspan="6" class="empty">'+(isMy?"No products have been added to your Buying Catalogue yet. Open Master Catalogue to add products.":"No master catalogue products match these filters.")+"</td></tr>";
 document.querySelectorAll("[data-mode-product]").forEach(e=>e.addEventListener("click",()=>{
 const id=e.dataset.modeProduct;
 if(e.dataset.modeValue==="automatic") collapsedPricing.delete(id); else {collapsedPricing.delete(id);pendingAutomatic.delete(id);}
 changeMode(id,e.dataset.modeValue);
}));
 document.querySelectorAll("[data-collapse-product]").forEach(e=>e.addEventListener("click",()=>{const id=e.dataset.collapseProduct;if(collapsedPricing.has(id))collapsedPricing.delete(id);else collapsedPricing.add(id);renderMaster();}));
 document.querySelectorAll("[data-add-product]").forEach(e=>e.addEventListener("click",()=>addProduct(e.dataset.addProduct,e)));
 document.querySelectorAll("[data-save-manual]").forEach(e=>e.addEventListener("click",()=>saveManual(e.dataset.saveManual,e)));
 document.querySelectorAll("[data-save-auto]").forEach(e=>e.addEventListener("click",()=>saveAuto(e.dataset.saveAuto,e)));
 document.querySelectorAll(".auto-input").forEach(e=>e.addEventListener("input",()=>{
   const p=master.find(x=>x.product_id===e.dataset.master);if(!p)return;
   const amount=conditionAutoAmount(p,"uk_new",e.value);
   const row=e.closest(".condition-row"),out=row?.querySelector(".calculated-price");
   if(out)out.textContent="Auto: "+(amount!==null?money(amount):"No research");
 }));
 document.querySelectorAll(".auto-input").forEach(e=>e.addEventListener("change",()=>{const p=master.find(x=>x.product_id===e.dataset.master);if(!p)return;const out=e.closest(".condition-row")?.querySelector(".calculated-price");const amount=conditionAutoAmount(p,"uk_new",e.value);if(out)out.textContent="Auto: "+(amount!==null?money(amount):"No research")}));
 document.querySelectorAll("[data-reset]").forEach(e=>e.addEventListener("click",()=>resetProduct(e.dataset.reset)));
 document.querySelectorAll("[data-visibility-product]").forEach(e=>e.addEventListener("click",async()=>{
  const hidden=e.dataset.visibility!=="true";
  try{await api("/rest/v1/rpc/set_buying_catalogue_website_visibility",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:e.dataset.visibilityProduct,p_visible:!hidden})});await loadPage();await loadStatusCounts();msg(hidden?"Product hidden from website. Its buying/pricing configuration was retained.":"Product shown on website again. Its existing buying/pricing configuration was retained.","success");}catch(err){msg(err.message||String(err),"error");}
 }));
 document.querySelectorAll(".product-select").forEach(e=>e.addEventListener("change",()=>{window.buyingSelected=window.buyingSelected||new Set();buyingSelectionAllMatching=false;if(e.checked)window.buyingSelected.add(e.dataset.productId);else window.buyingSelected.delete(e.dataset.productId);renderMaster();}));
}
function updateBulkControls(isMy){
 const mode=$("bulk-mode");
 const profile=$("bulk-profile-wrap");
 const action=$("bulk-add");
 const label=$("select-all-label");
 if(!mode||!action)return;
 const previous=mode.value;
 mode.innerHTML=isMy
  ? '<option value="automatic">Automatic pricing</option><option value="manual">Manual valuation</option><option value="off">Turn off Buying</option>'
  : '<option value="manual">Add as Manual valuation</option><option value="automatic">Add with Automatic pricing</option>';
 const allowed=isMy?["automatic","manual","off"]:["manual","automatic"];
 if(allowed.includes(previous))mode.value=previous;
 action.textContent=isMy?"Apply to selected":"Add selected to Buying Catalogue";
 if(label)label.textContent="Select all shown";
 if(profile)profile.hidden=mode.value!=="automatic";
 toggleBulkMode();
}
function applyBulkPreset(){
 const profiles={
  "70":{sealed:70,opened_never_used:65,excellent:60,good:50,poor:40},
  "60":{sealed:60,opened_never_used:55,excellent:50,good:40,poor:30},
  "50":{sealed:50,opened_never_used:45,excellent:40,good:30,poor:20},
  "40":{sealed:40,opened_never_used:35,excellent:30,good:20,poor:10}
 };
 const p=profiles[$("bulk-pricing-profile")?.value||"70"];
 if(!p)return;
 for(const k of Object.keys(p)){const e=$("bulk-"+k+"_percentage");if(e)e.value=p[k];}
}
async function applySelectedBuyingCatalogue(){
 const ids=Array.from(window.buyingSelected||[]);
 if(!buyingSelectionAllMatching&&!ids.length)return msg("Select at least one product first.","error");
 const mode=$("bulk-mode")?.value||"automatic";
 const button=$("bulk-add");button.disabled=true;
 const payload={p_tenant_id:tenantId,p_mode:mode,p_master_product_ids:ids,p_all_matching:buyingSelectionAllMatching,
  p_category_id:$("master-category").value||null,p_branch_id:$("master-branch").value||null,p_manufacturer_id:$("master-manufacturer").value||null,p_search:($("master-search").value||"").trim()||null};
 if(mode==="automatic"){
  const fields=["sealed_percentage","opened_never_used_percentage","excellent_percentage","good_percentage","poor_percentage"];
  for(const field of fields){
   const raw=$("bulk-"+field)?.value||"";const value=Number(raw);
   if(raw===""||!Number.isFinite(value)||value<0||value>100){button.disabled=false;return msg("Enter all five automatic percentages between 0 and 100.","error")}
   payload["p_"+field]=value;
  }
  for(const field of ["sealed_manual_price","opened_never_used_manual_price","excellent_manual_price","good_manual_price","poor_manual_price"]){
   const raw=$("bulk-"+field)?.value||"";const value=raw===""?null:Number(raw);
   if(value!==null&&(!Number.isFinite(value)||value<0)){button.disabled=false;return msg("Automatic condition overrides must be valid non-negative prices.","error")}
   payload["p_"+field]=value;
  }
 }
 try{
  let result;
  if(!buyingSelectionAllMatching && ids.length){
   const calls=ids.map(id=>{
    const body={p_tenant_id:tenantId,p_master_product_id:id,p_mode:mode};
    if(mode==="automatic"){
     body.p_sealed_percentage=payload.p_sealed_percentage;body.p_opened_never_used_percentage=payload.p_opened_never_used_percentage;body.p_excellent_percentage=payload.p_excellent_percentage;body.p_good_percentage=payload.p_good_percentage;body.p_poor_percentage=payload.p_poor_percentage;
     body.p_manual_price=null;
    }
    if(mode==="manual") body.p_manual_price=null;
    return api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify(body),timeoutMs:45000});
   });
   await Promise.all(calls); result={updated:ids.length};
  }else{
   result=await api("/rest/v1/rpc/apply_buying_catalogue_bulk",{method:"POST",body:JSON.stringify(payload),timeoutMs:45000});
  }
  window.buyingSelected=new Set();buyingSelectionAllMatching=false;
  await loadPage();await loadStatusCounts();
  const actionLabel=mode==="automatic"?"Automatic pricing":mode==="manual"?"Manual valuation":"Turned off";
  msg((result?.updated||0)+" product(s) updated: "+actionLabel+".","success");
 }catch(e){msg(e.message||String(e),"error");button.disabled=false;renderMaster()}
}
async function addSelectedProducts(){
 const ids=Array.from(window.buyingSelected||[]);
 if(!buyingSelectionAllMatching&&!ids.length)return;
 const mode=$("bulk-mode")?.value||"manual";
 const button=$("bulk-add");button.disabled=true;
 const payload={p_tenant_id:tenantId,p_mode:mode};
 if(mode==="automatic"){
  const fields=["sealed_percentage","opened_never_used_percentage","excellent_percentage","good_percentage","poor_percentage"];
  for(const field of fields){const raw=$("bulk-"+field)?.value||"";const value=Number(raw);if(raw===""||!Number.isFinite(value)||value<0||value>100){button.disabled=false;return msg("Enter all five automatic percentages between 0 and 100 before adding products automatically.","error")}payload["p_"+field]=value}
  for(const field of ["sealed_manual_price","opened_never_used_manual_price","excellent_manual_price","good_manual_price","poor_manual_price"]){const raw=$("bulk-"+field)?.value||"";const value=raw===""?null:Number(raw);if(value!==null&&(!Number.isFinite(value)||value<0)){button.disabled=false;return msg("Automatic condition overrides must be valid non-negative prices.","error")}payload["p_"+field]=value}
 }
 try{
  let result;
  if(buyingSelectionAllMatching){
   const cat=$("master-category").value||null,branch=$("master-branch").value||null,man=$("master-manufacturer").value||null,q=($("master-search").value||"").trim()||null;
   result=await api("/rest/v1/rpc/add_master_buying_products_filtered",{method:"POST",body:JSON.stringify({...payload,p_category_id:cat,p_branch_id:branch,p_manufacturer_id:man,p_search:q}),timeoutMs:45000});
  }else{
   result=await api("/rest/v1/rpc/add_master_buying_products_bulk",{method:"POST",body:JSON.stringify({...payload,p_master_product_ids:ids}),timeoutMs:45000});
  }
  window.buyingSelected=new Set();buyingSelectionAllMatching=false;
  await loadPage();await loadStatusCounts();
  msg((result?.added||0)+" product(s) added to your Buying Catalogue as "+(mode==="automatic"?"Automatic pricing":"Manual valuation")+((result?.skipped||0)?"; "+result.skipped+" already active and skipped.":".")+" You can now configure their pricing individually.","success");
 }catch(e){msg(e.message||String(e),"error");button.disabled=false;renderMaster()}
}
async function addProduct(masterId,button){
 const p=master.find(x=>x.product_id===masterId);if(!p)return;
 button.disabled=true;
 try{
  await api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"manual",p_manual_price:null})});
  await loadPage();await loadStatusCounts();msg("Product added. It is now Manual valuation until you enter a fixed price or configure Automatic pricing.","success");
 }catch(e){button.disabled=false;msg(e.message||String(e),"error")}
}
async function changeMode(masterId,mode){
 const p=master.find(x=>x.product_id===masterId);if(!p)return;
 if(mode==="automatic"){
  const values={sealed_percentage:p.sealed_percentage,opened_never_used_percentage:p.opened_never_used_percentage,excellent_percentage:p.excellent_percentage,good_percentage:p.good_percentage,poor_percentage:p.poor_percentage};
  const complete=Object.values(values).every(v=>v!==null&&v!==undefined&&v!=="");
  collapsedPricing.delete(masterId);
  if(!complete){
   pendingAutomatic.add(masterId);
   renderMaster();
   msg("Automatic pricing is being prepared, but it will not become active until all five percentages are entered and saved.","info");
   return;
  }
  try{
   await api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"automatic",p_sealed_percentage:values.sealed_percentage,p_opened_never_used_percentage:values.opened_never_used_percentage,p_excellent_percentage:values.excellent_percentage,p_good_percentage:values.good_percentage,p_poor_percentage:values.poor_percentage,p_manual_price:p.manual_offer_price??null})});
   pendingAutomatic.delete(masterId);await loadPage();await loadStatusCounts();msg("Automatic pricing mode enabled. Set the percentages and optional override below.","success");
  }catch(e){renderMaster();msg(e.message||String(e),"error")}
  return;
 }
 pendingAutomatic.delete(masterId);
 try{
  await api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"manual",p_manual_price:p.manual_offer_price??null})});
  await loadPage();await loadStatusCounts();msg("Manual mode enabled. Leave the price blank for Manual valuation or enter a fixed buying price.","success");
 }catch(e){renderMaster();msg(e.message||String(e),"error")}
}
async function saveManual(masterId,button){
 const input=document.querySelector('[data-master="'+masterId+'"].manual-input');if(!input)return;
 const value=input.value===""?null:Number(input.value);if(value!==null&&(!Number.isFinite(value)||value<0))return msg("Enter a valid manual buying price.","error");
 button.disabled=true;try{
  await api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"manual",p_manual_price:value})});
  await loadPage();await loadStatusCounts();msg(value===null?"Manual valuation enabled. A staff member can value this product when a customer request arrives.":"Manual buying price saved. The fixed price now takes precedence over automatic pricing if a rule is retained.","success");
 }catch(e){msg(e.message||String(e),"error")}finally{button.disabled=false}
}
async function saveAuto(masterId,button){
 const values={};document.querySelectorAll('.auto-input[data-master="'+masterId+'"]').forEach(i=>values[i.dataset.field]=i.value===""?null:Number(i.value));
 
 const overrides={};document.querySelectorAll('.condition-override-input[data-master="'+masterId+'"]').forEach(i=>overrides[i.dataset.field]=i.value===""?null:Number(i.value));
 const missing=["sealed_percentage","opened_never_used_percentage","excellent_percentage","good_percentage","poor_percentage"].filter(k=>values[k]===null||values[k]===undefined||values[k]==="");
 if(missing.length)return msg("Automatic pricing cannot be saved until all five condition percentages are entered.","error");
 for(const v of Object.values(values))if(v!==null&&(!Number.isFinite(v)||v<0||v>100))return msg("Automatic percentages must be between 0 and 100.","error");
 for(const v of Object.values(overrides))if(v!==null&&(!Number.isFinite(v)||v<0))return msg("Condition overrides must be valid non-negative prices.","error");
 button.disabled=true;try{
  await api("/rest/v1/rpc/configure_master_catalogue_buying_product_pricing",{method:"POST",body:JSON.stringify({
   p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"automatic",
   p_sealed_percentage:values.sealed_percentage,p_opened_never_used_percentage:values.opened_never_used_percentage,
   p_excellent_percentage:values.excellent_percentage,p_good_percentage:values.good_percentage,p_poor_percentage:values.poor_percentage,
   p_manual_price:null,
   p_sealed_manual_price:overrides.sealed_manual_price,p_opened_never_used_manual_price:overrides.opened_never_used_manual_price,
   p_excellent_manual_price:overrides.excellent_manual_price,p_good_manual_price:overrides.good_manual_price,p_poor_manual_price:overrides.poor_manual_price,
   p_sealed_reference_type:"uk_new",
   p_opened_never_used_reference_type:"uk_new",
   p_excellent_reference_type:"uk_new",
   p_good_reference_type:"uk_new",
   p_poor_reference_type:"uk_new"
  })});
  await loadPage();await loadStatusCounts();msg("Automatic buying rule saved. Each condition now has its own optional override.","success");
 }catch(e){msg(e.message||String(e),"error")}finally{button.disabled=false}
}
async function resetProduct(masterId){
 const p=master.find(x=>x.product_id===masterId);if(!p)return;
 if(!confirm("Reset this product to Inactive Buying? This clears the subscriber's buying price configuration."))return;
 try{
  await api("/rest/v1/rpc/configure_master_catalogue_buying_product",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_master_product_id:masterId,p_mode:"off"})});
  await loadPage();await loadStatusCounts();msg("Product reset to Inactive. It remains in the master catalogue but is no longer active for this subscriber.","success");
 }catch(e){msg(e.message||String(e),"error")}
}
async function refreshForCategory(){
 masterPage=1;
 $("master-branch").value="";
 $("master-manufacturer").value="";
 await loadFacets();
 await loadPage();await loadStatusCounts();
}
$("select-all-products").addEventListener("change",toggleSelectAll);
$("select-all-matching").addEventListener("click",toggleAllMatching);
document.querySelectorAll(".catalogue-tab").forEach(b=>b.addEventListener("click",()=>setCatalogueView(b.dataset.view)));
$("bulk-add").addEventListener("click",()=>catalogueView==="my"?applySelectedBuyingCatalogue():addSelectedProducts());
$("bulk-mode").addEventListener("change",()=>{toggleBulkMode();if($("bulk-mode").value==="automatic")applyBulkPreset()});
$("bulk-pricing-profile").addEventListener("change",applyBulkPreset);
$("master-category").addEventListener("change",refreshForCategory);
$("master-branch").addEventListener("change",async()=>{masterPage=1;$("master-manufacturer").value="";await loadFacets();await loadPage()});
$("master-manufacturer").addEventListener("change",async()=>{masterPage=1;await loadPage()});
$("master-hide-added").addEventListener("change",()=>{masterPage=1;loadPage().catch(e=>msg(e.message||String(e),"error"))});
$("master-search").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{masterPage=1;loadPage().catch(e=>msg(e.message||String(e),"error"))},350)});
$("prev-page").addEventListener("click",async()=>{if(masterPage>1){masterPage--;await loadPage()}});
$("next-page").addEventListener("click",async()=>{if(masterPage<Math.ceil(totalProducts/pageSize)){masterPage++;await loadPage()}});
$("sign-out").addEventListener("click",()=>{if(window.tradeflowSubscriberSignOut)window.tradeflowSubscriberSignOut();else{localStorage.removeItem("tradeflow_subscriber_session");location.href="subscriber-login.html"}});
if(window.tradeflowSubscriberAuthReady)window.tradeflowSubscriberAuthReady.then(init).catch(e=>msg(e.message||String(e),"error"));else msg("Subscriber authentication layer did not load.","error");function toggleSelectAll(){
 window.buyingSelected=window.buyingSelected||new Set();
 buyingSelectionAllMatching=false;
 const selectable=catalogueView==="my"
  ? master.map(p=>p.product_id)
  : master.filter(p=>stateFor(p).key==="inactive").map(p=>p.product_id);
 const allSelected=selectable.length&&selectable.every(id=>window.buyingSelected.has(id));
 selectable.forEach(id=>allSelected?window.buyingSelected.delete(id):window.buyingSelected.add(id));
 renderMaster();
}
function toggleAllMatching(){
 buyingSelectionAllMatching=!buyingSelectionAllMatching;
 window.buyingSelected=new Set();
 renderMaster();
}
function setCatalogueView(view){
 catalogueView=view;masterPage=1;window.buyingSelected=new Set();buyingSelectionAllMatching=false;
 document.querySelectorAll(".catalogue-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 $("catalogue-title").textContent=view==="my"?"My Buying Catalogue":"Master Catalogue";
 $("catalogue-subtitle").textContent=view==="my"?"Products currently selected for this subscriber.":"Browse the independent TradeFlow master catalogue and add products you actually buy.";
 loadPage().catch(e=>msg(e.message||String(e),"error"));
}
function toggleBulkMode(){
 const automatic=$("bulk-mode")?.value==="automatic";
 $("bulk-automatic-fields")?.classList.toggle("hidden",!automatic);
 $("bulk-profile-wrap")?.classList.toggle("hidden",!automatic);
 if(automatic&&Object.values(["sealed_percentage","opened_never_used_percentage","excellent_percentage","good_percentage","poor_percentage"]).some(k=>!($("bulk-"+k)?.value)))applyBulkPreset();
}







