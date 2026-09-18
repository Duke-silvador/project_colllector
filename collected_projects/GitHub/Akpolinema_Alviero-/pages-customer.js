/* ===== pages-customer.js ===== */
/* ============================================================
   E-CRM Studio — pages-customer.js
   Semua halaman Pelanggan (Customer)
   ============================================================ */

'use strict';

// ═══════════════════════════════════════════════════════════
//  DASHBOARD PELANGGAN
// ═══════════════════════════════════════════════════════════
function renderCustomerDashboard() {
  const c = DB.getCustomer(currentUser.id);
  const invs = DB.getInvoicesByCustomer(c.id);
  const page = createPage(`Halo, ${c.nama} 👋`, 'Selamat datang di panel pelanggan E-CRM Studio');

  const kg = kpiGrid(
    createKpiCard('🛍️','Total Pesanan', invs.length, 'Seluruh riwayat transaksi','#2255C4','#e8effc'),
    createKpiCard('💰','Total Belanja', formatRupiah(c.totalBelanja), 'Transaksi lunas','#1DB954','#e6f9ee'),
    createKpiCard('⭐','Poin Loyalitas', c.poin, 'Kumpulkan untuk reward','#F59E0B','#FEF3C7'),
    createKpiCard('🎯','Status Pelanggan', c.status, 'Berdasarkan poin & belanja','#D7263D','#fde8eb')
  );
  page.appendChild(kg);

  // Status pesanan yang perlu diperhatikan
  const pending = invs.filter(i=>['Menunggu Pembayaran','Menunggu DP','Menunggu Pelunasan'].includes(i.status));
  if (pending.length > 0) {
    const alert = document.createElement('div');
    alert.className = 'alert-info';
    alert.style.cssText = 'background:var(--red-light);color:var(--red);border-color:var(--red);margin-bottom:20px;padding:12px;border-radius:8px;border:1px solid;display:flex;align-items:center;gap:12px';
    alert.innerHTML = `<span style="font-size:1.4rem">⚠️</span> <div><strong>Ada ${pending.length} pesanan yang menunggu pembayaran Anda.</strong><br><a href="#" onclick="navigateTo('pesananSaya',document.querySelector('[data-page=pesananSaya]'));return false;" style="text-decoration:underline;color:var(--red)">Cek Pesanan Saya →</a></div>`;
    page.appendChild(alert);
  }

  // Loyalty Card
  const lCard = document.createElement('div');
  lCard.className = 'loyalty-card';
  lCard.innerHTML = `
    <div class="loyalty-name">Kartu Member E-CRM Studio</div>
    <div class="loyalty-points">${c.poin} <span style="font-size:1.5rem">⭐</span></div>
    <div class="loyalty-pts-label">Total Poin Loyalitas Anda</div>
    <div class="loyalty-status-badge">${c.status}</div>
  `;

  // Aktivitas Terbaru
  const akt = DB.getAktivitasByCustomer(c.id);
  let aktHtml = '';
  if (!akt.length) {
    aktHtml = '<p style="color:#aaa;text-align:center;padding:20px 0">Belum ada aktivitas.</p>';
  } else {
    aktHtml = '<div class="activity-list">' + akt.slice(0,5).map(a=>`
      <div class="activity-item">
        <div class="activity-dot" style="width:20px;height:20px;font-size:0"></div>
        <div class="activity-content"><div class="activity-desc">${a.desc}</div><div class="activity-time">${a.waktu}</div></div>
      </div>`).join('') + '</div>';
  }
  const aCard = createCard('Aktivitas Terbaru', aktHtml);

  const twoCol = document.createElement('div');
  twoCol.style.cssText = 'display:grid;grid-template-columns:300px 1fr;gap:20px';
  twoCol.appendChild(lCard);
  twoCol.appendChild(aCard);
  page.appendChild(twoCol);

  return page;
}

// ═══════════════════════════════════════════════════════════
//  KATALOG PRODUK
// ═══════════════════════════════════════════════════════════
function renderKatalogProduk() {
  const page = createPage('Katalog Produk & Layanan','Pilih paket foto studio dan tambahkan ke keranjang');
  const prods = DB.getProducts();

  // Katalog & Info Studio (Lokasi + Ulasan) dipisah pakai TAB di dalam
  // halaman yang sama — bukan menu sidebar baru. Jadi begitu "Lihat Katalog"
  // diklik, pelanggan langsung mendarat di tab Katalog (tab aktif default),
  // dan Lokasi/Ulasan tetap ada tapi tidak lagi bercampur di layar yang sama.
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;border-bottom:2px solid var(--gray-200);padding-bottom:0';
  tabBar.innerHTML = `
    <button class="btn btn-primary" id="tabBtnKatalog" style="border-radius:8px 8px 0 0" onclick="switchKatalogTab('katalog')">🛍️ Katalog Produk</button>
    <button class="btn btn-outline" id="tabBtnInfo" style="border-radius:8px 8px 0 0" onclick="switchKatalogTab('info')">📍 Info Studio (Lokasi &amp; Ulasan)</button>
  `;
  page.appendChild(tabBar);

  const tabKatalog = document.createElement('div');
  tabKatalog.id = 'tabKatalogContent';
  const tabInfo = document.createElement('div');
  tabInfo.id = 'tabInfoContent';
  tabInfo.classList.add('hidden');
  page.appendChild(tabKatalog);
  page.appendChild(tabInfo);

  window.switchKatalogTab = (tab) => {
    const isKatalog = tab === 'katalog';
    tabKatalog.classList.toggle('hidden', !isKatalog);
    tabInfo.classList.toggle('hidden', isKatalog);
    document.getElementById('tabBtnKatalog').className = isKatalog ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('tabBtnInfo').className = !isKatalog ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('tabBtnKatalog').style.borderRadius = '8px 8px 0 0';
    document.getElementById('tabBtnInfo').style.borderRadius = '8px 8px 0 0';
  };

  // ── LOKASI STUDIO & GOOGLE MAPS ──
  const lokasiCard = createCard('📍 Lokasi Studio', `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
      ${LOKASI_STUDIO.map(l => `
        <div style="border:1px solid var(--gray-200);border-radius:10px;overflow:hidden;background:#fff;display:flex;flex-direction:column">
          <div style="position:relative">
            ${renderStandardMapEmbed(l.id, '160px')}
          </div>
          <div style="padding:12px;flex:1;display:flex;flex-direction:column">
            <div style="font-weight:700;color:var(--navy);font-size:.9rem">${l.nama}</div>
            <div style="font-size:.78rem;color:var(--gray-500);margin:6px 0 12px;flex:1">${l.alamat}</div>
            <a class="btn-lokasi-buka-maps" href="${mapsUrlFor(l.alamat)}" target="_blank" rel="noopener noreferrer">
              🗺️ Buka di Google Maps
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `);
  tabInfo.appendChild(lokasiCard);

  // ── ULASAN PELANGGAN ──
  const ulasan = [...DB.getUlasan()].sort((a,b)=>b.id.localeCompare(a.id));
  const avgRating = DB.getAvgRating();
  const ulasanBody = ulasan.length === 0
    ? `<div style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:20px">Belum ada ulasan dari pelanggan.</div>`
    : `<div style="display:flex;flex-direction:column;gap:12px;max-height:320px;overflow-y:auto">
        ${ulasan.slice(0,10).map(r => `
          <div style="border:1px solid var(--gray-200);border-radius:8px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:.85rem;color:var(--navy)">${r.customerNama}</strong>
              <span style="color:var(--amber);font-size:.9rem">${r.rating>0 ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating) : '<span style=\'color:var(--gray-400);font-weight:normal\'>Tanpa rating bintang</span>'}</span>
            </div>
            <div style="font-size:.75rem;color:var(--gray-400);margin:2px 0 6px">${r.produk} · ${getLokasiById(r.lokasi).nama} · ${formatDate(r.tanggal)}</div>
            <div style="font-size:.85rem;color:var(--gray-700)">${r.komentar}</div>
          </div>
        `).join('')}
      </div>`;
  const ulasanCard = createCard(`⭐ Ulasan Pelanggan ${ulasan.length ? `<span style="font-size:.8rem;font-weight:normal;color:var(--gray-500)">(Rata-rata ${avgRating.toFixed(1)}/5 dari ${ulasan.length} ulasan)</span>` : ''}`, ulasanBody);
  tabInfo.appendChild(ulasanCard);

  // ── HIGHLIGHT ULASAN di tab Katalog (tab default) ──
  // Ditaruh di sini supaya pelanggan langsung melihat bukti bahwa Alviero
  // Studio sudah punya ulasan/rating dari pelanggan, tanpa harus pindah ke
  // tab "Info Studio" dulu. Klik "Lihat Semua Ulasan" akan membawa ke tab
  // tsb untuk melihat daftar lengkapnya.
  if (ulasan.length > 0) {
    const cuplikan = ulasan.slice(0, 2);
    const highlightCard = document.createElement('div');
    highlightCard.className = 'card';
    highlightCard.style.marginBottom = '20px';
    highlightCard.innerHTML = `
      <div class="card-body" style="padding:16px 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.3rem;font-weight:800;color:var(--navy)">⭐ ${avgRating.toFixed(1)}/5</span>
            <span style="font-size:.8rem;color:var(--gray-500)">dari ${ulasan.length} ulasan pelanggan</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchKatalogTab('info')">Lihat Semua Ulasan</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          ${cuplikan.map(r => `
            <div style="border:1px solid var(--gray-200);border-radius:8px;padding:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:.85rem;color:var(--navy)">${r.customerNama}</strong>
                <span style="color:var(--amber);font-size:.85rem">${r.rating>0 ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating) : ''}</span>
              </div>
              <div style="font-size:.82rem;color:var(--gray-700);margin-top:6px">"${r.komentar}"</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    tabKatalog.appendChild(highlightCard);
  }

  // Kategori filter buttons
  const kats = [...new Set(prods.map(p=>p.kategori))];
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap';
  btnGroup.innerHTML = `<button class="btn btn-primary" onclick="filterKatalog('Semua',this)">Semua</button>` +
    kats.map(k=>`<button class="btn btn-outline" onclick="filterKatalog('${k}',this)">${k}</button>`).join('');
  tabKatalog.appendChild(btnGroup);

  const grid = document.createElement('div');
  grid.className = 'product-grid';
  grid.id = 'customerProductGrid';

  // Katalog di-group per Jenis Produk (kategori): tampil 1 kartu per jenis
  // (mis. "Pass Photo"). Klik "Lihat" akan membuka pilihan paket di dalam
  // jenis itu (mis. Pass Photo 2×3, 3×4, 4×6) — bukan langsung 1 produk.
  kats.forEach(k => {
    const items = prods.filter(p => p.kategori === k);
    if (!items.length) return;
    const rep = items[0]; // fallback ikon/foto kalau Jenis Produk belum punya foto sendiri
    const katData = DB.getCategory(k);
    const katFoto = katData ? (katData.foto || katData.image || katData.image_url || '') : '';
    const prodFoto = rep ? (rep.foto || rep.image || rep.image_url || rep.imageUrl || '') : '';
    const repFoto = katFoto || prodFoto; // foto Jenis Produk diutamakan
    const repIcon = (katData && katData.icon) ? katData.icon : rep.icon;
    const isDp = ['Group Photo','Graduation'].includes(k);
    const harga = items.map(p=>p.harga);
    const min = Math.min(...harga), max = Math.max(...harga);
    const hargaLabel = min===max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.kategori = k;
    card.innerHTML = `
      ${repFoto
        ? `<img src="${repFoto}" alt="${k}" class="product-photo">`
        : `<div class="product-icon">${repIcon}</div>`}
      <div class="product-name">${k}</div>
      <div class="product-cat">${items.length} pilihan paket</div>
      <div class="product-price">${hargaLabel}</div>
      <div style="flex:1;font-size:.75rem;color:var(--gray-500);margin:8px 0">${items.map(p=>p.nama).join(' · ')}</div>
      <div style="font-size:.7rem;padding:4px 8px;background:var(--gray-50);border-radius:4px;margin-bottom:12px;color:var(--gray-700)">
        ${isDp ? '💳 DP 50% saat booking' : '💳 Bayar Penuh di muka'}
      </div>
      <button class="btn btn-outline btn-full" onclick="showKategoriPilihan('${k.replace(/'/g,"\\'")}')">${eyeIconSVG()} Lihat</button>
    `;
    grid.appendChild(card);
  });

  tabKatalog.appendChild(grid);

  // Global func for filter
  window.filterKatalog = (kat, btn) => {
    btnGroup.querySelectorAll('button').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-outline'); });
    btn.classList.remove('btn-outline'); btn.classList.add('btn-primary');
    document.querySelectorAll('.product-card').forEach(c => {
      if (kat==='Semua' || c.dataset.kategori===kat) c.style.display = 'flex';
      else c.style.display = 'none';
    });
  };

  return page;
}

// ── PILIHAN PAKET DI DALAM 1 JENIS PRODUK (mis. semua Self Photo) ──
// Dibuka lewat tombol "Lihat" pada kartu jenis produk di katalog.
window.showKategoriPilihan = (kat) => {
  const items = DB.getProducts().filter(p => p.kategori === kat);
  const isDp = ['Group Photo','Graduation'].includes(kat);
  const listHtml = items.map(p => {
    const fotoSrc = p.foto || p.image || p.image_url || p.imageUrl || '';
    return `
    <div style="display:flex;gap:12px;align-items:center;border:1px solid var(--gray-200);border-radius:10px;padding:12px;margin-bottom:10px">
      ${fotoSrc
        ? `<img src="${fotoSrc}" alt="${p.nama}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">`
        : `<div style="width:56px;height:56px;border-radius:8px;background:var(--gray-50);display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0">${p.icon}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--navy);font-size:.9rem">${p.nama}</div>
        <div style="font-size:.78rem;color:var(--gray-500);margin:2px 0">${p.deskripsi||''}</div>
        <div style="font-weight:700;color:var(--primary)">${formatRupiah(p.harga)}</div>
      </div>
      <button class="btn btn-outline btn-sm" style="flex-shrink:0" onclick="showProdukInfo('${p.id}')">${eyeIconSVG()} Lihat</button>
    </div>
  `;}).join('');

  openModal(`
    <h2 class="modal-title" style="margin-bottom:2px">${kat}</h2>
    <p class="modal-sub" style="margin-bottom:16px">Pilih salah satu paket ${kat} di bawah ini</p>
    <div style="font-size:.78rem;padding:8px 12px;background:var(--gray-50);border-radius:6px;margin-bottom:16px;color:var(--gray-700)">
      ${isDp ? '💳 DP 50% saat booking · Pelunasan saat/setelah sesi' : '💳 Bayar Penuh di muka'}
    </div>
    ${listHtml || '<p style="text-align:center;color:var(--gray-400)">Belum ada paket pada jenis produk ini.</p>'}
    <button class="btn btn-secondary btn-full" style="margin-top:6px" onclick="closeModalBtn()">Tutup</button>
  `);
};

// ── DETAIL / INFO LENGKAP PRODUK (dibuka lewat tombol "Lihat") ──
// Ikon mata vektor (SVG) untuk tombol "Lihat" — pengganti emoji 👁️
function eyeIconSVG() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3.2"/></svg>`;
}

window.showProdukInfo = (id) => {
  const p = DB.getProduct(id); if (!p) return;
  const isDp = ['Group Photo','Graduation'].includes(p.kategori);
  const fotoSrc = p.foto || p.image || p.image_url || p.imageUrl || '';
  const fotoHtml = fotoSrc
    ? `<img src="${fotoSrc}" alt="${p.nama}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:16px">`
    : `<div style="font-size:3rem;text-align:center;margin-bottom:12px">${p.icon}</div>`;
  const includesHtml = (p.includes && p.includes.length)
    ? `<ul style="list-style:disc;padding-left:20px;font-size:.85rem;color:var(--gray-700);line-height:1.7;margin-bottom:16px">
        ${p.includes.map(it=>`<li>${it}</li>`).join('')}
      </ul>`
    : `<p style="font-size:.85rem;color:var(--gray-400);margin-bottom:16px">Belum ada rincian tambahan untuk paket ini.</p>`;
  openModal(`
    ${fotoHtml}
    <h2 class="modal-title" style="margin-bottom:2px">${p.nama}</h2>
    <p class="modal-sub" style="margin-bottom:14px">${p.kategori}</p>
    <div style="font-size:1.5rem;font-weight:800;color:var(--navy);margin-bottom:12px">${formatRupiah(p.harga)}</div>
    ${p.deskripsi ? `<p style="font-size:.88rem;color:var(--gray-600);margin-bottom:16px">${p.deskripsi}</p>` : ''}
    <h3 style="font-size:.9rem;color:var(--navy);margin-bottom:8px">Fasilitas / Yang Anda Dapatkan</h3>
    ${includesHtml}
    <div style="font-size:.78rem;padding:8px 12px;background:var(--gray-50);border-radius:6px;margin-bottom:20px;color:var(--gray-700)">
      ${isDp ? '💳 DP 50% saat booking · Pelunasan saat/setelah sesi' : (p.paymentNote || '💳 Bayar Penuh di muka')}
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary" style="flex:1" onclick="showKategoriPilihan('${p.kategori.replace(/'/g,"\\'")}')">← Kembali</button>
      <button class="btn btn-primary" style="flex:2" onclick="closeModalBtn(); addToCartCustomer('${p.id}')">+ Tambah ke Keranjang</button>
    </div>
  `);
};

window.addToCartCustomer = (id) => {
  addToCart(id);
  navigateTo('keranjang', document.querySelector('#customerMenu .nav-item[data-page="keranjang"]'));
};

// ═══════════════════════════════════════════════════════════
//  KERANJANG & CHECKOUT
// ═══════════════════════════════════════════════════════════
function renderKeranjang() {
  const page = createPage('Keranjang Saya','Review paket yang akan di-booking');
  if (cart.length === 0) {
    page.appendChild(emptyState('🛒','Keranjang Anda Kosong','Silakan pilih paket layanan di menu Katalog Produk.'));
    return page;
  }

  const total = cart.reduce((s,i)=>s+i.harga*i.qty, 0);
  const pType = DB.getPaymentTypeForCart(cart);
  const dpAmount = pType==='dp' ? Math.ceil(total*0.5) : total;

  let itemsHtml = cart.map(i=>`
    <div class="cart-item">
      <div style="font-size:1.8rem">${i.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${i.nama}</div>
        <div class="cart-item-price"><span class="badge badge-gray">${i.kategori}</span> ${formatRupiah(i.harga)}</div>
      </div>
      <div class="cart-qty-control">
        <button class="cart-qty-btn" onclick="changeCartQty('${i.id}',-1)">-</button>
        <div class="cart-qty">${i.qty}</div>
        <button class="cart-qty-btn" onclick="changeCartQty('${i.id}',1)">+</button>
      </div>
      <div class="cart-subtotal">${formatRupiah(i.harga*i.qty)}</div>
      <button class="cart-remove" onclick="removeFromCart('${i.id}')" title="Hapus">✕</button>
    </div>
  `).join('');

  // Info Pembayaran
  let paymentInfo = '';
  if (pType==='dp') {
    paymentInfo = `
      <div style="background:var(--amber-light);border:1px solid var(--amber);padding:12px;border-radius:8px;margin-bottom:20px;font-size:.85rem;color:#92680a">
        <strong>⚠️ Sistem Pembayaran DP 50%</strong><br>
        Keranjang Anda berisi layanan Group Photo/Graduation. Anda cukup membayar DP 50% <strong>(${formatRupiah(dpAmount)})</strong> saat ini untuk mengamankan jadwal. Pelunasan dilakukan saat/setelah sesi foto.
      </div>
    `;
  } else {
    paymentInfo = `
      <div style="background:var(--blue-light);border:1px solid var(--primary);padding:12px;border-radius:8px;margin-bottom:20px;font-size:.85rem;color:var(--primary)">
        <strong>ℹ️ Pembayaran Penuh</strong><br>
        Layanan ini mensyaratkan pembayaran lunas <strong>(${formatRupiah(total)})</strong> di muka.
      </div>
    `;
  }

  const todayStr = new Date().toISOString().slice(0,10);
  
  const checkoutHtml = `
    <div class="checkout-grid" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px">
      <div>
        <div class="card" style="margin-bottom:20px"><div class="card-body" style="padding:16px 24px">${itemsHtml}</div></div>
        
        <div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">📍 Lokasi Studio Terpilih</span></div>
          <div class="card-body" id="lokasiSelectedWrap"></div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">📅 Pilih Jadwal Sesi</span></div>
          <div class="card-body">
            <div class="form-group">
              <label>Pilih Tanggal</label>
              <input type="date" id="bookDate" min="${todayStr}" onchange="checkTimeSlots()" />
            </div>
            <div class="form-group" id="timeSlotContainer" style="display:none">
              <label>Pilih Jam <span style="font-size:.7rem;font-weight:normal;color:var(--gray-500)">(Maks 2 sesi/jam)</span></label>
              <div id="timeSlots" style="display:flex;gap:10px;flex-wrap:wrap"></div>
            </div>
            <div id="noSlotMsg" style="display:none;color:var(--red);font-size:.85rem;padding:10px;background:var(--red-light);border-radius:6px">Maaf, semua jadwal pada tanggal ini sudah penuh. Silakan pilih tanggal lain.</div>
          </div>
        </div>
      </div>
      
      <div>
        <div class="card">
          <div class="card-header"><span class="card-title">Ringkasan Checkout</span></div>
          <div class="card-body">
            ${paymentInfo}
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:.9rem;color:var(--gray-600)"><span>Total Paket</span><span>${formatRupiah(total)}</span></div>
            <div class="cart-total-row">
              <span class="cart-total-label">${pType==='dp' ? 'Yang Harus Dibayar (DP)' : 'Total Bayar'}</span>
              <span class="cart-total-value">${formatRupiah(dpAmount)}</span>
            </div>
            <div style="margin-top:20px">
              <label style="display:block;font-size:.85rem;font-weight:700;margin-bottom:8px;color:var(--navy)">Nama Lengkap</label>
              <input type="text" id="checkoutNama" placeholder="Contoh: Budi Santoso" style="width:100%;padding:10px;margin-bottom:12px;border-radius:6px;border:1px solid var(--gray-300)" />
              <label style="display:block;font-size:.85rem;font-weight:700;margin-bottom:8px;color:var(--navy)">Email</label>
              <input type="email" id="checkoutEmail" placeholder="nama@email.com" style="width:100%;padding:10px;margin-bottom:12px;border-radius:6px;border:1px solid var(--gray-300)" />
              <label style="display:block;font-size:.85rem;font-weight:700;margin-bottom:8px;color:var(--navy)">Nomor WA / HP</label>
              <input type="text" id="checkoutHp" placeholder="08xxxxxxxx" style="width:100%;padding:10px;margin-bottom:12px;border-radius:6px;border:1px solid var(--gray-300)" />
              <label style="display:block;font-size:.85rem;font-weight:700;margin-bottom:8px;color:var(--navy)">Metode Pembayaran</label>
              <select id="checkoutMetode" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--gray-300);margin-bottom:16px">
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="QRIS">QRIS</option>
              </select>
              <button class="btn btn-primary btn-full" style="padding:14px;font-size:1rem" onclick="doCheckout()" id="btnCheckout" disabled>Checkout & Booking</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const checkoutDiv = document.createElement('div');
  checkoutDiv.innerHTML = checkoutHtml;
  page.appendChild(checkoutDiv);

  // Logic to handle slots dynamically
  window.selectedTime = null;
  // Lokasi TIDAK dipilih ulang di sini — pelanggan sudah memilihnya di
  // halaman "Selamat Datang" (welcome gate) sebelum masuk ke katalog, dan
  // sudah sempat melihat ulasan sebelum sampai di keranjang. Di sini cukup
  // tampilkan lokasi yang sudah dipilih tsb. Fallback ke lokasi pertama
  // hanya untuk jaga-jaga jika belum sempat terisi.
  if (!window.selectedLokasi) window.selectedLokasi = LOKASI_STUDIO[0].id;

  const lokasiSelWrap = checkoutDiv.querySelector('#lokasiSelectedWrap');
  const lokTerpilih = getLokasiById(window.selectedLokasi);
  lokasiSelWrap.innerHTML = `
    <div style="border:1.5px solid var(--primary);border-radius:10px;overflow:hidden">
      <div style="display:flex;gap:10px;align-items:flex-start;padding:14px">
        <div style="font-size:1.3rem;line-height:1">📍</div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--navy);font-size:.92rem">${lokTerpilih.nama}</div>
          <div style="font-size:.8rem;color:var(--gray-500);margin-top:3px">${lokTerpilih.alamat}</div>
        </div>
      </div>
      <a href="${mapsUrlFor(lokTerpilih.alamat)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="display:flex;align-items:center;justify-content:center;gap:6px;margin:0 14px 14px;border-radius:8px">🗺️ Buka Peta</a>
    </div>
    <div style="font-size:.72rem;color:var(--gray-400);margin-top:8px">Lokasi ini sudah Anda pilih di awal saat membuka aplikasi, jadi tidak perlu dipilih ulang di sini.</div>
  `;

  window.checkTimeSlots = () => {
    const date = document.getElementById('bookDate').value;
    const cont = document.getElementById('timeSlotContainer');
    const slots = document.getElementById('timeSlots');
    const noMsg = document.getElementById('noSlotMsg');
    const btn = document.getElementById('btnCheckout');
    
    window.selectedTime = null;
    btn.disabled = true;

    if (!date) { cont.style.display='none'; noMsg.style.display='none'; return; }

    const info = DB.getSlotInfo(date);
    const hasAny = info.some(i=>i.available);
    
    if (!hasAny) {
      cont.style.display='none'; noMsg.style.display='block';
    } else {
      noMsg.style.display='none'; cont.style.display='block';
      slots.innerHTML = info.map(i => {
        if (i.available) {
          return `<button class="btn btn-outline" style="min-width:70px;padding:8px" onclick="selectTime('${i.time}',this)">${i.time}</button>`;
        } else {
          return `<button class="btn" style="min-width:70px;padding:8px;background:var(--gray-200);color:var(--gray-500);cursor:not-allowed" disabled>${i.time}<br><span style="font-size:.6rem">PENUH</span></button>`;
        }
      }).join('');
    }
  };

  window.selectTime = (time, btn) => {
    document.querySelectorAll('#timeSlots .btn-primary').forEach(b=>{b.classList.remove('btn-primary');b.classList.add('btn-outline');});
    btn.classList.remove('btn-outline'); btn.classList.add('btn-primary');
    window.selectedTime = time;
    document.getElementById('btnCheckout').disabled = false;
  };

  window.doCheckout = () => {
    const date = document.getElementById('bookDate').value;
    const time = window.selectedTime;
    const met = document.getElementById('checkoutMetode').value;
    const nama = document.getElementById('checkoutNama').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const hp = document.getElementById('checkoutHp').value.trim();
    
    if (!date || !time) { showToast('Silakan pilih jadwal terlebih dahulu!','warning'); return; }
    if (!nama) { showToast('Mohon isi Nama Lengkap Anda!','error'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Format email tidak valid!','error'); return; }
    
    // FIX: Cocokkan identitas pelanggan berdasarkan NAMA yang diketik saat checkout
    // (bukan sekadar id tersimpan di browser ini). Sebelumnya, id tersimpan di
    // localStorage SELALU dipakai duluan — jadi kalau browser yang sama dipakai
    // untuk booking atas nama orang lain, datanya malah tercampur/menimpa profil
    // pelanggan sebelumnya. Sekarang: Data Pelanggan, Profil Pelanggan, Poin
    // Loyalitas, dan Riwayat Pembelian akan selalu bertambah/terupdate SESUAI
    // JUMLAH NAMA pelanggan/pemesan yang benar-benar berbeda.
    let custId = currentUser.id;
    if (currentUser.role === 'customer') {
      const allCust = DB.getCustomers();
      const namaLower = nama.toLowerCase();

      // 1) Cocokkan dulu berdasarkan Nama (case-insensitive) — ini penentu utama
      //    supaya nama pemesan yang berbeda selalu jadi pelanggan yang berbeda.
      let existing = allCust.find(c => (c.nama||'').trim().toLowerCase() === namaLower);
      // 2) Kalau nama belum pernah tercatat, coba cocokkan No. HP...
      if (!existing && hp) {
        existing = allCust.find(c => c.hp && c.hp.replace(/\D/g,'') === hp.replace(/\D/g,''));
      }
      // 3) ...atau Email, untuk pelanggan lama yang mungkin ganti sedikit nama.
      if (!existing && email) {
        existing = allCust.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
      }

      if (existing) {
        // Pelanggan (nama) ini sudah dikenal → pakai profil yang sama, cukup
        // perbarui data kontak terbarunya.
        custId = existing.id;
        existing.nama = nama;
        if (hp) existing.hp = hp;
        if (email) existing.email = email;
        const cs = allCust.map(c => c.id === existing.id ? existing : c);
        DB.saveCustomers(cs);
      } else {
        // Nama pemesan ini belum pernah tercatat → benar-benar pelanggan baru,
        // walau browsernya sama dengan pemesan sebelumnya (data TIDAK ditimpa).
        const newCust = DB.addCustomer(nama, email, hp);
        custId = newCust.id;
      }
      localStorage.setItem('ecrm_active_customer_id', custId);
      currentUser.id = custId;
      currentUser.name = nama;
    }
    
    const inv = DB.checkout(custId, cart, date, time, met, window.selectedLokasi);
    if (!inv) { showToast('Maaf, jadwal ini baru saja penuh!','error'); checkTimeSlots(); return; }
    
    cart = [];
    updateCartBadge();
    showToast(`Booking sukses! Tagihan ${formatRupiah(inv.paymentType==='dp'?inv.dpAmount:inv.total)} telah dibuat.`,`success`);
    
    setTimeout(() => {
      // Reload the page to reset state so their name is preserved as the current simulated logged-in user
      window.location.reload();
    }, 1500);
  };

  return page;
}

// ═══════════════════════════════════════════════════════════
//  PESANAN SAYA
// ═══════════════════════════════════════════════════════════
function renderPesananSaya() {
  const page = createPage('Pesanan Saya','Riwayat booking dan pembayaran Anda');
  const invs = [...DB.getInvoicesByCustomer(currentUser.id)].sort((a,b)=>b.id.localeCompare(a.id));

  if (invs.length === 0) {
    page.appendChild(emptyState('🧾','Belum Ada Pesanan','Anda belum pernah memesan paket foto.'));
    return page;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;gap:16px';

  invs.forEach(i => {
    const isDp = i.paymentType === 'dp';
    
    // Tentukan aksi yang perlu dilakukan user
    let actionBtn = '';
    let callout = '';
    
    if (i.status === 'Menunggu DP') {
      actionBtn = `<button class="btn btn-primary" onclick="simulasiBayarCustomer('${i.id}','dp')">Bayar DP (${formatRupiah(i.dpAmount)})</button>`;
      callout = `<div style="background:var(--red-light);color:var(--red);padding:10px;border-radius:6px;font-size:.85rem;margin-bottom:12px;font-weight:600">⚠️ DP belum dibayar. Jadwal belum terkunci.</div>`;
    } 
    else if (i.status === 'Menunggu Pembayaran') { // Full
      actionBtn = `<button class="btn btn-primary" onclick="simulasiBayarCustomer('${i.id}','full')">Bayar Penuh (${formatRupiah(i.total)})</button>`;
      callout = `<div style="background:var(--red-light);color:var(--red);padding:10px;border-radius:6px;font-size:.85rem;margin-bottom:12px;font-weight:600">⚠️ Pembayaran belum dilakukan.</div>`;
    }
    else if (i.status === 'DP Terkonfirmasi') {
      // Tombol untuk bayar pelunasan (biasanya aktif setelah sesi atau saat sesi)
      actionBtn = `<button class="btn btn-warning" style="background:var(--amber);color:#fff" onclick="simulasiBayarCustomer('${i.id}','pelunasan')">Bayar Pelunasan (${formatRupiah(i.pelunasanAmount)})</button>`;
      callout = `<div style="background:var(--blue-light);color:var(--primary);padding:10px;border-radius:6px;font-size:.85rem;margin-bottom:12px">✅ Sesi telah terjadwal. Jangan lupa lakukan pelunasan.</div>`;
    }
    else if (i.status === 'Dibatalkan') {
      callout = `<div style="background:var(--gray-100);color:var(--gray-600);padding:10px;border-radius:6px;font-size:.85rem;margin-bottom:12px">🚫 Booking ini telah dibatalkan${i.alasanBatal?` — ${i.alasanBatal}`:''}. Slot jadwal sudah otomatis tersedia kembali.</div>`;
    }

    // Boleh dibatalkan sendiri oleh pelanggan selama belum LUNAS dan belum dibatalkan
    const cancelBtn = !['Lunas','Dibatalkan'].includes(i.status)
      ? `<button class="btn btn-danger" onclick="confirmCancelBooking('${i.id}')">🚫 Batalkan Booking</button>` : '';

    const itemStr = i.items.map(it=>`<div>${it.qty}x ${it.nama}</div>`).join('');
    const lokasiInfo = i.lokasi ? getLokasiById(i.lokasi) : null;

    const existingReview = i.status === 'Lunas' ? DB.getUlasanByInvoice(i.id) : null;
    let reviewBtn = '';
    if (i.status === 'Lunas') {
      reviewBtn = existingReview
        ? `<button class="btn btn-outline" onclick="showMyReview('${i.id}')">⭐ Lihat Ulasan Saya</button>`
        : `<button class="btn btn-warning" style="background:var(--amber);color:#fff" onclick="showReviewModal('${i.id}')">⭐ Beri Ulasan</button>`;
    }

    const c = createCard(`Invoice: ${i.id} <span style="float:right;font-size:.8rem;font-weight:normal;color:var(--gray-500)">Order: ${formatDate(i.tanggal)}</span>`, `
      ${callout}
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:.8rem;color:var(--gray-500);margin-bottom:4px">JADWAL SESI</div>
          <div style="font-weight:700;color:var(--navy);font-size:1.1rem">📅 ${formatDate(i.bookingDate)} <span class="slot-time-badge">${i.bookingTime}</span></div>
          ${lokasiInfo ? `<div style="font-size:.78rem;color:var(--gray-500);margin-top:4px">📍 ${lokasiInfo.nama} · <a href="${mapsUrlFor(lokasiInfo.alamat)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">🗺️ Lihat Maps</a></div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:.8rem;color:var(--gray-500);margin-bottom:4px">STATUS</div>
          <div>${statusBadge(i.status)}</div>
        </div>
      </div>
      <hr class="divider">
      <div class="pesanan-detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:.85rem">
        <div>
          <strong style="color:var(--gray-700)">Paket Dipesan:</strong><br>
          <div style="color:var(--gray-600);margin-top:4px">${itemStr}</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--gray-500)">Total Biaya</div>
          <strong style="font-size:1.2rem;color:var(--navy)">${formatRupiah(i.total)}</strong>
          <div style="color:var(--gray-500);margin-top:4px;font-size:.75rem">
            ${isDp ? `Sistem DP 50%<br>DP: ${formatRupiah(i.dpAmount)} | Pelunasan: ${formatRupiah(i.pelunasanAmount)}` : 'Pembayaran Penuh di Muka'}
          </div>
        </div>
      </div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="showInvoiceCustomer('${i.id}')">Lihat Detail</button>
        ${reviewBtn}
        ${cancelBtn}
        ${actionBtn}
      </div>
    `);
    grid.appendChild(c);
  });
  page.appendChild(grid);

  return page;
}

// Fungsi bintang rating pada modal "Beri Ulasan" HARUS berupa fungsi global (window.*)
// yang dipanggil lewat atribut onclick/onmouseenter langsung di HTML — bukan lewat tag
// <script> yang disisipkan via innerHTML, karena <script> yang ditambahkan dengan cara
// itu tidak akan pernah dieksekusi oleh browser.
// Rating default dimulai dari 0 (belum ada bintang terisi) — pelanggan boleh melewati
// pemberian rating bintang jika tidak ingin memberi rating, cukup isi komentar saja.
window.paintStars = (n) => {
  document.querySelectorAll('#starPicker .star-pick').forEach(s => {
    const v = +s.dataset.n;
    s.style.color = v <= n ? 'var(--amber)' : '#d1d5db';
  });
};
window.pickStar = (n) => {
  // Klik bintang yang sama dengan rating saat ini akan membatalkan pilihan (kembali ke 0)
  window.__reviewStars = (window.__reviewStars === n) ? 0 : n;
  window.paintStars(window.__reviewStars);
};
window.hoverStar = (n) => { window.paintStars(n); };
window.resetStarHover = () => { window.paintStars(window.__reviewStars || 0); };

window.showReviewModal = (invId) => {
  const i = DB.getInvoice(invId); if (!i) return;
  const lokasiOpts = LOKASI_STUDIO.map(l=>`<option value="${l.id}" ${i.lokasi===l.id?'selected':''}>${l.nama}</option>`).join('');
  const produkNama = i.items.map(it=>it.nama).join(', ');
  window.__reviewStars = 0;
  openModal(`
    <h2 class="modal-title">Beri Ulasan</h2>
    <p class="modal-sub">Invoice ${i.id} — ${produkNama}</p>
    <div class="form-group">
      <label>Rating <span style="font-weight:normal;color:var(--gray-400);font-size:.75rem">(opsional — lewati jika tidak ingin memberi rating bintang)</span></label>
      <div id="starPicker" style="font-size:1.8rem;letter-spacing:4px" onmouseleave="resetStarHover()">
        <span class="star-pick" data-n="1" style="cursor:pointer" onclick="pickStar(1)" onmouseenter="hoverStar(1)">★</span><span class="star-pick" data-n="2" style="cursor:pointer" onclick="pickStar(2)" onmouseenter="hoverStar(2)">★</span><span class="star-pick" data-n="3" style="cursor:pointer" onclick="pickStar(3)" onmouseenter="hoverStar(3)">★</span><span class="star-pick" data-n="4" style="cursor:pointer" onclick="pickStar(4)" onmouseenter="hoverStar(4)">★</span><span class="star-pick" data-n="5" style="cursor:pointer" onclick="pickStar(5)" onmouseenter="hoverStar(5)">★</span>
      </div>
    </div>
    <div class="form-group"><label>Lokasi Sesi</label>
      <select id="rvLokasi">${lokasiOpts}</select>
    </div>
    <div class="form-group"><label>Komentar Anda</label>
      <textarea id="rvKomentar" rows="3" placeholder="Bagaimana pengalaman foto Anda di studio kami?"></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="submitReview('${invId}')">Kirim Ulasan</button>
    </div>
  `);
  paintStars(0);
};

window.submitReview = (invId) => {
  const i = DB.getInvoice(invId); if (!i) return;
  const lokasi = document.getElementById('rvLokasi').value;
  const komentar = document.getElementById('rvKomentar').value.trim();
  const rating = window.__reviewStars || 0; // 0 = pelanggan memilih tidak memberi rating bintang
  if (!komentar) { showToast('Mohon isi komentar ulasan Anda!', 'error'); return; }
  const produkNama = i.items.map(it=>it.nama).join(', ');
  DB.addUlasan(currentUser.id, currentUser.name, invId, produkNama, lokasi, rating, komentar);
  closeModalBtn();
  showToast('Terima kasih atas ulasan Anda! ⭐', 'success');
  navigateTo('pesananSaya', document.querySelector('[data-page="pesananSaya"]'));
};

window.showMyReview = (invId) => {
  const r = DB.getUlasanByInvoice(invId); if (!r) return;
  openModal(`
    <h2 class="modal-title">Ulasan Anda</h2>
    <p class="modal-sub">Invoice ${r.invoiceId} — ${r.produk}</p>
    <div style="font-size:1.6rem;color:var(--amber);margin-bottom:10px">${r.rating>0 ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating) : '<span style=\'color:var(--gray-400);font-weight:normal\'>Tanpa rating bintang</span>'}</div>
    <div style="background:var(--gray-50);border-radius:8px;padding:14px;font-size:.9rem;color:var(--gray-700);margin-bottom:16px">${r.komentar}</div>
    <div style="font-size:.78rem;color:var(--gray-400)">📍 ${getLokasiById(r.lokasi).nama} · ${formatDate(r.tanggal)}</div>
    <button class="btn btn-secondary btn-full" style="margin-top:16px" onclick="closeModalBtn()">Tutup</button>
  `);
};

window.simulasiBayarCustomer = (invId, type) => {
  const i = DB.getInvoice(invId); if(!i)return;
  const am = type==='dp'?i.dpAmount : type==='pelunasan'?i.pelunasanAmount : i.total;
  const showMetodePicker = type === 'pelunasan'; // dropdown metode HANYA untuk pelunasan, bukan DP/pembayaran penuh
  const metodeOpts = ['Transfer BCA','Transfer Mandiri','Transfer BNI','QRIS','Cash / Tunai di Studio']
    .map(m => `<option value="${m}" ${m===i.metodePembayaran?'selected':''}>${m}</option>`).join('');

  openModal(`
    <h2 class="modal-title">Simulasi Pembayaran</h2>
    <p class="modal-sub">Invoice <strong>${i.id}</strong>${type==='pelunasan' ? ' — Pelunasan' : type==='dp' ? ' — Uang Muka (DP 50%)' : ''}</p>
    <div style="background:var(--gray-50);padding:16px;border-radius:8px;text-align:center;margin-bottom:16px">
      <div style="font-size:.85rem;color:var(--gray-500)">Jumlah yang harus dibayar</div>
      <div style="font-size:1.8rem;font-weight:800;color:var(--navy);margin:4px 0">${formatRupiah(am)}</div>
      ${!showMetodePicker ? `<div style="font-size:.8rem;color:var(--gray-600)">Metode: ${i.metodePembayaran||'Transfer'}</div>` : ''}
    </div>
    ${showMetodePicker ? `
    <div class="form-group">
      <label>Pilih Metode Pembayaran</label>
      <select id="bayarMetode" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--gray-300)">
        ${metodeOpts}
      </select>
    </div>` : ''}
    <p style="font-size:.85rem;color:var(--gray-600);margin:16px 0;text-align:center">
      Klik tombol di bawah untuk mensimulasikan bahwa Anda telah melakukan pembayaran${showMetodePicker ? ' sesuai metode yang dipilih' : ' ke rekening/QRIS studio'}.
    </p>
    <button class="btn btn-primary btn-full" onclick="prosesBayar('${invId}','${type}')">Saya Sudah Transfer / Bayar</button>
  `);
};

window.prosesBayar = (id, type) => {
  const metodeEl = document.getElementById('bayarMetode');
  const metode = metodeEl ? metodeEl.value : undefined;
  if(type==='dp') DB.payDP(id, metode);
  else if(type==='pelunasan') DB.payPelunasan(id, metode);
  else DB.payFull(id, metode);
  closeModalBtn();
  showToast('Bukti pembayaran terkirim! Menunggu konfirmasi admin.','success');
  navigateTo('pesananSaya', document.querySelector('[data-page="pesananSaya"]'));
};

window.showInvoiceCustomer = (id) => {
  const i = DB.getInvoice(id); if(!i)return;
  openModal(`
    <h2 class="modal-title">Invoice ${i.id}</h2>
    <div style="margin-bottom:16px">${statusBadge(i.status)}</div>
    <div class="info-grid" style="margin-bottom:20px">
      <div class="info-item"><span class="info-label">Tanggal Booking</span><span class="info-value">${formatDate(i.tanggal)}</span></div>
      <div class="info-item"><span class="info-label">Jadwal Sesi</span><span class="info-value">${formatDate(i.bookingDate)} Pkl. ${i.bookingTime}</span></div>
      <div class="info-item"><span class="info-label">Lokasi Studio</span><span class="info-value">${i.lokasi ? getLokasiById(i.lokasi).nama+` <a href="${mapsUrlFor(getLokasiById(i.lokasi).alamat)}" target="_blank" rel="noopener" style="font-size:.75rem">🗺️ Maps</a>` : '-'}</span></div>
      <div class="info-item"><span class="info-label">Metode Bayar</span><span class="info-value">${i.metodePembayaran||'-'}${i.metodePelunasan?` <span style="color:var(--gray-400);font-weight:normal">(DP) · Pelunasan: ${i.metodePelunasan}</span>`:''}</span></div>
      <div class="info-item"><span class="info-label">Total</span><span class="info-value">${formatRupiah(i.total)}</span></div>
    </div>
    <div style="background:var(--gray-50);padding:12px;border-radius:6px;font-size:.85rem;margin-bottom:20px">
      <strong style="display:block;margin-bottom:6px">Paket:</strong>
      ${i.items.map(it=>`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>${it.qty}x ${it.nama}</span><span>${formatRupiah(it.harga*it.qty)}</span></div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-full" onclick="closeModalBtn()">Tutup</button>
  `);
}

// ---- BATALKAN BOOKING (PELANGGAN) ----
window.confirmCancelBooking = (invId) => {
  const i = DB.getInvoice(invId); if (!i) return;
  openModal(`
    <h2 class="modal-title">Batalkan Booking?</h2>
    <p style="color:var(--gray-600);margin-bottom:16px">
      Anda akan membatalkan booking <strong>${i.id}</strong> untuk sesi
      <strong>${formatDate(i.bookingDate)} Pkl. ${i.bookingTime}</strong>.
      Slot jam tersebut akan <strong>otomatis tersedia kembali</strong> untuk pelanggan lain.
      Tindakan ini tidak dapat dibatalkan.
    </p>
    <div class="form-group">
      <label>Alasan pembatalan (opsional)</label>
      <textarea id="cancelAlasanCust" rows="2" placeholder="Contoh: berhalangan hadir, ganti jadwal, dll."></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Tutup</button>
      <button class="btn btn-danger" style="flex:1" onclick="doCancelBookingCustomer('${invId}')">Ya, Batalkan</button>
    </div>`);
};

window.doCancelBookingCustomer = (invId) => {
  const alasanEl = document.getElementById('cancelAlasanCust');
  const ok = DB.cancelBooking(invId, alasanEl ? alasanEl.value : '', 'customer');
  closeModalBtn();
  if (ok) {
    showToast('Booking dibatalkan. Slot jadwal otomatis tersedia kembali ✓','success');
    navigateTo('pesananSaya', document.querySelector('[data-page="pesananSaya"]'));
  } else {
    showToast('Booking tidak dapat dibatalkan (status sudah LUNAS/Dibatalkan).','error');
  }
};

// ═══════════════════════════════════════════════════════════
//  POIN LOYALITAS
// ═══════════════════════════════════════════════════════════
function renderPoinSaya() {
  const c = DB.getCustomer(currentUser.id);
  const page = createPage('Poin Loyalitas', 'Kumpulkan poin untuk berbagai keuntungan');

  const loyaltyCard = document.createElement('div');
  loyaltyCard.className = 'loyalty-card';
  loyaltyCard.innerHTML = `
      <div class="loyalty-name">${c.nama}</div>
      <div class="loyalty-points">${c.poin} <span style="font-size:1.5rem">⭐</span></div>
      <div class="loyalty-pts-label">Poin Anda saat ini</div>
      <div class="loyalty-status-badge">${c.status}</div>
    `;
  page.appendChild(loyaltyCard);

  const infoHtml = `
    <h3 style="font-size:1rem;color:var(--navy);margin-bottom:12px">Cara Mendapatkan Poin</h3>
    <ul style="list-style:disc;padding-left:20px;font-size:.85rem;color:var(--gray-700);margin-bottom:20px;line-height:1.6">
      <li>Anda mendapatkan <strong>1 Poin</strong> untuk setiap transaksi <strong>Rp 10.000</strong>.</li>
      <li>Poin otomatis masuk ke akun Anda setelah status transaksi <strong>LUNAS</strong>.</li>
      <li>Poin tidak hangus dan dapat diakumulasikan.</li>
    </ul>
    
    <h3 style="font-size:1rem;color:var(--navy);margin-bottom:12px">Tingkat Membership</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="padding:12px;border:1px solid var(--gray-200);border-radius:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <strong>Loyal Customer</strong> <span class="badge badge-navy">150+ Poin</span>
        </div>
        <div style="font-size:.8rem;color:var(--gray-500)">Prioritas booking, gratis cetak foto tambahan, diskon spesial.</div>
      </div>
      <div style="padding:12px;border:1px solid var(--gray-200);border-radius:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <strong>Active Customer</strong> <span class="badge badge-blue">1 - 149 Poin</span>
        </div>
        <div style="font-size:.8rem;color:var(--gray-500)">Member reguler E-CRM Studio.</div>
      </div>
    </div>
  `;
  page.appendChild(createCard('Informasi Program Loyalitas', infoHtml));
  return page;
}

// ═══════════════════════════════════════════════════════════
//  PROFIL SAYA
// ═══════════════════════════════════════════════════════════
function renderProfilSaya() {
  const c = DB.getCustomer(currentUser.id);
  const page = createPage('Profil Saya', 'Informasi akun Anda');

  const html = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div class="user-avatar" style="width:64px;height:64px;font-size:2rem">${c.nama[0]}</div>
      <div>
        <h2 style="margin:0 0 4px;font-size:1.4rem;color:var(--navy)">${c.nama}</h2>
        <div style="font-size:.9rem;color:var(--gray-500)">ID: ${c.id}</div>
      </div>
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="text" value="${c.email}" readonly style="background:var(--gray-50);color:var(--gray-600)" />
    </div>
    <div class="form-group">
      <label>No. WhatsApp / HP</label>
      <input type="text" value="${c.hp}" readonly style="background:var(--gray-50);color:var(--gray-600)" />
    </div>
    <div class="form-group">
      <label>Status Membership</label>
      <div style="padding:10px 0">${customerStatusBadge(c.status)}</div>
    </div>
  `;
  page.appendChild(createCard('Data Pribadi', html));
  return page;
}

