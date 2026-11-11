/* Generator: builds the 14 pages in the site root and in 4 language directories.
 * Run: node build.js
 * Source of truth for all wording: src/lang.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DICT = JSON.parse(fs.readFileSync(path.join(SRC, 'lang.json'), 'utf8'));
const LANGS = ['zh', 'zhtw', 'en', 'vi'];
const HTML_LANG = { zh: 'zh-CN', zhtw: 'zh-TW', en: 'en', vi: 'vi' };
const HREFLANG = { zh: 'zh-Hans', zhtw: 'zh-Hant', en: 'en', vi: 'vi' };

const NAV = [
  { file: 'index.html', cn: 'nav.home', en: 'nav.en.home' },
  { file: 'about.html', cn: 'nav.about', en: 'nav.en.about' },
  { file: 'product.html', cn: 'nav.products', en: 'nav.en.products' },
  { file: 'info.html', cn: 'nav.news', en: 'nav.en.news' },
  { file: 'case.html', cn: 'nav.cases', en: 'nav.en.cases' },
  { file: 'guestbook.html', cn: 'nav.message', en: 'nav.en.message' },
  { file: 'contact.html', cn: 'nav.contact', en: 'nav.en.contact' }
];

const PAGES = [
  { file: 'index.html', key: 'index', title: 'page.title.index' },
  { file: 'about.html', key: 'about', title: 'page.title.about', h1: 'about.en', h2: 'about.cn' },
  { file: 'product.html', key: 'product', title: 'page.title.product', h1: 'products.en', h2: 'products.cn' },
  { file: 'info.html', key: 'info', title: 'page.title.info', h1: 'news.en', h2: 'news.cn' },
  { file: 'case.html', key: 'case', title: 'page.title.case', h1: 'cases.en', h2: 'cases.cn' },
  { file: 'guestbook.html', key: 'guestbook', title: 'page.title.guestbook', h1: 'guestbook.en', h2: 'guestbook.cn' },
  { file: 'contact.html', key: 'contact', title: 'page.title.contact', h1: 'contact.en', h2: 'contact.cn' },
  { file: 'page-4.html', key: 'page-4', title: 'page.title.page-4', h1: 'p4.title', h2: 'about.cn' },
  { file: 'page-5.html', key: 'page-5', title: 'page.title.page-5', h1: 'p5.title', h2: 'about.cn' },
  { file: 'page-6.html', key: 'page-6', title: 'page.title.page-6', h1: 'p6.title', h2: 'about.cn' },
  { file: 'page-7.html', key: 'page-7', title: 'page.title.page-7', h1: 'p7.title', h2: 'about.cn' },
  { file: 'page-8.html', key: 'page-8', title: 'page.title.page-8', h1: 'p8.title', h2: 'about.cn' },
  { file: 'page-9.html', key: 'page-9', title: 'page.title.page-9', h1: 'p9.title', h2: 'contact.cn' },
  { file: 'page-10.html', key: 'page-10', title: 'page.title.page-10', h1: 'p10.title', h2: 'contact.cn' }
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function t(lang, key) {
  if (DICT[lang] && DICT[lang][key] !== undefined) return DICT[lang][key];
  if (DICT.zh[key] !== undefined) return DICT.zh[key];
  throw new Error('Missing i18n key: ' + key);
}
function txt(lang, key, tag, attrs) {
  tag = tag || 'span';
  const a = attrs ? ' ' + attrs : '';
  return '<' + tag + ' data-i18n="' + key + '"' + a + '>' + esc(t(lang, key)) + '</' + tag + '>';
}
function attrNode(tag, key, lang, attrs) {
  return '<' + tag + ' data-i18n="' + key + '" data-i18n-attr="' +
    (attrs.attr || 'content') + '" ' + (attrs.rest || '') + '>';
}

/* ---------------- shared chrome ---------------- */
function header(lang, prefix, active) {
  const kws = [];
  kws.push(txt(lang, 'top.keyword_prefix'));
  for (let i = 1; i <= 7; i++) {
    kws.push('<a href="product.html">' + txt(lang, 'top.kw' + i) + '</a>');
  }
  const langButtons = LANGS.map(function (l) {
    return '<button type="button" data-lang="' + l + '" class="' +
      (l === lang ? 'active' : '') + '" aria-pressed="' + (l === lang) + '">' +
      esc(t(lang, 'lang.' + l)) + '</button>';
  }).join('');

  const nav = NAV.map(function (n) {
    return '<li><a href="' + n.file + '"' + (n.file === active ? ' class="active"' : '') + '>' +
      '<p class="cn" data-i18n="' + n.cn + '">' + esc(t(lang, n.cn)) + '</p>' +
      '<p class="en" data-i18n="' + n.en + '">' + esc(t(lang, n.en)) + '</p>' +
      '</a></li>';
  }).join('');

  return `
<div id="k-t"><div class="w1000">
  <div id="keywords">${kws.join(' ')}</div>
  <div id="top-right">
    <div id="tel-badge"><small data-i18n="top.base_label">${esc(t(lang, 'top.base_label'))}</small><span data-i18n="top.base">${esc(t(lang, 'top.base'))}</span></div>
    <div id="lang-switch"><span class="lang-label" data-i18n="lang.label">${esc(t(lang, 'lang.label'))}</span>${langButtons}</div>
  </div>
</div></div>
<div id="head"><div class="w1000 logo-tel">
  <div id="logo"><a href="index.html"><img src="${prefix}images/logo.png" data-i18n="brand.alt" data-i18n-attr="alt" alt="${esc(t(lang, 'brand.alt'))}"></a></div>
  <div id="nav"><ul class="nav-ul">${nav}</ul></div>
</div></div>`;
}

function hero(lang, prefix) {
  const slides = [1, 2, 3, 4].map(function (i) {
    return '<div class="hero-slide' + (i === 1 ? ' active' : '') + '">' +
      '<div class="hero-main" data-i18n="hero.s' + i + '">' + esc(t(lang, 'hero.s' + i)) + '</div>' +
      '<div class="hero-sub" data-i18n="hero.sub">' + esc(t(lang, 'hero.sub')) + '</div>' +
      '</div>';
  }).join('');
  const dots = [1, 2, 3, 4].map(function (i) {
    return '<li class="' + (i === 1 ? 'current' : '') + '"></li>';
  }).join('');
  return `<div id="banner">${slides}<ul id="pagination">${dots}</ul></div>`;
}

function innerHero(lang, page) {
  return `<div class="inner-hero"><div class="hero-cap">
    <h1 data-i18n="${page.h1}">${esc(t(lang, page.h1))}</h1>
    <p data-i18n="${page.h2}">${esc(t(lang, page.h2))}</p>
  </div></div>`;
}

function secTitle(lang, enKey, cnKey, onBlue) {
  return `<div class="sec-title${onBlue ? ' on-blue' : ''}">
    <div class="en" data-i18n="${enKey}">${esc(t(lang, enKey))}</div>
    <div class="cn" data-i18n="${cnKey}">${esc(t(lang, cnKey))}</div>
  </div>`;
}

function footer(lang, prefix) {
  const links = NAV.map(function (n) {
    return '<a href="' + n.file + '" data-i18n="' + n.cn + '">' + esc(t(lang, n.cn)) + '</a>';
  }).join('');
  const contacts = ['footer.address', 'footer.founded', 'footer.capital', 'footer.certs', 'footer.products']
    .map(function (k) { return '<p data-i18n="' + k + '">' + esc(t(lang, k)) + '</p>'; }).join('');
  const advantages = [1, 2, 3].map(function (i) {
    return '<p><span data-i18n="advantage.' + i + '.title">' + esc(t(lang, 'advantage.' + i + '.title')) +
      '</span><span data-i18n="advantage.' + i + '.desc">' + esc(t(lang, 'advantage.' + i + '.desc')) + '</span></p>';
  }).join('');
  const heading = function (enKey, cnKey) {
    return '<h4><span data-i18n="' + enKey + '">' + esc(t(lang, enKey)) +
      '</span><span class="cn-sub" data-i18n="' + cnKey + '">' + esc(t(lang, cnKey)) + '</span></h4>';
  };
  return `
<div id="foot">
  <div id="blink"><div class="w1000 blinkwrap">
    <div class="bw bw1">${heading('footer.col1.en', 'footer.col1.cn')}${contacts}</div>
    <div class="bw bw2">${heading('footer.col2.en', 'footer.col2.cn')}${advantages}</div>
    <div class="bw bw3">${heading('footer.col3.en', 'footer.col3.cn')}${links}</div>
  </div></div>
  <div id="copy"><div class="w1000">
    <span data-i18n="footer.copyright">${esc(t(lang, 'footer.copyright'))}</span>
    <span class="foot-slogan" data-i18n="footer.slogan">${esc(t(lang, 'footer.slogan'))}</span>
  </div></div>
</div>
<div id="scroll">
  <div class="scrolltop"><span data-i18n="service.title">${esc(t(lang, 'service.title'))}</span><span class="close-x" id="close-x">×</span></div>
  <ul class="scroll_ul">
    <li><a href="#" data-i18n="service.1">${esc(t(lang, 'service.1'))}</a></li>
    <li><a href="#" data-i18n="service.2">${esc(t(lang, 'service.2'))}</a></li>
    <li><a href="#" data-i18n="service.3">${esc(t(lang, 'service.3'))}</a></li>
  </ul>
</div>
<div id="to-top" data-i18n="common.top">${esc(t(lang, 'common.top'))}</div>`;
}

/* ---------------- page bodies ---------------- */
function featureRow(lang, prefix) {
  let out = '<ul class="iabt-ul">';
  for (let i = 1; i <= 5; i++) {
    const href = 'page-' + (i + 3) + '.html';
    out += '<li><a href="' + href + '"><img src="' + prefix + 'images/ico' + i + '.jpg" alt="">' +
      txt(lang, 'feature.' + i, 'p') + '</a></li>';
  }
  return out + '</ul>';
}

function productCard(lang, prefix, i, grid) {
  return '<div class="pro-card"><a href="product.html">' +
    '<img src="' + prefix + 'images/product' + i + '.jpg" alt="" data-i18n="product.' + i + '" data-i18n-attr="alt">' +
    '<p data-i18n="product.' + i + '">' + esc(t(lang, 'product.' + i)) + '</p>' +
    '</a></div>';
}

function body(lang, prefix, page) {
  switch (page.key) {
    case 'index': {
      const cards = [];
      for (let i = 1; i <= 10; i++) cards.push(productCard(lang, prefix, i, false));
      const proDots = [0, 1, 2].map(function (i) {
        return '<span class="' + (i === 0 ? 'current' : '') + '"></span>';
      }).join('');
      const newsItems = [1, 2, 3].map(function (i) {
        return '<li><a href="info.html"><span class="date" data-i18n="news.' + i + '.date">' + esc(t(lang, 'news.' + i + '.date')) +
          '</span><h3 data-i18n="news.' + i + '.title">' + esc(t(lang, 'news.' + i + '.title')) + '</h3></a>' +
          '<p data-i18n="news.' + i + '.desc">' + esc(t(lang, 'news.' + i + '.desc')) + '</p></li>';
      }).join('');
      return `
<div class="w1000 iabt">
  ${secTitle(lang, 'about.en', 'about.cn', false)}
  <div class="iabt-txt" data-i18n="about.intro">${esc(t(lang, 'about.intro'))}</div>
  ${featureRow(lang, prefix)}
  <p class="more-wrap"><a class="more-link" href="about.html" data-i18n="common.more">${esc(t(lang, 'common.more'))}</a></p>
</div>
<div class="ipro">
  <div class="w1000">
    ${secTitle(lang, 'products.en', 'products.cn', true)}
    <div class="pro-viewport"><div id="pro-track">${cards.join('')}</div></div>
    <div class="pro-dots">${proDots}</div>
  </div>
</div>
<div class="w1000 inews">
  ${secTitle(lang, 'news.en', 'news.cn', false)}
  <div class="inews-box">
    <div class="news-photo"><img src="${prefix}images/news-banner.jpg" alt="" data-i18n="news.cn" data-i18n-attr="alt"><span class="pager">1</span></div>
    <div class="news-main"><ul class="inews-ul">${newsItems}</ul>
      <p class="more-wrap left"><a class="more-link" href="info.html" data-i18n="common.view">${esc(t(lang, 'common.view'))}</a></p>
    </div>
  </div>
</div>`;
    }
    case 'about': {
      return `<div class="w1000 page-body">
  <h2 data-i18n="about.cn">${esc(t(lang, 'about.cn'))}</h2>
  <p class="lead" data-i18n="about.intro_full">${esc(t(lang, 'about.intro_full'))}</p>
  <p class="lead" data-i18n="about.philosophy">${esc(t(lang, 'about.philosophy'))}</p>
  ${featureRow(lang, prefix)}
  <h2 class="sub-head"><span data-i18n="advantage.cn">${esc(t(lang, 'advantage.cn'))}</span> <small data-i18n="advantage.en">${esc(t(lang, 'advantage.en'))}</small></h2>
  <ul class="advantage-list">${[1, 2, 3].map(function (i) {
    return '<li><b data-i18n="advantage.' + i + '.title">' + esc(t(lang, 'advantage.' + i + '.title')) +
      '</b><span data-i18n="advantage.' + i + '.desc">' + esc(t(lang, 'advantage.' + i + '.desc')) + '</span></li>';
  }).join('')}</ul>
</div>`;
    }
    case 'product': {
      const cats = [];
      for (let i = 1; i <= 7; i++) cats.push(txt(lang, 'category.' + i));
      const grid = [];
      for (let i = 1; i <= 10; i++) grid.push(productCard(lang, prefix, i, true));
      return `<div class="w1000 page-body">
  <h2 data-i18n="products.cn">${esc(t(lang, 'products.cn'))}</h2>
  <p class="lead" data-i18n="about.intro">${esc(t(lang, 'about.intro'))}</p>
  <div class="cat-list">${cats.join('')}</div>
  <div class="pro-grid">${grid.join('')}</div>
</div>`;
    }
    case 'info': {
      const items = [1, 2, 3].map(function (i) {
        return '<li><span class="date" data-i18n="news.' + i + '.date">' + esc(t(lang, 'news.' + i + '.date')) +
          '</span><h3 data-i18n="news.' + i + '.title">' + esc(t(lang, 'news.' + i + '.title')) + '</h3>' +
          '<p data-i18n="news.' + i + '.desc">' + esc(t(lang, 'news.' + i + '.desc')) + '</p></li>';
      }).join('');
      return `<div class="w1000 page-body"><h2 data-i18n="news.cn">${esc(t(lang, 'news.cn'))}</h2>
  <ul class="info-list">${items}</ul></div>`;
    }
    case 'case': {
      const cards = [1, 2, 3].map(function (i) {
        return '<div class="case-card"><img src="' + prefix + 'images/case' + i + '.jpg" alt="">' +
          '<div class="txt"><h3 data-i18n="case.' + i + '.title">' + esc(t(lang, 'case.' + i + '.title')) + '</h3>' +
          '<p data-i18n="case.' + i + '.desc">' + esc(t(lang, 'case.' + i + '.desc')) + '</p></div></div>';
      }).join('');
      return `<div class="w1000 page-body"><h2 data-i18n="cases.cn">${esc(t(lang, 'cases.cn'))}</h2>
  <p class="lead" data-i18n="about.philosophy">${esc(t(lang, 'about.philosophy'))}</p>
  <div class="case-grid">${cards}</div></div>`;
    }
    case 'guestbook': {
      const field = function (key, name, tag, extra) {
        const label = '<label data-i18n="' + key + '">' + esc(t(lang, key)) + '</label>';
        if (tag === 'textarea') {
          return '<div class="row">' + label + '<textarea name="' + name + '" data-i18n="' + key + '" data-i18n-attr="placeholder" placeholder="' + esc(t(lang, key)) + '"></textarea></div>';
        }
        return '<div class="row">' + label + '<input type="' + (extra || 'text') + '" name="' + name + '" data-i18n="' + key + '" data-i18n-attr="placeholder" placeholder="' + esc(t(lang, key)) + '"></div>';
      };
      return `<div class="w1000 page-body"><h2 data-i18n="guestbook.cn">${esc(t(lang, 'guestbook.cn'))}</h2>
  <p class="lead" data-i18n="contact.bases">${esc(t(lang, 'contact.bases'))}</p>
  <form class="gb-form" id="guestbook-form" novalidate>
    ${field('form.name', 'name')}
    ${field('form.phone', 'phone', 'input', 'tel')}
    ${field('form.email', 'email', 'input', 'email')}
    ${field('form.subject', 'subject')}
    ${field('form.message', 'message', 'textarea')}
    <button type="submit" data-i18n="form.submit">${esc(t(lang, 'form.submit'))}</button>
    <div id="form-msg" role="status"></div>
  </form></div>`;
    }
    case 'contact': {
      const keys = ['contact.address', 'contact.founded', 'contact.capital', 'contact.staff',
        'contact.certs', 'contact.ul', 'contact.products', 'contact.bases'];
      const list = keys.map(function (k) {
        return '<li data-i18n="' + k + '">' + esc(t(lang, k)) + '</li>';
      }).join('');
      return `<div class="w1000 page-body"><h2 data-i18n="contact.cn">${esc(t(lang, 'contact.cn'))}</h2>
  <div class="contact-grid">
    <ul class="contact-list">${list}</ul>
    <div class="contact-note"><h2 data-i18n="p9.title">${esc(t(lang, 'p9.title'))}</h2>
      <p class="lead" data-i18n="p9.desc">${esc(t(lang, 'p9.desc'))}</p></div>
  </div></div>`;
    }
    default: {
      const n = page.key.replace('page-', '');
      const iconIndex = Number(n) - 3;
      const img = iconIndex >= 1 && iconIndex <= 5
        ? prefix + 'images/ico' + iconIndex + '.jpg'
        : prefix + 'images/page' + n + '.jpg';
      return `<div class="w1000 page-body"><h2 data-i18n="p${n}.title">${esc(t(lang, 'p' + n + '.title'))}</h2>
  <div class="feature-detail">
    <img src="${img}" alt="">
    <div class="txt"><p class="lead" data-i18n="p${n}.desc">${esc(t(lang, 'p' + n + '.desc'))}</p>
      <p class="lead" data-i18n="about.philosophy">${esc(t(lang, 'about.philosophy'))}</p></div>
  </div></div>`;
    }
  }
}

/* ---------------- assembly ---------------- */
function alternates(prefix, page) {
  return LANGS.map(function (l) {
    return '<link rel="alternate" hreflang="' + HREFLANG[l] + '" href="' + prefix + l + '/' + page + '">';
  }).join('\n  ') + '\n  <link rel="alternate" hreflang="x-default" href="' + prefix + page + '">';
}

function render(lang, prefix, page) {
  const chrome = header(lang, prefix, page.file);
  const top = page.key === 'index' ? hero(lang, prefix) : innerHero(lang, page);
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title data-i18n="${page.title}">${esc(t(lang, page.title))}</title>
  <meta name="keywords" data-i18n="meta.keywords" data-i18n-attr="content" content="${esc(t(lang, 'meta.keywords'))}">
  <meta name="description" data-i18n="meta.description" data-i18n-attr="content" content="${esc(t(lang, 'meta.description'))}">
  <link rel="stylesheet" href="${prefix}css/site.css">
  ${alternates(prefix, page.file)}
  <script>window.DEFAULT_LANG = '${lang}';</script>
  <script src="${prefix}js/i18n-data.js"></script>
  <script src="${prefix}js/i18n.js"></script>
  <script src="${prefix}js/site.js" defer></script>
</head>
<body>
${chrome}
${top}
${body(lang, prefix, page)}
${footer(lang, prefix)}
</body>
</html>
`;
}

function main() {
  // 1. embedded dictionary (no fetch -> works from file://)
  fs.mkdirSync(path.join(ROOT, 'js'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'js', 'i18n-data.js'),
    '/* Generated by build.js from src/lang.json - do not edit */\nwindow.I18N = ' +
    JSON.stringify(DICT, null, 2) + ';\n', 'utf8');
  fs.copyFileSync(path.join(SRC, 'i18n.js'), path.join(ROOT, 'js', 'i18n.js'));
  fs.copyFileSync(path.join(SRC, 'site.js'), path.join(ROOT, 'js', 'site.js'));

  // 2. all pages in root (default zh) and in each language directory
  const targets = [{ lang: 'zh', dir: ROOT, prefix: '' }].concat(
    LANGS.map(function (l) {
      return { lang: l, dir: path.join(ROOT, l), prefix: '../' };
    })
  );
  let count = 0;
  targets.forEach(function (target) {
    fs.mkdirSync(target.dir, { recursive: true });
    PAGES.forEach(function (page) {
      fs.writeFileSync(path.join(target.dir, page.file), render(target.lang, target.prefix, page), 'utf8');
      count++;
    });
  });
  console.log('Built ' + count + ' HTML pages (' + PAGES.length + ' pages x ' +
    (LANGS.length + 1) + ' roots)');
  console.log('Languages: ' + LANGS.join(', '));
  console.log('Output: ' + ROOT);
}

main();
