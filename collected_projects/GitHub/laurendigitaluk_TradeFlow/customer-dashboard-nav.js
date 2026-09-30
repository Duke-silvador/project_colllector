/* TradeFlow customer dashboard navigation.
 * Keeps customer portal navigation independent from the data controller.
 * Native hash navigation must remain available while the portal is hidden;
 * otherwise the navigation script itself can make the page appear completely inert.
 */
(()=>{
  const sectionIds=['selling','orders','details'];
  const tenantId=new URLSearchParams(location.search).get('tenant_id');
  const setTenantLink=(selector,path)=>{
    const link=document.querySelector(selector);
    if(!link)return;
    const target=new URL(path,location.href);
    if(tenantId)target.searchParams.set('tenant_id',tenantId);
    link.href=target.href;
  };
  const show=(id,updateHash=true)=>{
    const target=sectionIds.includes(id)?id:'selling';
    const portal=document.getElementById('portal');
    if(!portal||portal.hidden)return false;
    sectionIds.forEach(sectionId=>{
      const section=document.getElementById(sectionId);
      if(section)section.hidden=sectionId!==target;
    });
    document.querySelectorAll('a[href^="#"]').forEach(link=>{
      link.classList.toggle('active',link.getAttribute('href')===`#${target}`);
    });
    if(updateHash&&location.hash!==`#${target}`)history.replaceState(null,'',`#${target}`);
    const content=document.querySelector('.content');
    if(content)content.scrollIntoView({block:'start'});
    return true;
  };
  const bind=()=>{
    setTenantLink('a[href="customer-basket.html"]','customer-basket.html');
    document.querySelectorAll('a[href^="#"]').forEach(link=>{
      link.addEventListener('click',e=>{
        const id=link.getAttribute('href').slice(1);
        if(!sectionIds.includes(id))return;
        const portal=document.getElementById('portal');
        if(!portal||portal.hidden)return;
        e.preventDefault();
        show(id);
      });
    });
    window.addEventListener('hashchange',()=>show(location.hash.slice(1),false));
    const portal=document.getElementById('portal');
    if(!show(location.hash.slice(1)||'selling',false)){
      document.querySelectorAll('a[href^="#"]').forEach(link=>link.classList.remove('active'));
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
