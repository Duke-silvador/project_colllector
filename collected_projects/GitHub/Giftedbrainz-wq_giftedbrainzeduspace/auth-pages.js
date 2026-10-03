/* Gifted Brainz EduSpace v12.0.8 — shared Sign In / Create Account helpers */
(function(){
  // NOTE: v12.0.8 used to force a redirect to "/" whenever the browser reported
  // this page load as a "reload" navigation, to catch someone manually hitting
  // refresh. Removed in v12.0.9: many mobile browsers misreport ordinary loads
  // (e.g. a backgrounded tab being restored) as "reload", which was wiping
  // in-progress Sign In / Create Account forms and bouncing students back to
  // the home page. The form itself handles submission via fetch/Supabase with
  // preventDefault, so no native resubmission-on-refresh issue exists without this.
  var WA_DEFAULT='2348156767275';
  var REGISTER_MSG='Hello Gifted Brainz Tutorial, I want to register for the Gifted Brainz classes. Please provide me with the information I need to complete my registration.';
  function ls(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
  function deviceId(){var k='gb_device_id_v1',id=ls(k);if(!id){try{id=crypto.randomUUID()}catch(e){id='gb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)}try{localStorage.setItem(k,id)}catch(e){}}return id}
  function waNumber(contact){var d=String(contact||'').replace(/\D/g,'');if(d.length>=10){if(d.charAt(0)==='0'&&d.length===11)d='234'+d.slice(1);return d}return WA_DEFAULT}
  function waUrl(num,msg){return 'https://wa.me/'+num+'?text='+encodeURIComponent(msg)}
  window.GBAuthPages={
    registerUrl:function(){return waUrl(WA_DEFAULT,REGISTER_MSG)},
    contactAdmin:async function(){
      var contact=String(window.GB_ADMIN_CONTACT||'');
      try{var r=await fetch((String(window.GB_STUDENT_API_URL||'').replace(/\/$/,''))+'/api/student/support-contact',{cache:'no-store'});var d=await r.json();if(r.ok&&d.contact)contact=d.contact}catch(e){}
      var nameEl=document.getElementById('recoverName'),keyEl=document.getElementById('recoverKey');
      var name=(nameEl&&nameEl.value.trim())||ls('gb_student_name');
      var key=(keyEl&&keyEl.value.trim())||ls('gb_product_key');
      var lines=['Hello Gifted Brainz Administrator, I need help recovering my EduSpace student account password.','','Student name: '+(name||'Not provided'),'Device ID: '+deviceId(),'Product Key: '+(key||'Not available')];
      window.open(waUrl(waNumber(contact),lines.join('\n')),'_blank','noopener');
    }
  };
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-register-now]').forEach(function(a){a.href=window.GBAuthPages.registerUrl();a.target='_blank';a.rel='noopener'});
    var n=document.getElementById('recoverName');if(n&&!n.value)n.value=ls('gb_student_name');
    var k=document.getElementById('recoverKey');if(k&&!k.value)k.value=ls('gb_product_key');
    var b=document.getElementById('contactAdminBtn');if(b)b.addEventListener('click',function(){window.GBAuthPages.contactAdmin()});
  });
})();
