from pathlib import Path
import re, shutil
root=Path('/mnt/data/sitefix')
# optimize GIF while preserving GIF format
from PIL import Image
src=root/'assets/GHfire1.gif'; tmp=root/'assets/GHfire1.tmp.gif'
im=Image.open(src).convert('P')
im.save(tmp, format='GIF', optimize=True)
shutil.move(tmp, src)

# checker page: remove UnionTeams section and replace with clean management/profile
p=root/'checker/index.html'; s=p.read_text()
# body background use fixed local image layer, not background-attachment fixed
s=s.replace("html,body{margin:0;min-height:100%;background:#000;color:#ddd}body{font-family:\"Roboto Mono\",monospace;background:linear-gradient(to top,rgba(0,0,0,.1),rgba(0,0,0,.9) 72%,#000),url('../assets/GHfire1.gif') center bottom/cover fixed no-repeat}a{text-decoration:none;color:inherit}",
'''html,body{margin:0;min-height:100%;background:#000;color:#ddd}body{font-family:"Roboto Mono",monospace;position:relative;isolation:isolate}body::before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:url('../assets/GHfire1.gif') center/cover no-repeat;opacity:.20;transform:translateZ(0);will-change:transform}body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(to top,rgba(0,0,0,.10),rgba(0,0,0,.60) 55%,rgba(0,0,0,.94));}a{text-decoration:none;color:inherit}''')
# replace card profile union area through owner link
pat=re.compile(r'<section class="card"><div class="profile-top">.*?</section>\n<section class="card management" id="management">', re.S)
replacement='''<section class="card profile-card-clean"><div class="profile-top"><img class="profile-avatar" data-user-avatar alt=""><div class="profile-copy"><div class="profile-name" data-user-name>Гость</div><div class="profile-role" data-user-privilege></div><div class="profile-id">SteamID64: <b data-user-steamid></b></div></div><a class="profile-manage" data-owner-link href="#management" style="display:none">⚙ Управление</a></div></section>\n<section class="card management" id="management">'''
s2=pat.sub(replacement,s)
if s2==s: print('profile pattern not found')
s=s2
# hierarchy styling and role setting section title
s=s.replace('<section class="card management" id="management"><h2>Панель управления</h2>','<section class="card management" id="management"><h2>Настройка ролей</h2><div class="sub">Выберите роль ниже или используйте форму выдачи. Сервер дополнительно проверяет иерархию и не позволит выдать роль выше своих полномочий.</div>')
s=s.replace('<section class="card management" id="grant"><h2>Выдача привилегии</h2>','<section class="card management" id="grant"><h2>Выдача / изменение роли</h2>')
# remove any Union text remnants
s=re.sub(r'<div class="union-[^"]*"[^>]*>.*?</div>','',s,flags=re.S)
# Add stronger CSS overrides before </style>
css='''\n/* UI polish v4 */\n.cs-wrap{width:1060px;max-width:calc(100% - 36px)}\n.cs-header{height:76px}\n.cs-user{gap:8px}\n.cs-avatar{width:34px;height:34px;flex:none}\n.cs-usertext{min-width:0;gap:2px}\n.cs-usertext b{font-size:12px}.cs-usertext span{font-size:9px}\n.logout{padding:8px 12px;font-size:10px}\n.profile-card-clean{padding:20px 22px}.profile-top{gap:14px}.profile-copy{min-width:0}.profile-avatar{width:58px;height:58px;flex:none}.profile-name{font-size:20px}.profile-role{font-size:11px}.profile-id{font-size:10px}\n.profile-manage{margin-left:auto;border:1px solid #5b0b1b;background:#130306;color:#ff2442;border-radius:6px;padding:10px 14px;font-size:10px;font-weight:800;white-space:nowrap}.profile-manage:hover{border-color:#ff1836;box-shadow:0 0 18px rgba(255,24,54,.18)}\n.management h2{font-size:21px}.hierarchy{grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.hier{min-width:0;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}.hier:hover{transform:translateY(-2px);border-color:#555}.hier[aria-disabled="true"]{cursor:default;opacity:.5}.hier b{text-shadow:0 0 7px currentColor,0 0 18px color-mix(in srgb,currentColor 35%,transparent)}\n.form-grid{grid-template-columns:minmax(240px,1.3fr) minmax(150px,.9fr) minmax(180px,1fr) minmax(170px,.9fr);gap:10px}\n.urow{grid-template-columns:minmax(240px,1.7fr) minmax(135px,.8fr) minmax(135px,.8fr) minmax(240px,1.25fr);gap:16px;min-width:0;overflow:hidden}.urow>*{min-width:0}.umain{min-width:0}.uname{min-width:0}.sid{min-width:0;overflow:hidden}.sid b{display:block;max-width:100%;overflow-wrap:anywhere;word-break:break-word}.actions{flex-wrap:wrap}\n.role-admin{color:#ff1836!important;text-shadow:0 0 7px #ff1836,0 0 18px rgba(255,24,54,.5)}.role-senior{color:#4d8dff!important;text-shadow:0 0 7px #4d8dff,0 0 18px rgba(77,141,255,.45)}.role-assistant{color:#c05cff!important;text-shadow:0 0 7px #c05cff,0 0 18px rgba(192,92,255,.45)}.role-sudo{color:#22e6ff!important;text-shadow:0 0 7px #22e6ff,0 0 18px rgba(34,230,255,.45)}.role-special{color:#e8edf5!important;text-shadow:0 0 7px #e8edf5,0 0 18px rgba(232,237,245,.35)}.role-owner{background:linear-gradient(90deg,#7b0014,#ff1836,#8d0018,#ff1836,#7b0014);background-size:250% auto;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:ownerShimmer 3s linear infinite;text-shadow:0 0 9px rgba(255,0,35,.35)}\n@keyframes ownerShimmer{0%{background-position:0% center}100%{background-position:250% center}}\n@media(max-width:1100px){.urow{grid-template-columns:minmax(210px,1.5fr) minmax(130px,.8fr) minmax(130px,.8fr) minmax(220px,1.1fr)}}\n@media(max-width:900px){.hierarchy{grid-template-columns:repeat(3,minmax(0,1fr))}.urow{grid-template-columns:1fr 1fr}.sid{text-align:left}.actions{justify-content:flex-start}.form-grid{grid-template-columns:1fr 1fr}}\n@media(max-width:650px){.cs-wrap{max-width:calc(100% - 20px)}.cs-usertext{display:flex}.cs-avatar{width:32px;height:32px}.profile-top{align-items:center}.profile-manage{font-size:9px;padding:8px}.hierarchy,.form-grid,.urow{grid-template-columns:1fr}}\n'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>')
# replace inline JS render hierarchy/users to remove union and add classes
s=s.replace("document.getElementById('hierarchy').innerHTML=['Special Admin','Sudo Curator','Assistant Sudo Curator','Senior Administrator','Administrator'].map(x=>`<div class=\"hier\"><div class=\"n\">Уровень ${rank[x]}</div><b style=\"color:${colors[x]}\">${x}</b><span>${r>rank[x]?'Можно выдавать / снимать':'Нет доступа'}</span></div>`).join('')",
'''const cls={Administrator:'role-admin','Senior Administrator:'role-senior','Assistant Sudo Curator':'role-assistant','Sudo Curator':'role-sudo','Special Admin':'role-special'};document.getElementById('hierarchy').innerHTML=['Special Admin','Sudo Curator','Assistant Sudo Curator','Senior Administrator','Administrator'].map(x=>`<div class="hier" data-role="${x}" aria-disabled="${r<=rank[x]}"><div class="n">Уровень ${rank[x]}</div><b class="${cls[x]}">${x}</b><span>${r>rank[x]?'Можно выдать / снять':'Нет доступа'}</span></div>`).join('');document.querySelectorAll('.hier[data-role]').forEach(el=>{if(el.getAttribute('aria-disabled')!=='true')el.onclick=()=>{document.getElementById('privilege').value=el.dataset.role;document.getElementById('grant').scrollIntoView({behavior:'smooth',block:'center'});}})''')
s=s.replace("let role=u.effective_privilege||'Привилегия не назначена',c=colors[role]||'#777';return `<div class=\"urow\"><div class=\"umain\"><img class=\"uavatar\" src=\"${esc(u.avatar_url||'')}\" onerror=\"this.style.visibility='hidden'\"><div class=\"uname\"><b>${esc(u.display_name)}</b><small>${esc(u.unionteams?.callsign||'Steam профиль')}${u.unionteams?.role ? ' · SCP: '+esc(u.unionteams.role) : ''}${u.unionteams?.hours ? ' · '+esc(u.unionteams.hours)+' ч.' : ''}</small></div></div><div class=\"field\"><small>Привилегия</small><b style=\"color:${c}\">${esc(role)}</b></div>",
'''let role=u.effective_privilege||'Привилегия не назначена',cls=role==='Владелец'?'role-owner':role==='Administrator'?'role-admin':role==='Senior Administrator'?'role-senior':role==='Assistant Sudo Curator'?'role-assistant':role==='Sudo Curator'?'role-sudo':role==='Special Admin'?'role-special':'';return `<div class="urow"><div class="umain"><img class="uavatar" src="${esc(u.avatar_url||'')}" onerror="this.style.visibility='hidden'"><div class="uname"><b>${esc(u.display_name)}</b><small>Steam профиль</small></div></div><div class="field"><small>Привилегия</small><b class="${cls}">${esc(role)}</b></div>''')
# Fix owner top role class by adding CSS/JS in steam-auth later
p.write_text(s)

# steam-auth: role classes and cleaner header handling
p=root/'assets/steam-auth.js'; s=p.read_text()
insert='''\n  function roleClass(name){\n    return ({'Administrator':'role-admin','Senior Administrator':'role-senior','Assistant Sudo Curator':'role-assistant','Sudo Curator':'role-sudo','Special Admin':'role-special','Владелец':'role-owner'})[name] || '';\n  }\n'''
s=s.replace("  function privilegeStyle(profile){",insert+"\n  function privilegeStyle(profile){")
s=s.replace("el.textContent=profile.effective_privilege || profile.privilege || 'Привилегия не назначена';\n      el.style.color=privilegeStyle(profile);",
"const role=profile.effective_privilege || profile.privilege || 'Привилегия не назначена'; el.textContent=role; el.classList.remove('role-admin','role-senior','role-assistant','role-sudo','role-special','role-owner'); const rc=roleClass(role); if(rc) el.classList.add(rc); else el.style.color=privilegeStyle(profile);")
p.write_text(s)

# remove UnionTeams from worker API and parser to reduce lag/external calls
p=root/'steam-auth-cloudflare/worker.js'; s=p.read_text()
# Remove whole fetchUnionTeamsProfile function block
start=s.find('async function fetchUnionTeamsProfile')
end=s.find('\nasync function fetchSteamProfile', start)
if start!=-1 and end!=-1: s=s[:start]+s[end+1:]
# Remove API union assignments
s=re.sub(r'\n\s*user\.unionteams = await fetchUnionTeamsProfile\(session\.steam_id\);','',s)
s=re.sub(r'\n\s*user\.unionteams = await fetchUnionTeamsProfile\(steamId\);','',s)
s=re.sub(r'\n\s*unionteams: await fetchUnionTeamsProfile\(steamId\),','',s)
s=re.sub(r'\n\s*user\.unionteams = await fetchUnionTeamsProfile\(row\.steam_id\);','',s)
# security headers
s=s.replace("function json(data, status = 200, origin = SITE_ORIGIN) {\n  return new Response(JSON.stringify(data), {\n    status,\n    headers: {\n      'Content-Type': 'application/json; charset=UTF-8',\n      ...corsHeaders(origin)\n    }\n  });\n}",
"function securityHeaders() { return { 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()' }; }\n\nfunction json(data, status = 200, origin = SITE_ORIGIN) {\n  return new Response(JSON.stringify(data), {\n    status,\n    headers: {\n      'Content-Type': 'application/json; charset=UTF-8',\n      ...securityHeaders(),\n      ...corsHeaders(origin)\n    }\n  });\n}")
# Add Origin rejection for API mutations and auth exchange
s=s.replace("  const origin = request.headers.get('Origin') || '';\n\n  if (request.method === 'OPTIONS')", "  const origin = request.headers.get('Origin') || '';\n  if (origin && origin !== SITE_ORIGIN) return json({ error: 'FORBIDDEN_ORIGIN' }, 403, origin);\n\n  if (request.method === 'OPTIONS')")
# remove unused PRIVILEGE_COLORS? keep.
p.write_text(s)

# owner.js role class for management page
p=root/'assets/owner.js'; s=p.read_text()
s=s.replace("const privilegeColors = {", "const roleClasses = {'Administrator':'role-admin','Senior Administrator':'role-senior','Assistant Sudo Curator':'role-assistant','Sudo Curator':'role-sudo','Special Admin':'role-special','Владелец':'role-owner'};\n  const privilegeColors = {")
s=s.replace("const color=privilegeColors[u.effective_privilege||u.privilege]||'#666';", "const roleClass=roleClasses[u.effective_privilege||u.privilege]||'';")
s=s.replace('<b style="color:${color}">${esc(role)}</b>', '<b class="${roleClass}">${esc(role)}</b>')
s=s.replace("owner-name').textContent=me.effective_privilege||me.privilege||'Без привилегии';", "owner-name').textContent=me.effective_privilege||me.privilege||'Без привилегии';")
p.write_text(s)

# index.html: use local optimized GIF, avoid fixed background repaint, remove UnionTeams profile section if present
p=root/'index.html'; s=p.read_text()
s=s.replace('src="https://i.imgur.com/Y334pmB.gif"','src="assets/GHfire1.gif"')
s=s.replace('background-attachment:fixed!important;','background-attachment:scroll!important;')
# add local fixed compositor layer after existing #bg rule
s=s.replace('#bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;display:block;object-fit:cover;opacity:.18}', '#bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;display:block;object-fit:cover;opacity:.18;transform:translateZ(0);will-change:transform}')
# don't remove home UnionTeams unless exact profile block exists; leave for now because user specifically said remove information likely checker.
p.write_text(s)

# add shared neon CSS to style.css for pages using owner.js
p=root/'assets/style.css'; s=p.read_text(); s += '''\n.role-admin{color:#ff1836!important;text-shadow:0 0 7px #ff1836,0 0 18px rgba(255,24,54,.5)}\n.role-senior{color:#4d8dff!important;text-shadow:0 0 7px #4d8dff,0 0 18px rgba(77,141,255,.45)}\n.role-assistant{color:#c05cff!important;text-shadow:0 0 7px #c05cff,0 0 18px rgba(192,92,255,.45)}\n.role-sudo{color:#22e6ff!important;text-shadow:0 0 7px #22e6ff,0 0 18px rgba(34,230,255,.45)}\n.role-special{color:#e8edf5!important;text-shadow:0 0 7px #e8edf5,0 0 18px rgba(232,237,245,.35)}\n.role-owner{background:linear-gradient(90deg,#65000f,#ff1836,#7c0014,#ff1836,#65000f);background-size:250% auto;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:ownerShimmer 3s linear infinite;text-shadow:0 0 9px rgba(255,0,35,.35)}\n@keyframes ownerShimmer{0%{background-position:0% center}100%{background-position:250% center}}\n'''; p.write_text(s)
