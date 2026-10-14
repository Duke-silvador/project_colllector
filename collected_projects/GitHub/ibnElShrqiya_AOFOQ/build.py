#!/usr/bin/env python3
"""Generates all HTML pages + sitemap from the data below. Edit data/text here, run: python3 build.py"""
import re, os
R = os.path.dirname(os.path.abspath(__file__))
DOMAIN = 'https://YOUR-DOMAIN'   # replace before deploying (used in sitemap.xml)
def T(s): return re.sub(r'\{([^{}|]+)\|([^{}]+)\}', lambda m: f'<span data-ar="{m[1]}" data-en="{m[2]}">{m[1]}</span>', s)
U = {'index':'index.html','about':'pages/about.html','services':'pages/services.html','projects':'pages/projects.html',
     'request':'pages/request-project.html','contact':'pages/contact.html','privacy':'pages/privacy.html'}
NAV = [('about','عن أفق|About'),('services','الخدمات|Services'),('projects','المشاريع|Projects'),('contact','تواصل|Contact')]
# (icon, ar, en, desc_ar, desc_en, deliverable_ar, deliverable_en)
SV = [
 ('</>','تطوير مواقع الويب','Website development','مواقع سريعة ومتجاوبة وقابلة للتطوير بـ HTML وCSS وJavaScript.','Fast, responsive, extensible websites in HTML, CSS and JavaScript.','موقع جاهز للنشر + شرح التعديل','Deploy-ready site + edit guide'),
 ('▭','صفحات الهبوط','Landing pages','صفحات هبوط واضحة للمشاريع والشركات.','Clear landing pages for projects and companies.','صفحة متجاوبة محسّنة للبحث','Responsive, SEO-ready page'),
 ('▯','تطبيقات Android ومتعددة المنصات','Android & cross-platform apps','تطبيقات بـ Kotlin أو Flutter حسب الحاجة.','Apps in Kotlin or Flutter as needed.','تطبيق قابل للتثبيت + الكود المصدري','Installable app + source code'),
 ('{ }','الأدوات والسكربتات والأتمتة','Tools, scripts & automation','أدوات تختصر المهام المتكررة.','Tools that cut repetitive work.','سكربت موثق وسهل التشغيل','Documented, easy-to-run script'),
 ('◧','تحسين الواجهات وتجربة الاستخدام','UI/UX improvement','تحسين وضوح الواجهة وسهولة الاستخدام.','Clearer interfaces and easier usage.','ملاحظات وتصاميم محسّنة','Findings and improved designs'),
 ('≡','مراجعة الكود وتحسين الأداء','Code review & performance','مراجعة الجودة وإيجاد نقاط البطء.','Quality review and bottleneck hunting.','تقرير مراجعة بتوصيات','Review report with recommendations'),
 ('◈','تقييم الأمان (بتصريح)','Security assessment (authorized)','تقييم ضمن نطاق مصرح به كتابيًا فقط، دون أي ادعاءات أمنية غير مثبتة.','Only within a written, authorized scope, with no unproven security claims.','تقرير ملاحظات وتوصيات','Findings and recommendations report'),
]
# slug, tags, name, status_ar, status_en, desc_ar, desc_en, tech
PR = [
 ('zad','app kotlin flutter','ZAD | زاد','قيد التطوير','In development','تطبيق إسلامي يجمع القرآن الكريم والأذكار ومواقيت الصلاة والقبلة في تجربة منظمة.','An Islamic app combining Quran, adhkar, prayer times and qibla in an organized experience.','Kotlin · Flutter'),
 ('due-fratelli','web','DUE FRATELLI','مكتمل','Completed','موقع تجاري لخدمات الحلاقة.','A commercial website for barber services.','Web'),
 ('cyberlab','sec','CYBERLAB','نموذج تجريبي','Prototype','مشروع للتعلم والتدريب في الأمن السيبراني.','A cybersecurity learning and training project.','—'),
]
FIL = [('all','الكل|All'),('web','مواقع|Web'),('app','تطبيقات|Apps'),('sec','أمن|Security'),('kotlin','Kotlin|Kotlin'),('flutter','Flutter|Flutter')]
STEPS = ['استقبال فكرة العميل|Receive your idea','فهم المتطلبات وتحديد النطاق|Understand requirements & scope','اقتراح الحل المناسب|Propose the right solution','الاتفاق على التكلفة والمدة|Agree on cost & timeline','التطوير والاختبار|Build & test','التسليم والدعم المتفق عليه|Delivery & agreed support']
def svc_cards(): return ''.join(f'<a class="card tilt rv" href="@R@pages/request-project.html?s={i}"><div class="ico">{s[0]}</div><h3>{T("{"+s[1]+"|"+s[2]+"}")}</h3><p>{T("{"+s[3]+"|"+s[4]+"}")}</p></a>' for i,s in enumerate(SV))
def prj_cards(): return ''.join(f'<a class="card tilt rv" data-tags="{p[1]}" href="@R@pages/projects/{p[0]}.html"><h3>{p[2]}</h3><span class="pill">{T("{"+p[3]+"|"+p[4]+"}")}</span><p>{T("{"+p[5]+"|"+p[6]+"}")}</p><p class="mono">{p[7]}</p></a>' for p in PR)
def steps(): return '<ol class="grid steps">'+''.join(f'<li class="card rv">{T("{"+s+"}")}</li>' for s in STEPS)+'</ol>'
def form(contact_only=False):
    opts=''.join(f'<option data-ar="{s[1]}" data-en="{s[2]}">{s[1]}</option>' for s in SV)
    return T('''<form data-mail novalidate>
<label>{الاسم|Name}<input name="name" required autocomplete="name"></label>
<label>{البريد الإلكتروني|Email}<input name="email" type="email" required autocomplete="email"></label>
<label>{الهاتف (اختياري)|Phone (optional)}<input name="phone" type="tel" autocomplete="tel"></label>
<label>{نوع المشروع|Project type}<select name="service">'''+opts+'''</select></label>
<label>{تفاصيل المشروع|Project details}<textarea name="details" rows="5" required></textarea></label>
<label>{الميزانية (اختياري)|Budget (optional)}<input name="budget"></label>
<label>{الموعد المتوقع|Expected date}<input name="date" type="date"></label>
<label class="ck"><input type="checkbox" name="consent" value="1"><span>{أوافق على|I agree to the} <a href="@R@pages/privacy.html" style="color:var(--em)">{سياسة الخصوصية|privacy policy}</a></span></label>
<button class="btn" type="submit">{إرسال الطلب|Send request}</button><p id="msg" class="msg" role="status"></p>
<p class="note">{الإرسال يفتح تطبيق البريد لديك برسالة جاهزة، ولا يُعد الطلب مُرسلًا إلا بعد ضغطك إرسال هناك. بدائل فورية: واتساب أو الاتصال.|Sending opens your email app with a prepared message; the request is only sent once you press send there. Instant alternatives: WhatsApp or phone.}</p></form>''')
def contact_box(): return T('<div class="card"><h3>{بيانات التواصل|Contact}</h3><div class="row" style="flex-direction:column"><a class="btn" href="tel:+201101774594" dir="ltr">+201101774594</a><a class="btn g" href="https://wa.me/201101774594" rel="noopener" target="_blank">WhatsApp</a><a class="btn g" href="mailto:harammasr54@gmail.com">harammasr54@gmail.com</a></div></div>')
def page(path, tar, ten, desc, body, key=None, og=True):
    root = '../' * path.count('/')
    nav = ''.join(f'<a href="@R@{U[k]}"'+(' aria-current="page"' if k==key else '')+f'>{T("{"+v+"}")}</a>' for k,v in NAV)
    html = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl" class="js-off" data-title-en="{ten}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{tar}</title><meta name="description" content="{desc}">
<meta property="og:title" content="{tar}"><meta property="og:description" content="{desc}"><meta property="og:type" content="website">
<link rel="icon" href="@R@assets/icons/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="@R@css/site.css">
<script src="@R@js/site.js" defer></script></head>
<body><canvas id="bg" aria-hidden="true"></canvas>
<header class="nav"><div class="wrap"><a class="logo" href="@R@index.html">OFOQ<span> | أُفُق</span></a>
<button class="burger" id="burger" aria-label="Menu" aria-expanded="false" aria-controls="links"><i></i><i></i><i></i></button>
<nav class="links" id="links">{nav}<a class="btn sm" href="@R@pages/request-project.html">{T("{اطلب مشروعك|Request}")}</a><button id="lang" class="btn g sm" aria-label="Language">EN</button></nav></div></header>
<main>{body}</main>
<footer><div class="wrap"><p>© <span id="yr">2026</span> OFOQ | أُفُق — {T("{نحوّل الأفكار إلى حلول رقمية.|Turning Ideas Into Digital Solutions.}")}</p>
<nav>{nav}<a href="@R@pages/privacy.html">{T("{الخصوصية|Privacy}")}</a></nav></div></footer>
<a class="wa" href="https://wa.me/201101774594" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a></body></html>'''
    html = html.replace('@R@', root)
    os.makedirs(os.path.dirname(os.path.join(R, path)) or R, exist_ok=True)
    open(os.path.join(R, path), 'w', encoding='utf-8').write(html)
    return path
def sec(inner, cls=''): return f'<section class="sec {cls}"><div class="wrap">{inner}</div></section>'
def head(t, lead=''): return f'<h1>{T(t)}</h1><p class="lead">{T(lead)}</p>'
PAGES = []
# ---- Home
home = sec(T('''<div class="hero"><div><p class="eyebrow"><span class="dot"></span>{البيئة التقنية جاهزة|Environment ready}</p>
<h1>{نصنع حلولًا رقمية تتجاوز التوقعات.|We craft digital solutions that exceed expectations.}</h1>
<p class="lead">{نحوّل الأفكار إلى مواقع وتطبيقات وأدوات برمجية تجمع بين التصميم المدروس والأداء والاعتمادية.|We turn ideas into websites, apps and software tools that combine considered design, performance and reliability.}</p>
<div class="row"><a class="btn" href="@R@pages/projects.html">{استكشف مشاريعنا|Explore our projects}</a><a class="btn g" href="@R@pages/request-project.html">{اطلب مشروعك|Request your project}</a></div></div>
<div class="term" aria-hidden="true"><div class="bar"><i></i><i></i><i></i></div><pre id="term">$ ofoq --status
&gt; web · mobile · automation · security</pre><div class="chips"><b>HTML5</b><b>CSS3</b><b>JavaScript</b><b>Kotlin</b><b>Flutter</b></div></div></div>''')) + \
 sec(T('<h2>{عن أفق|About OFOQ}</h2><p class="lead">{أفق استوديو تقني يجمع بين تطوير البرمجيات وتصميم المواقع وتطبيقات الموبايل والأتمتة والأمن السيبراني الأخلاقي.|OFOQ is a tech studio spanning software development, web design, mobile apps, automation and ethical cybersecurity.}</p><div class="row"><a class="btn g" href="@R@pages/about.html">{اعرف المزيد|Learn more}</a></div>'),'alt') + \
 sec(T('<h2>{الخدمات|Services}</h2>')+'<div class="grid">'+svc_cards()+'</div>') + \
 sec(T('<h2>{مشاريع مميزة|Featured projects}</h2>')+'<div class="grid">'+prj_cards()+'</div>','alt') + \
 sec(T('<h2>{منهجية العمل|How we work}</h2>')+steps()) + \
 sec(T('<h2>{التقنيات في مشاريعنا الفعلية|Tech in our actual projects}</h2><p class="lead">{مثال: تطبيق زاد يعتمد Kotlin وFlutter بحسب النسخة.|Example: ZAD uses Kotlin and Flutter depending on the version.}</p><div class="row"><a class="btn" href="@R@pages/contact.html">{تواصل معنا|Get in touch}</a></div>'),'alt')
PAGES.append(page('index.html','OFOQ | أُفُق — استوديو برمجة وتقنيات','OFOQ — Programming & Tech Studio','OFOQ | أُفُق: استوديو تقني لتطوير المواقع والتطبيقات والأتمتة وتقييم الأمان ضمن نطاق مصرح به.',home,'index'))
# ---- About
about = sec(head('{عن أفق|About OFOQ}','{علامة تقنية تحوّل الأفكار إلى حلول رقمية، يقودها مبرمج مهتم ببناء الحلول التقنية.|A tech brand turning ideas into digital solutions, led by a developer passionate about building technical solutions.}')+T('<div class="grid">'+''.join(f'<div class="card rv"><h3>{v}</h3></div>' for v in ['{الشفافية مع العملاء|Transparency with clients}','{جودة الكود|Code quality}','{الالتزام بنطاق العمل المتفق عليه|Sticking to the agreed scope}','{احترام خصوصية البيانات|Respecting data privacy}','{التطوير المستمر|Continuous improvement}'])+'</div><h2 style="margin-top:48px">{منهجية العمل|How we work}</h2>')+steps())
PAGES.append(page('pages/about.html','عن أفق | OFOQ','About | OFOQ','تعرّف على OFOQ | أُفُق ومنهجية العمل والقيم.',about,'about'))
# ---- Services
sv = ''.join(f'<article class="card rv" style="margin-top:18px"><div class="ico">{s[0]}</div><h2>{T("{"+s[1]+"|"+s[2]+"}")}</h2><p>{T("{"+s[3]+"|"+s[4]+"}")}</p><p><b>{T("{المخرجات:|Deliverables:}")}</b> {T("{"+s[5]+"|"+s[6]+"}")}</p><a class="btn g sm" href="@R@pages/request-project.html?s={i}">{T("{اطلب الخدمة|Request this}")}</a></article>' for i,s in enumerate(SV))
PAGES.append(page('pages/services.html','الخدمات | OFOQ','Services | OFOQ','خدمات OFOQ: مواقع، تطبيقات، أتمتة، مراجعة كود وتقييم أمان بتصريح.',sec(head('{الخدمات|Services}','{نطاق كل خدمة ومخرجاتها وطريقة طلبها.|Scope, deliverables and how to request each service.}')+sv),'services'))
# ---- Projects
flt = ''.join(f'<button class="chip" data-f="{k}" aria-pressed="{"true" if k=="all" else "false"}">{T("{"+v+"}")}</button>' for k,v in FIL)
PAGES.append(page('pages/projects.html','المشاريع | OFOQ','Projects | OFOQ','معرض مشاريع OFOQ مع حالة كل مشروع وتقنياته.',sec(head('{معرض المشاريع|Projects}','{حالة كل مشروع مذكورة كما هي.|Each project’s status is stated as it is.}')+f'<div class="row">{flt}</div><div class="grid">'+prj_cards()+'</div>'),'projects'))
# ---- Project details (only verified facts; the rest is marked as pending)
pend = '{لم يُوثَّق بعد. يُضاف بعد التحقق من صاحب المشروع.|Not documented yet. To be added after verification by the owner.}'
for p in PR:
    b = sec(f'<p><a href="@R@pages/projects.html" style="color:var(--em)">{T("{← المشاريع|← Projects}")}</a></p><h1>{p[2]}</h1><span class="pill">{T("{"+p[3]+"|"+p[4]+"}")}</span>'+T(f'<div class="doc"><h2>{{نبذة|Overview}}</h2><p>{{{p[5]}|{p[6]}}}</p><h2>{{التقنيات|Technologies}}</h2><p class="mono">{p[7]}</p><h2>{{الهدف والمشكلة والحل|Goal, problem and solution}}</h2><p>{pend}</p><h2>{{الميزات المنفذة فعليًا|Implemented features}}</h2><p>{pend}</p><h2>{{لقطات الشاشة|Screenshots}}</h2><p>{{لا توجد لقطات بعد.|No screenshots yet.}}</p><h2>{{الروابط|Links}}</h2><p>{{لا توجد روابط معاينة أو GitHub مؤكدة بعد.|No verified preview or GitHub links yet.}}</p></div><div class="row"><a class="btn" href="@R@pages/request-project.html">{{اطلب مشروعًا مشابهًا|Request a similar project}}</a></div>'))
    PAGES.append(page(f'pages/projects/{p[0]}.html',f'{p[2]} | OFOQ',f'{p[2]} | OFOQ',p[5],b,'projects'))
# ---- Request / contact / privacy
PAGES.append(page('pages/request-project.html','اطلب مشروعك | OFOQ','Request a project | OFOQ','أرسل تفاصيل مشروعك إلى OFOQ.',sec(head('{اطلب مشروعك|Request your project}','{املأ النموذج أو تواصل مباشرة.|Fill the form or reach us directly.}')+'<div class="split">'+form()+contact_box()+'</div>'),'request'))
PAGES.append(page('pages/contact.html','تواصل | OFOQ','Contact | OFOQ','وسائل التواصل الرسمية مع OFOQ.',sec(head('{تواصل معنا|Contact us}','{اتصال أو واتساب أو بريد إلكتروني.|Call, WhatsApp or email.}')+'<div class="split">'+contact_box()+T('<div class="card"><h3>{لديك مشروع؟|Have a project?}</h3><p>{استخدم نموذج الطلب لإرسال التفاصيل.|Use the request form to send details.}</p><div class="row"><a class="btn" href="@R@pages/request-project.html">{نموذج الطلب|Request form}</a></div></div>')+'</div>'),'contact'))
priv = sec(head('{سياسة الخصوصية|Privacy policy}')+T('''<div class="doc"><h2>{ما يجمعه الموقع|What the site collects}</h2><p>{لا يملك الموقع خادمًا ولا قاعدة بيانات، ولا يستخدم أدوات تحليلات أو إعلانات. لا يخزّن بيانات النماذج.|The site has no server or database, and uses no analytics or ads. It does not store form data.}</p>
<h2>{النماذج|Forms}</h2><p>{عند إرسال النموذج تُجهَّز رسالة في تطبيق البريد لديك تحتوي ما كتبته، ولا تُرسل إلا إذا ضغطت إرسال. تصل الرسالة إلى harammasr54@gmail.com وتخضع لسياسة مزوّد البريد.|When you submit the form, a message with what you typed is prepared in your email app and is only sent if you press send. It goes to harammasr54@gmail.com and is subject to your email provider’s policy.}</p>
<h2>{التخزين المحلي|Local storage}</h2><p>{نحفظ اختيار اللغة فقط في متصفحك، ولا نحفظ بيانات شخصية.|We only save your language choice in your browser, never personal data.}</p>
<h2>{الاستضافة وواتساب|Hosting and WhatsApp}</h2><p>{قد يسجّل مزوّد الاستضافة بيانات اتصال تقنية (مثل عنوان IP). عند فتح واتساب تنطبق سياسته.|The hosting provider may log technical connection data (such as IP). WhatsApp’s own policy applies when you open it.}</p>
<h2>{التواصل|Contact}</h2><p>harammasr54@gmail.com</p></div>'''))
PAGES.append(page('pages/privacy.html','سياسة الخصوصية | OFOQ','Privacy policy | OFOQ','سياسة الخصوصية لموقع OFOQ.',priv,'privacy'))
open(os.path.join(R,'sitemap.xml'),'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'<url><loc>{DOMAIN}/{p}</loc></url>\n' for p in PAGES)+'</urlset>\n')
open(os.path.join(R,'robots.txt'),'w').write(f'User-agent: *\nAllow: /\nSitemap: {DOMAIN}/sitemap.xml\n')
print(len(PAGES),'pages')
