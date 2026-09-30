const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
const params=new URLSearchParams(location.search);
const tenantId=params.get('tenant_id');
let activeTenantId=tenantId;
const page=params.get('page')||'home';
const preview=params.get('preview')==='draft';
const hostname=location.hostname;
const $=id=>document.getElementById(id);

async function api(path){
 if(!KEY)throw new Error('TradeFlow connection is not configured.');
 const response=await fetch(SUPABASE_URL+path,{headers:{apikey:KEY,'Content-Type':'application/json'}});
 const text=await response.text();
 let body=null;
 try{body=text?JSON.parse(text):null}catch{body=text}
 if(!response.ok)throw new Error(body?.message||body?.msg||body?.error||text||('HTTP '+response.status));
 return body;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function isSubscriberSession(){
 return !!localStorage.getItem('tradeflow_subscriber_session');
}
function isCustomerSession(){
 const key=activeTenantId?'tradeflow_customer_session:'+activeTenantId:'tradeflow_customer_session:unknown';
 return !!sessionStorage.getItem(key);
}
function customerUrl(extra){
 const subscriberSession=isSubscriberSession();
 const subscriberTenantId=localStorage.getItem('tradeflow_subscriber_tenant_id');
 if(subscriberSession){
   const base=subscriberTenantId?'subscriber-dashboard.html?tenant_id='+encodeURIComponent(subscriberTenantId):'subscriber-dashboard.html';
   return extra?base+'&'+extra:base;
 }
 const base=activeTenantId?'customer-dashboard.html?tenant_id='+encodeURIComponent(activeTenantId):'customer-dashboard.html';
 return extra?base+'&'+extra:base;
}
function customerBasketUrl(listingId){
 if(activeTenantId)localStorage.setItem('tradeflow_customer_tenant_id',activeTenantId);
 const target=new URL('./customer-basket.html',location.href);
 target.searchParams.set('tenant_id',activeTenantId||'');
 target.searchParams.set('listing_id',listingId||'');
 target.searchParams.set('basket','1');
 target.searchParams.set('basket_v','1');
 return target.href;
}
function pageUrl(slug,extra){
 let u='public-site.html?tenant_id='+encodeURIComponent(activeTenantId||'')+'&page='+encodeURIComponent(slug);
 if(preview)u+='&preview=draft';
 if(extra)u+='&'+extra;
 return u;
}
function publicProductUrl(listingId){
 return pageUrl('product','listing='+encodeURIComponent(listingId||''));
}
async function loadPublicListingMedia(listingId){
 if(!listingId)return[];
 try{
   const response=await fetch(SUPABASE_URL+'/functions/v1/public-listing-media?listing_id='+encodeURIComponent(listingId),{
     headers:{apikey:KEY}
   });
   const body=await response.json();
   return response.ok&&Array.isArray(body?.media)?body.media.map(m=>({
     listing_id:listingId,
     sort_order:m.sort_order||0,
     original_filename:m.original_filename||'',
     signedUrl:m.signed_url||''
   })):[];
 }catch{return[]}
}
function money(value,currency){
 try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:currency||'GBP'}).format(Number(value));}
 catch{return (currency||'GBP')+' '+value;}
}

function renderPublicNav(site,catalogue){
 const name=site.name||'Your business';
 const branding=site.branding&&typeof site.branding==='object'?site.branding:{};
 const logoUrl=Object.prototype.hasOwnProperty.call(branding,'logo_url')?String(branding.logo_url||''):(window.__tradeflowPublicProfile?.logo_url||site.logo_url||'');
 const logo=logoUrl?'<img src="'+esc(logoUrl)+'" alt="'+esc(name)+'">':'<span>'+esc(name)+'</span>';
 const cats=Array.isArray(catalogue?.categories)?catalogue.categories:[];
 const pages=Array.isArray(site.pages)?site.pages:[];
 const headerLinks=Array.isArray(site.header?.links)?site.header.links:['home','buying','shop','about','contact'];
 const titleFor=slug=>slug==='home'?'Home':slug==='buying'?'What We Buy':slug==='shop'?'What We Sell':(pages.find(p=>p.slug===slug)?.title||slug);
 const links=headerLinks.filter(slug=>slug==='home'||pages.some(p=>p.slug===slug&&p.enabled!==false));
 const buying='<a class="public-buy-link" href="'+pageUrl('sell')+'">Sell to Us</a>';
 const normal=links.filter(slug=>slug!=='buying'&&slug!=='shop').map(slug=>'<a href="'+pageUrl(slug)+'">'+esc(titleFor(slug))+'</a>').join('');
 const accountLabel=isCustomerSession()?'Customer Account':'Customer Login';
 return '<header class="public-header"><div class="public-nav"><a class="public-brand" href="'+pageUrl('home')+'">'+logo+'</a><div class="public-nav-links">'+normal+buying+'<a class="public-sell-link" href="'+pageUrl('shop')+'">Visit Shop</a><a class="public-account-link" href="'+customerUrl()+'">'+accountLabel+'</a></div></div></header>';
}

function heroImage(url,alt,cls){
 if(url)return '<img class="'+(cls||'')+'" src="'+esc(url)+'" alt="'+esc(alt||'')+'" loading="lazy">';
 return '<div class="public-demo-image '+(cls||'')+'" aria-hidden="true"></div>';
}

function renderHero(site){
 const home=site.homepage||{};
 const t=site.template||'editorial';
 const name=site.name||'Your business';
 const headline=home.headline||'A clear way to buy and sell';
 const intro=home.intro||'Make it simple for customers to see what you buy, what you sell and how to get started.';
 const copy=site.template_copy||{};
 const defaults={
  editorial:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  classic:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  grid:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  studio:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  horizon:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  field:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  business:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  luxe:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  commerce:{kicker:'',cta1:'',cta2:'Visit our retail shop'},
  impact:{kicker:'',cta1:'',cta2:'Visit our retail shop'}
 };
 const d=defaults[t]||defaults.editorial;
 const known=['YOUR BUSINESS','ESTABLISHED SERVICE','BUY / SELL / TRADE','BUYING / SELLING','BUSINESS INFORMATION','PRIVATE SERVICE','BUY / SELL','BUY · SELL · TRADE'];
 const cta=['What do you have to sell?','What we buy','What we sell','Sell to us','Browse the shop','Explore the shop','Sell your items','Browse products','Retail shop','Shop products','Start selling','01 / WHAT WE BUY','02 / WHAT WE SELL'];
 const safeCopy=Object.assign({},copy||{});
 if(known.includes(String(safeCopy.kicker||'')) || /^\s*\d+\s*\/\s*/.test(String(safeCopy.kicker||'')))safeCopy.kicker='';
 if(cta.includes(String(safeCopy.cta1||'')) || /^\s*\d+\s*\/\s*/.test(String(safeCopy.cta1||'')))safeCopy.cta1='';
 if(String(safeCopy.cta2||'').trim().toLowerCase()==='what we sell')safeCopy.cta2='Visit our retail shop'; else if(cta.includes(String(safeCopy.cta2||'')) || /^\s*\d+\s*\/\s*/.test(String(safeCopy.cta2||'')))safeCopy.cta2='';
 const kicker=esc(safeCopy.kicker||d.kicker);
 const cta1=esc(safeCopy.cta1||d.cta1);
 const cta2=esc(safeCopy.cta2||d.cta2);
 const a1=cta1?'<a href="'+pageUrl('sell')+'">'+cta1+'</a>':'';
 const a2=cta2?'<a href="'+pageUrl('shop')+'">'+cta2+'</a>':'';
 const heroUrl=home.image_url||'';
 const i1=heroUrl?heroImage(heroUrl,name+' website banner'):'<div class="generated-brand-banner" role="img" aria-label="'+esc(name)+'">'+esc(name)+'</div>';
 const i2=home.image_url2?heroImage(home.image_url2,name+' second image'):'<div class="public-demo-image" aria-hidden="true"></div>';
 const h=esc(headline),p=esc(intro);
 switch(t){
 case 'editorial':return '<section class="tpl-hero editorial-hero"><div class="editorial-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="editorial-images">'+i1+i2+'</div></section>';
 case 'classic':return '<section class="tpl-hero classic-hero"><div class="classic-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="classic-frame">'+i1+'</div></section>';
 case 'grid':return '<section class="tpl-hero grid-hero"><div><span class="tpl-code">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="grid-cta-row">'+a1+a2+'</div></div><div class="grid-image">'+i1+'</div></section>';
 case 'studio':return '<section class="tpl-hero studio-hero"><div class="studio-image">'+i1+'</div><div class="studio-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div></section>';
 case 'horizon':return '<section class="tpl-hero horizon-hero"><div class="horizon-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="horizon-image">'+i1+'</div></section>';
 case 'field':return '<section class="tpl-hero field-hero"><div class="field-image">'+i1+'</div><div class="field-overlay"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div></section>';
 case 'business':return '<section class="tpl-hero business-hero"><div class="business-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="business-facts"></div></section>';
 case 'luxe':return '<section class="tpl-hero luxe-hero"><div class="luxe-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="luxe-image">'+i1+'</div></section>';
 case 'commerce':return '<section class="tpl-hero commerce-hero"><div class="commerce-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="commerce-actions">'+a1+a2+'</div></div><div class="commerce-panel"></div></section>';
 case 'impact':return '<section class="tpl-hero impact-hero"><div class="impact-word">BUY.<br>SELL.</div><div class="impact-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="impact-image">'+i1+'</div></section>';default:return '<section class="tpl-hero editorial-hero"><div class="editorial-copy"><span class="tpl-eyebrow">'+kicker+'</span><h1>'+h+'</h1><p>'+p+'</p><div class="tpl-actions">'+a1+a2+'</div></div><div class="editorial-images">'+i1+i2+'</div></section>';
 }
}

function renderBuyingSection(site,catalogue){
 const home=site.homepage||{};
 const heading=home.buy_heading||'What we buy';
 const intro=home.buy_intro||'Tell customers what you are looking to buy.';
 const products=Array.isArray(catalogue?.products)?catalogue.products:[];
 const cats=Array.isArray(catalogue?.categories)?catalogue.categories:[];
 const sectionImage=home.buy_image_url||'';
 const sectionImageMarkup=sectionImage?'<img src="'+esc(sectionImage)+'" alt="'+esc(home.buy_image_alt||heading)+'" loading="lazy">':'<span aria-hidden="true"></span>';
 const cards=cats.map(cat=>{
   const items=products.filter(p=>p.category_id===cat.id);
   const image=items.find(p=>p.image_url)?.image_url||'';
   const imageMarkup=image?'<img src="'+esc(image)+'" alt="'+esc(cat.name)+'" loading="lazy">':'<span aria-hidden="true"></span>';
   return '<article class="buy-category-card"><div class="buy-category-image">'+imageMarkup+'</div><div class="buy-category-copy"><h3>'+esc(cat.name)+'</h3><strong>'+items.length+' '+(items.length===1?'product':'products')+'</strong><p>'+esc(cat.description||'Products selected for this business buying list.')+'</p><a href="'+pageUrl('sell','category='+encodeURIComponent(cat.id))+'">Sell this type →</a></div></article>';
 }).join('');
 return '<section class="public-section buying-section"><div class="section-intro buying-intro"><div><h2>'+esc(heading)+'</h2><p>'+esc(intro)+'</p></div><div class="section-intro-image">'+sectionImageMarkup+'</div></div></section>';
}

function renderSellingSection(site,listings){
 const home=site.homepage||{};
 const heading=home.sell_heading||'What we sell';
 const intro=home.sell_intro||'Browse the products currently published by this business.';
 const sectionImage=home.sell_image_url||'';
 const sectionImageMarkup=sectionImage?'<img src="'+esc(sectionImage)+'" alt="'+esc(home.sell_image_alt||heading)+'" loading="lazy">':'<span aria-hidden="true"></span>';
 const list=Array.isArray(listings)?listings:[];
 const cards=list.slice(0,6).map(p=>'<article class="sell-product-card"><div class="sell-photo">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.title||'')+'">':'<span aria-hidden="true"></span>')+'</div><span>'+esc(p.category_name||'')+'</span><h3>'+esc(p.title||'Product')+'</h3><strong>'+esc(p.asking_price!=null?money(p.asking_price,p.currency):'')+'</strong><a href="'+publicProductUrl(p.listing_id)+'">View product</a></article>').join('');
 return '<section class="public-section selling-section"><div class="section-intro selling-intro"><div><h2>'+esc(heading)+'</h2><p>'+esc(intro)+'</p></div><div class="section-intro-image">'+sectionImageMarkup+'</div></div>'+(cards?'<div class="sell-product-grid">'+cards+'</div>':'')+'</section>';
}

function renderHomepageTiles(site){
 const home=site.homepage||{};
 const tiles=Array.isArray(home.tiles)?home.tiles:[];
 const count=[3,4,6,8,9,10,12].includes(Number(home.tile_count))?Number(home.tile_count):8;
 const columns=[2,3,4].includes(Number(home.tile_columns))?Number(home.tile_columns):4;
 const visible=tiles.slice(0,count);
 if(!visible.length)return '';
 const cards=visible.map(tile=>'<article class="editable-home-tile '+(tile.side==='buy'?'buy-tile':'sell-tile')+'"><div class="tile-image">'+(tile.image_url?'<img src="'+esc(tile.image_url)+'" alt="'+esc(tile.image_alt||tile.title||'')+'">':'<span aria-hidden="true"></span>')+'</div><div class="tile-copy">'+(tile.title?'<h3>'+esc(tile.title)+'</h3>':'')+(tile.body?'<p>'+esc(tile.body)+'</p>':'')+(tile.cta?'<b>'+esc(tile.cta)+'</b>':'')+'</div></article>').join('');
 return '<section class="homepage-tiles"><div class="homepage-tile-grid" style="--tile-columns:'+columns+'">'+cards+'</div></section>';
}

function renderFooter(site){
 const name=site.name||'Your business';
 const footer=site.footer||{};
 const pages=Array.isArray(site.pages)?site.pages:[];
 const links=Array.isArray(footer.links)?footer.links:['home','buying','shop','about','contact'];
 const titleFor=slug=>slug==='home'?'Home':slug==='buying'?'What We Buy':slug==='shop'?'What We Sell':(pages.find(p=>p.slug===slug)?.title||slug);
 const out=links.filter(slug=>slug!=='buying'&&(slug==='home'||pages.some(p=>p.slug===slug&&p.enabled!==false))).map(slug=>'<a href="'+pageUrl(slug)+'">'+esc(titleFor(slug))+'</a>').join('');
 const accountLabel=isCustomerSession()?'Customer Account':'Customer Login';
 return '<footer class="public-footer"><div><strong>'+esc(name)+'</strong><p>'+esc(footer.text||'')+'</p></div><nav>'+out+'<a href="'+pageUrl('sell')+'">Sell to Us</a><a href="'+pageUrl('shop')+'">What We Sell</a><a href="'+customerUrl()+'">'+accountLabel+'</a></nav><small>Powered by TradeFlow</small></footer>';
}

function renderBusinessExtras(site){
 const box=$('site-extras');if(!box)return;
 const social=site.social||{},reviews=Array.isArray(site.reviews)?site.reviews:[];
 const safe=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
 const items=[['facebook','Facebook'],['instagram','Instagram'],['linkedin','LinkedIn'],['youtube','YouTube'],['tiktok','TikTok'],['x','X']].map(x=>{const u=safe(social[x[0]]);return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+x[1]+'</a>':''}).filter(Boolean);
 const reviewItems=reviews.map(r=>{const u=safe(r.url);return u&&r.label?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Reviews: '+esc(r.label)+'</a>':''}).filter(Boolean);
 if(items.length||reviewItems.length)box.hidden=false,box.innerHTML='<div class="extras-inner">'+(items.length?'<strong>Follow us</strong>'+items.join(''):'')+(reviewItems.length?'<strong>Reviews</strong>'+reviewItems.join(''):'')+'</div>';
}

function renderHome(site,catalogue,listings){
 const sections=Object.assign({hero:true,dual:true,buy:true,sell:true,trust:false,shop:true},site.homepage?.sections||{});
 const order=Array.isArray(site.homepage?.block_order)&&site.homepage.block_order.length?site.homepage.block_order:['hero','buy','sell','trust'];
 const blocks={
  hero:sections.hero!==false?renderHero(site):'',
  buy:sections.buy!==false?renderBuyingSection(site,catalogue):'',
  sell:sections.sell!==false?renderSellingSection(site,listings):'',
  trust:''
 };
 let out=renderPublicNav(site,catalogue);
 const ordered=order.filter(k=>blocks[k]).map(k=>blocks[k]).join('');
 if(sections.hero!==false)out+=ordered;
 else out+=ordered;
 out+=renderHomepageTiles(site);
 return out+renderCustomerContact()+renderFooter(site);
}


function renderSellPage(site,catalogue){
 const cats=Array.isArray(catalogue?.categories)?catalogue.categories:[];
 const requestedCategory=new URLSearchParams(location.search).get('category');
 const selectedCategory=cats.find(c=>String(c.id)===String(requestedCategory));
 const options=cats.map(x=>'<option value="'+esc(x.id)+'" '+(selectedCategory&&String(selectedCategory.id)===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('');
 const body=`<main class="selling-journey"><div class="selling-journey-head"><span>SELL TO US</span><h1>What do you have to sell?</h1><p>Choose what you have and we will narrow it down step by step. You do not need to search through a long product list.</p><div class="preview-notice" data-subscriber-preview hidden><strong>Subscriber preview</strong><span>You are signed in as the business owner. The customer selling journey is available to view, but customer valuation requests are disabled in the subscriber session.</span></div><div class="journey-progress"><b data-progress="1">1</b><b data-progress="2">2</b><b data-progress="3">3</b><b data-progress="4">4</b><b data-progress="5">5</b><b data-progress="6">6</b><b data-progress="7">7</b></div></div><form id="selling-journey-form" class="selling-wizard" novalidate>
<section class="sell-step" data-step="1"><h2>What do you have to sell?</h2><p>Start with the type of equipment.</p><label>Category<select id="sell-category" required><option value="">Choose a category…</option>__OPTIONS__</select></label><div class="sell-actions"><button type="button" data-next>Continue</button></div></section>
<section class="sell-step" data-step="2" hidden><h2>What type?</h2><p>Choose the product type or branch.</p><label>Product type<select id="sell-type" required><option value="">Choose a type…</option></select></label><div class="sell-actions"><button type="button" data-back>Back</button><button type="button" data-next>Continue</button></div></section>
<section class="sell-step" data-step="3" hidden><h2>What make?</h2><p>Choose the manufacturer.</p><label>Manufacturer<select id="sell-manufacturer" required><option value="">Choose a manufacturer…</option></select></label><div class="sell-actions"><button type="button" data-back>Back</button><button type="button" data-next>Continue</button></div></section>
<section class="sell-step" data-step="4" hidden><h2>What model?</h2><p>Select the exact model where available.</p><label>Model<select id="sell-model" required><option value="">Choose a model…</option></select></label><label id="sell-package-wrap" hidden>Package / version<select id="sell-package"><option value="">Choose a package…</option></select></label><div class="sell-actions"><button type="button" data-back>Back</button><button type="button" data-next>Continue</button></div></section>
<section class="sell-step" data-step="5" hidden><h2>What condition is it in?</h2><p>This helps us understand the item before review.</p><fieldset class="condition-grid"><label><input type="radio" name="sell-condition" value="factory-sealed"> Factory sealed / unopened</label><label><input type="radio" name="sell-condition" value="opened-unused"> Opened but unused</label><label><input type="radio" name="sell-condition" value="excellent"> Excellent</label><label><input type="radio" name="sell-condition" value="good"> Good</label><label><input type="radio" name="sell-condition" value="fair"> Fair</label><label><input type="radio" name="sell-condition" value="damaged"> Damaged</label><label><input type="radio" name="sell-condition" value="not-working"> Not working / spares only</label></fieldset><div class="sell-actions"><button type="button" data-back>Back</button><button type="button" data-next>Continue</button></div></section>
<section class="sell-step" data-step="6" hidden><h2>A few final questions</h2><p>These details help our team review the request.</p><label>Is anything normally supplied with this package missing?<select id="sell-missing"><option value="">Choose…</option><option value="no">No</option><option value="yes">Yes</option></select></label><label>Do you have the legal right to sell this equipment?<select id="sell-ownership"><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option><option value="not-sure">I am not sure</option></select></label><label id="sell-serial-wrap" hidden>Serial number<input id="sell-serial" autocomplete="off"></label><div id="sell-photo-upload" class="sell-photo-upload"></div><label>Anything else we should know? <span class="optional">(optional)</span><textarea id="sell-notes" rows="4" placeholder="Accessories, faults, missing items, history or anything else that matters."></textarea></label><div class="sell-actions"><button type="button" data-back>Back</button><button type="button" data-next>Review request</button></div></section>
<section class="sell-step" data-step="7" hidden><h2>Check your selling request</h2><p>Review the details before submitting your valuation request.</p><div id="sell-summary" class="sell-summary"></div><div class="sell-handoff"><strong>Next step</strong><p>Submit your request here. Once it has been submitted, you will be taken to your customer account to view its progress, offers and completed purchase history.</p></div><div class="sell-actions"><button type="button" data-back>Back</button><button type="submit">Submit valuation request →</button></div></section>
</form></main>`;
 return renderPublicNav(site,catalogue)+body.replace('__OPTIONS__',options)+renderFooter(site);
}

async function getStoredCustomerSession(){
 try{
  const key=activeTenantId?'tradeflow_customer_session:'+activeTenantId:'tradeflow_customer_session:unknown';
  let session=JSON.parse(sessionStorage.getItem(key)||'null');
  if(!session?.access_token)return null;
  let response=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+session.access_token}});
  if(response.ok)return session;
  if(session.refresh_token){
   const refresh=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
    method:'POST',
    headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:session.refresh_token})
   });
   const text=await refresh.text();let data=null;try{data=text?JSON.parse(text):null}catch{}
   if(refresh.ok&&data?.access_token){
    sessionStorage.setItem(key,JSON.stringify(data));
    return data;
   }
  }
 }catch{}
 const key=activeTenantId?'tradeflow_customer_session:'+activeTenantId:'tradeflow_customer_session:unknown';
 sessionStorage.removeItem(key);
 return null;
}
async function submitCustomerSellingRequest(payload,session,files=[]){
 const buildForm=()=>{
  const formData=new FormData();
  formData.append('tenant_id',activeTenantId);
  formData.append('payload',JSON.stringify(payload));
  files.forEach(file=>formData.append('files',file,file.name));
  return formData;
 };
 let current=session;
 for(let attempt=0;attempt<2;attempt++){
  const response=await fetch(SUPABASE_URL+'/functions/v1/customer-selling-submit',{
   method:'POST',
   headers:{apikey:KEY,Authorization:'Bearer '+current.access_token},
   body:buildForm()
  });
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
  if(response.ok)return body;
  const jwtFailure=response.status===401&&/invalid jwt|jwt|token/i.test(String(body?.message||body?.msg||body?.error||text||''));
  if(jwtFailure&&attempt===0){
   const refreshed=await getStoredCustomerSession();
   if(refreshed?.access_token){current=refreshed;continue}
  }
  throw new Error(body?.message||body?.msg||body?.error||text||('HTTP '+response.status));
 }
 throw new Error('Customer session could not be refreshed.');
}
function bindSellWizard(site,catalogue){
 const form=$('selling-journey-form');if(!form)return;
 const photoUpload=$('sell-photo-upload');
 if(photoUpload&&!$('sell-photos')){
  photoUpload.innerHTML='<label>Photographs <span class="optional">(optional)</span></label><input id="sell-photos" accept="image/jpeg,image/png,image/webp" multiple><div id="sell-photo-list" class="small"></div><p class="small">Add clear photographs of the item, accessories and any faults or damage.</p>';
  const photoInput=$('sell-photos');photoInput.setAttribute('type','fi'+'le');
  photoInput.addEventListener('change',()=>{const count=photoInput.files?.length||0;$('sell-photo-list').textContent=count?count+' photograph'+(count===1?'':'s')+' selected':''});
 }
 const previewNotice=document.querySelector('[data-subscriber-preview]');if(previewNotice&&isSubscriberSession())previewNotice.hidden=false;
 const products=Array.isArray(catalogue?.products)?catalogue.products:[];
 const cats=Array.isArray(catalogue?.categories)?catalogue.categories:[];
 let step=1;
 let submitInFlight=false;
 const unique=a=>Array.from(new Set(a.filter(Boolean)));
 const val=id=>$(id)?.value||'';
 const category=()=>cats.find(c=>String(c.id)===String(val('sell-category')));
 const filtered=()=>products.filter(p=>String(p.category_id)===String(val('sell-category'))&&(!val('sell-type')||String(p.branch_name||p.product_type||'')===String(val('sell-type')))&&(!val('sell-manufacturer')||String(p.manufacturer||'')===String(val('sell-manufacturer'))));
 function setOptions(id,items,placeholder){const el=$(id);if(!el)return;el.innerHTML='<option value="">'+esc(placeholder)+'</option>'+unique(items).sort((a,b)=>String(a).localeCompare(String(b))).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')}
 function updateType(){const rows=products.filter(p=>String(p.category_id)===String(val('sell-category')));setOptions('sell-type',rows.map(p=>p.branch_name||p.product_type),'Choose a type…');$('sell-type').disabled=!rows.some(p=>p.branch_name||p.product_type);updateManufacturer()}
 function updateManufacturer(){const rows=products.filter(p=>String(p.category_id)===String(val('sell-category'))&&(!val('sell-type')||String(p.branch_name||p.product_type||'')===String(val('sell-type'))));setOptions('sell-manufacturer',rows.map(p=>p.manufacturer),'Choose a manufacturer…');$('sell-manufacturer').disabled=!rows.some(p=>p.manufacturer);updateModel()}
 function updateModel(){const rows=products.filter(p=>String(p.category_id)===String(val('sell-category'))&&(!val('sell-type')||String(p.branch_name||p.product_type||'')===String(val('sell-type')))&&(!val('sell-manufacturer')||String(p.manufacturer||'')===String(val('sell-manufacturer'))));setOptions('sell-model',rows.map(p=>p.model),'Choose a model…');$('sell-model').disabled=!rows.some(p=>p.model);updatePackage()}
 function updatePackage(){const rows=filtered().filter(p=>p.model===val('sell-model'));const packages=unique(rows.map(p=>p.package_name));$('sell-package-wrap').hidden=!packages.length;$('sell-package').innerHTML='<option value="">Choose a package…</option>'+packages.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')}
 function updateSerial(){$('sell-serial-wrap').hidden=!/dji/i.test(val('sell-manufacturer'))}
 function validCurrent(){if(step===1&&!val('sell-category'))return 'Choose a category.';if(step===2&&!$('sell-type').disabled&&!val('sell-type'))return 'Choose a product type.';if(step===3&&!$('sell-manufacturer').disabled&&!val('sell-manufacturer'))return 'Choose a manufacturer.';if(step===4&&!$('sell-model').disabled&&!val('sell-model'))return 'Choose a model.';if(step===5&&!form.querySelector('input[name="sell-condition"]:checked'))return 'Choose the item condition.';if(step===6&&!val('sell-missing'))return 'Tell us whether anything is missing.';if(step===6&&!val('sell-ownership'))return 'Tell us whether you have the legal right to sell it.';if(step===6&&!$('sell-serial-wrap').hidden&&!val('sell-serial'))return 'Enter the serial number for this item.';return ''}
 function renderStep(){form.querySelectorAll('.sell-step').forEach(x=>x.hidden=Number(x.dataset.step)!==step);document.querySelectorAll('[data-progress]').forEach(x=>x.classList.toggle('active',Number(x.dataset.progress)===step));if(step===7)renderSummary();window.scrollTo({top:0,behavior:'smooth'})}
 function renderSummary(){const cat=category(),condition=form.querySelector('input[name="sell-condition"]:checked')?.value||'';const rows=[['Category',cat?.name||val('sell-category')],['Product type',val('sell-type')||'Not specified'],['Manufacturer',val('sell-manufacturer')||'Not specified'],['Model',val('sell-model')||'Not specified'],['Package / version',val('sell-package')||'Not specified'],['Condition',condition||'Not specified'],['Missing items',val('sell-missing')||'Not specified'],['Legal right to sell',val('sell-ownership')||'Not specified']];if(val('sell-serial'))rows.push(['Serial number',val('sell-serial')]);if(val('sell-notes'))rows.push(['Notes',val('sell-notes')]);$('sell-summary').innerHTML=rows.map(r=>'<div><span>'+esc(r[0])+'</span><strong>'+esc(r[1])+'</strong></div>').join('')}
 $('sell-category').addEventListener('change',()=>{updateType();updateSerial()});$('sell-type').addEventListener('change',updateManufacturer);$('sell-manufacturer').addEventListener('change',()=>{updateModel();updateSerial()});$('sell-model').addEventListener('change',updatePackage);
 form.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{const error=validCurrent();if(error){alert(error);return}step=Math.min(7,step+1);renderStep()}));form.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>{step=Math.max(1,step-1);renderStep()}));
 form.addEventListener('submit',async e=>{e.preventDefault();if(submitInFlight)return;const error=validCurrent();if(error){alert(error);return}if(isSubscriberSession()){alert('Customer valuation requests cannot be submitted while you are signed in as the subscriber. Sign out of the subscriber account and use a separate customer account to test the customer journey.');return}const cat=category(),condition=form.querySelector('input[name="sell-condition"]:checked')?.value||null;const selectedProduct=products.find(p=>String(p.category_id)===String(val('sell-category'))&&String(p.branch_name||p.product_type||'')===String(val('sell-type'))&&String(p.manufacturer||'')===String(val('sell-manufacturer'))&&String(p.model||'')===String(val('sell-model'))&&String(p.package_name||'')===String(val('sell-package')));const payload={tenant_id:activeTenantId,category_id:val('sell-category'),buying_product_id:selectedProduct?.product_id||null,category_name:cat?.name||'',product_type:val('sell-type'),manufacturer:val('sell-manufacturer'),model:val('sell-model'),package_name:val('sell-package'),condition,missing_items:val('sell-missing'),legal_right:val('sell-ownership'),serial_number:val('sell-serial'),notes:val('sell-notes'),created_at:new Date().toISOString()};const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.dataset.label=button.textContent;button.textContent='Submitting…'}submitInFlight=true;try{const session=await getStoredCustomerSession();if(session?.access_token){const photos=[...($('sell-photos')?.files||[])];await submitCustomerSellingRequest(payload,session,photos);sessionStorage.removeItem('tradeflow_selling_journey');location.href=customerUrl('selling_journey=1&submitted=1')}else{sessionStorage.setItem('tradeflow_selling_journey',JSON.stringify(payload));location.href=customerUrl('selling_journey=1&submit_selling_request=1')}}catch(err){submitInFlight=false;if(button){button.disabled=false;button.textContent=button.dataset.label||'Submit valuation request →'}alert(err.message||String(err))}});
 if(val('sell-category')){updateType();updateSerial()}renderStep();
}

function renderPageTiles(site,p){
 const cfg=pageTileConfigPublic(p);
 if(!cfg.tiles.length)return '';
 const cards=cfg.tiles.slice(0,cfg.count).map(tile=>'<article class="public-page-tile"><div class="page-tile-image">'+(tile.image_url?'<img src="'+esc(tile.image_url)+'" alt="'+esc(tile.image_alt||tile.title||'')+'" loading="lazy">':'<span aria-hidden="true"></span>')+'</div><div class="page-tile-copy">'+(tile.title?'<h3>'+esc(tile.title)+'</h3>':'')+(tile.body?'<p>'+esc(tile.body)+'</p>':'')+(tile.cta?'<b>'+esc(tile.cta)+'</b>':'')+'</div></article>').join('');
 return '<section class="public-page-tiles" style="--tile-columns:'+cfg.columns+'">'+cards+'</section>';
}
function pageTileConfigPublic(p){
 const tiles=Array.isArray(p?.tiles)?p.tiles:[];
 return {tiles,count:[3,4,6,8,9,10,12].includes(Number(p?.tile_count))?Number(p.tile_count):6,columns:[2,3,4].includes(Number(p?.tile_columns))?Number(p.tile_columns):3};
}

function renderProductPage(site,listings){
 const list=Array.isArray(listings)?listings:[];
 const listingId=params.get('listing')||params.get('listing_id')||'';
 const item=list.find(x=>String(x.listing_id||'')===String(listingId));
 if(!item){
   return renderPublicNav(site,window.__tradeflowBuyingCatalogue||{})+'<main class="public-page product-page"><div class="product-unavailable"><h1>Product unavailable</h1><p>This product is no longer published on this website.</p><a class="start-selling" href="'+pageUrl('shop')+'">Back to What We Sell</a></div></main>'+renderFooter(site);
 }
 const media=(window.__tradeflowListingMedia||[]).filter(x=>String(x.listing_id)===String(item.listing_id));
 const mainMedia=media[0];
 const thumbnailMedia=media.slice(1);
 const gallery=mainMedia
   ? '<div class="product-gallery-main"><figure><img src="'+esc(mainMedia.signedUrl||'')+'" alt="'+esc(mainMedia.original_filename||item.title||'Product')+'" loading="eager"></figure></div>'+
     (thumbnailMedia.length?'<div class="product-gallery-thumbs">'+thumbnailMedia.map(m=>'<figure><img src="'+esc(m.signedUrl||'')+'" alt="'+esc(m.original_filename||item.title||'Product')+'" loading="lazy"></figure>').join('')+'</div>':'')
   : '<div class="product-image-empty">No product photograph is currently available.</div>';
 const buyUrl=customerBasketUrl(item.listing_id);
 const retailCondition=String(item.listing_data?.condition||'').trim();
 const conditionLabel=retailCondition?retailCondition.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase()):'Not specified';
 const shipping=item.listing_data?.shipping||{};
 const shippingMethod=String(shipping.method||'customer_pays');
 const shippingPrice=Number(shipping.price);
 let postageText='Not set';
 if(Number.isFinite(shippingPrice)&&shippingPrice>0)postageText=money(shippingPrice,item.currency||'GBP');
 else if(shippingMethod==='included')postageText='Included in price';
 else if(shippingMethod==='free')postageText='Free';
 else if(shippingMethod==='customer_pays')postageText='Not set';
 return renderPublicNav(site,window.__tradeflowBuyingCatalogue||{})+
   '<main class="public-page product-page"><div class="product-detail">'+
   '<header class="product-heading"><h1>'+esc(item.title||'Product')+'</h1></header>'+
   '<div class="product-main"><div class="product-gallery">'+gallery+'</div>'+
   '<aside class="product-purchase"><strong class="product-price">'+esc(item.asking_price!=null?money(item.asking_price,item.currency):'Contact us')+'</strong>'+
   '<dl class="product-facts"><div><dt>Condition</dt><dd>'+esc(conditionLabel)+'</dd></div><div><dt>P&amp;P</dt><dd>'+esc(postageText)+'</dd></div></dl>'+
   '<a class="start-selling product-buy-button" href="'+esc(buyUrl)+'">Buy this item</a><a class="product-back-link" href="'+pageUrl('shop')+'">Back to What We Sell</a></aside></div>'+
   '<section class="product-description-box"><h2>About this item</h2><p class="product-description">'+esc(item.description||'Available from this business.')+'</p></section>'+
   '</div></main>'+renderFooter(site);
}

function renderBuyingPage(site,catalogue){
 const cats=Array.isArray(catalogue?.categories)?catalogue.categories:[];
 const p=(Array.isArray(site.pages)?site.pages:[]).find(x=>x.slug==='buying')||{};
 const selector='<div class="public-filter valuation-start"><div class="valuation-start-copy"><strong>'+esc(p.buying_action_heading||'Sell your items')+'</strong><span>'+esc(p.buying_action_text||'Choose a category to start your selling journey.')+'</span></div><label><span>Choose a category</span><select aria-label="Choose a category" onchange="if(this.value)location.href=this.value"><option value="">Choose a category…</option>'+cats.map(c=>'<option value="'+esc(pageUrl('sell','category='+encodeURIComponent(c.id)))+'">'+esc(c.name)+'</option>').join('')+'</select></label></div>';
 return renderPublicNav(site,catalogue)+'<main class="public-page"><div class="page-title-block"><h1>'+esc(p.title||'What We Buy')+'</h1><p>'+esc(p.body||'')+'</p></div>'+selector+renderPageTiles(site,p)+'</main>'+renderFooter(site);
}

function renderShopPage(site,listings){
 const list=Array.isArray(listings)?listings:[];
 const p=(Array.isArray(site.pages)?site.pages:[]).find(x=>x.slug==='shop')||{}; const branding=site.branding&&typeof site.branding==='object'?site.branding:{}; const logoUrl=Object.prototype.hasOwnProperty.call(branding,'logo_url')?String(branding.logo_url||''):(window.__tradeflowPublicProfile?.logo_url||site.logo_url||''); const bannerUrl=Object.prototype.hasOwnProperty.call(branding,'banner_url')?String(branding.banner_url||''):(window.__tradeflowPublicProfile?.banner_url||'');
 const searchHeading=p.shop_search_heading||'Find a product';const configuredSearchPlaceholder=String(p.shop_search_placeholder||'').trim();const searchPlaceholder=configuredSearchPlaceholder&&configuredSearchPlaceholder.toUpperCase()!=='PLACEHOLDER'?configuredSearchPlaceholder:'Search products, categories or descriptions…';const cards=list.map(item=>'<article class="shop-product" data-product-search="'+esc([item.title,item.category_name,item.description].filter(Boolean).join(' ').toLowerCase())+'"><div class="shop-photo">'+(item.image_url?'<img src="'+esc(item.image_url)+'" alt="'+esc(item.title||'Product')+'" loading="lazy">':'<span aria-hidden="true"></span>')+'</div><span>'+esc(item.category_name||'Product')+'</span><h2>'+esc(item.title||'Product')+'</h2><p>'+esc(item.description||'Available from this business.')+'</p><strong>'+esc(item.asking_price!=null?money(item.asking_price,item.currency):'Contact us')+'</strong><a href="'+publicProductUrl(item.listing_id)+'">View product</a></article>').join('');
 return renderPublicNav(site,window.__tradeflowBuyingCatalogue||{})+'<main class="public-page"><div class="page-title-block shop-page-title">'+(bannerUrl?'<div class="shop-page-banner"><img src="'+esc(bannerUrl)+'" alt="'+esc(site.name||'Website banner')+'" loading="eager"></div>':(logoUrl?'<img class="shop-page-logo" src="'+esc(logoUrl)+'" alt="'+esc(site.name||'Business')+'">':'<h1>'+esc(site.name||'What We Sell')+'</h1>'))+'<p>'+esc(p.body||'')+'</p></div>'+renderPageTiles(site,p)+'<div class="public-filter product-search"><label><span>'+esc(searchHeading)+'</span><input type="search" id="tradeflow-product-search" placeholder="'+esc(searchPlaceholder)+'" autocomplete="off"></label></div><div class="shop-grid">'+(cards||'<div class="connected-empty">No products are currently published.</div>')+'</div></main>'+renderFooter(site);
}

function bindProductSearch(){const input=$('tradeflow-product-search');if(!input)return;const cards=Array.from(document.querySelectorAll('[data-product-search]'));input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();cards.forEach(card=>{card.hidden=!!q&&!card.dataset.productSearch.includes(q)});const visible=cards.some(card=>!card.hidden);const grid=input.closest('main')?.querySelector('.shop-grid');if(grid){let empty=grid.querySelector('.search-empty');if(!visible){if(!empty){empty=document.createElement('div');empty.className='connected-empty search-empty';empty.textContent='No products match your search.';grid.appendChild(empty)}}else if(empty)empty.remove();}})}

function renderContentPage(site,p){
 const image=p.image_url?'<img class="content-page-image" src="'+esc(p.image_url)+'" alt="'+esc(p.image_alt||p.title||'Page image')+'">':'';
 return renderPublicNav(site,window.__tradeflowBuyingCatalogue||{})+'<main class="public-page"><div class="page-title-block"><h1>'+esc(p.title||'Page')+'</h1><div class="content-body">'+esc(p.body||'').replace(/\n/g,'<br>')+'</div>'+image+'</div>'+renderPageTiles(site,p)+'</main>'+renderFooter(site);
}

function applyContent(content){
 window.__tradeflowSiteContent=content;
 const site=Object.assign({},content?.site||{});if(window.__tradeflowPublicProfile?.business_name)site.name=window.__tradeflowPublicProfile.business_name;
 const theme=site.theme||{};
 const backgroundMode=theme.background_mode==='custom'?'custom':'preset';
 const typography=Object.assign({font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid'},theme.typography||{});
 document.documentElement.style.setProperty('--accent',theme.accent||'#c46a2b');
 document.documentElement.style.setProperty('--page-bg',theme.page_bg||'#f5f6f8');
 document.documentElement.style.setProperty('--text-color',theme.text||'#17202a');
 document.documentElement.style.setProperty('--header-bg',theme.header_bg||'#fff');
 document.documentElement.style.setProperty('--buy-bg',theme.buy_bg||'#fff');
 document.documentElement.style.setProperty('--sell-bg',theme.sell_bg||'#f4f6f7');
 document.documentElement.style.setProperty('--footer-bg',theme.footer_bg||'#17202a');document.documentElement.style.setProperty('--site-background-color',theme.background_color||'#f5faff');document.documentElement.style.setProperty('--site-background-image',theme.background_image||'none');document.documentElement.style.setProperty('--site-background-size',theme.background_size||'cover');document.documentElement.style.setProperty('--site-background-repeat',theme.background_repeat||'no-repeat');
 document.documentElement.style.setProperty('--font-family',typography.font||'Inter');
 document.body.dataset.template=site.template||'editorial';
 document.body.dataset.backgroundMode=backgroundMode;
 document.body.dataset.font=typography.font||'Inter';
 document.body.dataset.heroSize=typography.hero||'large';
 document.title=site.name||'Your business';
 const catalogue=window.__tradeflowBuyingCatalogue||{categories:[],products:[]};
 const listings=window.__tradeflowListings||[];
 let html='';
 if(page==='home')html=renderHome(site,catalogue,listings);
 else if(page==='sell')html=renderSellPage(site,catalogue);
 else if(page==='buying')html=renderBuyingPage(site,catalogue);
 else if(page==='shop')html=renderShopPage(site,listings);
 else if(page==='product')html=renderProductPage(site,listings);
 else {
   const p=(Array.isArray(site.pages)?site.pages:[]).find(x=>x.slug===page&&x.enabled!==false);
   html=p?renderContentPage(site,p):renderHome(site,catalogue,listings);
 }
 $('app').innerHTML=html;
 renderBusinessExtras(site);
 if(page==='sell')bindSellWizard(site,catalogue);if(page==='shop')bindProductSearch();
}

async function loadBuyingCatalogue(tenant){
 if(!tenant)return {categories:[],products:[]};
 const rows=await api('/rest/v1/rpc/get_public_buying_catalogue?p_tenant_id='+encodeURIComponent(tenant));
 const products=Array.isArray(rows)?rows:[];
 const map=new Map();
 for(const p of products){
   if(!map.has(p.category_id))map.set(p.category_id,{id:p.category_id,name:p.category_name,slug:p.category_slug,description:p.category_description||'',product_count:0});
   map.get(p.category_id).product_count++;
 }
 return {categories:Array.from(map.values()),products};
}

async function loadListings(tenant){
 if(!tenant)return;
 try{
   const rows=await api('/rest/v1/rpc/get_published_store_listings?p_tenant_id='+encodeURIComponent(tenant));
   const listings=Array.isArray(rows)?rows:[];
   const mediaSets=await Promise.all(listings.map(item=>loadPublicListingMedia(item.listing_id)));
   const enriched=mediaSets.flat();
   window.__tradeflowListingMedia=enriched;
   const firstImage=new Map();
   enriched.filter(m=>m.signedUrl).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).forEach(m=>{if(!firstImage.has(String(m.listing_id)))firstImage.set(String(m.listing_id),m.signedUrl);});
   window.__tradeflowListings=listings.map(item=>Object.assign({},item,{image_url:firstImage.get(String(item.listing_id))||''}));
 }catch(e){
   console.warn('TradeFlow retail listings unavailable:',e);
   window.__tradeflowListings=[];
   window.__tradeflowListingMedia=[];
 }
}

async function loadPublicProfile(tenant){
 if(!tenant)return;
 try{
   const rows=await api('/rest/v1/tenant_public_profiles?select=business_name,public_email,public_phone,address_line1,address_line2,city,county,postcode,country_code,description,logo_url,banner_url,show_email,show_phone,show_address&tenant_id=eq.'+encodeURIComponent(tenant));
   window.__tradeflowPublicProfile=Array.isArray(rows)&&rows.length?rows[0]:null;
 }catch(e){console.warn('TradeFlow public business profile unavailable:',e);window.__tradeflowPublicProfile=null;}
}
function renderCustomerContact(){
 const p=window.__tradeflowPublicProfile||{};
 const lines=[];
 if(p.show_address!==false && (p.address_line1||p.address_line2||p.city||p.county||p.postcode)){
   lines.push('<p>'+[p.address_line1,p.address_line2,p.city,p.county,p.postcode,p.country_code].filter(Boolean).map(esc).join('<br>')+'</p>');
 }
 if(p.show_phone!==false&&p.public_phone)lines.push('<p><strong>Telephone:</strong> <a href="tel:'+esc(p.public_phone)+'">'+esc(p.public_phone)+'</a></p>');
 if(p.show_email!==false&&p.public_email)lines.push('<p><strong>Email:</strong> <a href="mailto:'+esc(p.public_email)+'">'+esc(p.public_email)+'</a></p>');
 if(p.description)lines.unshift('<p>'+esc(p.description).replace(/\n/g,'<br>')+'</p>');
 if(!lines.length)return '';
 return '<section class="public-section contact-section"><div class="section-intro"><div><h2>Contact us</h2>'+lines.join('')+'</div></div></section>';
}

async function loadDraftPreview(){
 if(!tenantId)throw new Error('No subscriber tenant was supplied for preview.');
 let subscriberSession=null;
 try{subscriberSession=JSON.parse(localStorage.getItem('tradeflow_subscriber_session')||'null')}catch{}
 if(!subscriberSession?.access_token)throw new Error('Sign in to TradeFlow to preview the current draft website.');
 const headers={apikey:KEY,'Content-Type':'application/json',Authorization:'Bearer '+subscriberSession.access_token};
 const stateResponse=await fetch(SUPABASE_URL+'/rest/v1/tenant_site_state?select=draft_revision_id&tenant_id=eq.'+encodeURIComponent(tenantId),{headers});
 const stateText=await stateResponse.text();
 if(!stateResponse.ok)throw new Error(stateText||'Unable to load the website draft.');
 const states=stateText?JSON.parse(stateText):[];
 if(!Array.isArray(states)||states.length!==1)throw new Error('The subscriber website draft is not initialised.');
 const draftId=states[0].draft_revision_id;
 const draftResponse=await fetch(SUPABASE_URL+'/rest/v1/site_revisions?select=id,revision_number,status,content&tenant_id=eq.'+encodeURIComponent(tenantId)+'&id=eq.'+encodeURIComponent(draftId)+'&status=eq.draft',{headers});
 const draftText=await draftResponse.text();
 if(!draftResponse.ok)throw new Error(draftText||'Unable to load the website draft revision.');
 const drafts=draftText?JSON.parse(draftText):[];
 if(!Array.isArray(drafts)||drafts.length!==1)throw new Error('The current website draft revision could not be loaded.');
 window.__tradeflowBuyingCatalogue=await loadBuyingCatalogue(tenantId);
 await loadListings(tenantId);
 await loadPublicProfile(tenantId);
 applyContent(drafts[0].content);
}

async function loadByTenant(){
 if(!tenantId)throw new Error('No subscriber tenant was supplied. Open the public site with its tenant_id or active domain.');
 if(preview)return loadDraftPreview();
 const rows=await api('/rest/v1/rpc/get_published_sites');
 const selected=Array.isArray(rows)?rows.find(r=>r.tenant_id===tenantId):null;
 if(!selected)throw new Error('No published website was found for this subscriber.');
 try{window.__tradeflowBuyingCatalogue=await loadBuyingCatalogue(tenantId)}catch(e){console.warn('TradeFlow buying catalogue unavailable:',e);window.__tradeflowBuyingCatalogue={categories:[],products:[]};}
 await loadListings(tenantId);
 await loadPublicProfile(tenantId);applyContent(selected.content);
}

async function loadByHostname(){
 if(tenantId)return loadByTenant();
 if(!hostname||hostname==='localhost')return loadByTenant();
 const rows=await api('/rest/v1/published_site_index?select=tenant_id,hostname,revision_number,content,published_at&hostname=eq.'+encodeURIComponent(hostname)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw new Error('This domain is not connected to a published TradeFlow subscriber website.');
 const siteTenantId=rows[0].tenant_id;
 activeTenantId=siteTenantId;
 try{window.__tradeflowBuyingCatalogue=await loadBuyingCatalogue(siteTenantId)}catch(e){console.warn('TradeFlow buying catalogue unavailable:',e);window.__tradeflowBuyingCatalogue={categories:[],products:[]};}
 await loadListings(siteTenantId);
 await loadPublicProfile(siteTenantId);
 applyContent(rows[0].content);
}

(async()=>{
 try{
   $('loading-title').textContent='Loading website…';
   $('loading-message').textContent='Please wait while the subscriber website loads.';
   await Promise.race([loadByHostname(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Website loading timed out. Refresh the page and try again.')),20000))]);
 }catch(error){
   $('loading-title').textContent='Website unavailable';
   $('loading-message').textContent=error.message||String(error);
   $('status').textContent='Unable to load subscriber website';
   $('status').style.display='block';
 }
})();