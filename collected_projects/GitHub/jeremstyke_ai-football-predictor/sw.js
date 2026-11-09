// AI Football Predictor - site service worker: match notifications (web push) for the web app installed from the site. by @jeremstyke
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim())});
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:"AI Football Predictor",body:e.data?e.data.text():""}}
 const ic=self.registration.scope+"icon-192.png";
 e.waitUntil(self.registration.showNotification(d.title||"AI Football Predictor",{body:d.body||"",icon:ic,badge:ic,tag:d.tag||undefined,renotify:!!d.tag,data:{url:d.url||"/"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();let u=(e.notification.data&&e.notification.data.url)||"/";
 if(/^\//.test(u)){const q=u.replace(/^\/+/,"");u=self.registration.scope+(/[?&]lang=fr/.test(q)?"fr/":"")+q}
 e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus" in c){if(c.navigate)c.navigate(u).catch(()=>{});return c.focus()}}return self.clients.openWindow(u)}))});
