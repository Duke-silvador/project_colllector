/* P8 Harum Manis — public site interactions */
(function () {
  'use strict';

  const CONFIG = window.P8_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const I18N = {
    ms: {
      'brand.tagline': 'Produk & Sistem Inventori',
      'nav.products': 'Produk', 'nav.why': 'Kelebihan', 'nav.system': 'Sistem',
      'nav.contact': 'Hubungi', 'nav.openApp': 'Buka Sistem',
      'hero.eyebrow': 'HARUMANIS · PERLIS · SEJAK 2026',
      'hero.title1': 'Harumanis segar.', 'hero.title2': 'Stok terkawal.', 'hero.title3': 'Untung bersih.',
      'hero.sub': 'Produk Harumanis, makanan dan minuman dari Chuping — dengan sistem inventori yang memantau stok, batch FEFO, jualan dan untung bersih dalam satu tempat.',
      'hero.cta1': 'Buka Sistem Inventori', 'hero.cta2': 'Lihat Produk',
      'hero.trust1': 'Scan barcode', 'hero.trust2': 'FEFO automatik', 'hero.trust3': 'BM / English', 'hero.trust4': 'Cloud Google',
      'hero.badge': 'HARUMANIS ASLI', 'hero.float1': 'Stok fizikal', 'hero.float2': 'Batch terdekat',
      'hero.float3': 'Untung bersih', 'hero.days': 'hari',
      'stats.sku': 'SKU aktif', 'stats.months': 'bulan data', 'stats.lang': 'bahasa', 'stats.cloud': 'cloud',
      'products.eyebrow': 'PRODUK PILIHAN', 'products.title': 'Harumanis & minuman dari depot.',
      'products.sub': 'Harga runcit. Untuk pesanan borong atau agen, hubungi kami.',
      'products.all': 'Semua', 'products.food': 'Makanan', 'products.drink': 'Minuman', 'products.fruit': 'Buah Segar',
      'products.order': 'Pesan', 'products.note': 'Harga runcit untuk 2026. Pesanan borong, agen dan penghantaran boleh diatur melalui WhatsApp.',
      'cat.fruit': 'Buah Segar', 'cat.food': 'Makanan', 'cat.drink': 'Minuman',
      'why.eyebrow': 'SISTEM YANG BEKERJA', 'why.title': 'Bukan sekadar buku catatan.',
      'why.sub': 'Daripada scan pertama hingga laporan untung bersih, semua direkod dan boleh diaudit.',
      'why.f1.title': 'Scan & FEFO', 'why.f1.desc': 'Scan barcode atau taip SKU. Batch paling hampir luput dikeluarkan dahulu secara automatik.',
      'why.f2.title': 'Stok batch tepat', 'why.f2.desc': 'Setiap batch ada tarikh luput, qty, pemasok dan faktur. Stok tidak boleh menjadi negatif.',
      'why.f3.title': 'Untung bersih', 'why.f3.desc': 'Pendapatan, COGS, komisen dan biaya operasi dikira dalam satu dasbor P&L.',
      'why.f4.title': 'Audit & whitelist', 'why.f4.desc': 'Hanya akaun Google yang diluluskan boleh masuk. Setiap tindakan tercatat dalam log audit.',
      'system.eyebrow': 'SISTEM INVENTORI P8', 'system.title': 'Satu sistem untuk staf, stok dan untung.',
      'system.sub': 'Buka terus dari laman ini. Staf scan barang masuk/keluar, admin semak stok dan kewangan, semua dalam masa nyata.',
      'system.role1': 'Staf Operasi', 'system.role1desc': 'Scan masuk/keluar, lapor barang rosak dengan foto.',
      'system.role2': 'Admin / Supervisor', 'system.role2desc': 'Kelulusan, stok, batch, harga dan pengguna.',
      'system.role3': 'Bendahari', 'system.role3desc': 'Buku kas, hutang-piutang, P&L dan tutup bulan.',
      'system.cta': 'Buka Sistem', 'system.note': 'Akses terhad kepada akaun Google yang diluluskan.',
      'dash.revenue': 'Pendapatan', 'dash.cogs': 'COGS', 'dash.net': 'Untung bersih',
      'dash.safe': 'Aman', 'dash.low': 'Menipis', 'dash.exp': 'Luput',
      'contact.eyebrow': 'PESANAN & PERTANYAAN', 'contact.title': 'Nak tempah atau tanya stok?',
      'contact.sub': 'Hubungi kami untuk pesanan runcit, borong, agen atau penghantaran sekitar Perlis.',
      'contact.wa': 'WhatsApp', 'contact.email': 'E-mel',
      'contact.location': 'Lokasi', 'contact.locationValue': 'Chuping, Perlis',
      'contact.hours': 'Waktu', 'contact.hoursValue': 'Isnin–Sabtu · 9:00 pagi–6:00 petang',
      'contact.delivery': 'Penghantaran', 'contact.deliveryValue': 'Perlis & sekitar · boleh diatur',
      'footer.note': 'Produk Harumanis dan sistem inventori untuk depot kecil yang serius tentang kualiti.',
      'footer.system': 'Sistem inventori', 'footer.rights': 'Hak cipta terpelihara.',
      'footer.built': 'Dibina dengan Google Apps Script, Sheets & Drive.',
      'aria.menu': 'Buka menu'
    },
    en: {
      'brand.tagline': 'Products & Inventory System',
      'nav.products': 'Products', 'nav.why': 'Why us', 'nav.system': 'System',
      'nav.contact': 'Contact', 'nav.openApp': 'Open System',
      'hero.eyebrow': 'HARUMANIS · PERLIS · SINCE 2026',
      'hero.title1': 'Fresh Harumanis.', 'hero.title2': 'Stock in control.', 'hero.title3': 'Net profit.',
      'hero.sub': 'Harumanis products, food and drinks from Chuping — with an inventory system that tracks stock, FEFO batches, sales and net profit in one place.',
      'hero.cta1': 'Open Inventory System', 'hero.cta2': 'View Products',
      'hero.trust1': 'Barcode scan', 'hero.trust2': 'Automatic FEFO', 'hero.trust3': 'BM / English', 'hero.trust4': 'Google Cloud',
      'hero.badge': 'AUTHENTIC HARUMANIS', 'hero.float1': 'Physical stock', 'hero.float2': 'Nearest batch',
      'hero.float3': 'Net profit', 'hero.days': 'days',
      'stats.sku': 'active SKUs', 'stats.months': 'months of data', 'stats.lang': 'languages', 'stats.cloud': 'cloud',
      'products.eyebrow': 'SELECTED PRODUCTS', 'products.title': 'Harumanis & drinks from the depot.',
      'products.sub': 'Retail prices. For wholesale or agent orders, contact us.',
      'products.all': 'All', 'products.food': 'Food', 'products.drink': 'Drinks', 'products.fruit': 'Fresh Fruit',
      'products.order': 'Order', 'products.note': 'Retail prices for 2026. Wholesale, agent and delivery orders can be arranged via WhatsApp.',
      'cat.fruit': 'Fresh Fruit', 'cat.food': 'Food', 'cat.drink': 'Drinks',
      'why.eyebrow': 'A SYSTEM THAT WORKS', 'why.title': 'More than a notebook.',
      'why.sub': 'From the first scan to the net profit report, everything is recorded and auditable.',
      'why.f1.title': 'Scan & FEFO', 'why.f1.desc': 'Scan a barcode or type a SKU. The earliest-expiring batch is dispatched automatically.',
      'why.f2.title': 'Accurate batch stock', 'why.f2.desc': 'Every batch has an expiry date, qty, supplier and invoice. Stock can never go negative.',
      'why.f3.title': 'Net profit', 'why.f3.desc': 'Revenue, COGS, commission and operating expenses are calculated in one P&L dashboard.',
      'why.f4.title': 'Audit & whitelist', 'why.f4.desc': 'Only approved Google accounts can enter. Every action is written to the audit log.',
      'system.eyebrow': 'P8 INVENTORY SYSTEM', 'system.title': 'One system for staff, stock and profit.',
      'system.sub': 'Open it right from this site. Staff scan stock in/out, admin reviews stock and finance, all in real time.',
      'system.role1': 'Operations Staff', 'system.role1desc': 'Scan in/out, report damaged goods with photos.',
      'system.role2': 'Admin / Supervisor', 'system.role2desc': 'Approvals, stock, batches, pricing and users.',
      'system.role3': 'Treasurer', 'system.role3desc': 'Cash book, payables, receivables, P&L and month-end close.',
      'system.cta': 'Open System', 'system.note': 'Access is limited to approved Google accounts.',
      'dash.revenue': 'Revenue', 'dash.cogs': 'COGS', 'dash.net': 'Net profit',
      'dash.safe': 'Safe', 'dash.low': 'Low', 'dash.exp': 'Expired',
      'contact.eyebrow': 'ORDERS & ENQUIRIES', 'contact.title': 'Want to order or ask about stock?',
      'contact.sub': 'Contact us for retail, wholesale, agent or delivery orders around Perlis.',
      'contact.wa': 'WhatsApp', 'contact.email': 'Email',
      'contact.location': 'Location', 'contact.locationValue': 'Chuping, Perlis',
      'contact.hours': 'Hours', 'contact.hoursValue': 'Mon–Sat · 9:00 am–6:00 pm',
      'contact.delivery': 'Delivery', 'contact.deliveryValue': 'Perlis & nearby · can be arranged',
      'footer.note': 'Harumanis products and an inventory system for a small depot that takes quality seriously.',
      'footer.system': 'Inventory system', 'footer.rights': 'All rights reserved.',
      'footer.built': 'Built with Google Apps Script, Sheets & Drive.',
      'aria.menu': 'Open menu'
    }
  };

  const TITLES = {
    ms: 'P8 Harum Manis — Produk Harumanis & Sistem Inventori Perlis',
    en: 'P8 Harum Manis — Harumanis Products & Inventory System, Perlis'
  };
  const DESCRIPTIONS = {
    ms: 'P8 Harum Manis — produk Harumanis, makanan, minuman dan sistem inventori depot di Chuping, Perlis. Stok FEFO, scan barcode, untung bersih dan audit dalam satu platform.',
    en: 'P8 Harum Manis — Harumanis products, food, drinks and a depot inventory system in Chuping, Perlis. FEFO stock, barcode scanning, net profit and audit in one platform.'
  };

  function applyLang(lang) {
    const dict = I18N[lang] || I18N.ms;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (dict[k]) el.textContent = dict[k];
    });
    $$('[data-ms]').forEach(el => {
      const text = lang === 'en' ? el.dataset.en : el.dataset.ms;
      if (text) el.textContent = text;
    });
    $$('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.title = TITLES[lang] || TITLES.ms;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', DESCRIPTIONS[lang] || DESCRIPTIONS.ms);
    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.setAttribute('aria-label', dict['aria.menu'] || 'Menu');
    try { localStorage.setItem('p8_site_lang', lang); } catch (e) {}
  }

  function initLang() {
    let lang = 'ms';
    try { lang = localStorage.getItem('p8_site_lang') || 'ms'; } catch (e) {}
    applyLang(lang);
    $$('[data-lang]').forEach(btn => btn.addEventListener('click', () => applyLang(btn.dataset.lang)));
  }

  function initMenu() {
    const btn = $('#menuBtn');
    const menu = $('#mobileMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  }

  function initFilters() {
    const chips = $$('[data-filter]');
    const cards = $$('#productGrid .product-card');
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const f = chip.dataset.filter;
      cards.forEach(card => {
        card.style.display = (f === 'all' || card.dataset.cat === f) ? '' : 'none';
      });
    }));
  }

  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    items.forEach(el => io.observe(el));
  }

  function initLinks() {
    const wa = CONFIG.whatsapp || '';
    const mail = CONFIG.email || '';
    const waHref = wa ? ('https://wa.me/' + wa + '?text=' + encodeURIComponent('Hai P8 Harum Manis, saya ingin bertanya tentang produk.')) : '#hubungi';
    const mailHref = mail ? ('mailto:' + mail + '?subject=' + encodeURIComponent('Pesanan P8 Harum Manis')) : '#hubungi';
    $$('.js-wa').forEach(a => { a.href = waHref; a.target = '_blank'; a.rel = 'noopener'; });
    $$('.js-email').forEach(a => { a.href = mailHref; });
    $$('.js-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = btn.dataset.product || 'produk';
        const text = 'Hai P8 Harum Manis, saya ingin memesan: ' + product;
        if (wa) window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        else window.location.hash = '#hubungi';
      });
    });
    $$('.app-link').forEach(a => { a.href = 'app.html'; });
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  function init() {
    initLang();
    initMenu();
    initFilters();
    initReveal();
    initLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
