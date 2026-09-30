const TRADEFLOW_PUBLIC_SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const TRADEFLOW_PUBLIC_KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
async function tradeflowAvailablePlans(){
 const r=await fetch(TRADEFLOW_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/public_get_available_plans',{method:'POST',headers:{apikey:TRADEFLOW_PUBLIC_KEY,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error('Unable to load current TradeFlow plans.');
 const data=await r.json();return Array.isArray(data)?data:[];
}
function tradeflowPlanPrice(p){
 if(p.monthly_price===null||p.monthly_price===undefined)return '<strong>Price to be set</strong><span>per month</span>';
 const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:p.currency||'GBP'}).format(Number(p.monthly_price));
 const annual=p.annual_price===null||p.annual_price===undefined?'':'<small>'+new Intl.NumberFormat('en-GB',{style:'currency',currency:p.currency||'GBP'}).format(Number(p.annual_price))+' per year</small>';return '<strong>'+money+'</strong><span>per month</span>'+annual;
}
function tradeflowPlanHighlights(code){
 return ['Complete buying and valuation workflow','Trade-ins, offers and customer portal','Inventory, selling, orders and fulfilment','Customer-facing website and Website Builder','TradeFlow starting catalogue'];
}
function renderTradeflowPlanCards(host,plans){
 host.innerHTML=plans.map((p,i)=>{
  const featured=' featured-plan';
  const lis=tradeflowPlanHighlights(p.code).map(x=>'<li>'+x+'</li>').join('');
  const buttonClass='button button-primary full';
  return '<article class="plan-new'+featured+'"><div class="plan-top"><h3>'+p.name+'</h3><p>'+ (p.description||'') +'</p><div class="plan-price">'+tradeflowPlanPrice(p)+'</div></div><ul>'+lis+'</ul><a class="'+buttonClass+'" href="subscriber-signup.html?plan='+encodeURIComponent(p.code)+'">Start with '+p.name+'</a><a class="plan-detail-mini" href="plans.html#'+encodeURIComponent(p.code)+'">View '+p.name+' features →</a></article>';
 }).join('');
}
async function initTradeflowPublicPlans(){
 const host=document.getElementById('public-plan-grid');if(!host)return;
 try{const plans=await tradeflowAvailablePlans();renderTradeflowPlanCards(host,plans)}
 catch(e){host.innerHTML='<p>'+e.message+'</p>'}
}
async function initTradeflowPlanDetails(){
 const name=document.getElementById('plan-detail-name');
 const description=document.getElementById('plan-detail-description');
 const price=document.getElementById('plan-detail-price');
 const detail=document.getElementById('enhanced');
 if(!name&&!description&&!price&&!detail)return;
 try{
  const plans=await tradeflowAvailablePlans();
  const p=plans[0];
  if(!p){if(detail)detail.hidden=true;return;}
  if(name)name.textContent=p.name;
  if(description)description.textContent=p.description||'The complete TradeFlow workspace.';
  if(price)price.innerHTML=tradeflowPlanPrice(p);
  document.querySelectorAll('a[href*="subscriber-signup.html?plan="]').forEach(a=>{
    a.href='subscriber-signup.html?plan='+encodeURIComponent(p.code);
    if(a.textContent.includes('Start with '))a.textContent='Start your TradeFlow trial';
  });
 }catch(e){console.warn(e)}
}
document.addEventListener('DOMContentLoaded',()=>{initTradeflowPublicPlans();initTradeflowPlanDetails()});
