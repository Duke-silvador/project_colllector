#!/usr/bin/env python3
"""Build the live dashboard served by GitHub Pages (docs/ on main).

Writes docs/data.json (summary.json + one row per past screening) and docs/index.html.
The page reloads data.json every minute, so it stays current without any republishing.
Called at the end of build.py, so every snapshot refreshes it.
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
DOCS = os.path.join(ROOT, "docs")


def main():
    summary = json.load(open(os.path.join(DATA, "summary.json"), encoding="utf-8"))
    past = []
    path = os.path.join(DATA, "attendance.csv")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            past = [dict(date=r["date"], weekday=r["weekday"], start=r["start"], film=r["film"],
                         tickets=int(r["tickets_est"]), lag=int(r["last_seen_min_before"]), status=r["status"])
                    for r in csv.DictReader(f)]
    summary["past"] = sorted(past, key=lambda r: (r["date"], r["start"]), reverse=True)[:60]
    os.makedirs(DOCS, exist_ok=True)
    with open(os.path.join(DOCS, "data.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8") as f:
        f.write(PAGE)
    open(os.path.join(DOCS, ".nojekyll"), "w").close()


PAGE = r"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>לב סמדר: קהל חי</title>
<meta name="description" content="מכירות כרטיסים בקולנוע לב סמדר, ירושלים, לפי הקרנה. נאסף אוטומטית עבור יוזמת סמדר.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karantina:wght@700&family=Assistant:wght@400;600;700;800&display=swap">
<style>
:root{
  --teal:#00B8A9; --teal-ink:#00796F; --purple:#7C00FE; --yellow:#F9E400; --magenta:#F5004F;
  --bg:#FFFFFF; --surface:#F3F8F7; --ink:#1F2426; --muted:#61686B; --line:#D9E4E2; --grid:#E3EAE9;
  --good:#00897B; --warn:#A86500; --bad:#D6003F; --num:var(--purple);
  --display:"Karantina","Assistant",system-ui,sans-serif;
  --body:"Assistant","Heebo",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  color-scheme:light;
}
@media (prefers-color-scheme: dark){:root{
  color-scheme:dark; --bg:#101415; --surface:#182022; --ink:#ECF1F0; --muted:#A3AEAD; --line:#2A3537; --grid:#243033;
  --teal-ink:#3FD6C8; --good:#3FD6C8; --warn:#F5B942; --bad:#FF4D7E; --num:var(--yellow);
}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.55}
.page{max-width:980px;margin:0 auto;padding-inline:18px;padding-block:0 56px;display:grid;gap:22px}
a{color:var(--teal-ink)}
header{background:var(--purple);color:var(--yellow);padding:18px 20px 12px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px 16px}
header h1{font-family:var(--display);font-size:clamp(40px,8vw,64px);line-height:.9;margin:0;letter-spacing:.5px}
header span{color:#fff;font-size:14px;font-weight:600;opacity:.9}
.status{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;align-items:center;padding:16px 18px;background:var(--surface);border-inline-start:10px solid var(--state,var(--muted))}
.status[data-state="ok"]{--state:var(--good)} .status[data-state="late"]{--state:var(--warn)} .status[data-state="stopped"]{--state:var(--bad)}
.pill{display:inline-flex;align-items:center;gap:8px;font-weight:800;color:var(--state);white-space:nowrap}
.pill i{width:12px;height:12px;border-radius:50%;background:var(--state);box-shadow:0 0 0 4px color-mix(in srgb,var(--state) 22%,transparent)}
.status[data-state="ok"] .pill i{animation:pulse 2s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 8px color-mix(in srgb,var(--state) 0%,transparent)}}
@media (prefers-reduced-motion:reduce){.pill i{animation:none}}
.facts{display:flex;flex-wrap:wrap;gap:4px 22px}
.facts b{font-variant-numeric:tabular-nums}
.status p{grid-column:1/-1;margin:0;font-size:14.5px;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.stat{border:2px solid var(--line);padding:10px 14px;display:grid}
.stat .v{font-family:var(--display);font-size:46px;line-height:1;color:var(--num);font-variant-numeric:tabular-nums}
.stat .k{font-size:14px;color:var(--muted);line-height:1.35}
h2{margin:6px 0 0;font-size:21px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;text-wrap:balance}
h2 small{font-size:14px;font-weight:600;color:var(--muted)}
.day h3{margin:0 0 2px;font-size:15px;color:var(--muted)}
.row{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,32%) max-content;gap:4px 12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
.row .t{font-weight:800;font-variant-numeric:tabular-nums}
.bar{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:8px;align-items:center}
.bar span{height:12px;background:var(--grid);position:relative}
.bar span i{position:absolute;inset-block:0;inset-inline-start:0;background:var(--teal)}
.bar b{font-variant-numeric:tabular-nums;text-align:left}
.chip{font-size:13px;font-weight:700;padding:2px 8px;border:2px solid var(--line);color:var(--muted);white-space:nowrap}
.chip.next{border-color:var(--purple);color:var(--ink)} .chip.gone{border-style:dashed}
.row.is-next{background:color-mix(in srgb,var(--yellow) 22%,transparent);margin-inline:-8px;padding-inline:8px}
.tw{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:16px;font-variant-numeric:tabular-nums}
th,td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--line)}
thead th{font-size:14px;color:var(--muted);border-bottom:2px solid var(--ink)}
td.n,th.n{text-align:left;white-space:nowrap}
.tag{font-size:13px;font-weight:700;padding:1px 8px;white-space:nowrap}
.tag.final{background:var(--teal);color:#fff} .tag.partial{background:var(--yellow);color:#1F2426}
.note{font-size:14.5px;color:var(--muted);margin:0;max-width:78ch}
.avg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.avg > div{min-width:0}
.avg h3{margin:0 0 4px;font-size:16px}
.avg table,.heat{font-size:15px}
.cellbar{display:inline-block;height:8px;background:var(--teal);vertical-align:middle;margin-inline-start:6px}
.heat td.n{min-width:92px}
.heat td.empty{color:var(--muted)}
.heat .sc{font-size:12.5px;color:var(--muted);font-weight:400}
@media (max-width:640px){
  .avg{grid-template-columns:1fr}
  .status{grid-template-columns:1fr} .stat .v{font-size:34px}
  .row{grid-template-columns:48px minmax(0,1fr)} .row .bar,.row .chip{grid-column:2;justify-self:start}
  .row .bar{width:100%}
}
</style>
</head>
<body>
<div class="page">
  <header><h1>לב סמדר: קהל חי</h1><span>יוזמת סמדר · מתעדכן לבד כל דקה</span></header>
  <div class="status" id="status" data-state="unknown" role="status">
    <span class="pill"><i aria-hidden="true"></i><span id="state">טוען נתונים…</span></span>
    <div class="facts"><span>צילום אחרון: <b id="last">–</b></span><span>הצילום הבא: <b id="next">–</b></span></div>
    <p id="explain">האיסוף רץ ב-GitHub Actions: צילום כל חצי שעה, ועוד צילום בכל דקה ב-5 הדקות שלפני כל הקרנה. הצילום האחרון, כדקה לפני ההתחלה, נותן את האומדן הסופי.</p>
  </div>
  <div class="stats" id="stats"></div>
  <h2>הקרנות קרובות <small>כרטיסים שנמכרו עד הצילום האחרון</small></h2>
  <div id="up"></div>
  <h2>ממוצע כרטיסים להקרנה <small id="avgnote"></small></h2>
  <div class="avg">
    <div><h3>לפי יום</h3><div class="tw"><table><thead><tr><th>יום</th><th class="n">הקרנות</th><th class="n">ממוצע</th></tr></thead><tbody id="bywd"></tbody></table></div></div>
    <div><h3>לפי שעה ביום</h3><div class="tw"><table><thead><tr><th>שעות</th><th class="n">הקרנות</th><th class="n">ממוצע</th></tr></thead><tbody id="byslot"></tbody></table></div></div>
    <div><h3>לפי שבוע</h3><div class="tw"><table><thead><tr><th>שבוע</th><th class="n">הקרנות</th><th class="n">ממוצע</th></tr></thead><tbody id="byweek"></tbody></table></div></div>
  </div>
  <h3 style="margin:0;font-size:16px">יום ושעה ביחד <small style="font-weight:600;color:var(--muted)">ממוצע כרטיסים, ובסוגריים כמה הקרנות נמדדו</small></h3>
  <div class="tw"><table class="heat"><thead><tr><th>יום</th><th class="n">בוקר (עד 12)</th><th class="n">צהריים (12-16)</th><th class="n">ערב מוקדם (16-19)</th><th class="n">ערב (19 ואילך)</th></tr></thead><tbody id="grid"></tbody></table></div>
  <h2>הקרנות שהתקיימו <small>החדשות למעלה</small></h2>
  <div class="tw"><table><thead><tr><th>תאריך</th><th>יום</th><th class="n">שעה</th><th>סרט</th><th class="n">כרטיסים</th><th>סטטוס</th><th class="n">הצילום האחרון נלקח</th></tr></thead><tbody id="past"></tbody></table></div>
  <p class="note">שיטה: כרטיסים = (1 − אחוז הזמינות) × 267 מושבים, לפי הצילום האחרון לפני שההקרנה התחילה. <b>סופי</b> = הצילום האחרון עד 20 דקות לפני ההתחלה. <b>חלקי</b> = צילום מוקדם יותר, ולכן המספר הוא רצפה. מקור: ה-API הציבורי של מערכת הכרטוס של לב. <a href="https://github.com/guy-go-ld/lev-smadar-tracker">הנתונים הגולמיים</a>.</p>
</div>
<script>
(function(){
  var $=function(id){return document.getElementById(id);};
  var esc=function(t){var e=document.createElement("span");e.textContent=t==null?"":String(t);return e.innerHTML;};
  function lastSun(y,m){var x=new Date(Date.UTC(y,m+1,0));x.setUTCDate(x.getUTCDate()-x.getUTCDay());return x.getUTCDate();}
  function ilOffset(y,m,dd){if(m>3&&m<9)return 3;if(m<2||m>9)return 2;if(m===9)return dd<lastSun(y,9)?3:2;if(m===2)return dd>=lastSun(y,2)-2?3:2;return 3;}
  function il(s){var p=s.split(/[- :]/).map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2],p[3]||0,p[4]||0)-ilOffset(p[0],p[1]-1,p[2])*3600e3);}
  function hm(dt){var x=new Date(dt.getTime()+ilOffset(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate())*3600e3);return String(x.getUTCHours()).padStart(2,"0")+":"+String(x.getUTCMinutes()).padStart(2,"0");}
  function ago(m){if(m<1)return "עכשיו";if(m<60)return "לפני "+m+" דק'";var h=Math.floor(m/60),r=m%60;return "לפני "+h+" שע'"+(r?" ו-"+r+" דק'":"");}
  var d=null, up=[];
  function tick(){
    if(!d) return;
    var now=new Date(), last=il(d.generated_at), age=Math.round((now-last)/60e3);
    var st=age<=40?"ok":age<=90?"late":"stopped";
    $("status").setAttribute("data-state",st);
    $("state").textContent=st==="ok"?"האיסוף פעיל":st==="late"?"האיסוף מתעכב":"האיסוף נעצר";
    $("last").textContent=d.generated_at.slice(11)+" ("+ago(age)+")";
    var next=up.filter(function(u){return u.t>now;})[0], half=new Date(last.getTime()+30*60e3);
    $("next").textContent=(next&&next.first<=half)?hm(next.first)+"-"+hm(next.snap)+" כל דקה, לפני "+next.film+" ("+next.start+")":(half>now?hm(half):"בכל רגע")+" (צילום חצי-שעתי)";
    if(st==="stopped") $("explain").textContent="אין צילום חדש כבר יותר משעה וחצי. כנראה ששרשרת האיסוף נעצרה. הפעלה מחדש: gh workflow run loop.yml -R guy-go-ld/lev-smadar-tracker";
    var nextT=next&&next.t.getTime(), byDay={}, order=[], mx=Math.max(20,Math.max.apply(null,[0].concat(up.map(function(u){return u.sold_so_far;}))));
    up.forEach(function(u){if(!byDay[u.date]){byDay[u.date]=[];order.push(u.date);}byDay[u.date].push(u);});
    $("up").innerHTML=order.map(function(day){var f=byDay[day][0];
      return '<div class="day"><h3>יום '+esc(f.weekday)+' · '+esc(f.date.slice(8)+"."+Number(f.date.slice(5,7)))+'</h3>'+byDay[day].map(function(u){
        var started=u.t<=now, isNext=u.t.getTime()===nextT;
        var chip=started?'<span class="chip gone">התחילה, ממתינה לצילום הבא</span>':'<span class="chip'+(isNext?' next':'')+'">צילום סופי ב-'+hm(u.snap)+'</span>';
        return '<div class="row'+(isNext?' is-next':'')+'"><span class="t">'+esc(u.start)+'</span><span>'+esc(u.film)+'</span><span class="bar"><span><i style="width:'+Math.round(u.sold_so_far/mx*100)+'%"></i></span><b>'+esc(u.sold_so_far)+'</b></span>'+chip+'</div>';
      }).join("")+'</div>';}).join("")||'<p class="note">אין הקרנות מתוכננות בנתונים.</p>';
  }
  function render(data){
    d=data;
    up=(d.upcoming||[]).map(function(u){var s=il(u.date+" "+u.start);return Object.assign({},u,{t:s,snap:new Date(s.getTime()-60e3),first:new Date(s.getTime()-5*60e3)});});
    var past=d.past||[], fin=d.screenings_final;
    $("stats").innerHTML=[[past.length,"הקרנות שהתקיימו בנתונים"],[fin,"מתוכן עם אומדן סופי"],[d.avg_per_screening==null?"–":d.avg_per_screening,fin>0?"כרטיסים בממוצע להקרנה (סופי)":"כרטיסים בממוצע (רצפה, אין עדיין סופי)"]]
      .map(function(t){return '<div class="stat"><span class="v">'+esc(t[0])+'</span><span class="k">'+esc(t[1])+'</span></div>';}).join("");
    $("past").innerHTML=past.map(function(r){var f=r.status==="final";
      return "<tr><td>"+esc(r.date)+"</td><td>"+esc(r.weekday)+'</td><td class="n">'+esc(r.start)+"</td><td>"+esc(r.film)+'</td><td class="n"><b>'+esc(r.tickets)+'</b></td><td><span class="tag '+(f?"final":"partial")+'">'+(f?"סופי":"חלקי (רצפה)")+'</span></td><td class="n">'+esc(r.lag)+" דק' לפני</td></tr>";}).join("")||'<tr><td colspan="7" class="note">אין עדיין הקרנות שהתקיימו</td></tr>';
    var DAYS=["א'","ב'","ג'","ד'","ה'","ו'","ש'"], SL=["בוקר (<12)","צהריים (12-16)","ערב מוקדם (16-19)","ערב (19+)"];
    var SLN={"בוקר (<12)":"בוקר (עד 12)","צהריים (12-16)":"צהריים (12-16)","ערב מוקדם (16-19)":"ערב מוקדם (16-19)","ערב (19+)":"ערב (19 ואילך)"};
    function wkLabel(k){var m=/^(\d{4})-W(\d{2})$/.exec(k);if(!m)return k;var y=+m[1],w=+m[2],j4=new Date(Date.UTC(y,0,4)),mon=new Date(j4.getTime()-((j4.getUTCDay()+6)%7)*864e5+(w-1)*7*864e5),end=new Date(mon.getTime()+6*864e5);return mon.getUTCDate()+"."+(mon.getUTCMonth()+1)+"-"+end.getUTCDate()+"."+(end.getUTCMonth()+1);}
    var allv=[].concat.apply([],[d.by_weekday,d.by_slot,d.by_week].map(function(o){return Object.keys(o||{}).map(function(k){return o[k].avg;});}));
    var amx=Math.max.apply(null,[1].concat(allv));
    function rows(obj,keys,label){keys=keys.filter(function(k){return obj&&obj[k];});
      return keys.map(function(k){var v=obj[k];return "<tr><td>"+esc(label?label(k):k)+'</td><td class="n">'+v.screenings+'</td><td class="n"><b>'+v.avg+'</b><span class="cellbar" style="width:'+Math.round(v.avg/amx*60)+'px"></span></td></tr>';}).join("")||'<tr><td colspan="3" class="note">אין עדיין נתונים</td></tr>';}
    $("bywd").innerHTML=rows(d.by_weekday,DAYS,function(k){return "יום "+k;});
    $("byslot").innerHTML=rows(d.by_slot,SL,function(k){return SLN[k];});
    $("byweek").innerHTML=rows(d.by_week,Object.keys(d.by_week||{}).sort(),wkLabel);
    var g=d.by_weekday_slot||{}, gmx=Math.max.apply(null,[1].concat(Object.keys(g).map(function(k){return g[k].avg;})));
    $("grid").innerHTML=DAYS.map(function(day){return "<tr><td><b>"+esc(day)+"</b></td>"+SL.map(function(sl){var v=g[day+"|"+sl];
      if(!v)return '<td class="n empty">–</td>';var a=Math.round((v.avg/gmx*0.55+0.08)*100);
      return '<td class="n" style="background:color-mix(in srgb,var(--teal) '+a+'%,transparent)"><b>'+v.avg+'</b> <span class="sc">('+v.screenings+')</span></td>';}).join("")+"</tr>";}).join("");
    $("avgnote").textContent=d.based_on==="final"?"רק מהקרנות עם ספירה סופית ("+fin+")":"מכל ההקרנות (עדיין אין ספירה סופית, ולכן זו רצפה)";
    tick();
  }
  function load(){
    fetch("data.json?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.json();}).then(render)
      .catch(function(){ if(!d) $("state").textContent="לא הצלחתי לטעון את הנתונים"; });
  }
  load(); setInterval(load,60e3); setInterval(tick,15e3);
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
