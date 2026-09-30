const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY_STORAGE='tradeflow_subscriber_publishable_key';
let supabaseKey=localStorage.getItem(KEY_STORAGE)||null,session=null,tenantId=null,draftRevisionId=null,currentTemplate='editorial';
let selectedPage='home',dirty=false;
let siteName='Your Business',headerTagline='',footerText='',headline='',intro='',accent='#c46a2b',homeImageUrl='',homeImageUrl2='',homeBuyImageUrl='',homeSellImageUrl='',logoUrl='',bannerUrl='';
let authoritativeBranding={logo_url:'',banner_url:''};
let templateCopy={},homepageTileCount=8,homepageTileColumns=4,homeBuyHeading='What we buy',homeBuyIntro='Tell customers the types of products, equipment or services you are looking to buy.',homeSellHeading='What we sell',homeSellIntro='Showcase the products and collections customers can browse and buy.';
let homepageTiles=[];
let buyingCatalogue={categories:[],products:[]};
let retailListings=[];
let themeColors={accent:'#c46a2b',page_bg:'#f5f6f8',text:'#17202a',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#f4f6f7',footer_bg:'#17202a',background_id:'clean-wave',background_mode:'preset'};
const websiteBackgrounds=[
 {id:'clean-wave',label:'Clean Gradient',color:'#f5f8fb',image:'linear-gradient(135deg,#f4f8fc 0%,#dce9f4 48%,#ffffff 100%)',size:'cover',repeat:'no-repeat'},
 {id:'soft-blue',label:'Blue Gradient',color:'#eaf3fb',image:'linear-gradient(135deg,#e7f3ff 0%,#b9d9f2 50%,#f8fbff 100%)',size:'cover',repeat:'no-repeat'},
 {id:'soft-green',label:'Green Gradient',color:'#edf7f0',image:'linear-gradient(135deg,#e7f7ec 0%,#b8dfc3 50%,#fbfdfb 100%)',size:'cover',repeat:'no-repeat'},
 {id:'warm-sand',label:'Warm Gradient',color:'#f7f1e8',image:'linear-gradient(135deg,#f8eee0 0%,#dec7a9 50%,#fffaf4 100%)',size:'cover',repeat:'no-repeat'},
 {id:'soft-lavender',label:'Lavender Gradient',color:'#f3effa',image:'linear-gradient(135deg,#f2eaff 0%,#cfc0e8 50%,#fbf9ff 100%)',size:'cover',repeat:'no-repeat'},
 {id:'sunset',label:'Sunset Gradient',color:'#fff0e8',image:'linear-gradient(135deg,#ffe4d7 0%,#f3bfa7 48%,#d8c7ee 100%)',size:'cover',repeat:'no-repeat'},
 {id:'fine-diagonal',label:'Fine Lines',color:'#f4f6f8',image:'repeating-linear-gradient(135deg,rgba(45,60,75,.38) 0 2px,transparent 2px 12px)',size:'auto',repeat:'repeat'},
 {id:'wide-diagonal',label:'Wide Lines',color:'#f2f4f6',image:'repeating-linear-gradient(135deg,rgba(45,60,75,.48) 0 8px,transparent 8px 26px)',size:'auto',repeat:'repeat'},
 {id:'soft-dots',label:'Dot Pattern',color:'#f6f7f9',image:'radial-gradient(circle,rgba(45,60,75,.44) 0 2.5px,transparent 3px)',size:'22px 22px',repeat:'repeat'},
 {id:'fine-grid',label:'Grid Pattern',color:'#f4f6f8',image:'linear-gradient(rgba(45,60,75,.30) 1.5px,transparent 1.5px),linear-gradient(90deg,color-mix(in srgb,var(--accent) 25%,transparent) 1.5px,transparent 1.5px)',size:'28px 28px',repeat:'repeat'},
 {id:'soft-hex',label:'Hex Pattern',color:'#f2f5f7',image:'linear-gradient(30deg,rgba(45,60,75,.30) 12%,transparent 12.5%,transparent 87%,rgba(45,60,75,.30) 87.5%),linear-gradient(150deg,color-mix(in srgb,var(--accent) 25%,transparent) 12%,transparent 12.5%,transparent 87%,color-mix(in srgb,var(--accent) 25%,transparent) 87.5%),linear-gradient(60deg,rgba(45,60,75,.22) 25%,transparent 25.5%,transparent 75%,rgba(45,60,75,.22) 75%)',size:'56px 96px',repeat:'repeat'},
 {id:'dark-geometry',label:'Dark Geometry',color:'#111820',image:'linear-gradient(135deg,#111820 25%,#263747 25% 50%,#111820 50% 75%,#34495a 75%)',size:'80px 80px',repeat:'repeat'}
];
function normalizeBackgroundId(id){
 const valid=new Set(websiteBackgrounds.map(x=>x.id));
 if(valid.has(id))return id;
 const legacyMap={
  music:'clean-wave',camera:'clean-wave',mobile:'clean-wave',instruments:'warm-sand',drone:'soft-blue',tools:'fine-diagonal',
  vehicles:'clean-wave',home:'warm-sand',kitchen:'clean-wave',fashion:'soft-lavender',office:'fine-grid',toys:'sunset',
  gaming:'dark-geometry','clean-wave':'clean-wave','pastel-gradient':'clean-wave','blue-wave':'soft-blue','green-wave':'soft-green',
  'warm-wave':'warm-sand','purple-wave':'soft-lavender','dark-wave':'dark-geometry','hexagon-pattern':'soft-hex',
  'dot-pattern':'soft-dots','diagonal-stripes':'wide-diagonal','soft-bokeh':'clean-wave',marble:'warm-sand',watercolour:'sunset',
  'abstract-shapes':'sunset','soft-texture':'clean-wave','colour-blend':'sunset'
 };
 return legacyMap[id]||'clean-wave';
}
function applyWebsiteBackground(){const e=$('site-editor');if(!e)return;const mode=themeColors.background_mode==='custom'?'custom':'preset';themeColors.background_id=normalizeBackgroundId(themeColors.background_id);const p=websiteBackgrounds.find(x=>x.id===themeColors.background_id)||websiteBackgrounds[0];e.dataset.backgroundMode=mode;e.style.setProperty('--site-background-color',mode==='custom'?themeColors.page_bg:p.color);e.style.setProperty('--site-background-image',mode==='custom'?'none':p.image);e.style.setProperty('--site-background-size',mode==='custom'?'cover':p.size);e.style.setProperty('--site-background-repeat',mode==='custom'?'no-repeat':p.repeat);}
function selectWebsiteBackground(id){const p=websiteBackgrounds.find(x=>x.id===id);if(!p)return;themeColors.background_id=p.id;themeColors.background_mode='preset';applyWebsiteBackground();renderEditor();markDirty();setStatus(p.label+' selected. Brand colours remain editable. Save the draft to keep the change.','success');}
function selectPresetBackgroundMode(){themeColors.background_mode='preset';applyWebsiteBackground();renderDesignControls();renderEditor();markDirty();setStatus('Preset background mode enabled. Choose a pattern or gradient below.','success');}
function selectCustomBackground(){themeColors.background_mode='custom';applyWebsiteBackground();renderDesignControls();renderEditor();markDirty();setStatus('Custom colours selected. No background pattern or gradient is applied.','success');}
window.tradeflowSelectWebsiteBackground=selectWebsiteBackground;
window.tradeflowSelectPresetBackgroundMode=selectPresetBackgroundMode;
window.tradeflowSelectCustomBackground=selectCustomBackground;

let socialLinks={facebook:'',instagram:'',linkedin:'',youtube:'',tiktok:'',x:'',show_share:true};
let reviewLinks=[];
let typography={font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid',header:'standard',footer:'simple'};
let homepageSections={hero:true,hero_image:true,dual:true,buy:true,sell:true,trust:false,shop:true};
let headerLinks=[],footerLinks=[],homepageOrder=['hero','buy','sell'];
function defaultHomepageTiles(){return [
 {id:'buy-1',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'buy-2',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'buy-3',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'buy-4',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-1',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-2',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-3',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-4',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'buy-5',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-5',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'buy-6',side:'buy',title:'',body:'',image_url:'',image_alt:'',cta:''},
 {id:'sell-6',side:'sell',title:'',body:'',image_url:'',image_alt:'',cta:''}
]}
homepageTiles=defaultHomepageTiles();
const params=new URLSearchParams(location.search),requestedTemplate=params.get('template'),requestedPage=params.get('page'),requestedFocus=params.get('focus');
const $=id=>document.getElementById(id);

const templates=[
 {id:'editorial',name:'Editorial',desc:'Clean, spacious and image-led'},
 {id:'classic',name:'Classic',desc:'Warm, refined and established'},
 {id:'grid',name:'Grid',desc:'Dark, structured and information-led'},
 {id:'studio',name:'Studio',desc:'Creative, visual and asymmetric'},
 {id:'horizon',name:'Horizon',desc:'Light, modern and expansive'},
 {id:'field',name:'Field',desc:'Immersive, bold and image-led'},
 {id:'business',name:'Business',desc:'Clear, confident and professional'},
 {id:'luxe',name:'Luxe',desc:'Minimal, premium and understated'},
 {id:'commerce',name:'Commerce',desc:'Product-led and conversion-focused'},
 {id:'impact',name:'Impact',desc:'Bold typography and strong colour'}
];
const templatePalettes={
 editorial:{accent:'#b85c38',page_bg:'#f7f4f0',text:'#20252a',header_bg:'#fffdfb',buy_bg:'#fffdfb',sell_bg:'#f0ebe6',footer_bg:'#20252a'},
 classic:{accent:'#8b5e3c',page_bg:'#f7f1e8',text:'#30271f',header_bg:'#fffaf2',buy_bg:'#fffdf8',sell_bg:'#eee2d2',footer_bg:'#352b24'},
 grid:{accent:'#5ea8d6',page_bg:'#101820',text:'#eef3f6',header_bg:'#0d141b',buy_bg:'#151f28',sell_bg:'#1c2933',footer_bg:'#080d12'},
 studio:{accent:'#b35b3e',page_bg:'#f3ece5',text:'#2b2521',header_bg:'#fffaf5',buy_bg:'#fffdf9',sell_bg:'#e9ddd2',footer_bg:'#29221e'},
 horizon:{accent:'#287d9b',page_bg:'#edf5f8',text:'#19303a',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e1eef2',footer_bg:'#18343e'},
 field:{accent:'#b6a05a',page_bg:'#17231d',text:'#f1f2ed',header_bg:'#111a15',buy_bg:'#1a2820',sell_bg:'#26352b',footer_bg:'#0b110d'},
 business:{accent:'#2563a8',page_bg:'#f1f4f7',text:'#1d2a35',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e5ebf1',footer_bg:'#172431'},
 luxe:{accent:'#c49a58',page_bg:'#f3f0eb',text:'#202328',header_bg:'#fbfaf7',buy_bg:'#fbfaf7',sell_bg:'#e8e2d8',footer_bg:'#15191d'},
 commerce:{accent:'#d05a38',page_bg:'#f6f7f8',text:'#20252a',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#eceff1',footer_bg:'#20252a'},
 impact:{accent:'#d64b3d',page_bg:'#f2f2ef',text:'#171b1f',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e7e8e4',footer_bg:'#171b1f'}
};
const templateHeadlines={editorial:'A clear way to buy and sell',classic:'A trusted way to buy and sell',grid:'Your products. Your buying list.',studio:'Good products deserve a good presentation.',horizon:'A simpler way to buy and sell',field:'Equipment for the next chapter.',business:'A straightforward way to buy and sell',luxe:'Quality products. Clear service.',commerce:'Browse, buy and sell with confidence.',impact:'BUY. SELL. MOVE FORWARD.'};
const templateDefaults={
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

const pageDefinitions=[
 {slug:'buying',title:'What We Buy',enabled:true,hint:'Buying page',prompt:'Show customers what you are looking to buy and how they can start a selling request.'},
 {slug:'shop',title:'Retail Shop',enabled:true,hint:'Selling page',prompt:'Show customers the products you currently have available to buy.'},
 {slug:'about',title:'About',enabled:true,hint:'About your business',prompt:'Tell customers about your business, service and experience.'},
 {slug:'contact',title:'Contact',enabled:true,hint:'Contact details',prompt:'Add the contact information customers need to reach your business.'},
 {slug:'customer-account',title:'Customer Account',enabled:true,hint:'Customer account area',prompt:'Customer account area managed by TradeFlow.'}
];

function defaultPages(){
 return pageDefinitions.map(p=>({
   slug:p.slug,title:p.title,enabled:p.enabled,
   body:p.slug==='shop'?'Welcome to our shop. Browse our current products below.':
        p.slug==='customer-account'?'':p.slug==='contact'?'Add your contact details here.':'',
   image_url:'',image_alt:'',image_url2:'',image_alt2:'',tile_count:p.slug==='shop'||p.slug==='buying'?6:0,tile_columns:p.slug==='shop'||p.slug==='buying'?3:3,tiles:p.slug==='shop'||p.slug==='buying'?defaultPageTiles(p.slug==='shop'?'shop-tile':'buying-tile'):[],seo_title:'',seo_description:''
 }));
}
let pages=defaultPages();

function defaultPageTiles(prefix){
 return Array.from({length:12},(_,i)=>({id:prefix+'-'+(i+1),title:'',body:'',image_url:'',image_alt:'',cta:''}));
}
function ensurePageTileCapacity(tiles,prefix){
 const existing=Array.isArray(tiles)?tiles:[];const byId=new Map(existing.map(t=>[t.id,t]));
 return defaultPageTiles(prefix).map(d=>byId.has(d.id)?Object.assign({},d,byId.get(d.id)):Object.assign({},d));
}
function cleanPageTiles(tiles,prefix){
 const defaults=new Map(defaultPageTiles(prefix).map(t=>[t.id,t]));
 return (Array.isArray(tiles)?tiles:[]).map(t=>{const d=defaults.get(t.id);if(!d)return t;const copy={...t};['title','body','cta'].forEach(k=>{if(copy[k]===d[k])copy[k]='';});return copy;});
}
function pageTileConfig(p){
 const prefix=p.slug==='shop'?'shop-tile':'buying-tile';
 return {tiles:ensurePageTileCapacity(cleanPageTiles(p.tiles,prefix),prefix),count:[3,4,6,8,9,10,12].includes(Number(p.tile_count))?Number(p.tile_count):6,columns:[2,3,4].includes(Number(p.tile_columns))?Number(p.tile_columns):3};
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function setStatus(text,type){const el=$('status');if(el){el.textContent=text||'';el.dataset.type=type||''}}
function markDirty(){dirty=true;const el=$('save-state');if(el)el.textContent='Unsaved changes';}
function pageDef(slug){return pageDefinitions.find(p=>p.slug===slug)||{slug:slug,title:slug,hint:'Optional',enabled:true,prompt:'Add the information customers need on this page.'}}
function cleanPageBody(slug,body){const v=String(body||'').trim();const placeholders={shop:['Welcome to our shop. Browse our current products below.','Browse our current retail range.'],contact:['Add your contact details here.']};return (placeholders[slug]||[]).includes(v)?'':v;}
function validPageSlug(slug){return slug==='home'||pages.some(p=>p.slug===slug)}
function currentPage(){return selectedPage==='home'?{slug:'home',title:'Home page'}:(pages.find(p=>p.slug===selectedPage)||pages[0])}

function renderPageList(){
 const box=$('page-list');if(!box)return;
 const items=[{slug:'home',title:'Home page',hint:'Main landing page',enabled:true},...pages.map(p=>({slug:p.slug,title:p.title,hint:p.slug==='shop'?'Retail selling page':p.slug==='buying'?'Buying page':pageDef(p.slug).hint,enabled:p.enabled}))];
 box.innerHTML=items.map(p=>'<div class="page-row '+(p.slug===selectedPage?'selected':'')+'"><button type="button" class="page-link" data-page="'+esc(p.slug)+'"><span class="page-link-icon">'+(p.slug==='home'?'HOME':p.slug==='shop'?'SHOP':p.slug==='buying'?'BUY':'PAGE')+'</span><span><b>'+esc(p.title)+'</b><small>'+esc(p.enabled===false?'Hidden from website':p.hint)+'</small></span></button>'+(p.slug==='home'||p.slug==='customer-account'?'':p.slug==='buying'||p.slug==='shop'?'<button type="button" class="page-visibility" data-toggle-page="'+esc(p.slug)+'">'+(p.enabled===false?'Show':'Hide')+'</button>':'<button type="button" class="page-delete" data-delete-page="'+esc(p.slug)+'" title="Delete page">Delete</button>')+'</div>').join('');
 box.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>selectPage(b.dataset.page)));
 box.querySelectorAll('[data-toggle-page]').forEach(b=>b.addEventListener('click',()=>{
   const slug=b.dataset.togglePage,page=pages.find(p=>p.slug===slug);if(!page)return;
   page.enabled=page.enabled===false;markDirty();renderPageList();renderHeaderFooterControls();renderEditor();setStatus(page.enabled?'What We Buy / What We Sell page shown.':'What We Buy / What We Sell page hidden from the customer website.','success');
 }));
 box.querySelectorAll('[data-delete-page]').forEach(b=>b.addEventListener('click',()=>{
   const slug=b.dataset.deletePage,page=pages.find(p=>p.slug===slug);if(!page)return;
   if(slug==='buying'||slug==='shop'){setStatus('What We Buy and What We Sell are permanent TradeFlow pages. They can be hidden, but not deleted.','error');return;}
   if(!window.confirm('Delete the page "'+page.title+'"? This will remove it from this website draft.'))return;
   if(!window.confirm('Are you sure you want to permanently remove "'+page.title+'" from this website draft?'))return;
   pages=pages.filter(p=>p.slug!==slug);headerLinks=headerLinks.filter(x=>x!==slug);footerLinks=footerLinks.filter(x=>x!==slug);
   selectedPage='home';markDirty();renderPageList();renderPageManager();renderHeaderFooterControls();renderBuilderPageHelp();renderEditor();setStatus('Page deleted from the draft. Save the draft to keep the change.','success');
 }));
}

function renderHeroImageControls(){
 const box=$('hero-image-controls');if(!box)return;
 const imageState=(url)=>url?'Image uploaded':'No image selected';
 const secondaryUsed=currentTemplate==='editorial';
 box.innerHTML='<div class="control-title">Additional homepage images</div><small>Your Branding banner is the primary homepage hero image. This section is for the fallback hero image and the optional second image used by templates that support it.</small><div class="hero-image-control"><div><b>Fallback hero image</b><span>'+imageState(homeImageUrl)+'</span></div><button type="button" data-hero-image="home">'+(homeImageUrl?'Replace photo':'Add photo')+'</button></div><div class="hero-image-control"><div><b>Secondary hero image</b><span>'+imageState(homeImageUrl2)+(secondaryUsed?' · used by this template':' · not used by this template')+'</span></div><button type="button" data-hero-image="home2">'+(homeImageUrl2?'Replace photo':'Add photo')+'</button></div>';
 box.querySelectorAll('[data-hero-image]').forEach(button=>button.addEventListener('click',()=>{
   const input=$('image-file-input');input.dataset.target=button.dataset.heroImage;input.value='';input.click();
 }));
}
function renderHomepageControls(){
 const box=$('homepage-controls');if(!box)return;
 const p=currentPage();
 const isCustomPage=p.slug==='buying'||p.slug==='shop';
 if(isCustomPage){
   const cfg=pageTileConfig(p);
   p.tiles=cfg.tiles;p.tile_count=cfg.count;p.tile_columns=cfg.columns;
   box.innerHTML='<div class="tile-count-title">'+(p.slug==='shop'?'What We Sell':'What We Buy')+' page tiles</div><div class="tile-counts">'+[3,4,6,8,9,10,12].map(n=>'<button type="button" class="tile-count '+(cfg.count===n?'selected':'')+'" data-page-tile-count="'+n+'">'+n+' tiles</button>').join('')+'</div><div class="tile-count-title">Tiles per row</div><div class="tile-counts">'+[2,3,4].map(n=>'<button type="button" class="tile-count '+(cfg.columns===n?'selected':'')+'" data-page-tile-columns="'+n+'">'+n+' per row</button>').join('')+'</div><small>Add images, headings, descriptions and links directly in the page preview. These tiles are separate from the homepage.</small>';
   box.querySelectorAll('[data-page-tile-count]').forEach(b=>b.addEventListener('click',()=>{p.tile_count=Number(b.dataset.pageTileCount);renderHomepageControls();renderEditor();markDirty();}));
   box.querySelectorAll('[data-page-tile-columns]').forEach(b=>b.addEventListener('click',()=>{p.tile_columns=Number(b.dataset.pageTileColumns);renderHomepageControls();renderEditor();markDirty();}));
   return;
 }
 box.innerHTML='<div class="tile-count-title">Homepage tile layout</div><div class="tile-counts">'+[3,4,6,8,9,10,12].map(n=>'<button type="button" class="tile-count '+(homepageTileCount===n?'selected':'')+'" data-tile-count="'+n+'">'+n+' tiles</button>').join('')+'</div><div class="tile-count-title">Tiles per row</div><div class="tile-counts">'+[2,3,4].map(n=>'<button type="button" class="tile-count '+(homepageTileColumns===n?'selected':'')+'" data-tile-columns="'+n+'">'+n+' per row</button>').join('')+'</div><small>Choose how many visual tiles appear and how many sit on each row. TradeFlow keeps the selected layout on the customer website.</small>';
 box.querySelectorAll('[data-tile-count]').forEach(b=>b.addEventListener('click',()=>{homepageTileCount=Number(b.dataset.tileCount);renderHomepageControls();renderEditor();markDirty();}));
 box.querySelectorAll('[data-tile-columns]').forEach(b=>b.addEventListener('click',()=>{homepageTileColumns=Number(b.dataset.tileColumns);renderHomepageControls();renderEditor();markDirty();}));
}
function renderPageTilesEditor(p){
 const cfg=pageTileConfig(p);p.tiles=cfg.tiles;p.tile_count=cfg.count;p.tile_columns=cfg.columns;
 const visible=cfg.tiles.slice(0,cfg.count);
 return '<section class="homepage-tiles page-custom-tiles"><div class="homepage-tile-grid" style="--tile-columns:'+cfg.columns+'">'+visible.map(tile=>'<article class="editable-home-tile page-tile" draggable="true" data-page-tile-id="'+esc(tile.id)+'"><div class="tile-image">'+(tile.image_url?'<img src="'+esc(tile.image_url)+'" alt="'+esc(tile.image_alt||tile.title||'')+'"><button type="button" data-image-action="remove" data-image-target="page:'+esc(p.slug)+':tile:'+esc(tile.id)+'">Remove</button>':'<button type="button" data-image-action="add" data-image-target="page:'+esc(p.slug)+':tile:'+esc(tile.id)+'">Add image</button>')+'</div><div class="tile-copy"><h3 contenteditable="true" data-page-tile-id="'+esc(tile.id)+'" data-tile-field="title">'+esc(tile.title)+'</h3><p contenteditable="true" data-page-tile-id="'+esc(tile.id)+'" data-tile-field="body">'+esc(tile.body)+'</p><b contenteditable="true" data-page-tile-id="'+esc(tile.id)+'" data-tile-field="cta">'+esc(tile.cta)+'</b></div></article>').join('')+'</div></section>';
}

function resetDesignColours(){
 const p=templatePalettes[currentTemplate]||templatePalettes.editorial;
 themeColors={...themeColors,accent:p.accent,text:p.text,page_bg:p.page_bg,header_bg:p.header_bg,buy_bg:p.buy_bg,sell_bg:p.sell_bg,footer_bg:p.footer_bg,background_id:'clean-wave',background_mode:'preset'};
 typography={font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid',header:'standard',footer:'simple'};
 applyWebsiteBackground();
 renderDesignControls();renderEditor();markDirty();
 setStatus('Design colours reset to the selected template defaults. Your pages, text and images were kept. Save the draft to keep the reset.','success');
}
function renderDesignControls(){
 const box=$('design-controls');if(!box)return;
 const colors=[['accent','Brand / accent'],['text','Text'],['page_bg','Page background'],['header_bg','Header / navigation'],['buy_bg','Buying section'],['sell_bg','Selling section'],['footer_bg','Footer']];
 const palettes={professional:{label:'Professional',description:'Navy, blue-grey and restrained gold',accent:'#2563a8',text:'#172a3a',page_bg:'#f3f6f8',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e8eef4',footer_bg:'#142635'},warm:{label:'Warm',description:'Terracotta, cream and soft brown',accent:'#a84f2d',text:'#2b211d',page_bg:'#fbf7f2',header_bg:'#fffaf5',buy_bg:'#fffdf9',sell_bg:'#f3e7dc',footer_bg:'#3a2b25'},dark:{label:'Dark',description:'Charcoal, slate and warm gold',accent:'#d79a55',text:'#f2f4f5',page_bg:'#151b20',header_bg:'#101419',buy_bg:'#182027',sell_bg:'#202a32',footer_bg:'#0b0f12'},clean:{label:'Clean',description:'Fresh blue with white space',accent:'#1769aa',text:'#17202a',page_bg:'#f7f9fb',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#edf3f8',footer_bg:'#172b3a'},ocean:{label:'Ocean',description:'Deep teal, aqua and cool mist',accent:'#087f8c',text:'#12343a',page_bg:'#edf7f7',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#dcefee',footer_bg:'#10383d'},emerald:{label:'Emerald',description:'Rich green, sage and ivory',accent:'#16825b',text:'#17352a',page_bg:'#f0f7f3',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#deeee6',footer_bg:'#17382d'},royal:{label:'Royal',description:'Indigo, violet and soft lavender',accent:'#5b4bb7',text:'#242044',page_bg:'#f5f3fb',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e9e5f6',footer_bg:'#28204d'},sunset:{label:'Sunset',description:'Coral, amber and warm sand',accent:'#e45f3a',text:'#3a241e',page_bg:'#fff6f0',header_bg:'#fffdf9',buy_bg:'#ffffff',sell_bg:'#f8e4d8',footer_bg:'#40251e'},citrus:{label:'Citrus',description:'Lively orange, lemon and fresh cream',accent:'#e38b1f',text:'#302615',page_bg:'#fff9ec',header_bg:'#fffef8',buy_bg:'#ffffff',sell_bg:'#f7edc9',footer_bg:'#3a2d16'},berry:{label:'Berry',description:'Raspberry, plum and pale blush',accent:'#b43d69',text:'#351e2a',page_bg:'#fbf2f6',header_bg:'#fffafd',buy_bg:'#ffffff',sell_bg:'#f2dce5',footer_bg:'#3d2030'},coral:{label:'Coral',description:'Bright coral with coastal blue-grey',accent:'#e85d5d',text:'#302225',page_bg:'#fff5f3',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#f5e1e1',footer_bg:'#3b252b'},sky:{label:'Sky',description:'Clear blue, powder blue and navy',accent:'#1684d8',text:'#183047',page_bg:'#f1f8fe',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#dcecf9',footer_bg:'#15314a'},forest:{label:'Forest',description:'Deep green, moss and natural cream',accent:'#2f6b45',text:'#203026',page_bg:'#f2f6f1',header_bg:'#fffefa',buy_bg:'#ffffff',sell_bg:'#e2ebdf',footer_bg:'#1d3525'},plum:{label:'Plum',description:'Plum, mauve and warm stone',accent:'#7a3f70',text:'#302333',page_bg:'#f7f2f6',header_bg:'#fffdfd',buy_bg:'#ffffff',sell_bg:'#e9dce7',footer_bg:'#302034'},teal:{label:'Teal',description:'Vivid teal balanced with graphite',accent:'#009688',text:'#163332',page_bg:'#eff9f8',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#d9efec',footer_bg:'#163b39'},electric:{label:'Electric',description:'Bright blue, cobalt and cool grey',accent:'#1769ff',text:'#18233b',page_bg:'#f2f6ff',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#dfe8ff',footer_bg:'#172650'},rose:{label:'Rose',description:'Modern rose, blush and charcoal',accent:'#d34f78',text:'#30222a',page_bg:'#fff4f7',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#f5dfe6',footer_bg:'#3b2530'},monochrome:{label:'Monochrome',description:'Black, white and neutral grey',accent:'#3f4650',text:'#1e2328',page_bg:'#f4f5f6',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#e7e9eb',footer_bg:'#20252a'}};
 box.innerHTML='<div class="control-title">Website background</div><small>Choose a simple pattern or gradient, or use Custom colours for a clean background. Brand colours remain editable.</small><div class="background-mode-row"><button type="button" class="background-mode '+(themeColors.background_mode!=='custom'?'selected':'')+'" onclick="window.tradeflowSelectPresetBackgroundMode();return false;">Use preset background</button><button type="button" class="background-mode '+(themeColors.background_mode==='custom'?'selected':'')+'" onclick="window.tradeflowSelectCustomBackground();return false;">Use custom colours</button></div><div class="background-grid">'+websiteBackgrounds.map(p=>'<button type="button" class="background-option '+(themeColors.background_id===p.id?'selected':'')+'" data-background="'+p.id+'" title="'+esc(p.label)+'" onclick="window.tradeflowSelectWebsiteBackground(\''+p.id+'\');return false;"><span style="background-color:'+p.color+';background-image:'+p.image+';background-size:'+p.size+';background-repeat:'+p.repeat+';pointer-events:none"></span><b style="pointer-events:none">'+esc(p.label)+'</b></button>').join('')+'</div><div class="control-title">Brand colours</div><small>These colours control the header, page surfaces, buying section, selling section and footer. They remain editable when a preset background is active.</small><button type="button" class="design-reset-button" onclick="resetDesignColours();return false;">Reset design colours</button><div class="color-grid">'+colors.map(([key,label])=>'<label class="color-control"><span>'+label+'</span><input type="color" data-color="'+key+'" value="'+esc(themeColors[key])+'"><code>'+esc(themeColors[key])+'</code></label>').join('')+'</div><div class="preset-row"><span>Quick palettes</span><small>Choose a coordinated starting palette, then fine-tune any colour above.</small>'+Object.entries(palettes).map(([id,p])=>'<button type="button" data-palette="'+id+'" title="'+esc(p.label+' — '+p.description)+'"><i style="background:'+p.accent+'"></i>'+esc(p.label)+'</button>').join('')+'</div>';
 box.querySelectorAll('[data-background]').forEach(b=>{b.addEventListener('click',e=>e.stopPropagation());});
 box.querySelectorAll('[data-color]').forEach(input=>input.addEventListener('input',()=>{themeColors[input.dataset.color]=input.value;renderEditor();renderDesignControls();markDirty();}));
 
 box.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{const p=palettes[b.dataset.palette];themeColors={...themeColors,accent:p.accent,text:p.text,page_bg:p.page_bg,header_bg:p.header_bg,buy_bg:p.buy_bg,sell_bg:p.sell_bg,footer_bg:p.footer_bg};renderDesignControls();renderEditor();markDirty();}));
}
function renderHeaderFooterControls(){
 const box=$('header-footer-controls');if(!box)return;
 const available=[{slug:'home',title:'Home'},...pages.filter(p=>p.slug!=='customer-account').map(p=>({slug:p.slug,title:p.slug==='buying'?'What We Buy':p.slug==='shop'?'What We Sell':p.title}))];
 const checks=(arr,key)=>available.map(p=>'<label class="check-control"><input type="checkbox" data-link-area="'+key+'" data-link-slug="'+esc(p.slug)+'" '+(arr.includes(p.slug)?'checked':'')+'><span>'+esc(p.title)+'</span></label>').join('');
 box.innerHTML='<div class="control-title">Header & footer</div><small>Choose what appears in your navigation. You can edit the wording and links without changing your business data.</small><label class="select-control"><span>Header tagline</span><input type="text" data-hf-field="headerTagline" value="'+esc(headerTagline)+'" placeholder="Optional short line"></label><label class="select-control"><span>Footer text</span><input type="text" data-hf-field="footerText" value="'+esc(footerText)+'" placeholder="Short business message"></label><div class="hf-columns"><div><b>Header links</b>'+checks(headerLinks,'header')+'</div><div><b>Footer links</b>'+checks(footerLinks,'footer')+'</div></div>';
 box.querySelectorAll('[data-hf-field]').forEach(el=>el.addEventListener('input',()=>{if(el.dataset.hfField==='headerTagline')headerTagline=el.value;if(el.dataset.hfField==='footerText')footerText=el.value;markDirty();renderEditor();}));
 box.querySelectorAll('[data-link-area]').forEach(el=>el.addEventListener('change',()=>{const target=el.dataset.linkArea==='header'?headerLinks:footerLinks;el.checked?target.push(el.dataset.linkSlug):target.splice(target.indexOf(el.dataset.linkSlug),1);markDirty();renderHeaderFooterControls();renderEditor();}));
}
function renderPageManager(){
 const box=$('page-manager');if(!box)return;
 box.innerHTML='<div class="control-title">Pages</div><small>Add your own pages and then choose whether they appear in the header or footer.</small><div class="page-add-row"><input id="new-page-title" type="text" placeholder="New page name"><button type="button" id="add-page-button">Add page</button></div>';
 const btn=$('add-page-button');if(btn)btn.addEventListener('click',()=>{const input=$('new-page-title'),title=input.value.trim();if(!title)return;const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'page-'+Date.now();if(pages.some(p=>p.slug===slug)){setStatus('That page already exists.','error');return}pages.push({slug,title,enabled:true,prompt:'Add the information customers should see on this page.',body:'',image_url:'',image_alt:'',image_url2:'',image_alt2:'',tile_count:0,tile_columns:3,tiles:[],seo_title:'',seo_description:''});headerLinks.push(slug);footerLinks.push(slug);input.value='';markDirty();renderPageList();renderHeaderFooterControls();renderEditor();selectPage(slug);});
}
function renderBrandingControls(){
 const box=$('branding-controls');if(!box)return;
 box.innerHTML='<div class="control-title">Branding</div><small>Keep your customer-facing logo and website banner together here. Your business name remains managed in Business Settings. The logo is used in the website header; the banner is used in the homepage hero. Recommended banner size: <b>1600 × 600 px</b> (8:3). PNG, JPEG or WebP, maximum 5 MB.</small>'+
 '<div class="branding-control">'+(logoUrl?'<img src="'+esc(logoUrl)+'" alt="'+esc(siteName)+'"><span class="small">Logo uploaded</span>':'<span class="small">No business logo uploaded.</span>')+'<div class="actions"><button type="button" data-logo-upload>'+(logoUrl?'Replace logo':'Upload logo')+'</button>'+(logoUrl?'<button type="button" class="secondary" data-logo-remove>Remove logo</button>':'')+'</div></div>'+
 '<div class="branding-banner-control">'+(bannerUrl?'<img src="'+esc(bannerUrl)+'" alt="Website banner">':'<div class="generated-brand-banner-preview">'+esc(siteName||'Your Business')+'</div>')+
 '<div class="branding-banner-actions"><span class="small">'+(bannerUrl?'Website banner uploaded':'No banner uploaded — the business name will be used automatically')+'</span><div class="actions"><button type="button" data-banner-upload>Upload banner</button>'+(bannerUrl?'<button type="button" class="secondary" data-banner-remove>Remove banner</button>':'')+'</div></div></div>'+
 '<div class="actions"><a href="settings.html">Business Settings</a></div>';
 const logoUpload=box.querySelector('[data-logo-upload]');
 if(logoUpload)logoUpload.addEventListener('click',()=>{const input=$('image-file-input');input.dataset.target='logo';input.value='';input.click();});
 const logoRemove=box.querySelector('[data-logo-remove]');
 if(logoRemove)logoRemove.addEventListener('click',()=>removeImage('logo'));
 const upload=box.querySelector('[data-banner-upload]');
 if(upload)upload.addEventListener('click',()=>{const input=$('image-file-input');input.dataset.target='banner';input.value='';input.click();});
 const remove=box.querySelector('[data-banner-remove]');
 if(remove)remove.addEventListener('click',()=>removeImage('banner'));
}
function renderBusinessExtras(){
 const box=$('business-extras');if(!box)return;
 const socials=[['facebook','Facebook'],['instagram','Instagram'],['linkedin','LinkedIn'],['youtube','YouTube'],['tiktok','TikTok'],['x','X']];
 box.innerHTML='<div class="control-title">Social media & reviews</div><small>Add your own profile links. Leave a field blank if you do not use it.</small><div class="social-grid">'+socials.map(([key,label])=>'<label><span>'+label+'</span><input type="url" data-social="'+key+'" value="'+esc(socialLinks[key]||'')+'" placeholder="https://"></label>').join('')+'</div><label class="check-control"><input type="checkbox" data-share-toggle '+(socialLinks.show_share!==false?'checked':'')+'> Show website share buttons</label><div class="review-editor"><strong>Review sites</strong><small>Add up to four review profiles, such as Google, Trustpilot or another review service.</small><div id="review-list">'+[0,1,2,3].map(i=>{const r=reviewLinks[i]||{};return '<div class="review-row"><input type="text" data-review-label="'+i+'" value="'+esc(r.label||'')+'" placeholder="Review site name"><input type="url" data-review-url="'+i+'" value="'+esc(r.url||'')+'" placeholder="https://"></div>'}).join('')+'</div></div>';
 box.querySelectorAll('[data-social]').forEach(input=>input.addEventListener('change',()=>{socialLinks[input.dataset.social]=input.value.trim();markDirty();}));
 const share=box.querySelector('[data-share-toggle]');if(share)share.addEventListener('change',()=>{socialLinks.show_share=share.checked;markDirty();});
 box.querySelectorAll('[data-review-label],[data-review-url]').forEach(input=>input.addEventListener('change',()=>{const i=Number(input.dataset.reviewLabel??input.dataset.reviewUrl);reviewLinks[i]={label:box.querySelector('[data-review-label="'+i+'"]').value.trim(),url:box.querySelector('[data-review-url="'+i+'"]').value.trim()};reviewLinks=reviewLinks.filter(r=>r.label||r.url);markDirty();}));
}

function renderTypographyControls(){
 const box=$('typography-controls');if(!box)return;
 const fonts=[['Inter','Modern'],['Arial','Clean'],['Georgia','Editorial'],['Trebuchet MS','Friendly'],['Verdana','Classic']];
 const sizes=[['small','Small'],['standard','Standard'],['large','Large'],['xlarge','Extra large']];
 const options=(items,key)=>items.map(([v,l])=>'<option value="'+esc(v)+'" '+(typography[key]===v?'selected':'')+'>'+esc(l)+'</option>').join('');
 box.innerHTML='<div class="control-title">Typography & layout</div><small>Choose professional type styles and simple size levels. TradeFlow keeps the design consistent across the site.</small><label class="select-control"><span>Font style</span><select data-type-key="font">'+options(fonts,'font')+'</select></label><label class="select-control"><span>Hero heading</span><select data-type-key="hero">'+options(sizes,'hero')+'</select></label><label class="select-control"><span>Section headings</span><select data-type-key="section">'+options(sizes,'section')+'</select></label><label class="select-control"><span>Body text</span><select data-type-key="body">'+options(sizes,'body')+'</select></label><label class="select-control"><span>Navigation</span><select data-type-key="nav">'+options(sizes,'nav')+'</select></label><label class="select-control"><span>Buttons</span><select data-type-key="button">'+[['solid','Solid'],['outline','Outline'],['rounded','Rounded']].map(([v,l])=>'<option value="'+v+'" '+(typography.button===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="select-control"><span>Header</span><select data-type-key="header">'+[['standard','Standard'],['compact','Compact'],['centred','Centred logo'],['large','Large']].map(([v,l])=>'<option value="'+v+'" '+(typography.header===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="select-control"><span>Footer</span><select data-type-key="footer">'+[['simple','Simple'],['business','Business'],['social','Social'],['full','Full']].map(([v,l])=>'<option value="'+v+'" '+(typography.footer===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
 box.querySelectorAll('[data-type-key]').forEach(el=>el.addEventListener('change',()=>{typography[el.dataset.typeKey]=el.value;renderTypographyControls();renderEditor();markDirty();}));
}
function renderSectionControls(){
 const box=$('section-controls');if(!box)return;
 const items=[['hero','Hero section'],['hero_image','Hero image'],['dual','Buying & selling introduction'],['buy','What we buy tiles'],['sell','What we sell tiles'],['trust','Trust strip'],['shop','Retail shop']];
 box.innerHTML='<div class="control-title">Website sections</div><small>Show or hide sections without deleting your content. Hidden sections can be switched back on later.</small>'+items.map(([k,l])=>'<label class="check-control section-toggle"><input type="checkbox" data-section="'+k+'" '+(homepageSections[k]!==false?'checked':'')+'><span>'+l+'</span></label>').join('');
 box.querySelectorAll('[data-section]').forEach(el=>el.addEventListener('change',()=>{homepageSections[el.dataset.section]=el.checked;renderEditor();markDirty();}));
}

function renderTemplates(){
 const box=$('templates');if(!box)return;
 box.innerHTML=templates.map(t=>'<button type="button" class="template-card '+(t.id===currentTemplate?'selected':'')+'" data-template="'+t.id+'"><span class="template-mini template-mini-'+t.id+'"><i></i><b></b><em></em><u></u></span><strong>'+esc(t.name)+'</strong><small>'+esc(t.desc)+'</small></button>').join('');
 box.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>applyTemplate(b.dataset.template)));
}

function navMarkup(){
 const links=pages.filter(p=>p.enabled&&['about','contact'].includes(p.slug)).map(p=>'<button type="button" data-nav-page="'+esc(p.slug)+'">'+esc(p.title)+'</button>').join('');
 const cats=Array.isArray(buyingCatalogue.categories)?buyingCatalogue.categories:[];
 const categoryLinks=cats.map(cat=>'<button type="button" data-nav-page="buying"><b>'+esc(cat.name)+'</b><small>'+Number(cat.product_count||0)+' products</small></button>').join('');
 const buyingLink='<button type="button" data-nav-page="buying">What We Buy</button>';
 return '<header class="template-header"><nav class="template-nav"><div class="template-brand">'+logoEditor()+'<small>'+esc(headerTagline)+'</small></div><div class="template-nav-links">'+links+buyingLink+'<button type="button" data-nav-page="shop">What We Sell</button><span class="managed-login">Customer Login</span></div></nav></header>';
}
function footerMarkup(){
 const findTitle=slug=>slug==='home'?'Home':slug==='buying'?'What We Buy':slug==='shop'?'What We Sell':(pages.find(p=>p.slug===slug)?.title||slug);
 const links=footerLinks.filter(slug=>slug==='home'||pages.some(p=>p.slug===slug&&p.enabled!==false)).map(slug=>'<button type="button" data-nav-page="'+esc(slug)+'">'+esc(findTitle(slug))+'</button>').join('');
 return '<footer class="template-footer"><div><strong>'+esc(siteName)+'</strong><p>'+esc(footerText||'Your business website powered by TradeFlow.')+'</p></div><div class="template-footer-links">'+links+'</div></footer>';
}

function imageBlock(url,kind,label,alt){
 const heading=kind==='home'?'MAIN HERO IMAGE':kind==='home2'?'SECONDARY HERO IMAGE':kind==='home-buy'?'WHAT WE BUY IMAGE':kind==='home-sell'?'WHAT WE SELL IMAGE':'IMAGE';
 if(url)return '<div class="image-slot"><div class="image-slot-label">'+heading+'</div><div class="visual-image"><img src="'+esc(url)+'" alt="'+esc(alt||'')+'"><div class="image-tools"><button type="button" data-image-action="replace" data-image-target="'+esc(kind)+'">Replace image</button><button type="button" data-image-action="remove" data-image-target="'+esc(kind)+'">Remove</button></div></div></div>';
 return '<div class="image-slot"><div class="image-slot-label">'+heading+'</div><div class="image-drop"><button type="button" data-image-action="add" data-image-target="'+esc(kind)+'">Add image</button><span>'+esc(label)+'</span><small>PNG, JPEG or WebP · maximum 5 MB</small></div></div>';
}

function editText(field,value,tag='span',cls=''){return '<'+tag+' class="'+cls+'" contenteditable="true" data-edit="'+field+'">'+esc(value||'')+'</'+tag+'>'}
function logoEditor(){return logoUrl?'<div class="brand-mark"><img src="'+esc(logoUrl)+'" alt="'+esc(siteName)+'"><button type="button" data-image-action="replace" data-image-target="logo">Change logo</button></div>':'<div class="brand-mark"><button type="button" data-image-action="add" data-image-target="logo">Add logo</button><span>'+esc(siteName||'Your business')+'</span></div>'}
function buyingPreview(){
 const products=Array.isArray(buyingCatalogue.products)?buyingCatalogue.products:[];
 const categories=Array.isArray(buyingCatalogue.categories)?buyingCatalogue.categories:[];
 if(!categories.length)return '';
 const cards=categories.map(cat=>{
   const items=products.filter(p=>p.category_id===cat.id);
   const image=items.find(p=>p.image_url)?.image_url||'';
   const imageMarkup=image?'<img src="'+esc(image)+'" alt="'+esc(cat.name)+'">':'<span aria-hidden="true"></span>';
   return '<article class="buy-category-card"><div class="buy-category-image">'+imageMarkup+'</div><div class="buy-category-copy"><h3>'+esc(cat.name)+'</h3><strong>'+items.length+' '+(items.length===1?'product':'products')+'</strong><p>'+esc(cat.description||'Products selected for this business buying list.')+'</p><a href="#" data-nav-page="buying">Sell this type →</a></div></article>';
 }).join('');
 return '<div class="buy-category-grid">'+cards+'</div>';
}
function sellingPreview(){
 const list=Array.isArray(retailListings)?retailListings:[];
 if(!list.length)return '';
 return '<div class="sell-product-grid">'+list.slice(0,6).map(p=>'<article class="sell-product-card"><div class="sell-photo">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.title||'Product')+'">':'<span aria-hidden="true"></span>')+'</div><span>'+esc(p.category_name||'')+'</span><h3>'+esc(p.title||'Product')+'</h3><strong>'+esc(p.asking_price!=null?new Intl.NumberFormat('en-GB',{style:'currency',currency:p.currency||'GBP'}).format(Number(p.asking_price)):'')+'</strong><a href="#" data-nav-page="shop">View &amp; buy</a></article>').join('')+'</div>';
}
function navMarkup(){
 const links=pages.filter(p=>p.enabled&&['about','contact','buying','shop'].includes(p.slug)).map(p=>'<button type="button" data-nav-page="'+esc(p.slug)+'">'+esc(p.slug==='buying'?'What We Buy':p.slug==='shop'?'What We Sell':p.title)+'</button>').join('');
 return '<nav class="template-nav"><div class="template-brand">'+logoEditor()+'</div><div class="template-nav-links"><button type="button" data-nav-page="home">Home</button>'+links+'<span class="managed-login">Customer Login</span></div></nav>';
}
function templateHero(){
 const d=templateDefaults[currentTemplate]||templateDefaults.editorial;
 const heroUrl=homeImageUrl;
 const img1=heroUrl?'<img src="'+esc(heroUrl)+'" alt="'+esc(siteName||'Website banner')+'">':'<div class="demo-image" aria-label="Main hero image"></div>';
 const img2=homeImageUrl2?'<img src="'+esc(homeImageUrl2)+'" alt="'+esc(siteName||'Second image')+'">':'<div class="demo-image" aria-label="Secondary hero image"></div>';
 templateCopy=cleanTemplateCopy(templateCopy); const kicker=editText('templateKicker',templateCopy.kicker||d.kicker,'span');
 const h=editText('headline',headline,'h1'),i=editText('intro',intro,'p');
 const a1='<b class="editable-hero-cta" contenteditable="true" data-template-field="cta1">'+esc(templateCopy.cta1||d.cta1)+'</b>';
 const a2='<b class="editable-hero-cta" contenteditable="true" data-template-field="cta2">'+esc(templateCopy.cta2||d.cta2)+'</b>';
 switch(currentTemplate){
 case 'editorial': return '<section class="tpl-hero editorial-hero"><div class="editorial-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="editorial-images">'+img1+img2+'</div></section>';
 case 'classic': return '<section class="tpl-hero classic-hero"><div class="classic-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="classic-frame">'+img1+'</div></section>';
 case 'grid': return '<section class="tpl-hero grid-hero"><div><div class="tpl-code">'+kicker+'</div>'+h+i+'<div class="grid-cta-row">'+a1+a2+'</div></div><div class="grid-image">'+img1+'</div></section>';
 case 'studio': return '<section class="tpl-hero studio-hero"><div class="studio-image">'+img1+'</div><div class="studio-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div></section>';
 case 'horizon': return '<section class="tpl-hero horizon-hero"><div class="horizon-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="horizon-image">'+img1+'</div></section>';
 case 'field': return '<section class="tpl-hero field-hero"><div class="field-image">'+img1+'</div><div class="field-overlay"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div></section>';
 case 'business': return '<section class="tpl-hero business-hero"><div class="business-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="business-facts"></div></section>';
 case 'luxe': return '<section class="tpl-hero luxe-hero"><div class="luxe-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="luxe-image">'+img1+'</div></section>';
 case 'commerce': return '<section class="tpl-hero commerce-hero"><div class="commerce-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="commerce-actions">'+a1+a2+'</div></div><div class="commerce-panel"></div></section>';
 default: return '<section class="tpl-hero impact-hero"><div class="impact-word">BUY.<br>SELL.</div><div class="impact-copy"><div class="tpl-eyebrow">'+kicker+'</div>'+h+i+'<div class="tpl-actions">'+a1+a2+'</div></div><div class="impact-image">'+img1+'</div></section>';
 }
}
function renderHome(){
 const visibleTiles=homepageTiles.slice(0,homepageTileCount);
 const tileMarkup=visibleTiles.map(tile=>'<article class="editable-home-tile '+(tile.side==='buy'?'buy-tile':'sell-tile')+'" draggable="true" data-tile-id="'+esc(tile.id)+'"><div class="tile-image">'+(tile.image_url?'<img src="'+esc(tile.image_url)+'" alt="'+esc(tile.image_alt||tile.title)+'">':'<button type="button" data-image-action="add" data-image-target="tile:'+esc(tile.id)+'">Add image</button>')+'</div><div class="tile-copy"><h3 contenteditable="true" data-tile-id="'+esc(tile.id)+'" data-tile-field="title">'+esc(tile.title)+'</h3><p contenteditable="true" data-tile-id="'+esc(tile.id)+'" data-tile-field="body">'+esc(tile.body)+'</p><b contenteditable="true" data-tile-id="'+esc(tile.id)+'" data-tile-field="cta">'+esc(tile.cta)+'</b></div></article>').join('');
 const blocks={
  hero:homepageSections.hero!==false?templateHero():'',
  buy:homepageSections.buy!==false?'<section class="template-section buying-block" draggable="true" data-home-block="buy"><div class="section-intro"><div>'+editText('buyHeading',homeBuyHeading,'h2')+editText('buyIntro',homeBuyIntro,'p')+'</div>'+imageBlock(homeBuyImageUrl,'home-buy','Add a What We Buy image.',homeBuyHeading||'What We Buy')+'</div>'+buyingPreview()+'</section>':'',
  sell:homepageSections.sell!==false?'<section class="template-section selling-block" draggable="true" data-home-block="sell"><div class="section-intro"><div>'+editText('sellHeading',homeSellHeading,'h2')+editText('sellIntro',homeSellIntro,'p')+'</div>'+imageBlock(homeSellImageUrl,'home-sell','Add a What We Sell image.',homeSellHeading||'What We Sell')+'</div>'+sellingPreview()+'</section>':'',
  trust:''
 };
 const tiles=visibleTiles.length?'<section class="homepage-tiles" data-home-tiles><div class="homepage-tile-grid" style="--tile-columns:'+homepageTileColumns+'">'+tileMarkup+'</div></section>':'';
 const ordered=homepageOrder.filter(k=>blocks[k]).map(k=>blocks[k]).join('');
 return navMarkup()+ordered+tiles+footerMarkup();
}

function renderPage(p){
 const isShop=p.slug==='shop',isBuying=p.slug==='buying',managed=p.slug==='customer-account';
 if(isBuying)return navMarkup()+'<section class="full-page buying-page"><div class="page-title-block">'+editText('page-title',p.title,'h1')+editText('page-body',p.body||'','p')+'</div>'+buyingPreview()+renderPageTilesEditor(p)+'</section>'+footerMarkup();
 if(isShop)return navMarkup()+'<section class="full-page shop-page"><div class="page-title-block shop-page-title">'+(bannerUrl?'<div class="builder-shop-banner"><img src="'+esc(bannerUrl)+'" alt="'+esc(siteName||'Website banner')+'"></div>':logoUrl?'<img class="shop-page-logo" src="'+esc(logoUrl)+'" alt="'+esc(siteName||'Business')+'">':'')+editText('page-title',p.title,'h1')+editText('page-body',p.body||'','p')+'</div>'+sellingPreview()+renderPageTilesEditor(p)+'</section>'+footerMarkup();
 return navMarkup()+'<section class="full-page content-page"><div class="page-title-block">'+(managed?'<h1>'+esc(p.title)+'</h1>':editText('page-title',p.title,'h1'))+(managed?'':editText('page-body',p.body||'','p'))+'</div>'+imageBlock(p.image_url,p.slug,'Add a branded image to this page.',p.image_alt||p.title)+'</section>'+footerMarkup();
}
function renderBuilderPageHelp(){
 const box=$('builder-page-help');if(!box)return;
 if(selectedPage==='buying'){box.hidden=false;box.innerHTML='<strong>How What We Buy works:</strong> this page is connected automatically to your <b>Buying Catalogue</b>. Products you add or remove in the catalogue control what customers see here. You do not need to add the products again in the Website Builder. <a href="buying-catalogue.html">Open Buying Catalogue</a> · <a href="subscriber-website-manual.html">Read the Website Manual</a>';return}
 if(selectedPage==='shop'){box.hidden=false;box.innerHTML='<strong>How What We Sell works:</strong> this page is connected automatically to your <b>Selling</b> listings. Products you set up for sale and publish through Selling appear here. You do not need to add the products again in the Website Builder. <a href="selling-dashboard.html">Open Selling</a> · <a href="subscriber-website-manual.html">Read the Website Manual</a>';return}
 box.hidden=true;box.innerHTML='';
}
function renderEditor(){
 const p=currentPage();
 $('editing-page-name').textContent=p.slug==='home'?'Home page':p.title;
 $('browser-label').textContent=(siteName||'Your business')+' · '+(p.slug==='home'?'Home':p.title);
 $('site-editor').className='site-editor template-'+currentTemplate;$('site-editor').dataset.font=typography.font;$('site-editor').dataset.heroSize=typography.hero;$('site-editor').dataset.sectionSize=typography.section;$('site-editor').dataset.bodySize=typography.body;$('site-editor').dataset.navSize=typography.nav;$('site-editor').dataset.buttonStyle=typography.button;$('site-editor').dataset.headerStyle=typography.header;$('site-editor').dataset.footerStyle=typography.footer;
 $('site-editor').innerHTML=p.slug==='home'?renderHome():renderPage(p);
 $('site-editor').style.setProperty('--accent',themeColors.accent);applyWebsiteBackground();$('site-editor').style.setProperty('--page-bg',themeColors.page_bg);$('site-editor').style.setProperty('--text-color',themeColors.text);$('site-editor').style.setProperty('--header-bg',themeColors.header_bg);$('site-editor').style.setProperty('--buy-bg',themeColors.buy_bg);$('site-editor').style.setProperty('--sell-bg',themeColors.sell_bg);$('site-editor').style.setProperty('--footer-bg',themeColors.footer_bg);
 bindEditor();
}

function bindEditor(){
 const root=$('site-editor');
 root.querySelectorAll('[contenteditable="true"]').forEach(el=>{
   el.addEventListener('input',()=>{
     const field=el.dataset.edit;
     if(field==='site-name')siteName=el.innerText.trim();
     if(field==='headline')headline=el.innerText.trim();
     if(field==='intro')intro=el.innerText.trim();
     if(field==='page-title'){currentPage().title=el.innerText.trim()||pageDef(currentPage().slug).title;renderPageList();}
     if(field==='page-body')currentPage().body=el.innerText.replace(/\r/g,'').trim();
     if(el.dataset.tileField){const tileId=el.dataset.tileId||el.dataset.pageTileId;const pageTile=el.dataset.pageTileId&&currentPage().tiles?.find(t=>t.id===el.dataset.pageTileId);const tile=homepageTiles.find(t=>t.id===tileId);if(pageTile)pageTile[el.dataset.tileField]=el.innerText.trim();else if(tile)tile[el.dataset.tileField]=el.innerText.trim();}
     if(field==='buyHeading')homeBuyHeading=el.innerText.trim();
     if(field==='buyIntro')homeBuyIntro=el.innerText.trim();
     if(field==='sellHeading')homeSellHeading=el.innerText.trim();
     if(field==='sellIntro')homeSellIntro=el.innerText.trim(); if(field==='templateKicker')templateCopy.kicker=el.innerText.trim(); if(el.dataset.templateField)templateCopy[el.dataset.templateField]=el.innerText.trim();
     markDirty();
   });
   el.addEventListener('focus',()=>el.classList.add('editing'));
   el.addEventListener('blur',()=>el.classList.remove('editing'));
 });
 root.querySelectorAll('[data-nav-page]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();selectPage(el.dataset.navPage)}));
 root.querySelectorAll('[data-image-action]').forEach(el=>{el.draggable=false;el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('click',e=>{e.stopPropagation();
   const action=el.dataset.imageAction,target=el.dataset.imageTarget;
   if(action==='remove'){removeImage(target);return}
   const input=$('image-file-input');input.dataset.target=target;input.value='';input.click();
 });});
 let draggedBlock=null;
 root.querySelectorAll('[data-home-block]').forEach(el=>{
   el.addEventListener('dragstart',()=>{draggedBlock=el.dataset.homeBlock;el.classList.add('dragging')});
   el.addEventListener('dragend',()=>el.classList.remove('dragging'));
   el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over')});
   el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
   el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');const target=el.dataset.homeBlock;if(!draggedBlock||draggedBlock===target)return;homepageOrder=homepageOrder.filter(k=>k!==draggedBlock);const at=homepageOrder.indexOf(target);homepageOrder.splice(at<0?homepageOrder.length:at,0,draggedBlock);markDirty();renderEditor()});
 });
 let draggedTile=null;
 root.querySelectorAll('[data-tile-id]').forEach(el=>{
   if(el.matches('.editable-home-tile'))el.addEventListener('dragstart',()=>{draggedTile=el.dataset.tileId;el.classList.add('dragging')});
   if(el.matches('.editable-home-tile'))el.addEventListener('dragend',()=>el.classList.remove('dragging'));
   if(el.matches('.editable-home-tile'))el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over')});
   if(el.matches('.editable-home-tile'))el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');if(!draggedTile||draggedTile===el.dataset.tileId)return;const from=homepageTiles.findIndex(t=>t.id===draggedTile),to=homepageTiles.findIndex(t=>t.id===el.dataset.tileId);if(from<0||to<0)return;const [item]=homepageTiles.splice(from,1);homepageTiles.splice(to,0,item);markDirty();renderEditor()});
 });
}

function selectPage(slug){
 if(!validPageSlug(slug))return;
 selectedPage=slug;
 const next=new URL(location.href);
 next.searchParams.set('page',slug);
 history.replaceState(null,'',next.toString());
 renderPageList();renderHomepageControls();renderEditor();window.scrollTo({top:0,behavior:'smooth'});
}

function applyTemplate(template){
 if(!templateHeadlines[template])return;
 const previousDefaults=Object.values(templateDefaults).some(d=>d.kicker===templateCopy.kicker&&d.cta1===templateCopy.cta1&&d.cta2===templateCopy.cta2);
 currentTemplate=template;
 themeColors=Object.assign({},templatePalettes[template]||templatePalettes.editorial,{background_id:themeColors.background_id||'clean-wave',background_mode:themeColors.background_mode||'preset'});
 if(!headline||Object.values(templateHeadlines).includes(headline))headline=templateHeadlines[template];
 if(!templateCopy.kicker||previousDefaults)templateCopy=Object.assign({},templateDefaults[template]||templateDefaults.editorial);
 renderTemplates();renderHomepageControls();renderHeroImageControls();renderEditor();markDirty();
 setStatus(template+' template selected. Text, colours and images remain editable.','success');
}
function buildContent(){
 return {schema_version:2,template_reset_version:2,site:{
   name:siteName.trim()||null,
   pages:pages,
   theme:{accent:themeColors.accent||accent||'#c46a2b',page_bg:themeColors.page_bg,text:themeColors.text,header_bg:themeColors.header_bg,buy_bg:themeColors.buy_bg,sell_bg:themeColors.sell_bg,footer_bg:themeColors.footer_bg,background_id:normalizeBackgroundId(themeColors.background_id),background_mode:themeColors.background_mode==='custom'?'custom':'preset',background_color:themeColors.background_mode==='custom'?(themeColors.page_bg||'#f5f6f8'):(websiteBackgrounds.find(x=>x.id===themeColors.background_id)?.color||'#f5faff'),background_image:themeColors.background_mode==='custom'?'':(websiteBackgrounds.find(x=>x.id===themeColors.background_id)?.image||''),background_size:themeColors.background_mode==='custom'?'cover':(websiteBackgrounds.find(x=>x.id===themeColors.background_id)?.size||'cover'),background_repeat:themeColors.background_mode==='custom'?'no-repeat':(websiteBackgrounds.find(x=>x.id===themeColors.background_id)?.repeat||'no-repeat'),typography:typography},
   social:socialLinks,
   header:{tagline:headerTagline,links:headerLinks},footer:{text:footerText,links:footerLinks},
   reviews:reviewLinks,
   branding:{logo_url:logoUrl||'',banner_url:bannerUrl||''},
   homepage:{block_order:homepageOrder,headline:headline.trim()||null,intro:intro.trim()||null,image_url:homeImageUrl||'',image_alt:siteName||'Homepage image',image_url2:homeImageUrl2||'',image_alt2:siteName+' secondary image',buy_image_url:homeBuyImageUrl||'',buy_image_alt:homeBuyHeading||'What We Buy',sell_image_url:homeSellImageUrl||'',sell_image_alt:homeSellHeading||'What We Sell',sections:homepageSections,tile_count:homepageTileCount,tile_columns:homepageTileColumns,buy_heading:homeBuyHeading,buy_intro:homeBuyIntro,sell_heading:homeSellHeading,sell_intro:homeSellIntro,tiles:homepageTiles},
   navigation:[{label:'Home',path:'?page=home'}].concat(pages.filter(p=>p.enabled).map(p=>({label:p.title,path:'?page='+p.slug}))),
   category_manifest:Array.isArray(window.__existingCategoryManifest)?window.__existingCategoryManifest:[],
   template:currentTemplate,template_copy:templateCopy,
   contact:{text:(pages.find(p=>p.slug==='contact')?.body||'').trim()||null}
 }};
}

function cleanTemplateCopy(copy){
 const known=['YOUR BUSINESS','ESTABLISHED SERVICE','BUY / SELL / TRADE','BUYING / SELLING','BUSINESS INFORMATION','PRIVATE SERVICE','BUY / SELL','BUY · SELL · TRADE'];
 const cta=['What do you have to sell?','What we buy','What we sell','Sell to us','Browse the shop','Explore the shop','Sell your items','Browse products','Retail shop','Shop products','Start selling','01 / WHAT WE BUY','02 / WHAT WE SELL','View product','View shop','View & buy'];
 const out=Object.assign({},copy||{});
 if(known.includes(String(out.kicker||'')) || /^\s*\d+\s*\/\s*/.test(String(out.kicker||'')))out.kicker='';
 if(cta.includes(String(out.cta1||'')) || /^\s*\d+\s*\/\s*/.test(String(out.cta1||'')))out.cta1='';
 if(String(out.cta2||'').trim().toLowerCase()==='what we sell')out.cta2='Visit our retail shop'; else if(cta.includes(String(out.cta2||'')) || /^\s*\d+\s*\/\s*/.test(String(out.cta2||'')))out.cta2='';
 return out;
}
function ensureHomepageTileCapacity(tiles){
 const existing=Array.isArray(tiles)?tiles:[];
 const byId=new Map(existing.map(t=>[t.id,t]));
 return defaultHomepageTiles().map(d=>byId.has(d.id)?Object.assign({},d,byId.get(d.id)):Object.assign({},d));
}
function cleanHomepageTiles(tiles){
 const defaults=new Map(defaultHomepageTiles().map(t=>[t.id,t]));
 return (Array.isArray(tiles)?tiles:[]).map(t=>{const d=defaults.get(t.id);if(!d)return t;const copy={...t};['title','body','cta'].forEach(k=>{if(copy[k]===d[k])copy[k]='';});return copy;});
}

function loadContent(content){
 const s=content?.site||{}; templateCopy=cleanTemplateCopy(Object.assign({},templateDefaults[s.template]||templateDefaults.editorial,s.template_copy||{}));
 window.__existingCategoryManifest=Array.isArray(s.category_manifest)?s.category_manifest:[];
 siteName=s.name||'';headerTagline=s.header?.tagline||'';footerText=s.footer?.text||'';
 headline=s.homepage?.headline||'';
 intro=s.homepage?.intro||'';
 accent=s.theme?.accent||'#c46a2b';
 typography=Object.assign({font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid',header:'standard',footer:'simple'},s.theme?.typography||{});homepageOrder=Array.isArray(s.homepage?.block_order)&&s.homepage.block_order.length?s.homepage.block_order:['hero','buy','sell','trust'];homepageSections=Object.assign({hero:true,hero_image:true,dual:true,buy:true,sell:true,trust:true,shop:true},s.homepage?.sections||{});
 themeColors={accent:accent,page_bg:s.theme?.page_bg||'#f5f6f8',text:s.theme?.text||'#17202a',header_bg:s.theme?.header_bg||'#ffffff',buy_bg:s.theme?.buy_bg||'#ffffff',sell_bg:s.theme?.sell_bg||'#f4f6f7',footer_bg:s.theme?.footer_bg||'#17202a',background_id:normalizeBackgroundId(s.theme?.background_id),background_mode:s.theme?.background_mode==='custom'?'custom':'preset'};
 socialLinks=Object.assign({facebook:'',instagram:'',linkedin:'',youtube:'',tiktok:'',x:'',show_share:true},s.social||{});
 reviewLinks=Array.isArray(s.reviews)?s.reviews.map(r=>({label:r.label||'',url:r.url||''})).slice(0,4):[];
 const branding=s.branding&&typeof s.branding==='object'?s.branding:{};
 logoUrl=Object.prototype.hasOwnProperty.call(branding,'logo_url')?String(branding.logo_url||''):(authoritativeBranding.logo_url||s.logo_url||'');
 bannerUrl=Object.prototype.hasOwnProperty.call(branding,'banner_url')?String(branding.banner_url||''):(authoritativeBranding.banner_url||'');headerLinks=Array.isArray(s.header?.links)?s.header.links:['home','buying','shop','about','contact'];footerLinks=Array.isArray(s.footer?.links)?s.footer.links:['home','buying','shop','about','contact'];
 homeImageUrl=s.homepage?.image_url||'';homeImageUrl2=s.homepage?.image_url2||'';homeBuyImageUrl=s.homepage?.buy_image_url||'';homeSellImageUrl=s.homepage?.sell_image_url||'';
 homeBuyHeading=s.homepage?.buy_heading||'What we buy';homeBuyIntro=s.homepage?.buy_intro||'Tell customers the types of products, equipment or services you are looking to buy.';homeSellHeading=s.homepage?.sell_heading||'What we sell';homeSellIntro=s.homepage?.sell_intro||'Showcase the products and collections customers can browse and buy.';homepageTileCount=[3,4,6,8,9,10,12].includes(Number(s.homepage?.tile_count))?Number(s.homepage.tile_count):8;homepageTileColumns=[2,3,4].includes(Number(s.homepage?.tile_columns))?Number(s.homepage.tile_columns):4;homepageTiles=ensureHomepageTileCapacity(Array.isArray(s.homepage?.tiles)&&s.homepage.tiles.length?cleanHomepageTiles(s.homepage.tiles):defaultHomepageTiles());
 currentTemplate=templateHeadlines[s.template]?s.template:'editorial';
 pages=Array.isArray(s.pages)&&s.pages.length?s.pages.map(p=>Object.assign({},p,{
   enabled:p.enabled!==false,
   title:p.slug==='shop'&&(!p.title||p.title==='Shop')?'Retail Shop':(p.title||p.slug),
   body:cleanPageBody(p.slug,p.body),image_url:p.image_url||'',image_alt:p.image_alt||'',image_url2:p.image_url2||'',image_alt2:p.image_alt2||'',tile_count:p.slug==='shop'||p.slug==='buying'?([3,4,6,8,9,10,12].includes(Number(p.tile_count))?Number(p.tile_count):6):0,tile_columns:p.slug==='shop'||p.slug==='buying'?([2,3,4].includes(Number(p.tile_columns))?Number(p.tile_columns):3):3,tiles:p.slug==='shop'||p.slug==='buying'?ensurePageTileCapacity(cleanPageTiles(p.tiles,p.slug==='shop'?'shop-tile':'buying-tile'),p.slug==='shop'?'shop-tile':'buying-tile'):[],seo_title:p.seo_title||'',seo_description:p.seo_description||''
 })):defaultPages();
 selectedPage=validPageSlug(requestedPage)?requestedPage:'home';dirty=false;
 renderPageList();renderPageManager();renderHeaderFooterControls();renderTemplates();renderHomepageControls();renderHeroImageControls();renderDesignControls();renderBrandingControls();renderBusinessExtras();renderEditor();
}

async function uploadImage(file,target){
 if(!file)return;
 if(file.size>5242880)throw new Error('Image is larger than 5 MB.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPEG or WebP images only.');
 if(!tenantId||!session?.access_token)throw new Error('Subscriber session is not ready.');
 setStatus('Uploading image…');
 const slug=target==='home'?'home':target==='logo'?'logo':target==='banner'?'banner':target;
 const safe=(file.name||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
 const path=tenantId+'/'+slug+'/'+Date.now()+'-'+safe;
 const response=await fetch(SUPABASE_URL+'/storage/v1/object/tradeflow-site-media/'+path.split('/').map(encodeURIComponent).join('/'),{
   method:'POST',headers:{apikey:supabaseKey,Authorization:'Bearer '+session.access_token,'Content-Type':file.type,'x-upsert':'false'},body:file
 });
 const responseText=await response.text();
 if(!response.ok)throw new Error(responseText||'Image upload failed.');
 const url=SUPABASE_URL+'/storage/v1/object/public/tradeflow-site-media/'+path.split('/').map(encodeURIComponent).join('/');
 if(target==='home')homeImageUrl=url;
 else if(target==='home2')homeImageUrl2=url;
 else if(target==='home-buy')homeBuyImageUrl=url;
 else if(target==='home-sell')homeSellImageUrl=url;
 else if(target==='logo')logoUrl=url;
 else if(target==='banner')bannerUrl=url;
 else if(target.endsWith(':image2')){const p=pages.find(x=>x.slug===target.split(':')[0]);if(p){p.image_url2=url;p.image_alt2=p.title+' second image';}}
 else if(target.startsWith('tile:')){const tile=homepageTiles.find(x=>x.id===target.slice(5));if(tile){tile.image_url=url;tile.image_alt=tile.title;}}
 else if(target.startsWith('page:')&&target.includes(':tile:')){const parts=target.split(':');const p=pages.find(x=>x.slug===parts[1]);const tile=p?.tiles?.find(x=>x.id===parts[3]);if(tile){tile.image_url=url;tile.image_alt=tile.title;}}
 else if(target.includes(':image2')){const p=pages.find(x=>x.slug===target.split(':')[0]);if(p){p.image_url2='';p.image_alt2='';}}
 else {const p=pages.find(x=>x.slug===target);if(p){p.image_url=url;p.image_alt=p.title;}}
 try{
   await api('/rest/v1/media_assets',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
     tenant_id:tenantId,storage_bucket:'tradeflow-site-media',storage_path:path,original_filename:file.name,
     mime_type:file.type,byte_size:file.size,status:'active',created_by:session.user?.id||null,
     asset_kind:target==='logo'?'site_logo':target==='banner'?'site_banner':'site_image',retention_policy:'permanent'
   })});
 }catch(e){console.warn('Site image metadata insert failed',e)}
 dirty=true;renderHeroImageControls();renderEditor();renderPageList();setStatus('Image added. Save the draft to keep the website change.','success');
}

function removeImage(target){
 if(target==='home')homeImageUrl='';
 else if(target==='home2')homeImageUrl2='';
 else if(target==='home-buy')homeBuyImageUrl='';
 else if(target==='home-sell')homeSellImageUrl='';
 else if(target==='logo')logoUrl='';
 else if(target==='banner')bannerUrl='';
 else if(target.startsWith('tile:')){const tile=homepageTiles.find(x=>x.id===target.slice(5));if(tile){tile.image_url='';tile.image_alt='';}}
 else if(target.startsWith('page:')&&target.includes(':tile:')){const parts=target.split(':');const p=pages.find(x=>x.slug===parts[1]);const tile=p?.tiles?.find(x=>x.id===parts[3]);if(tile){tile.image_url='';tile.image_alt='';}}
 else {const p=pages.find(x=>x.slug===target);if(p){p.image_url='';p.image_alt='';}}
 markDirty();renderHeroImageControls();renderEditor();setStatus('Image removed from this draft. Save the draft to keep the change.','success');
}

async function api(path,options){
 options=options||{};
 if(!supabaseKey)throw new Error('TradeFlow is not connected. Open the TradeFlow subscriber sign-in page first.');
 const headers=new Headers(options.headers||{});
 headers.set('apikey',supabaseKey);headers.set('Content-Type','application/json');
 if(session?.access_token)headers.set('Authorization','Bearer '+session.access_token);
 const response=await fetch(SUPABASE_URL+path,Object.assign({},options,{headers}));
 const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
 if(!response.ok){const detail=body&&(body.msg||body.message||body.error_description||body.error)||text||('HTTP '+response.status);throw new Error(detail)}
 return body;
}

async function restoreSession(){
 if(!window.tradeflowSubscriberAuthReady)throw new Error('Subscriber authentication layer did not load.');
 const auth=await window.tradeflowSubscriberAuthReady;
 if(!auth?.session?.access_token)throw new Error('Subscriber authentication did not provide an access token.');
 supabaseKey=auth.key;session=auth.session;tenantId=auth.tenantId;
 if(!tenantId)throw new Error('Subscriber authentication did not provide a tenant.');
 try{const profile=await api('/rest/v1/tenant_public_profiles?select=business_name,logo_url,banner_url&tenant_id=eq.'+encodeURIComponent(tenantId));const p=profile?.[0]||{};authoritativeBranding={logo_url:p.logo_url||'',banner_url:p.banner_url||''};if(p.business_name){siteName=p.business_name;window.__tradeflowBusinessNameLoaded=true;}}catch{authoritativeBranding={logo_url:'',banner_url:''};}
 return tenantId;
}

async function loadBuyingCatalogue(tenant){
 if(!tenant)return {categories:[],products:[]};
 const rows=await api('/rest/v1/rpc/get_public_buying_catalogue?p_tenant_id='+encodeURIComponent(tenant));
 const products=Array.isArray(rows)?rows:[];
 const map=new Map();
 for(const p of products){if(!map.has(p.category_id))map.set(p.category_id,{id:p.category_id,name:p.category_name,slug:p.category_slug,description:p.category_description||'',product_count:0});map.get(p.category_id).product_count++;}
 return {categories:Array.from(map.values()),products};
}
async function loadRetailListings(tenant){
 if(!tenant)return [];
 try{const rows=await api('/rest/v1/rpc/get_published_store_listings?p_tenant_id='+encodeURIComponent(tenant));return Array.isArray(rows)?rows:[]}
 catch(e){console.warn('TradeFlow retail preview listings unavailable:',e);return []}
}
async function clearFreshStartMedia(){
 try{
   const assets=await api('/rest/v1/media_assets?select=storage_path&tenant_id=eq.'+encodeURIComponent(tenantId));
   const paths=Array.isArray(assets)?assets.map(a=>a.storage_path).filter(Boolean):[];
   if(paths.length)await fetch(SUPABASE_URL+'/storage/v1/object/remove',{method:'POST',headers:{apikey:supabaseKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths})});
   await api('/rest/v1/media_assets?tenant_id=eq.'+encodeURIComponent(tenantId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
 }catch(e){console.warn('Fresh website media cleanup skipped:',e)}
}
function resetToFreshWebsite(){
 siteName='';headerTagline='';footerText='';headline='';intro='';accent='#c46a2b';homeImageUrl='';homeImageUrl2='';homeBuyImageUrl='';homeSellImageUrl='';
 templateCopy=Object.assign({},templateDefaults.editorial);
 homepageTileCount=8;homepageTileColumns=4;homeBuyHeading='What we buy';homeBuyIntro='Tell customers what you are looking to buy.';
 homeSellHeading='What we sell';homeSellIntro='Show customers what is available to buy.';
 homepageTiles=defaultHomepageTiles();themeColors={accent:'#c46a2b',page_bg:'#f5f6f8',text:'#17202a',header_bg:'#ffffff',buy_bg:'#ffffff',sell_bg:'#f4f6f7',footer_bg:'#17202a',background_id:'clean-wave',background_mode:'preset'};
 socialLinks={facebook:'',instagram:'',linkedin:'',youtube:'',tiktok:'',x:'',show_share:true};reviewLinks=[];typography={font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid',header:'standard',footer:'simple'};
 homepageSections={hero:true,hero_image:true,dual:true,buy:true,sell:true,trust:true,shop:true};headerLinks=['home','buying','shop','about','contact'];footerLinks=['home','buying','shop','about','contact'];homepageOrder=['hero','buy','sell','trust'];
 pages=defaultPages();selectedPage='home';currentTemplate='editorial';window.__existingCategoryManifest=[];
}
async function loadDraft(){
 const rows=await api('/rest/v1/tenant_site_state?select=tenant_id,draft_revision_id,published_revision_id&tenant_id=eq.'+encodeURIComponent(tenantId));
 if(!Array.isArray(rows)||rows.length!==1)throw new Error('Subscriber website state is not initialised.');
 draftRevisionId=rows[0].draft_revision_id;
 const drafts=await api('/rest/v1/site_revisions?select=id,revision_number,status,content&tenant_id=eq.'+encodeURIComponent(tenantId)+'&id=eq.'+encodeURIComponent(draftRevisionId)+'&status=eq.draft');
 if(!Array.isArray(drafts)||drafts.length!==1)throw new Error('The current website draft revision could not be loaded.');
 if(Number(drafts[0].content?.template_reset_version||0)<2){await clearFreshStartMedia();resetToFreshWebsite();dirty=true;renderPageList();renderPageManager();renderHeaderFooterControls();renderTemplates();renderHomepageControls();renderHeroImageControls();renderDesignControls();renderBrandingControls();renderBusinessExtras();renderEditor();await api('/rest/v1/site_revisions?id=eq.'+encodeURIComponent(draftRevisionId)+'&tenant_id=eq.'+encodeURIComponent(tenantId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({content:buildContent()})});dirty=false;const freshState=$('save-state');if(freshState)freshState.textContent='Fresh website saved';setStatus('Fresh website templates loaded. Previous website text, branding and images have been cleared.','success');}else{loadContent(drafts[0].content);}
 try{await loadBuyingCatalogue();}catch(e){console.warn('TradeFlow buying catalogue did not load in the builder:',e);buyingCatalogue={categories:[],products:[]};}
 retailListings=await loadRetailListings(tenantId);
 renderEditor();
 if(validPageSlug(requestedPage))selectedPage=requestedPage;
 if(requestedTemplate)applyTemplate(requestedTemplate);
 setStatus('Website loaded. Click the page and edit directly on the preview.','success'); if(requestedFocus==='branding'){const box=$('branding-controls');if(box){box.scrollIntoView({behavior:'smooth',block:'center'});}}
}

function resetDesignToDefaults(){
 if(!window.confirm('Reset the website design to its factory defaults? Your page text, pages and uploaded images will be kept.'))return;
 const palette=templatePalettes.editorial||{accent:'#b85c38',page_bg:'#f7f4f0',text:'#20252a',header_bg:'#fffdfb',buy_bg:'#fffdfb',sell_bg:'#f0ebe6',footer_bg:'#20252a'};
 currentTemplate='editorial';
 themeColors=Object.assign({},palette,{background_id:'clean-wave',background_mode:'preset'});
 typography={font:'Inter',hero:'large',section:'large',body:'standard',nav:'standard',button:'solid',header:'standard',footer:'simple'};
 templateCopy=Object.assign({},templateDefaults.editorial);
 homepageTileCount=8;
 homepageTileColumns=4;
 homepageSections={hero:true,hero_image:true,dual:true,buy:true,sell:true,trust:true,shop:true};
 homepageOrder=['hero','buy','sell','trust'];
 applyWebsiteBackground();
 renderTemplates();
 renderHomepageControls();
 renderHeroImageControls();
 renderDesignControls();
 renderBrandingControls();
 renderTypographyControls();
 renderSectionControls();
 renderHeaderFooterControls();
 renderEditor();
 markDirty();
 setStatus('Design reset to factory defaults. Your content, pages and images were kept. Save the draft to keep the reset.','success');
}
async function saveDraft(){
 if(!draftRevisionId)await loadDraft();
 setStatus('Saving website draft…');
 await api('/rest/v1/site_revisions?id=eq.'+encodeURIComponent(draftRevisionId)+'&tenant_id=eq.'+encodeURIComponent(tenantId),{
   method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({content:buildContent()})
 });
 dirty=false;const state=$('save-state');if(state)state.textContent='All changes saved';
 setStatus('Website draft saved to TradeFlow.','success');
}

async function publish(){
 if(!draftRevisionId)await loadDraft();
 if(dirty)await saveDraft();
 setStatus('Publishing website…');
 await api('/rest/v1/rpc/publish_site_revision',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId,p_revision_id:draftRevisionId})});
 await loadDraft();
 setStatus('Website published. A new draft is ready for further edits.','success');
}

function initBuilder(){
 $('templates')&&renderTemplates();
 $('page-list')&&renderPageList();
 renderDesignControls();
 renderHeroImageControls();
 renderBrandingControls();
 renderPageManager();
 renderHeaderFooterControls();
 renderTypographyControls();
 renderSectionControls();
 renderBusinessExtras();
 $('image-file-input').addEventListener('change',e=>{
   const file=e.target.files?.[0],target=e.target.dataset.target;
   if(file)uploadImage(file,target).catch(err=>setStatus(err.message||String(err),'error'));
 });
 $('save-draft').addEventListener('click',()=>saveDraft().catch(e=>setStatus(e.message||String(e),'error')));
 $('reset-design').addEventListener('click',resetDesignToDefaults);
 $('publish').addEventListener('click',()=>publish().catch(e=>setStatus(e.message||String(e),'error')));
 $('preview-customer').addEventListener('click',()=>location.href='customer-dashboard-preview.html'+(tenantId?'?tenant_id='+encodeURIComponent(tenantId):''));
 $('preview-site').addEventListener('click',e=>{
   e.currentTarget.href='public-site.html?preview=draft'+(tenantId?'&tenant_id='+encodeURIComponent(tenantId):'');
 });
 (async()=>{const saveState=$('save-state');try{if(saveState)saveState.textContent='Connecting to your website…';await Promise.race([restoreSession(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Subscriber session timed out. Please refresh and sign in again.')),15000))]);if(saveState)saveState.textContent='Loading website draft…';await Promise.race([loadDraft(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Website draft loading timed out. Please refresh the builder.')),20000))]);if(saveState)saveState.textContent='Website loaded';}catch(error){if(saveState)saveState.textContent='Website could not be loaded';setStatus(error.message||String(error),'error');console.error('TradeFlow Website Builder load error',error)}})();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initBuilder);else initBuilder();
