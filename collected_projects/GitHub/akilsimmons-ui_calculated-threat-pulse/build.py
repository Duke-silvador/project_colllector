#!/usr/bin/env python3
"""Build a real, low-maintenance, ad-supported public-information website.
No third-party Python packages or paid APIs required.
"""
import argparse
import datetime as dt
import html
import json
import re
import shutil
import urllib.request
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
DATA = ROOT / 'data' / 'kev.json'
CISA_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'


def esc(x):
    return html.escape(str(x or ''), quote=True)


def fetch_kev():
    """Load CISA's publicly available KEV JSON. Fail closed, keeping previous data."""
    request = urllib.request.Request(CISA_URL, headers={'User-Agent': 'CalculatedIT Threat Pulse/1.0 (+public security information site)'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read(8_000_000)
            new = json.loads(raw)
        assert isinstance(new.get('vulnerabilities'), list)
        assert len(new['vulnerabilities']) > 100
        assert all('cveID' in entry and 'dateAdded' in entry for entry in new['vulnerabilities'][:20])
        DATA.parent.mkdir(parents=True, exist_ok=True)
        DATA.write_text(json.dumps(new, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f"Downloaded {len(new['vulnerabilities'])} CISA KEV records")
    except Exception as error:
        print(f'Unable to refresh CISA feed: {error}; using last cached feed, if present.')


def load_data():
    if not DATA.exists():
        return [], '', ''
    data = json.loads(DATA.read_text(encoding='utf-8'))
    rows = data.get('vulnerabilities', [])
    clean = []
    for r in rows:
        cve = str(r.get('cveID', ''))
        day = str(r.get('dateAdded', ''))
        if re.fullmatch(r'CVE-\d{4}-\d{4,}', cve) and re.fullmatch(r'\d{4}-\d\d-\d\d', day):
            clean.append({k: str(r.get(k, '')) for k in [
                'cveID', 'dateAdded', 'vendorProject', 'product', 'vulnerabilityName',
                'shortDescription', 'requiredAction', 'dueDate', 'knownRansomwareCampaignUse', 'notes']})
    clean.sort(key=lambda r: (r['dateAdded'], r['cveID']), reverse=True)
    return clean, str(data.get('dateReleased', '')), str(data.get('catalogVersion', ''))


def chrome(cfg, title, description, content, path='/'):
    name = cfg['site_name']
    origin = cfg.get('site_url', '').rstrip('/')
    canonical = f'<link rel="canonical" href="{esc(origin + path)}">' if origin.startswith('https://') else ''
    ads_id = cfg.get('adsense_publisher_id', '')
    script = ''
    if re.fullmatch(r'ca-pub-\d{16}', ads_id):
        script = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={esc(ads_id)}" crossorigin="anonymous"></script>'
    return f'''<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{esc(description)}"><meta name="theme-color" content="#0b1630">
<title>{esc(title)} | {esc(name)}</title>{canonical}{script}
<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/brand.css"></head><body>
<header class="header"><div class="wrap nav"><a href="/" class="logo" aria-label="CalculatedIT Threat Pulse home"><span class="brand-symbol" aria-hidden="true"><span class="tile-red"></span><span class="tile-green"></span><span class="tile-blue"></span></span><span class="brand-copy"><strong>CalculatedIT</strong><small>THREAT PULSE</small></span></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/alerts.html">Threat feed</a><a href="/tools.html">Free tools</a><a href="/guides.html">Guides</a></nav><span class="navpill"><span class="live"></span> Official sources</span></div></header>
<main>{content}</main>
<footer><div class="wrap footer"><div><a href="https://calculatedit.com/" class="parent-identity" aria-label="Calculated Ventures corporate website"><img class="corporate-logo" src="https://calculatedit.com/wp-content/uploads/2023/05/cropped-output-onlinejpgtools-1.png" alt="Calculated Ventures logo" loading="lazy"><span><strong>{esc(name)}</strong><small>A Calculated Ventures, LLC publication</small></span></a><p>Security intelligence and practical tools. Information, not security guarantees.</p><p class="fine">Source data: CISA. Not affiliated with or endorsed by CISA or the U.S. government.</p><p class="fine">© {dt.datetime.now(dt.timezone.utc).year} Calculated Ventures, LLC</p></div><div class="footerlinks"><a href="/about.html">About</a><a href="/privacy.html">Privacy</a><a href="/contact.html">Contact</a><a href="https://calculatedit.com/" rel="noopener" target="_blank">Calculated Ventures ↗</a><a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" rel="noopener" target="_blank">CISA source ↗</a></div></div></footer>
</body></html>'''


def ad(cfg):
    publisher = cfg.get('adsense_publisher_id', '')
    slot = str(cfg.get('adsense_slot_id', ''))
    if re.fullmatch(r'ca-pub-\d{16}', publisher) and re.fullmatch(r'\d{8,12}', slot):
        return f'''<div class="ad-wrap"><span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="{esc(publisher)}" data-ad-slot="{esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script></div>'''
    return '<div class="ad-placeholder"><span>ADVERTISEMENT SPACE</span><p>Ads only appear after publisher approval and configuration.</p></div>'


def write_page(cfg, file, title, description, body):
    path = '/' if file == 'index.html' else '/' + file
    (PUBLIC / file).write_text(chrome(cfg, title, description, body, path), encoding='utf-8')


def alert_card(r):
    cve = r['cveID']
    cve_url = 'https://nvd.nist.gov/vuln/detail/' + quote(cve)
    action = r['requiredAction'] or 'Review the vendor advisory and assess exposure.'
    return f'''<article class="threat-card" data-search="{esc(' '.join([r['cveID'], r['vendorProject'], r['product'], r['vulnerabilityName']]).lower())}">
<div class="threat-top"><span class="cve">{esc(cve)}</span><span class="date">Added {esc(r['dateAdded'])}</span></div>
<h3>{esc(r['vulnerabilityName'] or r['vendorProject'] + ' ' + r['product'])}</h3>
<p class="muted">{esc(r['vendorProject'])} · {esc(r['product'])}</p>
<p>{esc(r['shortDescription'])}</p><div class="action"><strong>CISA-required action:</strong> {esc(action)}</div>
<div class="threat-bottom"><span>Agency due date: {esc(r['dueDate'] or 'Not specified')}</span><a href="{esc(cve_url)}" rel="noopener" target="_blank">NVD details ↗</a></div></article>'''


def build():
    cfg = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / 'assets', PUBLIC / 'assets', dirs_exist_ok=True)
    rows, released, version = load_data()
    (PUBLIC / 'data').mkdir(exist_ok=True)
    (PUBLIC / 'data' / 'kev.json').write_text(json.dumps({'source': CISA_URL, 'dateReleased': released, 'catalogVersion': version, 'vulnerabilities': rows[:200]}, ensure_ascii=False), encoding='utf-8')
    cards = ''.join(alert_card(r) for r in rows[:6]) if rows else '<div class="empty">Threat data hasn’t been downloaded yet. Run <code>python build.py --fetch</code> when connected to the internet, or enable the daily GitHub Actions workflow.</div>'
    today = dt.datetime.now(dt.timezone.utc).strftime('%B %d, %Y')
    body = f'''<section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">FREE TOOLS · VERIFIED SOURCES · DAILY UPDATES</div><h1>Know the risks.<br><em>Focus on what matters.</em></h1><p class="lead">A simpler way to spot actively exploited software vulnerabilities and make better security decisions. Built for small businesses and busy IT teams.</p><div class="buttons"><a class="btn" href="/alerts.html">Explore live threat feed <span>↗</span></a><a class="btn-secondary" href="/tools.html">Use free tools →</a></div><div class="subline"><span class="live"></span> CISA KEV official source <span class="separator">•</span> No sign-up required</div></div><div class="hero-panel"><div class="panel-head"><span>THREAT INTELLIGENCE</span><span class="signal">SOURCE: CISA</span></div><div class="bigstat">{len(rows):,}<span>tracked</span></div><p>Known exploited vulnerabilities in source feed</p><div class="panel-divider"></div><div class="statsrow"><div><small>Latest addition</small><b>{esc(rows[0]['dateAdded'] if rows else 'Not loaded')}</b></div><div><small>Feed edition</small><b>{esc(version or 'Not loaded')}</b></div></div><div class="panel-note">Records are evidence of known exploitation, not proof your systems are vulnerable.</div></div></div></section>
<section class="section wrap"><div class="section-top"><div><div class="eyebrow dark">THE LATEST</div><h2>Recently added advisories</h2><p class="muted">Automatically pulled from the public CISA Known Exploited Vulnerabilities catalog. <a href="/alerts.html">Browse more →</a></p></div></div><div class="cardgrid">{cards}</div><div class="source-note">Source: <a href="{esc(CISA_URL)}">CISA KEV JSON</a>. Feed release: {esc(released or 'Not available')}. Page built {esc(today)} UTC. See CISA for authoritative updates.</div></section>
<section class="section pale"><div class="wrap"><div class="eyebrow dark">ACTIONABLE, NOT ALARMIST</div><h2>Free calculators and checklists</h2><p class="muted intro">Practical tools to turn security questions into actionable decisions.</p><div class="featuregrid"><a class="feature" href="/tools.html#downtime"><div class="feature-icon">⌁</div><h3>Downtime cost calculator</h3><p>Estimate operational losses from a service interruption using your own assumptions.</p><span>Open calculator →</span></a><a class="feature" href="/tools.html#password"><div class="feature-icon">✳</div><h3>Passphrase strength planner</h3><p>Compare lengths and character set sizes without entering your actual password.</p><span>Open calculator →</span></a><a class="feature" href="/guides.html"><div class="feature-icon">✓</div><h3>Risk response guides</h3><p>Understand prioritization, MFA rollout, and the first hour of an incident.</p><span>Read the guides →</span></a></div></div></section>
<section class="wrap section">{ad(cfg)}<div class="editorial"><div><div class="eyebrow dark">THE CALCULATEDIT METHOD</div><h2>Practical advice, grounded in public evidence.</h2></div><p>We link back to primary sources rather than inventing vulnerability severity scores or pretending automated summaries are expert assessments. Verify applicability to your environment before acting.</p></div></section>'''
    write_page(cfg, 'index.html', 'Daily security intelligence & free tools', 'Practical free security tools and automatically refreshed CISA KEV alerts for small IT teams.', body)

    alerts = ''.join(alert_card(r) for r in rows[:200]) if rows else '<p class="empty">No official feed was cached. Contact the operator or check CISA directly for the latest updates.</p>'
    body = f'''<section class="simple-hero"><div class="wrap"><div class="eyebrow">SOURCE-TRACEABLE INTELLIGENCE</div><h1>Known exploited vulnerabilities</h1><p class="lead">Browse recently added records in CISA's KEV catalog. Search below for a CVE, vendor, or product. Data is not a complete inventory of vulnerabilities.</p></div></section><section class="wrap section"><div class="filterline"><label for="search">Filter advisories</label><input id="search" placeholder="Try a CVE, vendor, or product..." aria-label="Filter advisories"><span id="count" aria-live="polite"></span></div><div class="cardgrid" id="alerts">{alerts}</div><p class="source-note">Displaying up to 200 most recent catalog records. Date added to catalog is not the date of initial exploitation. Source: <a href="{esc(CISA_URL)}">CISA JSON</a>. Catalog edition {esc(version or 'not loaded')}. <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog">Read CISA's guidance</a>.</p>{ad(cfg)}</section><script src="/assets/app.js" defer></script>'''
    write_page(cfg, 'alerts.html', 'CISA known exploited vulnerabilities', 'Search up to 200 recent CISA known exploited vulnerability records by CVE, product or vendor.', body)

    tools = '''<section class="simple-hero"><div class="wrap"><div class="eyebrow">USEFUL · PRIVATE · FREE</div><h1>Security planning tools</h1><p class="lead">Fast, transparent estimates you can use without submitting personal information. Calculations run in your browser.</p></div></section><section class="wrap section tool-layout"><article id="downtime" class="tool"><div class="eyebrow dark">OPERATIONS</div><h2>Downtime cost estimator</h2><p class="muted">For planning only. Enter your own assumptions; this is not a predictive model.</p><div class="fieldgrid"><label>Employees affected<input id="workers" type="number" min="0" max="100000" value="15"></label><label>Fully loaded hourly cost ($)<input id="hourly" type="number" min="0" max="100000" value="65"></label><label>Downtime (hours)<input id="hours" type="number" min="0" max="10000" step="0.5" value="4"></label><label>Estimated lost revenue per hour ($)<input id="revenue" type="number" min="0" max="10000000" value="500"></label></div><div class="result"><small>Illustrative total interruption impact</small><strong id="downtime-result">—</strong><span>Labor cost + revenue impact; may overstate losses when the same activity is counted twice.</span></div></article><article id="password" class="tool"><div class="eyebrow dark">ACCOUNT HYGIENE</div><h2>Passphrase length planner</h2><p class="muted">Never enter a real password here. This is a theoretical search-space comparison, not an estimate of actual resistance to attacks.</p><div class="fieldgrid"><label>Hypothetical random characters<input id="chars" type="number" min="1" max="100" value="16"></label><label>Hypothetical character set<select id="charset"><option value="26">Lowercase letters (26)</option><option value="52">Mixed-case letters (52)</option><option value="62" selected>Letters + digits (62)</option><option value="94">Letters + digits + symbols (94)</option></select></label></div><div class="result"><small>Theoretical entropy, only if uniformly random</small><strong id="password-result">—</strong><span>Real human-chosen passwords have less entropy. Use unique passphrases, a password manager, and MFA.</span></div></article></section><section class="wrap section"><div class="callout"><h3>Where to go after the estimate</h3><p>For account defenses, consult <a href="https://www.cisa.gov/secure-our-world/use-strong-passwords" target="_blank" rel="noopener">CISA guidance on passwords</a>. For incident preparedness, see the <a href="https://www.cisa.gov/resources-tools/resources/incident-response-plan-irp-basics" target="_blank" rel="noopener">CISA incident response planning guide</a>.</p></div></section><script src="/assets/app.js" defer></script>'''
    write_page(cfg, 'tools.html', 'Free security calculators', 'Downtime costs and passphrase search-space calculators that run in the browser.', tools)

    guides = '''<section class="simple-hero"><div class="wrap"><div class="eyebrow">PRACTICAL LEARNING</div><h1>Security guides for small teams</h1><p class="lead">A starting point for better decisions. These guides are general educational material, not incident-specific professional advice.</p></div></section><section class="wrap section prose"><article><div class="eyebrow dark">GUIDE 01</div><h2>Prioritize vulnerabilities by exposure and exploitation</h2><p>Not every vulnerability is equally urgent. Start with software you actually operate, then determine whether a vulnerable version is present and reachable. An entry in the CISA Known Exploited Vulnerabilities catalog is evidence that exploitation has been observed in the wild, so it is a practical input into prioritization rather than merely a theoretical score.</p><p>Build a simple triage record that includes the asset owner, version, network accessibility, vulnerability reference, compensating controls, remediation owner, and verification date. Compare available vendor remediation guidance to the CISA required action; don't automatically assume a patch is suitable for your environment.</p><p>Federal agencies have specific CISA deadlines. Private businesses can use the dates as useful signals, but should set their own risk-based commitments. Test mitigations in an appropriate environment and track exceptions. Primary source: <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog">CISA KEV catalog</a>.</p></article><article><div class="eyebrow dark">GUIDE 02</div><h2>Roll out multifactor authentication without causing chaos</h2><p>Start with privileged accounts, email, VPN, and critical business systems. Identify any service accounts or legacy applications that cannot support MFA before enforcing policies broadly. Prefer phishing-resistant MFA when your platforms support it.</p><p>Prepare recovery procedures before deployment: backup factors, help-desk identity verification, and a clear process for lost devices. Test with a small group, monitor lockouts, then expand. MFA reduces account compromise risks but is not a substitute for patching, device protection, and good access management.</p><p>Primary sources: <a href="https://www.cisa.gov/secure-our-world/turn-mfa">CISA MFA guidance</a> and <a href="https://pages.nist.gov/800-63-4/sp800-63b.html">NIST digital identity guidance</a>.</p></article><article><div class="eyebrow dark">GUIDE 03</div><h2>The first hour after a suspected security incident</h2><p>Keep people safe, assess what is happening, preserve evidence, and activate your organization's incident response procedures. Record the time and source of each observation. Isolate affected systems when appropriate, but consider operational consequences and evidence preservation before altering or powering them off.</p><p>Notify the responsible incident commander, IT/security leadership, and legal or compliance teams as required by your organization. Don't promise that a system is clean until there is evidence. Maintain a single decision log covering hypotheses, actions, and owners.</p><p>Reporting duties differ by sector and jurisdiction. Your actual plan and applicable law govern. Primary source: <a href="https://www.cisa.gov/resources-tools/resources/incident-response-plan-irp-basics">CISA incident response plan basics</a>.</p></article>{ad_here}</section>'''.replace('{ad_here}', ad(cfg))
    write_page(cfg, 'guides.html', 'Small-business security guides', 'Original guides to vulnerability prioritization, MFA adoption, and incident response with primary-source links.', guides)

    about = '''<section class="simple-hero"><div class="wrap"><div class="eyebrow">ABOUT</div><h1>Built to reduce security noise</h1><p class="lead">CalculatedIT Threat Pulse is a security-information publication of Calculated Ventures, LLC. It brings together public-source threat intelligence, free tools, and practical security guidance. Our RMF Accelerator and professional services are separate offerings.</p></div></section><section class="wrap section prose"><h2>Editorial standards</h2><p>We use primary sources where possible, distinguish advisory data from interpretation, and avoid invented risk scores. The feed is automatically sourced from the CISA Known Exploited Vulnerabilities catalog; entries are displayed with source links, and any data outage should be treated as a reason to consult CISA directly.</p><p>Calculator outputs are estimates, not guarantees or expert assessments. This publication is not affiliated with or endorsed by NASA, CISA, NIST, or any U.S. government agency. See <a href="https://calculatedit.com/">CalculatedIT and Calculated Ventures</a> for the parent company and commercial services.</p></section>'''
    write_page(cfg, 'about.html', 'About', 'About CalculatedIT Threat Pulse, a Calculated Ventures security-information publication.', about)

    email = cfg.get('contact_email', '')
    contact = ('<p>Questions or corrections? Email <a href="mailto:' + esc(email) + '">' + esc(email) + '</a>.</p>') if re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) else '<p>Contact details will be provided by the site operator before public launch. No contact form currently collects user data.</p>'
    write_page(cfg, 'contact.html', 'Contact', 'Contact the CalculatedIT Threat Pulse editorial team.', f'<section class="simple-hero"><div class="wrap"><h1>Contact</h1></div></section><section class="wrap section prose">{contact}</section>')
    privacy = f'''<section class="simple-hero"><div class="wrap"><h1>Privacy policy</h1><p class="lead">Last updated: {esc(today)}</p></div></section><section class="wrap section prose"><h2>What this website does</h2><p>The tools operate locally in your browser. The current site does not include account registration or an email collection form. Hosting providers may process request logs such as IP addresses and user agents under their own policies.</p><h2>Advertising</h2><p>{'This site can load Google AdSense advertising technology. Google and its partners may process identifiers or use cookies subject to applicable consent requirements.' if re.fullmatch(r'ca-pub-\d{16}', cfg.get('adsense_publisher_id', '')) else 'Advertising has not been configured. If third-party advertising is enabled, this policy must be reviewed and updated to reflect the actual providers, cookie and consent practices.'}</p><p>If Google ads are enabled, see <a href="https://policies.google.com/technologies/ads">Google advertising technologies</a> and configure any legally required consent management platform before serving personalized ads.</p><h2>Outbound links</h2><p>Links to CISA, NIST, and other external websites take you to third parties governed by their respective policies.</p><h2>Questions</h2><p>See the <a href="/contact.html">contact page</a>.</p><p class="muted">Operator review of this policy is required before public launch. This template is not legal advice.</p></section>'''
    write_page(cfg, 'privacy.html', 'Privacy policy', 'Privacy and third-party advertising disclosure.', privacy)

    (PUBLIC / 'robots.txt').write_text('User-agent: *\nAllow: /\n' + (f'Sitemap: {cfg["site_url"].rstrip("/")}/sitemap.xml\n' if cfg.get('site_url', '').startswith('https://') else ''), encoding='utf-8')
    if cfg.get('site_url', '').startswith('https://'):
        url = cfg['site_url'].rstrip('/')
        pages = ['/', '/alerts.html', '/tools.html', '/guides.html', '/about.html', '/contact.html', '/privacy.html']
        (PUBLIC / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{esc(url+p)}</loc></url>' for p in pages) + '</urlset>', encoding='utf-8')
    print(f'Built {len(list(PUBLIC.glob("*.html")))} pages. Cached vulnerabilities: {len(rows)}. AdSense: {"configured" if cfg.get("adsense_publisher_id") else "disabled"}.')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--fetch', action='store_true', help='Fetch official CISA KEV source before building')
    args = p.parse_args()
    if args.fetch:
        fetch_kev()
    build()
