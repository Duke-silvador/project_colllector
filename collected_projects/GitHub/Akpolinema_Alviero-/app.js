/* ===== app.js ===== */
/* ============================================================
   E-CRM Studio — app.js
   Core: auth, navigation, cart, modal, toast, helpers
   ============================================================ */

'use strict';

let currentUser = null;
let cart = [];

window.addEventListener('DOMContentLoaded', () => {
  updateTopbarDate();
  setInterval(updateTopbarDate, 60000);
  
  // Tentukan role berdasarkan URL hash (#admin) karena query param sering gagal di protokol file:///
  const isAdmin = window.location.hash.includes('admin');
  const users = DB.getUsers();
  
  if (isAdmin) {
    currentUser = users.find(u => u.role === 'admin');
  } else {
    // FIX: pakai identitas pelanggan yang tersimpan di browser ini (jika pernah checkout
    // sebelumnya) supaya SEMUA transaksinya konsisten tercatat di "Transaksi & Riwayat"
    // walau halaman di-reload. Sebelumnya currentUser selalu direset ke pelanggan demo
    // default, sehingga invoice yang baru dibuat saat checkout (dengan customer id baru)
    // jadi tidak pernah muncul lagi di riwayat pelanggan tsb.
    const savedId = localStorage.getItem('ecrm_active_customer_id');
    let cust = savedId ? DB.getCustomer(savedId) : null;
    if (!cust) cust = users.find(u => u.role === 'customer'); // fallback ke pelanggan demo
    currentUser = { id: cust.id, name: cust.nama || cust.name, role: 'customer' };
  }

  
  showApp();
});

function updateTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
}



// ---- ROLE SWITCHER (INSTANT HIDDEN TOGGLE) ----
window.instantToggleRole = function() {
  const isAdmin = window.location.hash.includes('admin');
  if (isAdmin) {
    window.location.hash = '';
  } else {
    window.location.hash = 'admin';
  }
  window.location.reload();
};

// ---- SHOW APP ----
function showApp() {
  const lp = document.getElementById('loginPage');
  if (lp) lp.classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Pelanggan';
  document.getElementById('userAvatar').textContent = currentUser.name[0].toUpperCase();

  if (currentUser.role === 'admin') {
    document.getElementById('topbarUser').style.display = 'flex';
    // Lonceng notifikasi tetap ditampilkan untuk admin — dipakai untuk
    // memberi tahu jika ada booking yang dibatalkan (termasuk gagal foto/no-show).
    document.getElementById('custNotifBell').classList.remove('hidden');
    const bellBtn = document.getElementById('notifBellBtn');
    if (bellBtn) bellBtn.title = 'Notifikasi Pembatalan Booking';
    const m = document.getElementById('adminMenu');
    if(m) m.classList.remove('hidden');
    navigateTo('adminDashboard', document.querySelector('#adminMenu .nav-item[data-page="adminDashboard"]'));
    updateNotifBadge();
  } else {
    document.getElementById('topbarUser').style.display = 'none';
    document.getElementById('custNotifBell').classList.remove('hidden');
    const m = document.getElementById('customerMenu');
    if(m) m.classList.remove('hidden');

    // Notifikasi "Selamat Datang" tampil di halamannya sendiri (tanpa sidebar)
    // sebelum pelanggan memilih lokasi & masuk ke katalog. Jika sudah pernah
    // tampil di sesi ini, langsung lanjut ke katalog seperti biasa.
    const gateShown = showWelcomeGate();
    if (!gateShown) {
      navigateTo('katalogProduk', document.querySelector('#customerMenu .nav-item[data-page="katalogProduk"]'));
    }
    updateNotifBadge();
  }
}

// ═══════════════════════════════════════════════════════════
//  NOTIFIKASI PELANGGAN — jadwal pemotretan & status pembayaran DP
//  Muncul otomatis di lonceng 🔔 pada topbar setiap kali pelanggan login,
//  dan ikut ter-update ketika data invoice berubah (via refreshCurrentPage).
// ═══════════════════════════════════════════════════════════
function buildCustomerNotifications() {
  if (!currentUser || currentUser.role !== 'customer') return [];
  const invs = DB.getInvoicesByCustomer(currentUser.id);
  const notif = [];

  invs.forEach(i => {
    const jadwal = `${formatDate(i.bookingDate)} Pkl. ${i.bookingTime||'-'}`;
    const lokasi = i.lokasi ? getLokasiById(i.lokasi).nama : '';

    if (i.status === 'Menunggu DP') {
      notif.push({ id:i.id, icon:'⚠️', title:`DP Belum Dibayar — ${i.id}`,
        desc:`Jadwal foto ${jadwal}${lokasi?` di ${lokasi}`:''} belum terkunci. Segera bayar DP ${formatRupiah(i.dpAmount)}.` });
    } else if (i.status === 'Menunggu Konfirmasi DP') {
      notif.push({ id:i.id, icon:'⏳', title:`DP Menunggu Konfirmasi Admin — ${i.id}`,
        desc:`DP ${formatRupiah(i.dpAmount)} untuk sesi ${jadwal} sedang diverifikasi admin.` });
    } else if (i.status === 'DP Terkonfirmasi') {
      notif.push({ id:i.id, icon:'📅', title:`Jadwal Pemotretan Terkonfirmasi — ${i.id}`,
        desc:`DP sudah dikonfirmasi ✓ Sesi foto Anda: ${jadwal}${lokasi?` di ${lokasi}`:''}. Lakukan pelunasan ${formatRupiah(i.pelunasanAmount)} saat/setelah sesi.` });
    } else if (i.status === 'Menunggu Konfirmasi Pelunasan' || i.status === 'Menunggu Konfirmasi') {
      notif.push({ id:i.id, icon:'⏳', title:`Pelunasan Menunggu Konfirmasi — ${i.id}`,
        desc:`Pembayaran Anda untuk sesi ${jadwal} sedang diverifikasi admin agar berstatus LUNAS.` });
    } else if (i.status === 'Menunggu Pembayaran') {
      notif.push({ id:i.id, icon:'⚠️', title:`Pembayaran Belum Dilakukan — ${i.id}`,
        desc:`Sesi foto ${jadwal}${lokasi?` di ${lokasi}`:''} menunggu pembayaran penuh ${formatRupiah(i.total)}.` });
    }
  });

  return notif;
}

// ═══════════════════════════════════════════════════════════
//  NOTIFIKASI ADMIN — muncul otomatis di lonceng 🔔 admin setiap kali ada
//  booking yang DIBATALKAN (baik dibatalkan sendiri oleh pelanggan, maupun
//  ditandai admin karena pelanggan gagal foto/tidak hadir pada jadwalnya).
// ═══════════════════════════════════════════════════════════
function buildAdminNotifications() {
  if (!currentUser || currentUser.role !== 'admin') return [];
  return DB.getInvoices()
    .filter(i => i.status === 'Dibatalkan' && !i.notifDibacaAdmin)
    .sort((a,b) => (b.waktuBatal||'').localeCompare(a.waktuBatal||''))
    .map(i => ({
      id: i.id,
      icon: '🚫',
      title: `Booking Dibatalkan — ${i.id}`,
      desc: `${i.customerNama} — sesi ${formatDate(i.bookingDate)} Pkl. ${i.bookingTime||'-'} dibatalkan (${i.alasanBatal||'-'}). Slot jam tsb otomatis tersedia kembali.`
    }));
}

// Tandai semua notifikasi pembatalan sebagai sudah dibaca admin (dipanggil saat dropdown dibuka)
function markAdminNotifRead() {
  const invs = DB.getInvoices();
  let changed = false;
  invs.forEach(i => { if (i.status==='Dibatalkan' && !i.notifDibacaAdmin) { i.notifDibacaAdmin = true; changed = true; } });
  if (changed) DB.saveInvoices(invs);
}

window.updateNotifBadge = () => {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const notif = isAdmin ? buildAdminNotifications() : buildCustomerNotifications();
  if (notif.length > 0) {
    badge.textContent = notif.length > 9 ? '9+' : notif.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
};

window.renderNotifDropdown = () => {
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const notif = isAdmin ? buildAdminNotifications() : buildCustomerNotifications();
  const emptyMsg = isAdmin
    ? `<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:.82rem">🔔 Tidak ada pembatalan booking baru.</div>`
    : `<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:.82rem">🔔 Tidak ada notifikasi baru.<br>Semua jadwal & pembayaran Anda aman ✓</div>`;
  const clickFn = isAdmin ? 'showInvoiceDetail' : 'showInvoiceCustomer';
  dd.innerHTML = notif.length === 0
    ? emptyMsg
    : `<div style="padding:8px 10px;font-weight:700;font-size:.78rem;color:var(--gray-500)">NOTIFIKASI (${notif.length})</div>` +
      notif.map(n => `
        <div class="notif-item" onclick="${clickFn}('${n.id}');toggleNotifDropdown();">
          <span class="notif-item-icon">${n.icon}</span>
          <div>
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-desc">${n.desc}</div>
          </div>
        </div>`).join('');
  // Begitu admin membuka lonceng, notifikasi pembatalan dianggap sudah dilihat
  if (isAdmin && notif.length > 0) { markAdminNotifRead(); updateNotifBadge(); }
};

window.toggleNotifDropdown = (e) => {
  if (e) e.stopPropagation();
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  const willShow = dd.classList.contains('hidden');
  document.querySelectorAll('.notif-dropdown').forEach(x => x.classList.add('hidden'));
  if (willShow) {
    renderNotifDropdown();
    dd.classList.remove('hidden');
    document.addEventListener('click', closeNotifDropdownOnce);
  }
};
function closeNotifDropdownOnce(e) {
  const wrap = document.getElementById('custNotifBell');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('notifDropdown').classList.add('hidden');
    document.removeEventListener('click', closeNotifDropdownOnce);
  }
}

// ═══════════════════════════════════════════════════════════
//  WELCOME GATE PAGE — halaman tersendiri TANPA sidebar yang
//  tampil sebelum pelanggan melihat katalog. Alurnya:
//  1) Notifikasi "Selamat Datang" tampil di halaman ini sendiri.
//  2) Pelanggan memilih lokasi studio yang akan didatangi.
//  3) Klik "Lihat Katalog" -> langsung menuju halaman katalog,
//     dan lokasi yang sudah dipilih dibawa terus (tidak perlu
//     memilih ulang di halaman keranjang).
// ═══════════════════════════════════════════════════════════
function renderWelcomeGateLokasi() {
  const wrap = document.getElementById('welcomeGateLokasiWrap');
  if (!wrap) return;
  if (!window.selectedLokasi) window.selectedLokasi = LOKASI_STUDIO[0].id;

  wrap.innerHTML = LOKASI_STUDIO.map(l => {
    const isSelected = l.id === window.selectedLokasi;
    const shortArea = l.id === 'pusat' ? 'Karangploso' : 'Dinoyo';
    return `
      <div class="lokasi-option ${isSelected ? 'is-selected' : ''}" data-lokasi="${l.id}" onclick="pilihLokasiGate('${l.id}', event)">
        <div class="lokasi-header">
          <input type="radio" name="lokasiPilihGate" value="${l.id}" ${isSelected ? 'checked' : ''} onchange="pilihLokasiGate('${l.id}')">
          <div class="lokasi-title-wrap">
            <div class="lokasi-nama-row">
              <span class="lokasi-nama">${l.nama}</span>
              <span class="lokasi-badge-tag">${shortArea}</span>
            </div>
          </div>
          <span class="lokasi-check-icon" aria-hidden="true">${isSelected ? '✓' : ''}</span>
        </div>

        <div class="lokasi-expandable" id="lokasiExpand_${l.id}" style="${isSelected ? 'display:block;' : 'display:none;'}" onclick="event.stopPropagation()">
          <div class="lokasi-alamat-text">📍 ${l.alamat}</div>
          <div class="lokasi-map-slot">
            ${renderStandardMapEmbed(l.id, '160px')}
          </div>
          <a href="${mapsUrlFor(l.alamat)}" target="_blank" rel="noopener noreferrer" class="btn-lokasi-buka-maps" onclick="event.stopPropagation()">
            🗺️ Buka di Google Maps
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.pilihLokasiGate = (id, event) => {
  if (event && event.target && (event.target.closest('a') || event.target.closest('.lokasi-expandable'))) return;
  window.selectedLokasi = id;
  document.querySelectorAll('#welcomeGateLokasiWrap .lokasi-option').forEach(el => {
    const isTarget = el.dataset.lokasi === id;
    el.classList.toggle('is-selected', isTarget);

    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = isTarget;

    const checkIcon = el.querySelector('.lokasi-check-icon');
    if (checkIcon) checkIcon.textContent = isTarget ? '✓' : '';

    const exp = el.querySelector('.lokasi-expandable');
    if (exp) {
      if (isTarget) {
        exp.style.display = 'block';
        exp.style.animation = 'lokasiExpandIn 0.22s ease forwards';
      } else {
        exp.style.display = 'none';
      }
    }
  });
};

// Menampilkan halaman gate. Return true jika ditampilkan (customer baru di
// sesi ini), return false jika sudah pernah ditampilkan sebelumnya.
function showWelcomeGate() {
  if (sessionStorage.getItem('alviero_welcome_shown')) return false;
  sessionStorage.setItem('alviero_welcome_shown', '1');

  document.getElementById('appShell').classList.add('hidden');
  const gate = document.getElementById('welcomeGatePage');
  gate.classList.remove('hidden');

  // Selalu mulai dari Step 1 (Selamat Datang) setiap kali gate ditampilkan
  document.getElementById('welcomeGateStep1').classList.remove('hidden');
  document.getElementById('welcomeGateStep2').classList.add('hidden');

  const logo = document.getElementById('welcomeGateLogo');
  if (logo) logo.style.backgroundImage = `url('data:image/png;base64,${ALVIERO_LOGO_B64}')`;
  const joiningLogo = document.getElementById('joiningLogoInner');
  if (joiningLogo) joiningLogo.style.backgroundImage = `url('data:image/png;base64,${ALVIERO_LOGO_B64}')`;

  // Tampilkan badge rating & cuplikan ulasan sebagai bukti sosial (social
  // proof) di halaman Selamat Datang, supaya pelanggan langsung tahu
  // Alviero Studio sudah punya ulasan bagus dari pelanggan sebelumnya —
  // tanpa perlu masuk aplikasi dulu.
  const ulasanAll = [...DB.getUlasan()].sort((a,b)=>b.id.localeCompare(a.id));
  const ulasanCount = ulasanAll.length;
  const avg = DB.getAvgRating();
  const ratingBadge = document.getElementById('welcomeGateRatingBadge');
  if (ratingBadge) {
    ratingBadge.innerHTML = ulasanCount > 0
      ? `<div class="welcome-gate-rating-badge">⭐ ${avg.toFixed(1)}/5 — dari ${ulasanCount} ulasan pelanggan kami</div>`
      : '';
  }
  const reviewList = document.getElementById('welcomeGateReviewList');
  if (reviewList) {
    const bagus = ulasanAll.filter(u => u.rating >= 4 && u.komentar).slice(0, 2);
    reviewList.innerHTML = bagus.length === 0 ? '' : `
      <div class="welcome-gate-review-list">
        ${bagus.map(r => `
          <div class="welcome-gate-review-item">
            <div class="wgr-top">
              <span class="wgr-name">${r.customerNama}</span>
              <span class="wgr-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            </div>
            <div class="wgr-comment">"${r.komentar}"</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ── LAYAR "JOINING" ala Zoom: tampil sekilas sambil "menyiapkan" halaman,
  // lalu fade ke notifikasi Selamat Datang. Efek ini hanya kosmetik/UX,
  // tidak menunda data apa pun karena semua data sudah disiapkan di atas.
  const joining = document.getElementById('joiningScreen');
  const card = document.getElementById('welcomeGateCard');
  card.classList.add('hidden');
  joining.classList.remove('hidden');
  joining.classList.remove('fade-out');
  setTimeout(() => {
    joining.classList.add('fade-out');
    setTimeout(() => {
      joining.classList.add('hidden');
      card.classList.remove('hidden');
    }, 280);
  }, 1000);

  return true;
}

// Step 1 -> Step 2: dari notifikasi Selamat Datang menuju pemilihan lokasi
window.goToWelcomeGateStep2 = () => {
  document.getElementById('welcomeGateStep1').classList.add('hidden');
  document.getElementById('welcomeGateStep2').classList.remove('hidden');
  renderWelcomeGateLokasi();
};

// Dipanggil saat tombol "Lihat Katalog" di halaman gate diklik:
// menutup halaman gate, menampilkan app shell, lalu langsung ke katalog.
window.proceedFromWelcomeGate = () => {
  if (!window.selectedLokasi) window.selectedLokasi = LOKASI_STUDIO[0].id;
  document.getElementById('welcomeGatePage').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  navigateTo('katalogProduk', document.querySelector('#customerMenu .nav-item[data-page="katalogProduk"]'));
  updateNotifBadge();
};

// ---- NAVIGATION ----
function navigateTo(pageId, linkEl) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  const label = linkEl ? (linkEl.querySelector('span:not(.cart-badge)')?.textContent?.trim() || pageId) : pageId;
  document.getElementById('topbarTitle').textContent = label;
  window.currentPageId = pageId;

  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const pageMap = {
    adminDashboard: renderAdminDashboard, dataPelanggan: renderDataPelanggan,
    dataProduk: renderDataProduk, pesananInvoice: renderPesananInvoice,
    pembayaran: renderPembayaran, penerimaanKas: renderPenerimaanKas,
    profilPelanggan: renderProfilPelanggan, riwayatPembelian: renderRiwayatPembelian,
    poinLoyalitas: renderPoinLoyalitas,
    laporan: renderLaporan,
    customerDashboard: renderCustomerDashboard, katalogProduk: renderKatalogProduk,
    keranjang: renderKeranjang, pesananSaya: renderPesananSaya,
    poinSaya: renderPoinSaya, profilSaya: renderProfilSaya,
  };

  if (pageMap[pageId]) main.appendChild(pageMap[pageId]());
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('sidebar-open');
    document.getElementById('sidebarOverlay').classList.add('hidden');
  }
  updateCartBadge();
}

// ── AUTO-REFRESH DATA (supaya transaksi yang dibuat lewat tampilan
//    HP/tab lain langsung terlihat update di sisi Admin) ──────────
// Halaman yang aman untuk di-refresh otomatis (bukan sedang diisi formulir aktif)
const AUTO_REFRESH_SAFE_PAGES = [
  'adminDashboard','dataPelanggan','dataProduk','pesananInvoice','pembayaran',
  'penerimaanKas','profilPelanggan','riwayatPembelian','poinLoyalitas','laporan',
  'customerDashboard','katalogProduk','pesananSaya','poinSaya'
];
window.refreshCurrentPage = () => {
  if (currentUser) updateNotifBadge();
  const pid = window.currentPageId;
  if (!pid || !AUTO_REFRESH_SAFE_PAGES.includes(pid)) return; // skip 'keranjang' dsb agar tidak mengganggu input aktif
  if (!document.getElementById('mainContent')) return;
  const link = document.querySelector(`[data-page="${pid}"]`);
  navigateTo(pid, link);
};

// Tab/jendela lain pada browser yang sama menyimpan data baru (mis. pelanggan
// checkout lewat tab HP) → tab admin ini otomatis ikut memperbarui tampilannya
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('ecrm_')) window.refreshCurrentPage();
});

// Saat berpindah aplikasi/tab lalu kembali (umum terjadi di HP), pastikan
// data yang ditampilkan adalah data paling baru dari penyimpanan
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') window.refreshCurrentPage();
});
window.addEventListener('focus', () => window.refreshCurrentPage());

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('sidebar-open');
  document.getElementById('sidebarOverlay').classList.toggle('hidden');
}

// ---- CART ----
function updateCartBadge() {
  const b = document.getElementById('cartBadge');
  if (!b) return;
  const t = cart.reduce((s,i)=>s+i.qty,0);
  b.textContent = t; t > 0 ? b.classList.remove('hidden') : b.classList.add('hidden');
}

function addToCart(productId) {
  const prod = DB.getProducts().find(p => p.id === productId);
  if (!prod) return;
  const ex = cart.find(i => i.id === productId);
  if (ex) ex.qty++; else cart.push({ id:prod.id, nama:prod.nama, harga:prod.harga, qty:1, icon:prod.icon||'📷', kategori:prod.kategori });
  updateCartBadge();
  showToast(`"${prod.nama}" ditambahkan ke keranjang 🛒`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartBadge();
  refreshIfOnPage('keranjang');
}

function changeCartQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { cart = cart.filter(i => i.id !== productId); }
  updateCartBadge();
  refreshIfOnPage('keranjang');
}

function refreshIfOnPage(pageId) {
  const active = document.querySelector('.nav-item.active');
  if (active && active.dataset.page === pageId) navigateTo(pageId, active);
}

// ---- MODAL ----
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalContent').innerHTML = '';
  document.body.style.overflow = '';
  const box = document.getElementById('modalBox');
  if (box) box.classList.remove('modal-box-square'); // reset ke bentuk modal standar
}

// ---- TOAST ----
function showToast(msg, type='') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type ? 'toast-'+type : ''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>{ t.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>t.remove(),300); }, 4000);
}

// ---- DOM HELPERS ----
function createPage(title, subtitle) {
  const p = document.createElement('div');
  p.className = 'page';
  p.innerHTML = `<div class="page-header"><h1 class="page-title">${title}</h1>${subtitle?`<p class="page-subtitle">${subtitle}</p>`:''}</div>`;
  return p;
}

function createCard(title, bodyHtml, headerExtra='') {
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<div class="card-header"><span class="card-title">${title}</span>${headerExtra}</div><div class="card-body">${bodyHtml}</div>`;
  return c;
}

function createKpiCard(icon, label, value, sub='', color='#2255C4', bg='#e8effc') {
  const c = document.createElement('div');
  c.className = 'kpi-card';
  c.style.setProperty('--kpi-color', color);
  c.style.setProperty('--kpi-bg', bg);
  c.innerHTML = `<div class="kpi-icon">${icon}</div><div class="kpi-info"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
  return c;
}

function kpiGrid(...cards) {
  const g = document.createElement('div');
  g.className = 'kpi-grid';
  cards.forEach(c => g.appendChild(c));
  return g;
}

function emptyState(icon, title, sub='') {
  const d = document.createElement('div');
  d.className = 'empty-state';
  d.innerHTML = `<div class="empty-state-icon">${icon}</div><div class="empty-state-title">${title}</div>${sub?`<p class="empty-state-sub">${sub}</p>`:''}`;
  return d;
}

// ---- EXPORT HELPERS (Excel / PDF / Word) ----

// Unduh file Word (.doc) sederhana dari konten HTML (dibuka native oleh MS Word)
function downloadWordDoc(filename, bodyHtml, title='Export E-CRM Studio') {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body{font-family:Calibri,Arial,sans-serif;font-size:12px;color:#0F2A5C}
      h2{color:#0F2A5C} table{border-collapse:collapse;width:100%}
      th{background:#2255C4;color:#fff;padding:6px;text-align:left}
      td{padding:6px;border:1px solid #ccc}
    </style></head><body>`;
  const footer = '</body></html>';
  const source = header + bodyHtml + footer;
  const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

// Unduh file Excel (.xlsx) dari array of object (SheetJS)
function downloadExcel(filename, rows, sheetName='Sheet1') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Buat instance jsPDF baru
function newPDF(orientation='portrait') {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ orientation });
}

// Kunci minggu ISO sederhana untuk pengelompokan laporan mingguan
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - firstJan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}


