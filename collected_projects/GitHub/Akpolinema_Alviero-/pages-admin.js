/* ===== pages-admin.js ===== */
/* ============================================================
   E-CRM Studio — pages-admin.js
   Semua halaman Admin
   ============================================================ */

'use strict';

// ═══════════════════════════════════════════════════════════
//  DASHBOARD ADMIN
// ═══════════════════════════════════════════════════════════
function renderAdminDashboard() {
  const page = createPage('Dashboard', 'Ringkasan seluruh modul studio foto dalam satu tampilan interaktif');

  const invs   = DB.getInvoices();
  const custs  = DB.getCustomers();
  const kas    = DB.getKas();
  const lunas  = invs.filter(i => i.status === 'Lunas');
  const perluAksi = invs.filter(i => ['Menunggu Konfirmasi DP','Menunggu Konfirmasi Pelunasan','Menunggu Konfirmasi'].includes(i.status));

  const totalPenjualan = lunas.reduce((s,i)=>s+i.total,0);
  const totalKas       = kas.reduce((s,k)=>s+k.jumlah,0);

  // ── KPI RINGKAS (klik untuk lompat ke modul terkait) ──
  const kg = kpiGrid(
    createKpiCard('👥','Total Pelanggan', custs.length, `${custs.filter(c=>c.status==='Loyal Customer').length} loyal customer`, '#2255C4','#e8effc'),
    createKpiCard('🧾','Total Pesanan',   invs.length,  `${lunas.length} lunas`, '#F59E0B','#FEF3C7'),
    createKpiCard('📸','Total Penjualan', formatRupiah(totalPenjualan), 'Dari transaksi lunas', '#1DB954','#e6f9ee'),
    createKpiCard('💰','Penerimaan Kas',  formatRupiah(totalKas),       'Kas telah masuk', '#D7263D','#fde8eb')
  );
  ['dataPelanggan','pesananInvoice','laporan','penerimaanKas'].forEach((pg,idx)=>{
    const card = kg.children[idx];
    card.style.cursor = 'pointer';
    card.title = 'Klik untuk melihat detail';
    card.onclick = () => navigateTo(pg, document.querySelector(`[data-page="${pg}"]`));
  });
  page.appendChild(kg);

  // Alert perlu aksi
  if (perluAksi.length > 0) {
    const alert = document.createElement('div');
    alert.className = 'alert-info';
    alert.innerHTML = `<span>🔔</span> <strong>${perluAksi.length} transaksi</strong> menunggu konfirmasi pembayaran. <a href="#" onclick="navigateTo('pembayaran',document.querySelector('[data-page=pembayaran]'));return false;">Lihat Pembayaran →</a>`;
    page.appendChild(alert);
  }

  // ── PANEL FILTER & ANALITIK INTERAKTIF ──
  const analyticsCard = document.createElement('div');
  analyticsCard.className = 'card';
  analyticsCard.style.marginBottom = '16px';
  const kategoriOpts = ['Semua', ...new Set(DB.getProducts().map(p=>p.kategori))];
  analyticsCard.innerHTML = `
    <div class="card-header">
      <span class="card-title">📊 Analitik Penjualan & Pelanggan</span>
      <button class="btn btn-outline btn-sm" onclick="exportDashboardPDF()">🖨️ Export PDF</button>
    </div>
    <div class="card-body">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">
        <input type="text" id="dashSearch" placeholder="🔍 Cari invoice / nama pelanggan..." style="flex:1;min-width:200px;padding:9px 12px;border-radius:6px;border:1px solid var(--gray-300)">
        <select id="dashKategori" style="padding:9px;border-radius:6px;border:1px solid var(--gray-300)">
          ${kategoriOpts.map(k=>`<option value="${k}">${k==='Semua'?'Semua Jenis Foto':k}</option>`).join('')}
        </select>
        <select id="dashPeriode" style="padding:9px;border-radius:6px;border:1px solid var(--gray-300)">
          <option value="harian">Per Tanggal (Harian)</option>
          <option value="bulanan" selected>Per Bulan</option>
          <option value="tahunan">Per Tahun</option>
        </select>
        <input type="date" id="dashDari" style="padding:8px;border-radius:6px;border:1px solid var(--gray-300)" title="Dari tanggal">
        <input type="date" id="dashSampai" style="padding:8px;border-radius:6px;border:1px solid var(--gray-300)" title="Sampai tanggal">
        <button class="btn btn-primary btn-sm" onclick="updateDashboardAnalytics()">Terapkan Filter</button>
      </div>

      <div class="dash-charts-grid" style="display:grid;grid-template-columns:1.3fr 1fr;gap:20px;margin-bottom:20px">
        <div>
          <div style="font-size:.82rem;font-weight:700;color:var(--navy);margin-bottom:8px">📈 Grafik Penjualan</div>
          <div style="position:relative;height:260px"><canvas id="chartPenjualan"></canvas></div>
        </div>
        <div>
          <div style="font-size:.82rem;font-weight:700;color:var(--navy);margin-bottom:8px">👥 Grafik Pelanggan (Top Belanja)</div>
          <div style="position:relative;height:260px"><canvas id="chartPelanggan"></canvas></div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="font-size:.82rem;font-weight:700;color:var(--navy)">🧾 Daftar Transaksi (sesuai filter)</div>
        <div style="font-size:.78rem;color:var(--gray-500)">Klik judul kolom untuk mengurutkan</div>
      </div>
      <div class="table-wrap" id="dashTableWrap"></div>
    </div>`;
  page.appendChild(analyticsCard);

  // ── ULASAN PELANGGAN TERBARU (terintegrasi & real-time dari input pelanggan) ──
  const ulasanAll = [...DB.getUlasan()].sort((a,b)=>b.id.localeCompare(a.id));
  const avgRatingAdmin = DB.getAvgRating();
  const ulasanCardAdmin = document.createElement('div');
  ulasanCardAdmin.className = 'card';
  ulasanCardAdmin.style.marginBottom = '16px';
  ulasanCardAdmin.innerHTML = `
    <div class="card-header">
      <span class="card-title">⭐ Ulasan Pelanggan ${ulasanAll.length ? `<span style="font-size:.78rem;font-weight:normal;color:var(--gray-500)">(Rata-rata ${avgRatingAdmin.toFixed(1)}/5 dari ${ulasanAll.length} ulasan)</span>` : ''}</span>
    </div>
    <div class="card-body">
      ${ulasanAll.length === 0
        ? `<div style="color:var(--gray-400);font-size:.85rem;text-align:center;padding:16px">Belum ada ulasan masuk dari pelanggan.</div>`
        : `<div class="table-wrap"><table>
            <thead><tr><th>Pelanggan</th><th>Invoice</th><th>Paket</th><th>Lokasi</th><th>Rating</th><th>Komentar</th><th>Tanggal</th></tr></thead>
            <tbody>
              ${ulasanAll.slice(0,15).map(r=>`<tr>
                <td>${r.customerNama}</td>
                <td><span class="id-tag">${r.invoiceId}</span></td>
                <td style="font-size:.8rem">${r.produk}</td>
                <td style="font-size:.78rem">${getLokasiById(r.lokasi).nama}</td>
                <td style="color:var(--amber);white-space:nowrap">${r.rating>0 ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating) : '<span style=\'color:var(--gray-400);font-weight:normal\'>Tanpa rating bintang</span>'}</td>
                <td style="max-width:220px;font-size:.8rem;color:var(--gray-600)">${r.komentar}</td>
                <td style="font-size:.78rem;color:var(--gray-500)">${formatDate(r.tanggal)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
    </div>`;
  page.appendChild(ulasanCardAdmin);

  // Flow chart + Jadwal hari ini side by side
  const twoCol = document.createElement('div');
  twoCol.className = 'dash-flow-grid';
  twoCol.style.cssText = 'display:grid;grid-template-columns:220px 1fr;gap:16px;margin-bottom:16px';

  const flowCard = document.createElement('div');
  flowCard.className = 'card';
  flowCard.innerHTML = `<div class="card-header"><span class="card-title">Alur Sistem</span></div>
  <div class="flow-chart">
    <div class="flow-step"><div class="flow-box">👤 Pelanggan</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">📅 Booking Jadwal</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">🛒 Pilih Paket</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">🧾 Invoice</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">💳 DP 50%</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">✅ Sesi Foto</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">💳 Pelunasan</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box">💰 Penerimaan Kas</div><div class="flow-arrow">↓</div></div>
    <div class="flow-step"><div class="flow-box flow-ecrm">🎯 Update E-CRM</div></div>
  </div>`;
  twoCol.appendChild(flowCard);

  // Jadwal hari ini
  const today = new Date().toISOString().slice(0,10);
  const todayBookings = invs.filter(i => i.bookingDate === today);
  let bRows = todayBookings.map(i=>`<tr>
    <td><span class="slot-time-badge">${i.bookingTime}</span></td>
    <td><strong>${i.customerNama}</strong></td>
    <td>${i.items.map(x=>x.nama).join(', ')}</td>
    <td>${statusBadge(i.status)}</td>
  </tr>`).join('');
  const todayCard = document.createElement('div');
  todayCard.className = 'card';
  todayCard.innerHTML = `<div class="card-header"><span class="card-title">📅 Jadwal Sesi Hari Ini</span></div>
    <div class="card-body">
      <div class="table-wrap"><table>
        <thead><tr><th>Jam</th><th>Pelanggan</th><th>Paket</th><th>Status</th></tr></thead>
        <tbody>${bRows||'<tr><td colspan="4" style="text-align:center;color:#aaa">Tidak ada jadwal sesi hari ini</td></tr>'}</tbody>
      </table></div>
    </div>`;
  twoCol.appendChild(todayCard);
  page.appendChild(twoCol);

  // ── LOGIKA INTERAKTIF DASHBOARD ──
  window.dashSortKey = window.dashSortKey || 'tanggal';
  window.dashSortDir = window.dashSortDir || 'desc';
  window.dashChartPenjualan = null;
  window.dashChartPelanggan = null;

  window.getDashboardFilteredInvoices = () => {
    const search  = (document.getElementById('dashSearch')?.value || '').toLowerCase();
    const kategori= document.getElementById('dashKategori')?.value || 'Semua';
    const dari    = document.getElementById('dashDari')?.value;
    const sampai  = document.getElementById('dashSampai')?.value;
    let list = DB.getInvoices();
    if (search) list = list.filter(i => i.customerNama.toLowerCase().includes(search) || i.id.toLowerCase().includes(search));
    if (kategori !== 'Semua') list = list.filter(i => i.items.some(it => { const p = DB.getProduct(it.produkId); return p && p.kategori === kategori; }));
    if (dari)   list = list.filter(i => i.tanggal >= dari);
    if (sampai) list = list.filter(i => i.tanggal <= sampai);
    return list;
  };

  window.groupInvoicesByPeriode = (list, periode) => {
    const map = {};
    list.forEach(i => {
      let key;
      if (periode === 'harian') key = i.tanggal;
      else if (periode === 'tahunan') key = i.tanggal.slice(0,4);
      else key = i.tanggal.slice(0,7);
      if (!map[key]) map[key] = { revenue:0, count:0 };
      map[key].count++;
      if (i.status === 'Lunas') map[key].revenue += i.total;
    });
    const keys = Object.keys(map).sort();
    return { labels: keys, revenue: keys.map(k=>map[k].revenue), count: keys.map(k=>map[k].count) };
  };

  window.topCustomersFromInvoices = (list, n=6) => {
    const map = {};
    list.filter(i=>i.status==='Lunas').forEach(i => { map[i.customerNama] = (map[i.customerNama]||0) + i.total; });
    const arr = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n);
    return { labels: arr.map(a=>a[0]), data: arr.map(a=>a[1]) };
  };

  window.renderDashboardTable = (list) => {
    let rows = [...list];
    const key = window.dashSortKey, dir = window.dashSortDir;
    rows.sort((a,b) => {
      let va, vb;
      if (key === 'nama') { va=a.customerNama.toLowerCase(); vb=b.customerNama.toLowerCase(); return dir==='asc'? va.localeCompare(vb) : vb.localeCompare(va); }
      if (key === 'total') { va=a.total; vb=b.total; return dir==='asc'? va-vb : vb-va; }
      va = a.tanggal; vb = b.tanggal;
      return dir==='asc'? va.localeCompare(vb) : vb.localeCompare(va);
    });
    const arrow = (k) => window.dashSortKey===k ? (window.dashSortDir==='asc'?' ▲':' ▼') : '';
    const trows = rows.slice(0,25).map(i => {
      const kats = [...new Set(i.items.map(it=>DB.getProduct(it.produkId)?.kategori).filter(Boolean))];
      return `<tr>
        <td><strong>${i.id}</strong></td>
        <td>${i.customerNama}</td>
        <td>${formatDate(i.tanggal)}</td>
        <td>${kats.map(k=>`<span class="badge badge-gray" style="font-size:.62rem">${k}</span>`).join(' ')}</td>
        <td class="text-right">${formatRupiah(i.total)}</td>
        <td>${statusBadge(i.status)}</td>
      </tr>`;
    }).join('');
    document.getElementById('dashTableWrap').innerHTML = `<table>
      <thead><tr>
        <th>Invoice</th>
        <th style="cursor:pointer" onclick="sortDashboardTable('nama')">Pelanggan${arrow('nama')}</th>
        <th style="cursor:pointer" onclick="sortDashboardTable('tanggal')">Tanggal${arrow('tanggal')}</th>
        <th>Jenis Foto</th>
        <th class="text-right" style="cursor:pointer" onclick="sortDashboardTable('total')">Total${arrow('total')}</th>
        <th>Status</th>
      </tr></thead>
      <tbody>${trows || '<tr><td colspan="6" style="text-align:center;color:#aaa">Tidak ada transaksi sesuai filter</td></tr>'}</tbody>
    </table>
    <div style="font-size:.75rem;color:var(--gray-400);padding:8px 4px">Menampilkan ${Math.min(rows.length,25)} dari ${rows.length} transaksi terfilter</div>`;
  };

  window.sortDashboardTable = (key) => {
    if (window.dashSortKey === key) window.dashSortDir = window.dashSortDir==='asc'?'desc':'asc';
    else { window.dashSortKey = key; window.dashSortDir = 'asc'; }
    window.renderDashboardTable(window.getDashboardFilteredInvoices());
  };

  window.updateDashboardAnalytics = () => {
    const list = window.getDashboardFilteredInvoices();
    const periode = document.getElementById('dashPeriode')?.value || 'bulanan';
    const grouped = window.groupInvoicesByPeriode(list, periode);
    const top = window.topCustomersFromInvoices(list);

    // Render tabel transaksi DULUAN & terpisah, supaya tetap tampil
    // walaupun proses menggambar grafik di bawah gagal/error.
    window.renderDashboardTable(list);

    const ctx1 = document.getElementById('chartPenjualan');
    const ctx2 = document.getElementById('chartPelanggan');

    // ── GRAFIK PENJUALAN ──
    try {
      if (typeof Chart === 'undefined' || !ctx1 || ctx1.tagName !== 'CANVAS') throw new Error('Chart.js/canvas tidak tersedia');
      if (window.dashChartPenjualan) window.dashChartPenjualan.destroy();
      window.dashChartPenjualan = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: grouped.labels,
          datasets: [{
            label: 'Pendapatan (Rp)', data: grouped.revenue,
            borderColor:'#2255C4', backgroundColor:'rgba(34,85,196,0.12)',
            tension:.3, fill:true, pointRadius:3
          }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>formatRupiah(c.raw) } } },
          scales:{ y:{ ticks:{ callback:(v)=>formatRupiah(v) } } }
        }
      });
    } catch (err) {
      // Fallback: gambar grafik sendiri pakai SVG, tidak butuh internet/CDN
      window.dashChartPenjualan = null;
      if (ctx1?.parentElement) {
        const holder = document.createElement('div');
        holder.id = 'chartPenjualan';
        holder.style.cssText = 'width:100%;height:100%';
        ctx1.parentElement.replaceChildren(holder);
        renderLineChartSVG(holder, grouped.labels, grouped.revenue);
      }
    }

    // ── GRAFIK PELANGGAN (TOP BELANJA) ──
    try {
      if (typeof Chart === 'undefined' || !ctx2 || ctx2.tagName !== 'CANVAS') throw new Error('Chart.js/canvas tidak tersedia');
      if (window.dashChartPelanggan) window.dashChartPelanggan.destroy();
      window.dashChartPelanggan = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: top.labels.length?top.labels:['Belum ada data'],
          datasets: [{ label:'Total Belanja (Rp)', data: top.data.length?top.data:[0], backgroundColor:'#1DB954', borderRadius:6 }]
        },
        options: {
          indexAxis:'y', responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>formatRupiah(c.raw) } } },
          scales:{ x:{ ticks:{ callback:(v)=>formatRupiah(v) } } }
        }
      });
    } catch (err) {
      window.dashChartPelanggan = null;
      if (ctx2?.parentElement) {
        const holder = document.createElement('div');
        holder.id = 'chartPelanggan';
        holder.style.cssText = 'width:100%;height:100%';
        ctx2.parentElement.replaceChildren(holder);
        renderBarChartSVG(holder, top.labels, top.data);
      }
    }
  };

  // Live search & filter tanpa perlu klik tombol
  setTimeout(() => {
    ['dashSearch','dashKategori','dashPeriode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(id==='dashSearch'?'input':'change', updateDashboardAnalytics);
    });
    updateDashboardAnalytics();
  }, 0);

  return page;
}

window.exportDashboardPDF = () => {
  const doc = newPDF('landscape');
  doc.setFontSize(16); doc.text('Dashboard E-CRM Studio', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), 14, 21);

  let y = 28;
  if (window.dashChartPenjualan) {
    doc.setFontSize(10); doc.text('Grafik Penjualan', 14, y);
    doc.addImage(window.dashChartPenjualan.toBase64Image(), 'PNG', 14, y+3, 125, 60);
  }
  if (window.dashChartPelanggan) {
    doc.setFontSize(10); doc.text('Grafik Pelanggan (Top Belanja)', 150, y);
    doc.addImage(window.dashChartPelanggan.toBase64Image(), 'PNG', 150, y+3, 125, 60);
  }
  y += 70;

  const list = window.getDashboardFilteredInvoices ? window.getDashboardFilteredInvoices() : DB.getInvoices();
  const rows = list.map(i => [i.id, i.customerNama, formatDate(i.tanggal), formatRupiah(i.total), i.status]);
  doc.autoTable({ startY:y, head:[['Invoice','Pelanggan','Tanggal','Total','Status']], body: rows, styles:{fontSize:8} });
  doc.save('dashboard-ecrm-'+new Date().toISOString().slice(0,10)+'.pdf');
};

// ═══════════════════════════════════════════════════════════
//  DATA PELANGGAN
// ═══════════════════════════════════════════════════════════

// Helper konversi string nomor HP ke URL WhatsApp (https://wa.me/628...)
function formatWaUrl(phone) {
  if (!phone) return '';
  let str = String(phone).trim();
  // Hapus semua karakter spasi, strip (-), dan titik (.)
  str = str.replace(/[\s\-\.]/g, '');
  // Hapus karakter '+' di awal jika ada
  str = str.replace(/^\+/, '');
  // Jika nomor diawali dengan angka 0 (contoh: 08...), ubah otomatis angka 0 di depan menjadi 62
  if (str.startsWith('0')) {
    str = '62' + str.slice(1);
  } else if (str.startsWith('8')) {
    str = '62' + str;
  }
  // Pastikan hanya karakter digit
  str = str.replace(/\D/g, '');
  return str ? `https://wa.me/${str}` : '';
}
window.formatWaUrl = formatWaUrl;

// Helper render teks nomor HP yang dibungkus tag <a> ke WhatsApp dengan target="_blank"
function renderCustomerPhoneLink(phone) {
  if (!phone || String(phone).trim() === '' || String(phone).trim() === '-') {
    return '<span style="color:var(--gray-400)">-</span>';
  }
  const displayText = String(phone).trim();
  const waUrl = formatWaUrl(displayText);
  if (!waUrl) {
    return displayText;
  }
  return `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:5px;transition:opacity .15s" onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'" title="Chat WhatsApp: ${displayText}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    <span>${displayText}</span>
  </a>`;
}
window.renderCustomerPhoneLink = renderCustomerPhoneLink;

function renderDataPelanggan() {
  const page = createPage('Data Pelanggan','Kelola data master pelanggan studio');
  const custs = DB.getCustomers();

  const addBtn = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto">
    <button class="btn btn-primary btn-sm" onclick="showAddCustomerModal()">+ Tambah Pelanggan</button>
    <input type="file" id="importCustomerFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleImportCustomers(event)">
    <button class="btn btn-outline btn-sm" onclick="document.getElementById('importCustomerFile').click()">📥 Import Excel</button>
    <button class="btn btn-outline btn-sm" onclick="exportCustomersExcel()">📤 Export Excel</button>
    <button class="btn btn-outline btn-sm" onclick="exportCustomersPDF()">📄 Export PDF</button>
  </div>`;

  let rows = custs.map(c => `<tr>
    <td><span class="id-tag">${c.id}</span></td>
    <td><strong>${c.nama}</strong></td>
    <td>${c.email}</td>
    <td>${renderCustomerPhoneLink(c.hp)}</td>
    <td style="text-align:center"><span class="badge badge-gray">${c.totalPesanan||0} pesanan</span></td>
    <td class="text-right">${formatRupiah(c.totalBelanja)}</td>
    <td><strong>${c.poin}</strong> poin</td>
    <td>${customerStatusBadge(c.status)}</td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="showCrmModal('${c.id}')">🎯 CRM</button>
      <button class="btn btn-icon btn-sm" onclick="deleteCustomerConfirm('${c.id}')" title="Hapus">🗑</button>
    </td>
  </tr>`).join('');

  page.appendChild(createCard('Daftar Pelanggan', `
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>No. HP</th><th style="text-align:center">Jumlah Pesanan</th><th class="text-right">Total Belanja</th><th>Poin</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="9" style="text-align:center;color:#aaa">Belum ada data</td></tr>'}</tbody>
    </table></div>`, addBtn));
  return page;
}

window.handleImportCustomers = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type:'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      let count = 0;
      json.forEach(row => {
        const nama = row.nama || row.Nama || row.NAMA;
        const email = row.email || row.Email || row.EMAIL;
        const hp = row.hp || row.HP || row['No. HP'] || '';
        if (nama && email) { DB.addCustomer(nama, email, hp); count++; }
      });
      showToast(`${count} pelanggan berhasil diimpor dari Excel ✓`, 'success');
      navigateTo('dataPelanggan', document.querySelector('[data-page="dataPelanggan"]'));
    } catch (err) {
      showToast('Gagal membaca file Excel.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
};

window.exportCustomersExcel = () => {
  const custs = DB.getCustomers();
  const rows = custs.map(c => ({
    ID: c.id,
    Nama: c.nama,
    Email: c.email || '-',
    'No. HP': c.hp || '-',
    'Jumlah Pesanan': c.totalPesanan || 0,
    'Total Belanja': c.totalBelanja,
    'Poin Loyalitas': c.poin,
    Status: c.status
  }));
  downloadExcel('data-pelanggan.xlsx', rows, 'Data Pelanggan');
};

window.exportCustomersPDF = () => {
  const doc = newPDF();
  doc.setFontSize(14); doc.text('Daftar Pelanggan - E-CRM Studio', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const custs = DB.getCustomers();
  const rows = custs.map(c=>[c.id,c.nama,c.email,c.hp,c.totalPesanan||0,formatRupiah(c.totalBelanja),c.poin,c.status]);
  doc.autoTable({ startY:26, head:[['ID','Nama','Email','No. HP','Pesanan','Total Belanja','Poin','Status']], body: rows, styles:{fontSize:8} });
  doc.save('data-pelanggan.pdf');
};

function showAddCustomerModal() {
  openModal(`
    <h2 class="modal-title">Tambah Pelanggan Baru</h2>
    <p class="modal-sub">Isi data pelanggan baru</p>
    <div class="form-group"><label>Nama Lengkap</label><input type="text" id="newCustNama" placeholder="Contoh: Reza Pratama" /></div>
    <div class="form-group"><label>Email</label><input type="email" id="newCustEmail" placeholder="email@contoh.com" /></div>
    <div class="form-group"><label>No. HP / WhatsApp</label><input type="text" id="newCustHp" placeholder="08xxxxxxxxxx" /></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveNewCustomer()">Simpan Pelanggan</button>
    </div>`);
}

function saveNewCustomer() {
  const nama  = document.getElementById('newCustNama').value.trim();
  const email = document.getElementById('newCustEmail').value.trim();
  const hp    = document.getElementById('newCustHp').value.trim();
  if (!nama || !email) { showToast('Nama dan email wajib diisi!','error'); return; }
  DB.addCustomer(nama, email, hp);
  closeModalBtn();
  showToast(`Pelanggan "${nama}" berhasil ditambahkan ✓`,'success');
  navigateTo('dataPelanggan', document.querySelector('[data-page="dataPelanggan"]'));
}

function deleteCustomerConfirm(id) {
  const c = DB.getCustomer(id);
  if (!c) return;
  openModal(`
    <h2 class="modal-title">Hapus Pelanggan?</h2>
    <p style="color:var(--gray-600);margin-bottom:20px">Anda akan menghapus data <strong>${c.nama}</strong>. Tindakan ini tidak dapat dibatalkan.</p>
    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-danger" style="flex:1" onclick="doDeleteCustomer('${id}')">Hapus</button>
    </div>`);
}
function doDeleteCustomer(id) {
  DB.deleteCustomer(id); closeModalBtn();
  showToast('Data pelanggan dihapus.','');
  navigateTo('dataPelanggan', document.querySelector('[data-page="dataPelanggan"]'));
}

// ═══════════════════════════════════════════════════════════
//  DATA PRODUK
// ═══════════════════════════════════════════════════════════
function renderDataProduk() {
  const page  = createPage('Data Produk & Harga','Kelola paket layanan foto studio');
  const prods = DB.getProducts();

  // Group by kategori
  const groups = {};
  prods.forEach(p => { if(!groups[p.kategori]) groups[p.kategori]=[]; groups[p.kategori].push(p); });
  const katList = Object.keys(groups);

  // ── KELOLA JENIS PRODUK (KATEGORI) — punya foto sendiri, terpisah dari
  // foto tiap paket. Foto Jenis Produk ini yang dipakai sebagai foto utama
  // kartu jenis produk di Katalog pelanggan. Bisa ditambah jenis baru dan
  // foto langsung tersimpan & muncul. ──
  const allCats = DB.getCategories();
  // Sinkronkan kalau ada kategori dari produk yang belum tercatat di DB.categories
  katList.forEach(k => { if (!allCats.find(c=>c.nama===k)) DB.ensureCategory(k); });
  const catsToShow = DB.getCategories();

  const katCardBody = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:14px">
      ${catsToShow.map(c => {
        const jumlah = groups[c.nama] ? groups[c.nama].length : 0;
        return `
        <div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px;text-align:center">
          ${c.foto
            ? `<img src="${c.foto}" alt="${c.nama}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:8px">`
            : `<div style="width:100%;height:90px;border-radius:8px;background:var(--gray-50);border:1px dashed var(--gray-300);display:flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:8px">${c.icon}</div>`}
          <div style="font-weight:700;color:var(--navy);font-size:.85rem">${c.nama}</div>
          <div style="font-size:.72rem;color:var(--gray-500);margin:2px 0 8px">${jumlah} paket</div>
          <button class="btn btn-outline btn-sm btn-full" onclick="showKategoriFotoModal('${c.nama.replace(/'/g,"\\'")}')">${c.foto ? '🖼️ Ganti Foto' : '🖼️ Tambah Foto'}</button>
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn-primary btn-sm" onclick="showAddKategoriModal()">+ Tambah Jenis Produk Baru</button>
  `;
  page.appendChild(createCard('Kelola Jenis Produk (Kategori)', katCardBody));

  const addBtn = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto">
    <select id="dpFilterKategori" onchange="filterDataProduk()" style="padding:8px 12px;border-radius:6px;border:1px solid var(--gray-300);font-family:var(--font);font-size:.85rem">
      <option value="Semua">Semua Jenis Produk</option>
      ${katList.map(k=>`<option value="${k}">${k}</option>`).join('')}
    </select>
    <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Tambah Produk</button>
    <input type="file" id="importProdukFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleImportProduk(event)">
    <button class="btn btn-outline btn-sm" onclick="document.getElementById('importProdukFile').click()">📥 Import Excel</button>
    <button class="btn btn-outline btn-sm" onclick="exportProdukExcel()">📤 Export Excel</button>
  </div>`;

// ── IKON SVG PRODUK (Kolom Foto Sementara) ──────────────────
function getProductSvgIcon(nama, kategori) {
  const n = (nama || '').toLowerCase().trim();
  const k = (kategori || '').toLowerCase().trim();

  // 1. Self Photo Reguler: Kamera biasa
  if (n.includes('self photo reguler') || (k.includes('self photo') && (n.includes('reguler') || n.includes('regular') || n.includes('standard') || n.includes('standar')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3.2"/>
      </svg>`,
      bg: '#eff6ff',
      border: '#bfdbfe',
      color: '#2563eb'
    };
  }

  // 2. Self Photo Premium: Kamera dengan mahkota/bintang
  if (n.includes('self photo premium') || (k.includes('self photo') && (n.includes('premium') || n.includes('vip') || n.includes('bintang') || n.includes('mahkota')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 6.5h-5L7 9.5H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="15" r="2.8"/>
        <path d="M12 1.5l1.2 2.2 2.4.4-1.8 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.8-1.7 2.4-.4z" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
      </svg>`,
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#d97706'
    };
  }

  // 3. Group Photo Small: 2 Orang
  if (n.includes('group photo small') || (k.includes('group photo') && (n.includes('small') || n.includes('2') || n.includes('couple') || n.includes('kecil')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>`,
      bg: '#faf5ff',
      border: '#e9d5ff',
      color: '#7c3aed'
    };
  }

  // 4. Group Photo Large: Banyak Orang / Grup
  if (n.includes('group photo large') || (k.includes('group photo') && (n.includes('large') || n.includes('besar') || n.includes('banyak') || n.includes('grup') || n.includes('ramai') || n.includes('5') || n.includes('10')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M7 21v-2a4 4 0 0 1 3-3.87"/>
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="12" cy="7" r="3.5"/>
        <circle cx="5" cy="9" r="2.5"/>
        <path d="M2 21v-1.5a3 3 0 0 1 3-3"/>
        <circle cx="19" cy="9" r="2.5"/>
        <path d="M22 21v-1.5a3 3 0 0 0-3-3"/>
      </svg>`,
      bg: '#eef2ff',
      border: '#c7d2fe',
      color: '#4f46e5'
    };
  }

  // 5. Graduation Basic: Topi Toga / Kelulusan
  if (n.includes('graduation basic') || (k.includes('graduation') && (n.includes('basic') || n.includes('standar') || n.includes('standard') || n.includes('reguler')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>`,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      color: '#059669'
    };
  }

  // 6. Graduation Premium: Topi Toga dengan Bintang/Ijazah
  if (n.includes('graduation premium') || (k.includes('graduation') && (n.includes('premium') || n.includes('vip') || n.includes('bintang') || n.includes('ijazah')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 9v5M3 9l9-4.5 9 4.5-9 4.5z"/>
        <path d="M6.5 11.5v4c2.5 2.5 8.5 2.5 11 0v-4"/>
        <path d="M19 14.5l.8 1.6 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2z" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
      </svg>`,
      bg: '#fefce8',
      border: '#fef08a',
      color: '#ca8a04'
    };
  }

  // 7. Graduation Family: Keluarga / Grup Kelulusan
  if (n.includes('graduation family') || (k.includes('graduation') && (n.includes('family') || n.includes('keluarga')))) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2 4 6l8 4 8-4z"/>
        <path d="M7 7.5v2.5c2 1.5 8 1.5 10 0v-2.5"/>
        <path d="M20 6v3"/>
        <circle cx="7" cy="14" r="2"/>
        <circle cx="17" cy="14" r="2"/>
        <circle cx="12" cy="15" r="1.8"/>
        <path d="M3.5 21v-1a3 3 0 0 1 3-3h1"/>
        <path d="M20.5 21v-1a3 3 0 0 0-3-3h-1"/>
        <path d="M9.5 21v-1.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2V21"/>
      </svg>`,
      bg: '#fff1f2',
      border: '#fecdd3',
      color: '#e11d48'
    };
  }

  // 8. Pass Photo: 2x3, 3x4, 4x6
  if (k.includes('pass photo') || n.includes('pass photo') || n.includes('pas photo') || n.includes('2x3') || n.includes('3x4') || n.includes('4x6') || n.includes('2×3') || n.includes('3×4') || n.includes('4×6')) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <circle cx="9" cy="10" r="2.2"/>
        <path d="M15 8h2M15 12h2M6.5 16.5c1-1.5 3.5-1.5 5 0"/>
      </svg>`,
      bg: '#f0fdfa',
      border: '#99f6e4',
      color: '#0d9488'
    };
  }

  // Fallbacks
  if (k.includes('self') || n.includes('self')) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3.2"/>
      </svg>`,
      bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb'
    };
  }
  if (k.includes('group') || n.includes('group')) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>`,
      bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed'
    };
  }
  if (k.includes('grad') || n.includes('grad') || n.includes('wisuda')) {
    return {
      svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>`,
      bg: '#ecfdf5', border: '#a7f3d0', color: '#059669'
    };
  }

  return {
    svg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3.2"/>
    </svg>`,
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#475569'
  };
}

// ── RENDER BARIS TABEL PRODUK DENGAN CONDITIONAL RENDERING FOTO ──
function renderProductTableRows(products) {
  return products.map(p => {
    const isDp = ['Group Photo','Graduation'].includes(p.kategori);
    const iconData = getProductSvgIcon(p.nama, p.kategori);
    const fotoSrc = p.foto || p.image || p.image_url || p.imageUrl || '';

    // CONDITIONAL RENDERING:
    // 1. Jika produk memiliki data foto (p.foto / product.image / product.image_url),
    //    tampilkan foto produk menggunakan tag <img />
    // 2. Jika tidak ada foto, tampilkan ikon placeholder default (SVG)
    const fotoContent = fotoSrc
      ? `<div style="position:relative;display:inline-flex;align-items:center">
          <img src="${fotoSrc}" alt="${p.nama}" style="width:40px;height:40px;min-width:40px;object-fit:cover;border-radius:10px;border:1px solid var(--gray-200);box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer;display:block" onclick="showProductPhotoModal('${p.id}')" title="Klik untuk ganti foto" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
          <div style="display:none;width:40px;height:40px;min-width:40px;border-radius:10px;background:${iconData.bg};border:1px solid ${iconData.border};align-items:center;justify-content:center;color:${iconData.color};flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer" onclick="showProductPhotoModal('${p.id}')" title="Klik untuk ganti foto">
            ${iconData.svg}
          </div>
        </div>`
      : `<div style="width:40px;height:40px;min-width:40px;border-radius:10px;background:${iconData.bg};border:1px solid ${iconData.border};display:inline-flex;align-items:center;justify-content:center;color:${iconData.color};flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer" onclick="showProductPhotoModal('${p.id}')" title="Klik untuk upload foto">
          ${iconData.svg}
        </div>`;

    return `<tr data-kategori="${p.kategori}" data-id="${p.id}">
      <td><span class="id-tag">${p.id}</span></td>
      <td>
        <div style="display:inline-flex;align-items:center;gap:12px">
          ${fotoContent}
          <span style="font-weight:600;color:var(--navy);font-size:.9rem;white-space:nowrap">${p.nama}</span>
        </div>
      </td>
      <td><span class="badge badge-gray">${p.kategori}</span></td>
      <td class="text-right"><strong>${formatRupiah(p.harga)}</strong></td>
      <td>${isDp
        ? `<span class="badge badge-amber" style="font-size:.7rem">DP 50% = ${formatRupiah(Math.ceil(p.harga*0.5))}</span>`
        : '<span class="badge badge-green" style="font-size:.7rem">Penuh di muka</span>'}</td>
      <td style="max-width:200px;font-size:.8rem;color:var(--gray-500)">${p.deskripsi}</td>
      <td>
        <button class="btn btn-icon btn-sm" onclick="showEditProductModal('${p.id}')" title="Edit Jenis Produk / Detail">✏️</button>
        <button class="btn btn-icon btn-sm" onclick="deleteProductConfirm('${p.id}')" title="Hapus">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

  let allRows = renderProductTableRows(prods);

  page.appendChild(createCard('Daftar Paket Layanan', `
    <div class="table-wrap" id="dpTableWrap"><table>
      <thead><tr><th>ID</th><th>Foto / Nama Paket</th><th>Kategori / Jenis</th><th class="text-right">Harga</th><th>Pembayaran</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
      <tbody>${allRows}</tbody>
    </table></div>`, addBtn));

  // Fungsi refresh otomatis tabel produk (re-fetch DB dan re-render baris tanpa reload manual)
  window.refreshProductTable = () => {
    const freshProds = DB.getProducts();
    const tbody = document.querySelector('#dpTableWrap tbody');
    if (tbody) {
      tbody.innerHTML = renderProductTableRows(freshProds);
      if (typeof window.filterDataProduk === 'function') window.filterDataProduk();
    }
  };

  // Filter tabel berdasarkan Jenis Produk yang dipilih di dropdown
  window.filterDataProduk = () => {
    const kat = document.getElementById('dpFilterKategori')?.value || 'Semua';
    document.querySelectorAll('#dpTableWrap tbody tr').forEach(tr => {
      tr.style.display = (kat === 'Semua' || tr.dataset.kategori === kat) ? '' : 'none';
    });
  };

  return page;
}

// Modal untuk tambah/ganti foto Jenis Produk (Kategori). Pakai fungsi global
// + atribut onchange langsung di HTML (bukan <script> lewat innerHTML) supaya
// foto benar-benar terbaca & tersimpan — sama seperti perbaikan foto produk.
window.showKategoriFotoModal = (namaKategori) => {
  const c = DB.getCategory(namaKategori);
  if (!c) return;
  window.__kfDataUrl = c.foto || '';
  openModal(`
    <h2 class="modal-title">${c.foto ? 'Ganti' : 'Tambah'} Foto Jenis Produk</h2>
    <p class="modal-sub">${c.icon} ${c.nama}</p>
    <div style="text-align:center;margin-bottom:16px">
      <img id="kfPreview" src="${c.foto||''}" style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--gray-200);${c.foto?'':'display:none'}">
      <div id="kfPlaceholder" style="${c.foto?'display:none':'display:flex'};align-items:center;justify-content:center;height:140px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:10px;color:var(--gray-400);font-size:.85rem">Belum ada foto</div>
    </div>
    <div class="form-group">
      <label>Pilih File Gambar</label>
      <input type="file" id="kfFile" accept="image/*" onchange="handleKfFileChange(event)">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveKategoriFoto('${c.nama.replace(/'/g,"\\'")}')">Simpan Foto</button>
    </div>
  `);
};
window.handleKfFileChange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    document.getElementById('kfPreview').src = ev.target.result;
    document.getElementById('kfPreview').style.display = 'block';
    document.getElementById('kfPlaceholder').style.display = 'none';
    window.__kfDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
};
window.saveKategoriFoto = (namaKategori) => {
  if (!window.__kfDataUrl) { showToast('Silakan pilih file gambar terlebih dahulu!', 'error'); return; }
  DB.updateCategoryFoto(namaKategori, window.__kfDataUrl);
  window.__kfDataUrl = null;
  closeModalBtn();
  showToast(`Foto Jenis Produk "${namaKategori}" berhasil disimpan ✓`, 'success');
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
};

// Modal untuk menambah Jenis Produk (Kategori) baru — lengkap dengan foto —
// tanpa harus membuat paket/produk dulu. Begitu disimpan, jenis baru ini
// langsung bertambah ke daftar Jenis Produk dan otomatis muncul sebagai
// pilihan kategori saat Tambah/Edit Produk maupun di Katalog pelanggan.
window.showAddKategoriModal = () => {
  window.__nkFotoDataUrl = '';
  openModal(`
    <h2 class="modal-title">Tambah Jenis Produk Baru</h2>
    <p class="modal-sub">Buat kategori/jenis foto baru, lengkap dengan fotonya</p>
    <div class="form-group"><label>Nama Jenis Produk</label><input type="text" id="nkNama" placeholder="Contoh: Prewedding Photo" /></div>
    <div class="form-group"><label>Icon (emoji, opsional)</label><input type="text" id="nkIcon" placeholder="📷" maxlength="4" /></div>
    <div class="form-group">
      <label>Foto Jenis Produk (opsional)</label>
      <input type="file" id="nkFoto" accept="image/*" onchange="handleNkFotoChange(event)">
      <img id="nkFotoPreview" style="display:none;max-width:100%;max-height:160px;border-radius:8px;margin-top:8px;border:1px solid var(--gray-200)">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveNewKategori()">Simpan Jenis Produk</button>
    </div>
  `);
};
window.handleNkFotoChange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    window.__nkFotoDataUrl = ev.target.result;
    const img = document.getElementById('nkFotoPreview');
    img.src = ev.target.result; img.style.display='block';
  };
  reader.readAsDataURL(file);
};
window.saveNewKategori = () => {
  const nama = document.getElementById('nkNama').value.trim();
  const icon = document.getElementById('nkIcon').value.trim();
  if (!nama) { showToast('Nama jenis produk wajib diisi!', 'error'); return; }
  DB.addCategory(nama, icon, window.__nkFotoDataUrl || '');
  window.__nkFotoDataUrl = '';
  closeModalBtn();
  showToast(`Jenis Produk "${nama}" berhasil ditambahkan ✓`, 'success');
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
};

window.showEditProductModal = (id) => {
  const p = DB.getProduct(id);
  if (!p) return;
  window.__epFotoDataUrl = p.foto || '';
  const categories = DB.getCategories().map(c=>c.nama);
  const isCustomKat = !categories.includes(p.kategori);
  const katOptions = categories.map(c => `<option value="${c}" ${p.kategori===c?'selected':''}>${c}</option>`).join('');

  openModal(`
    <h2 class="modal-title">Edit Produk & Jenis Produk</h2>
    <p class="modal-sub">ID: ${p.id} — ${p.nama}</p>
    <div class="form-group"><label>Nama Paket</label><input type="text" id="epNama" value="${p.nama.replace(/"/g, '&quot;')}" /></div>
    <div class="form-group"><label>Jenis Produk / Kategori</label>
      <select id="epKategori" onchange="toggleEpCustomCategory()">
        ${katOptions}
        <option value="Lainnya" ${isCustomKat?'selected':''}>+ Tambah Kategori / Jenis Lain...</option>
      </select>
    </div>
    <div class="form-group ${isCustomKat?'':'hidden'}" id="epCustomKatWrap">
      <label>Nama Kategori / Jenis Produk Baru</label>
      <input type="text" id="epCustomKategori" value="${isCustomKat?p.kategori:''}" placeholder="Contoh: Event Photo / Prewedding" />
    </div>
    <div class="form-group"><label>Harga (Rp)</label><input type="number" id="epHarga" value="${p.harga}" min="0" /></div>
    <div class="form-group"><label>Stok / Kapasitas</label><input type="number" id="epStok" value="${p.stok}" min="0" /></div>
    <div class="form-group"><label>Deskripsi Singkat</label><textarea id="epDesc" rows="3">${p.deskripsi||''}</textarea></div>
    <div class="form-group">
      <label>Foto Produk (opsional)</label>
      <input type="file" id="epFoto" accept="image/*" onchange="handleEpFotoChange(event)">
      <img id="epFotoPreview" src="${p.foto||''}" style="${p.foto?'display:block':'display:none'};max-width:100%;max-height:160px;border-radius:8px;margin-top:8px;border:1px solid var(--gray-200)">
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveEditProduct('${p.id}')">Simpan Perubahan</button>
    </div>
  `);
};

// Handler foto Edit Produk HARUS berupa fungsi global dipanggil lewat atribut
// onchange langsung di HTML — bukan lewat <script> yang disisipkan via
// innerHTML (openModal), karena <script> yang ditambahkan dengan cara itu
// tidak pernah dieksekusi oleh browser sehingga foto baru gagal tersimpan
// walau notifikasi "berhasil" tetap muncul.
window.toggleEpCustomCategory = function() {
  const val = document.getElementById('epKategori').value;
  document.getElementById('epCustomKatWrap').classList.toggle('hidden', val !== 'Lainnya');
};
window.handleEpFotoChange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    window.__epFotoDataUrl = ev.target.result;
    const img = document.getElementById('epFotoPreview');
    if (img) { img.src = ev.target.result; img.style.display='block'; }
  };
  reader.readAsDataURL(file);
};
window.handleEpUrlChange = function(e) {
  const val = e.target.value.trim();
  if (val) {
    window.__epFotoDataUrl = val;
    const img = document.getElementById('epFotoPreview');
    if (img) { img.src = val; img.style.display='block'; }
  }
};

window.saveEditProduct = (id) => {
  const nama = document.getElementById('epNama').value.trim();
  const katSel = document.getElementById('epKategori').value;
  const katCustom = document.getElementById('epCustomKategori')?.value.trim();
  const kat = (katSel === 'Lainnya' && katCustom) ? katCustom : (katSel === 'Lainnya' ? 'Lainnya' : katSel);
  const hrg = document.getElementById('epHarga').value;
  const stok = document.getElementById('epStok').value;
  const desc = document.getElementById('epDesc').value.trim();
  if (!nama || !hrg) { showToast('Nama dan harga wajib diisi!', 'error'); return; }

  const urlInput = document.getElementById('epUrlInput')?.value?.trim();
  const photoVal = window.__epFotoDataUrl !== undefined && window.__epFotoDataUrl !== null
    ? window.__epFotoDataUrl
    : (urlInput || '');

  DB.updateProduct(id, {
    nama,
    kategori: kat,
    harga: hrg,
    stok: stok || 10,
    deskripsi: desc,
    foto: photoVal,
    image: photoVal,
    image_url: photoVal,
    imageUrl: photoVal
  });

  window.__epFotoDataUrl = null;
  closeModalBtn();
  showToast('foto produk berhasil diperbarui', 'success');
  if (typeof window.refreshProductTable === 'function') {
    window.refreshProductTable();
  }
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
};

window.showProductPhotoModal = (id) => {
  const p = DB.getProduct(id);
  if (!p) return;
  const currentFoto = p.foto || p.image || p.image_url || p.imageUrl || '';
  window.__pfDataUrl = currentFoto;
  openModal(`
    <h2 class="modal-title">${currentFoto ? 'Ganti Foto Produk' : 'Tambah Foto Produk'}</h2>
    <p class="modal-sub">${p.icon} ${p.nama} (ID: ${p.id})</p>
    <div style="text-align:center;margin-bottom:16px">
      <img id="pfPreview" src="${currentFoto}" style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--gray-200);${currentFoto?'':'display:none'}">
      <div id="pfPlaceholder" style="${currentFoto?'display:none':'display:flex'};align-items:center;justify-content:center;height:140px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:10px;color:var(--gray-400);font-size:.85rem">Belum ada foto produk</div>
    </div>
    <div class="form-group">
      <label>Unggah File Gambar (dari Komputer / HP)</label>
      <input type="file" id="pfFile" accept="image/*" onchange="handlePfFileChange(event)">
    </div>
    <div class="form-group">
      <label>Atau Masukkan URL / Path Gambar</label>
      <input type="text" id="pfUrlInput" placeholder="https://... atau assets/images/..." value="${currentFoto && !currentFoto.startsWith('data:') ? currentFoto : ''}" oninput="handlePfUrlChange(event)">
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveProductPhoto('${id}')">Simpan Foto Produk</button>
    </div>
  `);
};

window.handlePfFileChange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    window.__pfDataUrl = ev.target.result;
    const img = document.getElementById('pfPreview');
    const pl = document.getElementById('pfPlaceholder');
    if (img) { img.src = ev.target.result; img.style.display = 'block'; }
    if (pl) pl.style.display = 'none';
  };
  reader.readAsDataURL(file);
};

window.handlePfUrlChange = function(e) {
  const val = e.target.value.trim();
  if (val) {
    window.__pfDataUrl = val;
    const img = document.getElementById('pfPreview');
    const pl = document.getElementById('pfPlaceholder');
    if (img) { img.src = val; img.style.display = 'block'; }
    if (pl) pl.style.display = 'none';
  }
};

window.saveProductPhoto = (id) => {
  const urlVal = document.getElementById('pfUrlInput')?.value?.trim();
  const photoVal = window.__pfDataUrl || urlVal;
  if (!photoVal) {
    showToast('Silakan pilih file gambar atau masukkan URL foto!', 'error');
    return;
  }
  DB.updateProductFoto(id, photoVal);
  window.__pfDataUrl = null;
  closeModalBtn();
  showToast('foto produk berhasil diperbarui', 'success');
  if (typeof window.refreshProductTable === 'function') {
    window.refreshProductTable();
  }
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
};

window.handleImportProduk = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type:'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      let count = 0;
      const iconMap = { 'Self Photo':'🤳','Group Photo':'👨‍👩‍👧‍👦','Graduation':'🎓','Pass Photo':'🪪' };
      json.forEach(row => {
        const nama = row.nama || row.Nama || row.NAMA;
        const kategori = row.kategori || row.Kategori || row.KATEGORI || 'Self Photo';
        const harga = row.harga || row.Harga || row.HARGA || 0;
        const stok = row.stok || row.Stok || row.STOK || 10;
        const deskripsi = row.deskripsi || row.Deskripsi || row.DESKRIPSI || '';
        const icon = row.icon || row.Icon || iconMap[kategori] || '📷';
        if (nama && harga) { DB.addProduct(nama, kategori, harga, stok, icon, deskripsi); count++; }
      });
      showToast(`${count} produk berhasil diimpor dari Excel ✓`, 'success');
      navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
    } catch (err) {
      showToast('Gagal membaca file Excel. Pastikan format kolom benar (nama, kategori, harga, stok, deskripsi).', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
};

window.exportProdukExcel = () => {
  const prods = DB.getProducts();
  const rows = prods.map(p => ({ ID:p.id, Nama:p.nama, Kategori:p.kategori, Harga:p.harga, Stok:p.stok, Deskripsi:p.deskripsi }));
  downloadExcel('data-produk.xlsx', rows, 'Produk');
};

function showAddProductModal() {
  window.__npFotoDataUrl = '';
  openModal(`
    <h2 class="modal-title">Tambah Produk Baru</h2>
    <p class="modal-sub">Tambahkan paket layanan foto</p>
    <div class="form-group"><label>Nama Paket</label><input type="text" id="npNama" placeholder="Contoh: Self Photo Eksklusif" /></div>
    <div class="form-group"><label>Kategori</label>
      <select id="npKategori" onchange="handleNpKategoriChange()">
        ${DB.getCategories().map(c=>`<option value="${c.nama}">${c.nama}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Harga (Rp)</label><input type="number" id="npHarga" placeholder="150000" min="0" /></div>
    <div class="form-group"><label>Stok / Kapasitas</label><input type="number" id="npStok" placeholder="20" min="0" /></div>
    <div class="form-group"><label>Deskripsi Singkat</label><textarea id="npDesc" rows="2" placeholder="Deskripsi layanan..."></textarea></div>
    <div class="form-group">
      <label>Foto Produk (opsional)</label>
      <input type="file" id="npFoto" accept="image/*" onchange="handleNpFotoChange(event)">
      <img id="npFotoPreview" style="display:none;max-width:100%;max-height:160px;border-radius:8px;margin-top:8px;border:1px solid var(--gray-200)">
    </div>
    <div class="form-group">
      <label>Atau Masukkan URL / Path Foto</label>
      <input type="text" id="npUrlInput" placeholder="https://... atau assets/images/..." oninput="handleNpUrlChange(event)">
    </div>
    <div id="npDpInfo" class="dp-info-box hidden">💳 Kategori ini menggunakan sistem <strong>DP 50%</strong> saat booking, pelunasan saat/setelah sesi.</div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveNewProduct()">Simpan Produk</button>
    </div>
  `);
}

// Sama seperti fix foto Edit Produk: fungsi global + atribut onchange
// langsung di HTML, bukan <script> yang disisipkan via innerHTML (openModal),
// karena <script> yang ditambahkan dengan cara itu tidak pernah dieksekusi
// oleh browser.
window.handleNpKategoriChange = function() {
  const dpCats = ['Group Photo','Graduation'];
  document.getElementById('npDpInfo').classList.toggle('hidden', !dpCats.includes(document.getElementById('npKategori').value));
};
window.handleNpFotoChange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    window.__npFotoDataUrl = ev.target.result;
    const img = document.getElementById('npFotoPreview');
    if (img) { img.src = ev.target.result; img.style.display='block'; }
  };
  reader.readAsDataURL(file);
};
window.handleNpUrlChange = function(e) {
  const val = e.target.value.trim();
  if (val) {
    window.__npFotoDataUrl = val;
    const img = document.getElementById('npFotoPreview');
    if (img) { img.src = val; img.style.display = 'block'; }
  }
};

function saveNewProduct() {
  const nama = document.getElementById('npNama').value.trim();
  const kat  = document.getElementById('npKategori').value;
  const hrg  = document.getElementById('npHarga').value;
  const stok = document.getElementById('npStok').value;
  const desc = document.getElementById('npDesc').value.trim();
  if (!nama || !hrg) { showToast('Nama dan harga wajib diisi!','error'); return; }
  const icons = {'Self Photo':'📸','Group Photo':'👥','Graduation':'🎓','Pass Photo':'🪪'};
  const urlVal = document.getElementById('npUrlInput')?.value?.trim() || '';
  const photoVal = window.__npFotoDataUrl || urlVal || '';
  DB.addProduct(nama, kat, hrg, stok||10, icons[kat]||'📷', desc, photoVal);
  window.__npFotoDataUrl = '';
  closeModalBtn();
  showToast(`Produk "${nama}" berhasil ditambahkan ✓`,'success');
  if (typeof window.refreshProductTable === 'function') {
    window.refreshProductTable();
  }
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
}

function deleteProductConfirm(id) {
  const p = DB.getProduct(id);
  if (!p) return;
  openModal(`
    <h2 class="modal-title">Hapus Produk?</h2>
    <p style="color:var(--gray-600);margin-bottom:20px">Anda akan menghapus <strong>${p.nama}</strong>. Tindakan ini tidak dapat dibatalkan.</p>
    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Batal</button>
      <button class="btn btn-danger" style="flex:1" onclick="doDeleteProduct('${id}')">Hapus</button>
    </div>`);
}
function doDeleteProduct(id) {
  DB.deleteProduct(id); closeModalBtn();
  showToast('Produk dihapus.','');
  navigateTo('dataProduk', document.querySelector('[data-page="dataProduk"]'));
}

// ═══════════════════════════════════════════════════════════
//  PESANAN & INVOICE
// ═══════════════════════════════════════════════════════════
function renderPesananInvoice() {
  const page = createPage('Pesanan & Invoice','Seluruh pesanan yang masuk');
  const invs = [...DB.getInvoices()].sort((a,b) => b.id.localeCompare(a.id));

  let rows = invs.map(i => `<tr>
    <td><strong>${i.id}</strong></td>
    <td>${i.customerNama}</td>
    <td>${formatDate(i.tanggal)}</td>
    <td>${formatDate(i.bookingDate)} <span class="slot-time-badge">${i.bookingTime||'-'}</span></td>
    <td style="font-size:.78rem">${i.lokasi ? getLokasiById(i.lokasi).nama : '-'}</td>
    <td class="text-right">${formatRupiah(i.total)}</td>
    <td>${i.paymentType==='dp'
      ? `<div style="font-size:.75rem">DP: ${formatRupiah(i.dpAmount)}</div><div style="font-size:.75rem;color:var(--gray-400)">Pel: ${formatRupiah(i.pelunasanAmount)}</div>`
      : '<span style="font-size:.75rem">Penuh</span>'}</td>
    <td>${statusBadge(i.status)}</td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="showInvoiceDetail('${i.id}')">🧾 Detail</button>
      <button class="btn btn-icon btn-sm" onclick="exportInvoicePDF('${i.id}')" title="Cetak PDF">🖨️</button>
      ${!['Lunas','Dibatalkan'].includes(i.status)
        ? `<button class="btn btn-icon btn-sm" onclick="confirmCancelBookingAdmin('${i.id}')" title="Batalkan booking / gagal foto">🚫</button>` : ''}
    </td>
  </tr>`).join('');

  page.appendChild(createCard('Semua Invoice',`
    <div class="table-wrap"><table>
      <thead><tr><th>Invoice</th><th>Pelanggan</th><th>Tgl Order</th><th>Jadwal Sesi</th><th>Lokasi</th><th class="text-right">Total</th><th>Info Bayar</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`,
    `<button class="btn btn-outline btn-sm" onclick="exportInvoicesExcel()">📤 Export Semua ke Excel</button>`));
  return page;
}

window.exportInvoicesExcel = () => {
  const invs = [...DB.getInvoices()].sort((a,b) => b.id.localeCompare(a.id));
  const rows = invs.map(i => ({
    Invoice: i.id,
    Pelanggan: i.customerNama,
    TglOrder: formatDate(i.tanggal),
    JadwalSesi: formatDate(i.bookingDate) + ' ' + (i.bookingTime||'-'),
    Paket: i.items.map(it => it.nama + (it.qty>1?` x${it.qty}`:'')).join(', '),
    Total: i.total,
    TipeBayar: i.paymentType==='dp' ? 'DP 50%' : 'Penuh',
    Status: i.status
  }));
  downloadExcel('semua-invoice.xlsx', rows, 'Invoice');
};

window.exportInvoicePDF = (id) => {
  const i = DB.getInvoice(id);
  if (!i) return;
  const isDp = i.paymentType === 'dp';
  const isLunas = i.status === 'Lunas';
  const loc = i.lokasi ? getLokasiById(i.lokasi) : null;
  const doc = newPDF();

  // ── KOP INVOICE ── judul utama selalu "INVOICE"; status DP/Lunas ditampilkan sebagai
  // label kecil terpisah di bawahnya supaya judul tidak terlalu panjang / terpotong.
  doc.setFontSize(20);
  doc.text('INVOICE', 16, 20);
  doc.setFontSize(9.5); doc.setTextColor(80);
  doc.text(isLunas ? 'Status: LUNAS' : (isDp ? 'Status: Uang Muka (DP 50%)' : 'Status: Belum Lunas'), 16, 26);
  doc.setTextColor(120);
  doc.text('Alviero Studio — Studio Foto Profesional', 16, 33);
  doc.text('Pusat: Karangploso, Malang  •  Cabang: Dinoyo, Malang', 16, 38);
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text('No. Invoice : ' + i.id, 16, 48);
  doc.text('Tanggal     : ' + formatDate(i.tanggal), 16, 54);
  doc.text('Pelanggan   : ' + i.customerNama, 110, 48);
  doc.text('Status      : ' + i.status, 110, 54);

  // ── TABEL RINCIAN (mengikuti format: No | Deskripsi | Lokasi Studio | Jadwal Sesi | Jumlah) ──
  const rows = i.items.map((it, idx) => [
    idx + 1,
    it.nama + (it.qty > 1 ? ` (x${it.qty})` : ''),
    loc ? loc.nama : '-',
    formatDate(i.bookingDate) + ' Pkl. ' + (i.bookingTime || '-'),
    formatRupiah(it.harga * it.qty)
  ]);

  const footRows = (isDp && !isLunas)
    ? [
        [{ content:'Total', colSpan:4, styles:{ halign:'right' } }, formatRupiah(i.total)],
        [{ content:'DP (Uang Muka) 50%', colSpan:4, styles:{ halign:'right' } }, formatRupiah(i.dpAmount)],
        [{ content:'Sisa Pelunasan 50%', colSpan:4, styles:{ halign:'right' } }, formatRupiah(i.pelunasanAmount)],
      ]
    : [
        [{ content:'Total', colSpan:4, styles:{ halign:'right' } }, formatRupiah(i.total)],
        [{ content: isLunas ? 'Status Pembayaran' : 'Sisa Tagihan', colSpan:4, styles:{ halign:'right' } }, isLunas ? 'LUNAS ✓' : formatRupiah(i.total)],
      ];

  doc.autoTable({
    startY: 62,
    head: [['No','Deskripsi','Lokasi Studio','Jadwal Sesi','Jumlah']],
    body: rows,
    foot: footRows,
    styles: { fontSize:9 },
    headStyles: { fillColor:[34,85,196] },
    columnStyles: { 0:{ halign:'center', cellWidth:10 }, 4:{ halign:'right' } },
    footStyles: { fontStyle:'bold', fillColor:[245,245,245], textColor:[20,20,20] },
  });

  let y = doc.lastAutoTable.finalY + 16;

  // ── STEMPEL "LUNAS" (hanya muncul pada invoice yang sudah LUNAS) ──
  if (isLunas) {
    const cx = 162, cy = y - 4, r = 16;
    doc.setDrawColor(200,0,0);
    doc.setTextColor(200,0,0);
    doc.setLineWidth(1.1);
    doc.circle(cx, cy, r, 'S');
    doc.circle(cx, cy, r - 2.5, 'S');
    doc.setFontSize(12);
    doc.text('LUNAS', cx, cy - 1, { align:'center', angle:-18 });
    doc.setFontSize(6);
    doc.text('ALVIERO STUDIO', cx, cy + 5, { align:'center', angle:-18 });
    doc.setLineWidth(0.2);
    doc.text(formatDate(i.tanggal), cx, cy + 10, { align:'center', angle:-18 });
    doc.setTextColor(0);
  }

  doc.setFontSize(8); doc.setTextColor(140);
  doc.text('Terima kasih telah mempercayakan momen Anda kepada Alviero Studio.', 14, 285);

  doc.save(i.id + (isLunas ? '-LUNAS' : (isDp ? '-DP50' : '')) + '.pdf');
};

function showInvoiceDetail(id) {
  const i = DB.getInvoice(id);
  if (!i) return;
  const isDp = i.paymentType === 'dp';
  const isLunas = i.status === 'Lunas';
  const loc = i.lokasi ? getLokasiById(i.lokasi) : null;
  const jadwal = formatDate(i.bookingDate) + ' Pkl. ' + (i.bookingTime||'-');

  let itemsHtml = i.items.map((it, idx) => `
    <tr>
      <td style="border:1px solid #333;padding:6px;text-align:center">${idx+1}</td>
      <td style="border:1px solid #333;padding:6px">${it.nama}${it.qty>1?` (x${it.qty})`:''}</td>
      <td style="border:1px solid #333;padding:6px">${loc ? loc.nama : '-'}</td>
      <td style="border:1px solid #333;padding:6px">${jadwal}</td>
      <td style="border:1px solid #333;padding:6px;text-align:right">${formatRupiah(it.harga*it.qty)}</td>
    </tr>`).join('');

  const footRowsHtml = (isDp && !isLunas) ? `
      <tr><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;font-weight:700">Total</td><td style="border:1px solid #333;padding:6px;text-align:right;font-weight:700">${formatRupiah(i.total)}</td></tr>
      <tr><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;font-weight:700;background:#FEF3C7">DP (Uang Muka) 50%</td><td style="border:1px solid #333;padding:6px;text-align:right;font-weight:700;background:#FEF3C7">${formatRupiah(i.dpAmount)}</td></tr>
      <tr><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;color:var(--gray-500)">Sisa Pelunasan 50%</td><td style="border:1px solid #333;padding:6px;text-align:right;color:var(--gray-500)">${formatRupiah(i.pelunasanAmount)}</td></tr>`
    : `
      <tr><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;font-weight:700">Total</td><td style="border:1px solid #333;padding:6px;text-align:right;font-weight:700">${formatRupiah(i.total)}</td></tr>
      <tr><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;font-weight:700;background:${isLunas?'#e6f9ee':'#FEE2E2'}">${isLunas?'Status Pembayaran':'Sisa Tagihan'}</td><td style="border:1px solid #333;padding:6px;text-align:right;font-weight:700;background:${isLunas?'#e6f9ee':'#FEE2E2'};color:${isLunas?'#1DB954':'#D7263D'}">${isLunas?'LUNAS ✓':formatRupiah(i.total)}</td></tr>`;

  openModal(`
    <h2 class="modal-title">Invoice ${i.id}</h2>
    <div style="font-size:.78rem;font-weight:700;color:${isLunas?'#1DB954':(isDp?'#F59E0B':'#D7263D')};margin:-6px 0 12px">
      ${isLunas ? 'Status: LUNAS' : (isDp ? 'Status: Uang Muka (DP 50%)' : 'Status: Belum Lunas')}
    </div>
    ${i.status==='Dibatalkan' ? `
    <div style="background:var(--gray-100);color:var(--gray-700);padding:10px 12px;border-radius:6px;font-size:.82rem;margin-bottom:14px">
      🚫 <strong>Dibatalkan${i.dibatalkanOleh==='admin'?' oleh Admin':' oleh Pelanggan'}</strong> pada ${i.waktuBatal||'-'}.<br>
      Alasan: ${i.alasanBatal||'-'}<br>
      Slot jam ${i.bookingTime||'-'} tanggal ${formatDate(i.bookingDate)} sudah otomatis tersedia kembali.
    </div>` : ''}
    <div class="invoice-header-info">
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Pelanggan</span><span class="info-value">${i.customerNama}</span></div>
        <div class="info-item"><span class="info-label">Tgl Order</span><span class="info-value">${formatDate(i.tanggal)}</span></div>
        <div class="info-item"><span class="info-label">Jadwal Sesi</span><span class="info-value">${jadwal}</span></div>
        <div class="info-item"><span class="info-label">Lokasi Studio</span><span class="info-value">${loc ? loc.nama+` <a href="${mapsUrlFor(loc.alamat)}" target="_blank" rel="noopener" style="font-size:.75rem">🗺️ Maps</a>` : '-'}</span></div>
        <div class="info-item"><span class="info-label">Metode Bayar</span><span class="info-value">${i.metodePembayaran||'-'}${i.metodePelunasan?` <span style="color:var(--gray-400);font-weight:normal">(DP) · Pelunasan: ${i.metodePelunasan}</span>`:''}</span></div>
        <div class="info-item"><span class="info-label">Sistem Bayar</span><span class="info-value">${isDp?'DP 50% + Pelunasan':'Pembayaran Penuh'}</span></div>
        <div class="info-item"><span class="info-label">Status</span><span class="info-value">${statusBadge(i.status)}</span></div>
      </div>
    </div>
    <hr class="divider">
    <div style="position:relative">
      <table style="width:100%;font-size:.82rem;border-collapse:collapse;margin-bottom:4px">
        <thead>
          <tr style="background:var(--navy);color:#fff">
            <th style="border:1px solid #333;padding:6px;width:34px">No</th>
            <th style="border:1px solid #333;padding:6px;text-align:left">Deskripsi</th>
            <th style="border:1px solid #333;padding:6px;text-align:left">Lokasi Studio</th>
            <th style="border:1px solid #333;padding:6px;text-align:left">Jadwal Sesi</th>
            <th style="border:1px solid #333;padding:6px;text-align:right">Jumlah</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}${footRowsHtml}</tbody>
      </table>
      ${isLunas ? `
      <div style="position:absolute;top:10px;right:16px;width:96px;height:96px;border:4px double #D7263D;border-radius:50%;
                  display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-18deg);
                  color:#D7263D;font-weight:800;letter-spacing:1px;pointer-events:none;opacity:.9;background:rgba(255,255,255,.5)">
        <div style="font-size:1.15rem;line-height:1">LUNAS</div>
        <div style="font-size:.5rem;margin-top:2px">ALVIERO STUDIO</div>
        <div style="font-size:.5rem">${formatDate(i.tanggal)}</div>
      </div>` : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="exportInvoicePDF('${i.id}')">🖨️ Cetak / Export PDF</button>
      <button class="btn btn-secondary" style="flex:1;justify-content:center" onclick="closeModalBtn()">Tutup</button>
    </div>`);
}

// ═══════════════════════════════════════════════════════════
//  PEMBAYARAN
// ═══════════════════════════════════════════════════════════
function renderPembayaran() {
  const page = createPage('Konfirmasi Pembayaran','Konfirmasi DP dan pelunasan dari pelanggan');
  const invs = [...DB.getInvoices()].sort((a,b) => b.id.localeCompare(a.id));

  const needsAction = ['Menunggu Konfirmasi DP','Menunggu Konfirmasi Pelunasan','Menunggu Konfirmasi'];
  const pending  = invs.filter(i => needsAction.includes(i.status));
  const lainnya  = invs.filter(i => !needsAction.includes(i.status));

  const kgPay = kpiGrid(
    createKpiCard('⏳','Menunggu Konfirmasi', pending.length, 'Perlu tindakan admin','#F59E0B','#FEF3C7'),
    createKpiCard('✅','Transaksi Lunas', invs.filter(i=>i.status==='Lunas').length, '','#1DB954','#e6f9ee'),
    createKpiCard('📋','DP Terkonfirmasi', invs.filter(i=>i.status==='DP Terkonfirmasi').length, 'Menunggu pelunasan','#2255C4','#e8effc')
  );
  page.appendChild(kgPay);

  // Pending
  if (pending.length > 0) {
    let rows = pending.map(i => {
      let aksi = '';
      const isDP  = i.status === 'Menunggu Konfirmasi DP';
      const isPel = i.status === 'Menunggu Konfirmasi Pelunasan';
      const isFul = i.status === 'Menunggu Konfirmasi';
      const amount = isDP ? i.dpAmount : isPel ? i.pelunasanAmount : i.total;
      const label  = isDP ? `✅ Setujui DP <span style="opacity:.7">(${formatRupiah(amount)})</span>`
                   : isPel ? `✅ Setujui Pelunasan → LUNAS <span style="opacity:.7">(${formatRupiah(amount)})</span>`
                   : `✅ Setujui Pembayaran → LUNAS <span style="opacity:.7">(${formatRupiah(amount)})</span>`;
      const fnName = isDP ? 'doKonfirmasiDP' : 'doKonfirmasiFinal';
      aksi = `<button class="btn btn-success btn-sm" onclick="${fnName}('${i.id}')">${label}</button>`;
      return `<tr>
        <td><strong>${i.id}</strong></td>
        <td>${i.customerNama}</td>
        <td>${formatDate(i.bookingDate)} <span class="slot-time-badge">${i.bookingTime||'-'}</span></td>
        <td>${i.metodePembayaran||'-'}</td>
        <td class="text-right">${formatRupiah(i.total)}</td>
        <td>${statusBadge(i.status)}</td>
        <td>${aksi} <button class="btn btn-outline btn-sm" onclick="showInvoiceDetail('${i.id}')">Detail</button></td>
      </tr>`;
    }).join('');
    page.appendChild(createCard('⏳ Menunggu Konfirmasi',`
      <div class="table-wrap"><table>
        <thead><tr><th>Invoice</th><th>Pelanggan</th><th>Jadwal Sesi</th><th>Metode</th><th class="text-right">Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`));
  }

  // Lainnya
  if (lainnya.length > 0) {
    let rows2 = lainnya.map(i=>`<tr>
      <td><strong>${i.id}</strong></td>
      <td>${i.customerNama}</td>
      <td>${formatDate(i.bookingDate)} <span class="slot-time-badge">${i.bookingTime||'-'}</span></td>
      <td>${i.metodePembayaran||'-'}</td>
      <td class="text-right">${formatRupiah(i.total)}</td>
      <td>${statusBadge(i.status)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="showInvoiceDetail('${i.id}')">Detail</button></td>
    </tr>`).join('');
    page.appendChild(createCard('Semua Transaksi Lainnya',`
      <div class="table-wrap"><table>
        <thead><tr><th>Invoice</th><th>Pelanggan</th><th>Jadwal Sesi</th><th>Metode</th><th class="text-right">Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows2}</tbody>
      </table></div>`));
  }
  return page;
}

function doKonfirmasiDP(id) {
  const ok = DB.confirmDP(id);
  if (ok) {
    showToast('DP dikonfirmasi. Sesi foto terjadwal untuk pelanggan ✓','success');
    navigateTo('pembayaran', document.querySelector('[data-page="pembayaran"]'));
  }
}

function doKonfirmasiFinal(id) {
  const earned = DB.confirmFinal(id);
  if (earned !== false) {
    showToast(`Pembayaran disetujui admin — Invoice ${id} berstatus LUNAS ✓ (stempel LUNAS otomatis tampil di invoice). Poin +${earned}.`,'success');
    navigateTo('pembayaran', document.querySelector('[data-page="pembayaran"]'));
  }
}

// ---- BATALKAN BOOKING / GAGAL FOTO (ADMIN) ----
// Dipakai admin untuk membatalkan booking, termasuk kasus pelanggan tidak hadir
// / gagal foto pada jadwalnya. Begitu disimpan, slot jam tsb otomatis terbuka
// kembali (lihat DB.getSlotCount) dan tercatat di lonceng notifikasi admin.
window.confirmCancelBookingAdmin = (id) => {
  const i = DB.getInvoice(id); if (!i) return;
  openModal(`
    <h2 class="modal-title">Batalkan Booking / Gagal Foto?</h2>
    <p style="color:var(--gray-600);margin-bottom:16px">
      Invoice <strong>${i.id}</strong> — ${i.customerNama}, sesi
      <strong>${formatDate(i.bookingDate)} Pkl. ${i.bookingTime}</strong>.
      Slot jam tersebut akan <strong>otomatis tersedia kembali</strong> untuk pelanggan lain.
    </p>
    <div class="form-group">
      <label>Alasan</label>
      <textarea id="cancelAlasanAdmin" rows="2">Pelanggan tidak hadir / gagal foto pada jadwal</textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="closeModalBtn()">Tutup</button>
      <button class="btn btn-danger" style="flex:1" onclick="doCancelBookingAdmin('${id}')">Ya, Batalkan</button>
    </div>`);
};

window.doCancelBookingAdmin = (id) => {
  const alasanEl = document.getElementById('cancelAlasanAdmin');
  const ok = DB.cancelBooking(id, alasanEl ? alasanEl.value : '', 'admin');
  closeModalBtn();
  if (ok) {
    showToast('Booking dibatalkan. Slot otomatis tersedia kembali ✓','success');
    navigateTo('pesananInvoice', document.querySelector('[data-page="pesananInvoice"]'));
  } else {
    showToast('Booking tidak dapat dibatalkan (status sudah LUNAS/Dibatalkan).','error');
  }
};

// ═══════════════════════════════════════════════════════════
//  PENERIMAAN KAS
// ═══════════════════════════════════════════════════════════
function renderPenerimaanKas() {
  const page = createPage('Penerimaan Kas','Kas masuk dari transaksi yang telah LUNAS');
  const kas  = [...DB.getKas()].sort((a,b)=>b.invoiceId.localeCompare(a.invoiceId));
  const totalKas = kas.reduce((s,k)=>s+k.jumlah,0);

  page.appendChild(kpiGrid(
    createKpiCard('💰','Total Penerimaan', formatRupiah(totalKas), 'Seluruh kas masuk','#1DB954','#e6f9ee'),
    createKpiCard('✅','Jumlah Transaksi', kas.length, 'Transaksi lunas','#2255C4','#e8effc')
  ));

  let rows = kas.map(k=>`<tr>
    <td>${formatDate(k.tanggal)}</td>
    <td><strong>${k.invoiceId}</strong></td>
    <td>${k.customerNama}</td>
    <td>${k.metode||'-'}</td>
    <td class="text-right"><strong>${formatRupiah(k.jumlah)}</strong></td>
  </tr>`).join('');

  page.appendChild(createCard('Rincian Penerimaan Kas',`
    <div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Invoice</th><th>Pelanggan</th><th>Metode</th><th class="text-right">Jumlah</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#aaa">Belum ada penerimaan kas</td></tr>'}</tbody>
    </table></div>
    <div style="padding:12px 0 4px;text-align:right;font-size:.85rem;color:var(--gray-500)">
      <strong>Total: ${formatRupiah(totalKas)}</strong>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="exportKasExcel()">📤 Excel</button>
     <button class="btn btn-outline btn-sm" onclick="exportKasPDF()">🖨️ PDF</button>`));
  return page;
}

window.exportKasExcel = () => {
  const kas = [...DB.getKas()].sort((a,b)=>b.invoiceId.localeCompare(a.invoiceId));
  const rows = kas.map(k => ({ Tanggal:formatDate(k.tanggal), Invoice:k.invoiceId, Pelanggan:k.customerNama, Metode:k.metode||'-', Jumlah:k.jumlah }));
  downloadExcel('penerimaan-kas.xlsx', rows, 'Penerimaan Kas');
};

window.exportKasPDF = () => {
  const doc = newPDF();
  doc.setFontSize(14); doc.text('Penerimaan Kas - E-CRM Studio', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const kas = [...DB.getKas()].sort((a,b)=>b.invoiceId.localeCompare(a.invoiceId));
  const rows = kas.map(k=>[formatDate(k.tanggal), k.invoiceId, k.customerNama, k.metode||'-', formatRupiah(k.jumlah)]);
  const total = kas.reduce((s,k)=>s+k.jumlah,0);
  doc.autoTable({ startY:26, head:[['Tanggal','Invoice','Pelanggan','Metode','Jumlah']], body: rows,
    foot:[['','','','Total', formatRupiah(total)]], styles:{fontSize:8} });
  doc.save('penerimaan-kas.pdf');
};

// ═══════════════════════════════════════════════════════════
//  E-CRM: PROFIL PELANGGAN
// ═══════════════════════════════════════════════════════════
function renderProfilPelanggan() {
  const page  = createPage('Profil Pelanggan','Data CRM berdasarkan aktivitas transaksi pelanggan');

  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center';
  filterBar.innerHTML = `
    <input type="text" id="crmSearch" placeholder="🔍 Cari nama / email pelanggan..." style="flex:1;min-width:220px;padding:10px 12px;border-radius:6px;border:1px solid var(--gray-300)" oninput="renderCrmTable()">
    <select id="crmStatusFilter" onchange="renderCrmTable()" style="padding:10px;border-radius:6px;border:1px solid var(--gray-300)">
      <option value="Semua">Semua Status</option>
      <option value="Loyal Customer">Loyal Customer</option>
      <option value="Active Customer">Active Customer</option>
      <option value="New Customer">New Customer</option>
    </select>
    <button class="btn btn-outline btn-sm" onclick="toggleCrmSort()">🔤 Urutkan: <span id="crmSortLabel">A-Z</span></button>
    <button class="btn btn-outline btn-sm" onclick="exportCrmAllExcel()">📤 Excel</button>
    <button class="btn btn-outline btn-sm" onclick="exportCrmAllWord()">📄 Word</button>
  `;
  page.appendChild(filterBar);

  const tableWrap = document.createElement('div');
  tableWrap.id = 'crmTableWrap';
  page.appendChild(tableWrap);

  window.crmSortDir = window.crmSortDir || 'asc';

  window.renderCrmTable = () => {
    const search  = (page.querySelector('#crmSearch')?.value || '').toLowerCase();
    const statusF = page.querySelector('#crmStatusFilter')?.value || 'Semua';
    let custs = DB.getCustomers().filter(c =>
      (c.nama.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)) &&
      (statusF === 'Semua' || c.status === statusF)
    );
    custs.sort((a,b) => window.crmSortDir === 'asc' ? a.nama.localeCompare(b.nama) : b.nama.localeCompare(a.nama));

    let rows = custs.map(c => {
      const invs  = DB.getInvoicesByCustomer(c.id);
      const akt   = DB.getAktivitasByCustomer(c.id);
      const last  = akt.length ? akt[0].waktu : '-';
      return `<tr>
        <td><div class="cust-avatar-mini">${c.nama[0]}</div> <strong>${c.nama}</strong></td>
        <td>${c.email}</td>
        <td style="text-align:center">${invs.length}</td>
        <td class="text-right">${formatRupiah(c.totalBelanja)}</td>
        <td><strong>${c.poin}</strong></td>
        <td>${customerStatusBadge(c.status)}</td>
        <td style="font-size:.75rem;color:var(--gray-400)">${last}</td>
        <td><button class="btn btn-primary btn-sm" onclick="showCrmModal('${c.id}')">Lihat CRM</button></td>
      </tr>`;
    }).join('');

    page.querySelector('#crmTableWrap').innerHTML = `<div class="card"><div class="card-header"><span class="card-title">Data E-CRM Pelanggan (${custs.length})</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Email</th><th style="text-align:center">Transaksi</th><th class="text-right">Total Belanja</th><th>Poin</th><th>Status</th><th>Aktivitas Terakhir</th><th>Aksi</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#aaa">Tidak ada pelanggan yang cocok</td></tr>'}</tbody>
      </table></div></div>`;
  };

  window.toggleCrmSort = () => {
    window.crmSortDir = window.crmSortDir === 'asc' ? 'desc' : 'asc';
    page.querySelector('#crmSortLabel').textContent = window.crmSortDir === 'asc' ? 'A-Z' : 'Z-A';
    renderCrmTable();
  };

  renderCrmTable();
  return page;
}

window.exportCrmAllExcel = () => {
  const custs = DB.getCustomers();
  const rows = custs.map(c => {
    const invs = DB.getInvoicesByCustomer(c.id);
    return { ID:c.id, Nama:c.nama, Email:c.email, HP:c.hp, TotalTransaksi:invs.length, TotalBelanja:c.totalBelanja, Poin:c.poin, Status:c.status };
  });
  downloadExcel('data-ecrm-pelanggan.xlsx', rows, 'Data E-CRM');
};

window.exportCrmAllWord = () => {
  const custs = DB.getCustomers();
  let html = `<h2>Data E-CRM Pelanggan — E-CRM Studio</h2>
    <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
    <table><tr><th>ID</th><th>Nama</th><th>Email</th><th>HP</th><th>Total Transaksi</th><th>Total Belanja</th><th>Poin</th><th>Status</th></tr>`;
  custs.forEach(c => {
    const invs = DB.getInvoicesByCustomer(c.id);
    html += `<tr><td>${c.id}</td><td>${c.nama}</td><td>${c.email}</td><td>${c.hp}</td><td>${invs.length}</td><td>${formatRupiah(c.totalBelanja)}</td><td>${c.poin}</td><td>${c.status}</td></tr>`;
  });
  html += '</table>';
  downloadWordDoc('data-ecrm-pelanggan.doc', html, 'Data E-CRM Pelanggan');
};

function showCrmModal(custId) {
  const c     = DB.getCustomer(custId); if (!c) return;
  const invs  = DB.getInvoicesByCustomer(custId);
  const lunas = invs.filter(i=>i.status==='Lunas');
  const akt   = DB.getAktivitasByCustomer(custId);
  const ulasanCust = DB.getUlasanByCustomer(custId);

  let invRows = invs.map(i=>`<tr>
    <td><strong>${i.id}</strong></td>
    <td>${formatDate(i.bookingDate)} ${i.bookingTime||''}</td>
    <td>${i.items.map(x=>x.nama).join(', ')}</td>
    <td class="text-right">${formatRupiah(i.total)}</td>
    <td>${statusBadge(i.status)}</td>
  </tr>`).join('');

  let aktHtml = akt.slice(0,8).map(a=>`
    <div class="activity-item">
      <div class="activity-dot">📌</div>
      <div class="activity-content">
        <div class="activity-desc">${a.desc}</div>
        <div class="activity-time">${a.waktu}</div>
      </div>
    </div>`).join('');

  let ulasanHtml = ulasanCust.length === 0
    ? `<p style="color:#aaa;text-align:center;font-size:.85rem">Belum pernah memberi ulasan</p>`
    : ulasanCust.map(r=>`
        <div style="border:1px solid var(--gray-200);border-radius:8px;padding:10px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--amber);font-size:.9rem">${r.rating>0 ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating) : '<span style=\'color:var(--gray-400);font-weight:normal\'>Tanpa rating bintang</span>'}</span>
            <span style="font-size:.72rem;color:var(--gray-400)">${formatDate(r.tanggal)}</span>
          </div>
          <div style="font-size:.72rem;color:var(--gray-400);margin:2px 0">${r.produk} · ${getLokasiById(r.lokasi).nama}</div>
          <div style="font-size:.83rem;color:var(--gray-700)">${r.komentar}</div>
        </div>`).join('');

  openModal(`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="user-avatar" style="width:52px;height:52px;font-size:1.4rem">${c.nama[0]}</div>
      <div>
        <h2 class="modal-title" style="margin:0">${c.nama}</h2>
        <div style="margin:2px 0 6px;color:var(--gray-400);font-size:.82rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span>${c.email}</span>
          <span>·</span>
          <span>${renderCustomerPhoneLink(c.hp)}</span>
        </div>
        ${customerStatusBadge(c.status)}
      </div>
    </div>
    <div class="stat-row" style="margin-bottom:16px">
      <div class="stat-mini"><div class="stat-mini-label">Total Transaksi</div><div class="stat-mini-value">${invs.length}</div></div>
      <div class="stat-mini"><div class="stat-mini-label">Total Belanja</div><div class="stat-mini-value" style="font-size:1rem">${formatRupiah(c.totalBelanja)}</div></div>
      <div class="stat-mini"><div class="stat-mini-label">Poin Loyalitas</div><div class="stat-mini-value">${c.poin} ⭐</div></div>
    </div>
    <hr class="divider">
    <h3 style="font-size:.9rem;font-weight:700;color:var(--navy);margin-bottom:10px">Riwayat Booking</h3>
    <div class="table-wrap" style="max-height:160px;overflow-y:auto;margin-bottom:16px"><table>
      <thead><tr><th>Invoice</th><th>Jadwal</th><th>Paket</th><th class="text-right">Total</th><th>Status</th></tr></thead>
      <tbody>${invRows||'<tr><td colspan="5" style="text-align:center;color:#aaa">Belum ada transaksi</td></tr>'}</tbody>
    </table></div>
    <hr class="divider">
    <h3 style="font-size:.9rem;font-weight:700;color:var(--navy);margin-bottom:10px">Ulasan dari Pelanggan Ini</h3>
    <div style="max-height:200px;overflow-y:auto;margin-bottom:16px">${ulasanHtml}</div>
    <hr class="divider">
    <h3 style="font-size:.9rem;font-weight:700;color:var(--navy);margin-bottom:10px">Aktivitas Pelanggan</h3>
    <div class="activity-list" style="max-height:200px;overflow-y:auto">${aktHtml||'<p style="color:#aaa;text-align:center">Belum ada aktivitas</p>'}</div>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="exportCrmCustomerExcel('${c.id}')">📤 Export Excel</button>
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="exportCrmCustomerWord('${c.id}')">📄 Export Word</button>
    </div>
    <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="closeModalBtn()">Tutup</button>`);
}

window.exportCrmCustomerExcel = (custId) => {
  const c = DB.getCustomer(custId); if (!c) return;
  const invs = DB.getInvoicesByCustomer(custId);
  const rows = invs.map(i => ({ Invoice:i.id, Jadwal: formatDate(i.bookingDate)+' '+(i.bookingTime||''), Paket: i.items.map(x=>x.nama).join(', '), Total:i.total, Status:i.status }));
  downloadExcel(`profil-${c.nama.replace(/\s+/g,'-')}.xlsx`, rows, c.nama.slice(0,25));
};

window.exportCrmCustomerWord = (custId) => {
  const c = DB.getCustomer(custId); if (!c) return;
  const invs = DB.getInvoicesByCustomer(custId);
  const akt  = DB.getAktivitasByCustomer(custId);
  let html = `<h2>Profil E-CRM: ${c.nama}</h2>
    <p>Email: ${c.email}<br>No. HP: ${c.hp}<br>Status: ${c.status}<br>Poin Loyalitas: ${c.poin}<br>Total Belanja: ${formatRupiah(c.totalBelanja)}</p>
    <h3>Riwayat Transaksi</h3>
    <table><tr><th>Invoice</th><th>Jadwal</th><th>Paket</th><th>Total</th><th>Status</th></tr>
    ${invs.map(i=>`<tr><td>${i.id}</td><td>${formatDate(i.bookingDate)} ${i.bookingTime||''}</td><td>${i.items.map(x=>x.nama).join(', ')}</td><td>${formatRupiah(i.total)}</td><td>${i.status}</td></tr>`).join('')}
    </table>
    <h3>Aktivitas Pelanggan</h3>
    <ul>${akt.map(a=>`<li>${a.waktu} — ${a.desc}</li>`).join('') || '<li>Belum ada aktivitas</li>'}</ul>`;
  downloadWordDoc(`profil-${c.nama.replace(/\s+/g,'-')}.doc`, html, 'Profil E-CRM '+c.nama);
};

// ═══════════════════════════════════════════════════════════
//  E-CRM: RIWAYAT PEMBELIAN
// ═══════════════════════════════════════════════════════════
function renderRiwayatPembelian() {
  const page = createPage('Riwayat Pembelian','Riwayat booking & transaksi per pelanggan, dapat dikelompokkan per jenis foto');
  const custs = DB.getCustomers();

  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap';
  filterBar.innerHTML = `
    <label style="font-size:.85rem;font-weight:600;color:var(--navy)">Kelompokkan per Jenis Foto:</label>
    <select id="riwayatKategori" onchange="renderRiwayatTable()" style="padding:8px 10px;border-radius:6px;border:1px solid var(--gray-300)">
      <option value="Semua">Semua Kategori</option>
      <option value="Self Photo">Self Photo</option>
      <option value="Group Photo">Group Photo</option>
      <option value="Graduation">Graduation</option>
      <option value="Pass Photo">Pass Photo</option>
    </select>
  `;
  page.appendChild(filterBar);

  const container = document.createElement('div');
  container.id = 'riwayatContainer';
  page.appendChild(container);

  window.renderRiwayatTable = () => {
    const kat = page.querySelector('#riwayatKategori')?.value || 'Semua';
    const cont = page.querySelector('#riwayatContainer');
    cont.innerHTML = '';
    custs.forEach(c => {
      let invs = DB.getInvoicesByCustomer(c.id);
      if (kat !== 'Semua') {
        invs = invs.filter(i => i.items.some(it => { const p = DB.getProduct(it.produkId); return p && p.kategori === kat; }));
      }
      if (!invs.length) return;

      // Urutkan: kelompok per kategori foto (item pertama), lalu per tanggal
      invs = [...invs].sort((a,b) => {
        const ka = DB.getProduct(a.items[0]?.produkId)?.kategori || '';
        const kb = DB.getProduct(b.items[0]?.produkId)?.kategori || '';
        return ka.localeCompare(kb) || a.tanggal.localeCompare(b.tanggal);
      });

      let rows = invs.map(i => {
        const kats = [...new Set(i.items.map(it => DB.getProduct(it.produkId)?.kategori).filter(Boolean))];
        return `<tr>
          <td><strong>${i.id}</strong></td>
          <td>${formatDate(i.tanggal)}</td>
          <td>${formatDate(i.bookingDate)} <span class="slot-time-badge">${i.bookingTime||'-'}</span></td>
          <td>${kats.map(k=>`<span class="badge badge-gray" style="font-size:.65rem">${k}</span>`).join(' ')}</td>
          <td>${i.items.map(x=>x.nama+(x.qty>1?` ×${x.qty}`:'')).join(', ')}</td>
          <td class="text-right">${formatRupiah(i.total)}</td>
          <td>${statusBadge(i.status)}</td>
        </tr>`;
      }).join('');

      cont.appendChild(createCard(`${c.nama} — ${invs.length} Transaksi`,`
        <div class="table-wrap"><table>
          <thead><tr><th>Invoice</th><th>Tgl Order</th><th>Jadwal Sesi</th><th>Kategori</th><th>Paket</th><th class="text-right">Total</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`));
    });
    if (!cont.children.length) cont.appendChild(emptyState('📋','Tidak Ada Data','Tidak ada transaksi untuk kategori yang dipilih.'));
  };

  renderRiwayatTable();
  return page;
}

// ═══════════════════════════════════════════════════════════
//  E-CRM: POIN LOYALITAS
// ═══════════════════════════════════════════════════════════
function renderPoinLoyalitas() {
  const page  = createPage('Poin Loyalitas','Rekap poin seluruh pelanggan (Rp10.000 = 1 poin)');
  const custs = [...DB.getCustomers()].sort((a,b)=>b.poin-a.poin);
  const total = custs.reduce((s,c)=>s+c.poin,0);

  page.appendChild(kpiGrid(
    createKpiCard('⭐','Total Poin Beredar', total, 'Seluruh pelanggan','#F59E0B','#FEF3C7'),
    createKpiCard('🏆','Loyal Customer', custs.filter(c=>c.status==='Loyal Customer').length, '','#2255C4','#e8effc'),
    createKpiCard('👥','Active Customer', custs.filter(c=>c.status==='Active Customer').length, '','#1DB954','#e6f9ee')
  ));

  let rows = custs.map((c,i)=>`<tr>
    <td style="text-align:center"><strong>#${i+1}</strong></td>
    <td><div style="display:flex;align-items:center;gap:8px"><div class="cust-avatar-mini">${c.nama[0]}</div><strong>${c.nama}</strong></div></td>
    <td>${c.email}</td>
    <td class="text-right"><strong style="font-size:1.1rem;color:var(--primary)">${c.poin}</strong> poin</td>
    <td class="text-right">${formatRupiah(c.totalBelanja)}</td>
    <td>${customerStatusBadge(c.status)}</td>
  </tr>`).join('');

  page.appendChild(createCard('Ranking Poin Pelanggan',`
    <div class="table-wrap"><table>
      <thead><tr><th style="text-align:center">Rank</th><th>Nama</th><th>Email</th><th class="text-right">Poin</th><th class="text-right">Total Belanja</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="padding:12px;background:var(--primary-light);border-radius:8px;margin-top:12px;font-size:.82rem;color:var(--primary)">
      ℹ️ Poin diberikan otomatis saat pembayaran dikonfirmasi LUNAS. <strong>Rp10.000 = 1 poin.</strong>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="exportPoinExcel()">📤 Excel</button>
     <button class="btn btn-outline btn-sm" onclick="exportPoinPDF()">🖨️ PDF</button>`));
  return page;
}

window.exportPoinExcel = () => {
  const custs = [...DB.getCustomers()].sort((a,b)=>b.poin-a.poin);
  const rows = custs.map((c,i)=>({ Rank:i+1, Nama:c.nama, Email:c.email, Poin:c.poin, TotalBelanja:c.totalBelanja, Status:c.status }));
  downloadExcel('poin-loyalitas.xlsx', rows, 'Poin Loyalitas');
};

window.exportPoinPDF = () => {
  const doc = newPDF();
  doc.setFontSize(14); doc.text('Poin Loyalitas Pelanggan - E-CRM Studio', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const custs = [...DB.getCustomers()].sort((a,b)=>b.poin-a.poin);
  const rows = custs.map((c,i)=>[i+1, c.nama, c.email, c.poin, formatRupiah(c.totalBelanja), c.status]);
  doc.autoTable({ startY:26, head:[['Rank','Nama','Email','Poin','Total Belanja','Status']], body: rows, styles:{fontSize:8} });
  doc.save('poin-loyalitas.pdf');
};

// ═══════════════════════════════════════════════════════════
//  LAPORAN
// ═══════════════════════════════════════════════════════════
function renderLaporan() {
  const page = createPage('Laporan','Ringkasan performa & laporan keuangan studio foto');

  const tabs = ['📊 Ringkasan','💵 Rincian Pendapatan','🧾 Pengeluaran Kas','📑 Laba Rugi','🔄 Kas Masuk & Keluar'];
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;border-bottom:2px solid var(--gray-200);padding-bottom:14px';
  tabBar.innerHTML = tabs.map((t,idx)=>`<button class="btn ${idx===0?'btn-primary':'btn-outline'} btn-sm laporan-tab-btn" onclick="switchLaporanTab(${idx})">${t}</button>`).join('');
  page.appendChild(tabBar);

  const content = document.createElement('div');
  content.id = 'laporanContent';
  page.appendChild(content);

  const renderers = [renderLaporanRingkasan, renderLaporanRincianPendapatan, renderLaporanPengeluaran, renderLaporanLabaRugi, renderLaporanKasFlow];

  window.switchLaporanTab = (idx) => {
    page.querySelectorAll('.laporan-tab-btn').forEach((b,i)=>{
      b.classList.toggle('btn-primary', i===idx);
      b.classList.toggle('btn-outline', i!==idx);
    });
    const c = page.querySelector('#laporanContent');
    c.innerHTML = '';
    c.appendChild(renderers[idx]());
  };

  switchLaporanTab(0);
  return page;
}

// ── TAB 1: RINGKASAN ──
function renderLaporanRingkasan() {
  const wrap = document.createElement('div');
  const invs  = DB.getInvoices();
  const lunas = invs.filter(i=>i.status==='Lunas');
  const kas   = DB.getKas();
  const custs = DB.getCustomers();
  const prods = DB.getProducts();

  const byKat = {};
  lunas.forEach(i=>{ i.items.forEach(it=>{
    const p=DB.getProduct(it.produkId); if(!p)return;
    if(!byKat[p.kategori])byKat[p.kategori]={count:0,revenue:0};
    byKat[p.kategori].count+=it.qty;
    byKat[p.kategori].revenue+=it.harga*it.qty;
  }); });
  let katRows = Object.entries(byKat).map(([k,v])=>`<tr>
    <td><strong>${k}</strong></td>
    <td style="text-align:center">${v.count}</td>
    <td class="text-right">${formatRupiah(v.revenue)}</td>
  </tr>`).join('');

  const byProd = {};
  lunas.forEach(i=>{ i.items.forEach(it=>{
    if(!byProd[it.nama])byProd[it.nama]={qty:0,revenue:0};
    byProd[it.nama].qty+=it.qty; byProd[it.nama].revenue+=it.harga*it.qty;
  }); });
  let prodRows = Object.entries(byProd).sort((a,b)=>b[1].revenue-a[1].revenue).map(([n,v])=>`<tr>
    <td>${n}</td>
    <td style="text-align:center">${v.qty}</td>
    <td class="text-right">${formatRupiah(v.revenue)}</td>
  </tr>`).join('');

  wrap.appendChild(kpiGrid(
    createKpiCard('✅','Transaksi Lunas', lunas.length, `dari ${invs.length} total`,'#1DB954','#e6f9ee'),
    createKpiCard('💰','Total Kas Masuk', formatRupiah(kas.reduce((s,k)=>s+k.jumlah,0)), '','#2255C4','#e8effc'),
    createKpiCard('👥','Total Pelanggan', custs.length, `${custs.filter(c=>c.poin>0).length} sudah bertransaksi`,'#F59E0B','#FEF3C7'),
    createKpiCard('📦','Total Produk', prods.length, '4 kategori layanan','#D7263D','#fde8eb')
  ));

  const twoCol = document.createElement('div');
  twoCol.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:16px';
  twoCol.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Pendapatan per Kategori</span></div>
      <div class="card-body"><div class="table-wrap"><table>
        <thead><tr><th>Kategori</th><th style="text-align:center">Qty</th><th class="text-right">Pendapatan</th></tr></thead>
        <tbody>${katRows||'<tr><td colspan="3" style="text-align:center;color:#aaa">Belum ada data</td></tr>'}</tbody>
      </table></div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Produk Terlaris</span></div>
      <div class="card-body"><div class="table-wrap"><table>
        <thead><tr><th>Produk</th><th style="text-align:center">Terjual</th><th class="text-right">Pendapatan</th></tr></thead>
        <tbody>${prodRows||'<tr><td colspan="3" style="text-align:center;color:#aaa">Belum ada data</td></tr>'}</tbody>
      </table></div></div>
    </div>`;
  wrap.appendChild(twoCol);
  return wrap;
}

// ── TAB 2: RINCIAN PENDAPATAN ──
function renderLaporanRincianPendapatan() {
  const wrap = document.createElement('div');

  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center';
  filterBar.innerHTML = `
    <label style="font-size:.82rem;font-weight:600">Dari</label>
    <input type="date" id="rincianDari" onchange="renderRincianTable()">
    <label style="font-size:.82rem;font-weight:600">Sampai</label>
    <input type="date" id="rincianSampai" onchange="renderRincianTable()">
    <label style="font-size:.82rem;font-weight:600">Kategori</label>
    <select id="rincianKategori" onchange="renderRincianTable()">
      <option value="Semua">Semua Kategori</option>
      <option value="Self Photo">Self Photo</option>
      <option value="Group Photo">Group Photo</option>
      <option value="Graduation">Graduation</option>
      <option value="Pass Photo">Pass Photo</option>
    </select>
    <div style="display:flex;gap:8px;margin-left:auto">
      <button class="btn btn-outline btn-sm" onclick="exportRincianExcel()">📤 Excel</button>
      <button class="btn btn-outline btn-sm" onclick="exportRincianPDF()">🖨️ PDF (Landscape)</button>
    </div>
  `;
  wrap.appendChild(filterBar);

  const tableWrap = document.createElement('div');
  tableWrap.id = 'rincianTableWrap';
  wrap.appendChild(tableWrap);

  window.getRincianRows = () => {
    const dari = document.getElementById('rincianDari')?.value;
    const sampai = document.getElementById('rincianSampai')?.value;
    const kat = document.getElementById('rincianKategori')?.value || 'Semua';
    let invs = DB.getInvoices().filter(i=>i.status==='Lunas');
    if (dari) invs = invs.filter(i=>i.tanggal>=dari);
    if (sampai) invs = invs.filter(i=>i.tanggal<=sampai);
    if (kat!=='Semua') invs = invs.filter(i=>i.items.some(it=>{const p=DB.getProduct(it.produkId); return p&&p.kategori===kat;}));
    return [...invs].sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
  };

  window.renderRincianTable = () => {
    const invs = getRincianRows();
    let rows = invs.map(i => `<tr>
      <td>${formatDate(i.tanggal)}</td>
      <td><strong>${i.id}</strong></td>
      <td>${i.customerNama}</td>
      <td>${i.items.map(x=>x.nama).join(', ')}</td>
      <td class="text-right">${formatRupiah(i.total)}</td>
    </tr>`).join('');
    const total = invs.reduce((s,i)=>s+i.total,0);
    tableWrap.innerHTML = `<div class="card"><div class="card-header"><span class="card-title">Rincian Pendapatan per Transaksi</span></div><div class="card-body">
      <div class="table-wrap"><table>
        <thead><tr><th>Tanggal</th><th>Invoice</th><th>Pelanggan</th><th>Paket</th><th class="text-right">Total</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#aaa">Tidak ada data</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4" style="text-align:right;font-weight:700">Total Pendapatan</td><td class="text-right" style="font-weight:700">${formatRupiah(total)}</td></tr></tfoot>
      </table></div>
    </div></div>`;
  };
  renderRincianTable();

  // Rekap per periode — kalender multifungsi: admin pilih dulu JENIS rekap
  // (Harian / Bulanan / Tahunan), lalu input kalendernya otomatis berubah
  // mengikuti jenis itu (date-picker harian, month-picker bulanan, atau
  // year-picker tahunan). Tabel yang tampil HANYA data sesuai jenis yang
  // diminta — tidak lagi digabung jadi satu tabel berisi hari+bulan+tahun.
  const nowD = new Date();
  const nowDateStr  = nowD.toISOString().slice(0,10);
  const nowMonthStr = nowD.toISOString().slice(0,7);
  const nowYearStr  = String(nowD.getFullYear());

  const periodBar = document.createElement('div');
  periodBar.style.cssText = 'display:flex;gap:12px;align-items:center;margin:24px 0 12px;flex-wrap:wrap;justify-content:space-between;background:var(--white);padding:14px;border-radius:var(--radius);box-shadow:var(--shadow)';
  periodBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <label style="font-size:.85rem;font-weight:700;color:var(--navy);display:flex;align-items:center;gap:6px">
        <span>📅</span> Jenis Rekap:
      </label>
      <select id="rekapJenis" onchange="onRekapJenisChange()" style="padding:8px 12px;border-radius:6px;border:1px solid var(--gray-300);font-family:var(--font);font-size:.88rem">
        <option value="harian">Harian</option>
        <option value="bulanan">Bulanan</option>
        <option value="tahunan">Tahunan</option>
      </select>
      <span id="rekapCalHolder"></span>
      <span style="font-size:.78rem;color:var(--gray-500)">(Pilih jenis rekap, lalu kalender menyesuaikan)</span>
    </div>
    <div style="display:flex;gap:8px;margin-left:auto">
      <button class="btn btn-outline btn-sm" onclick="exportRekapExcel()">📤 Export Excel Rekap</button>
      <button class="btn btn-outline btn-sm" onclick="exportRekapPDF()">🖨️ Export PDF Rekap</button>
    </div>
  `;
  wrap.appendChild(periodBar);

  const rekapWrap = document.createElement('div');
  rekapWrap.id = 'rekapPeriodeWrap';
  wrap.appendChild(rekapWrap);

  // Render ulang input kalender sesuai jenis rekap yang dipilih
  window.onRekapJenisChange = () => {
    const jenis = document.getElementById('rekapJenis')?.value || 'harian';
    const holder = document.getElementById('rekapCalHolder');
    const commonStyle = 'padding:8px 12px;border-radius:6px;border:1px solid var(--gray-300);font-family:var(--font);font-size:.88rem';
    if (jenis === 'harian') {
      holder.innerHTML = `<input type="date" id="rekapCalDate" value="${nowDateStr}" onchange="renderRekapPeriode()" style="${commonStyle}">`;
    } else if (jenis === 'bulanan') {
      holder.innerHTML = `<input type="month" id="rekapCalMonth" value="${nowMonthStr}" onchange="renderRekapPeriode()" style="${commonStyle}">`;
    } else {
      const thisYear = nowD.getFullYear();
      let opts = '';
      for (let y = thisYear + 1; y >= thisYear - 6; y--) opts += `<option value="${y}"${y===thisYear?' selected':''}>${y}</option>`;
      holder.innerHTML = `<select id="rekapCalYear" onchange="renderRekapPeriode()" style="${commonStyle}">${opts}</select>`;
    }
    renderRekapPeriode();
  };

  window.getRekapSummaryData = () => {
    const jenis = document.getElementById('rekapJenis')?.value || 'harian';
    const invs = DB.getInvoices().filter(i => i.status === 'Lunas');

    if (jenis === 'harian') {
      const selectedDate = document.getElementById('rekapCalDate')?.value || nowDateStr;
      const matched = invs.filter(i => i.tanggal === selectedDate);
      return { jenis, label: formatIndoFullDate(selectedDate), total: matched.reduce((s,i)=>s+i.total,0), rows: matched, selectedDate };
    }
    if (jenis === 'bulanan') {
      const selectedMonth = document.getElementById('rekapCalMonth')?.value || nowMonthStr;
      const matched = invs.filter(i => i.tanggal.startsWith(selectedMonth));
      return { jenis, label: formatIndoMonth(selectedMonth), total: matched.reduce((s,i)=>s+i.total,0), rows: matched, selectedMonth };
    }
    const selectedYear = document.getElementById('rekapCalYear')?.value || nowYearStr;
    const matched = invs.filter(i => i.tanggal.startsWith(selectedYear));
    return { jenis, label: 'Tahun ' + selectedYear, total: matched.reduce((s,i)=>s+i.total,0), rows: matched, selectedYear };
  };

  window.renderRekapPeriode = () => {
    const s = getRekapSummaryData();

    // Breakdown mengikuti jenis rekap yang diminta saja, dan sengaja dibuat
    // BERBEDA BENTUK satu sama lain supaya tidak pernah terlihat tertukar:
    // Harian → daftar TRANSAKSI pada hari itu (per invoice);
    // Bulanan → total per KATEGORI layanan dalam bulan itu (bukan per
    //   tanggal — supaya tidak lagi terlihat seperti tampilan Harian);
    // Tahunan → total per BULAN dalam tahun itu.
    let breakdownHead = '';
    let breakdownRows = '';
    if (s.jenis === 'harian') {
      breakdownHead = '<tr><th>Invoice</th><th>Pelanggan</th><th>Paket</th><th class="text-right">Total</th></tr>';
      breakdownRows = s.rows.map(i => `<tr>
        <td><strong>${i.id}</strong></td>
        <td>${i.customerNama}</td>
        <td>${i.items.map(x=>x.nama).join(', ')}</td>
        <td class="text-right">${formatRupiah(i.total)}</td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#aaa">Tidak ada transaksi pada tanggal ini</td></tr>';
    } else if (s.jenis === 'bulanan') {
      const entries = getRekapKategoriMap(s.rows);
      breakdownHead = '<tr><th>Kategori Layanan</th><th class="text-right">Total Pendapatan</th></tr>';
      breakdownRows = entries.map(([k,t]) => `<tr><td>${k}</td><td class="text-right">${formatRupiah(t)}</td></tr>`).join('')
        || '<tr><td colspan="2" style="text-align:center;color:#aaa">Tidak ada transaksi pada bulan ini</td></tr>';
    } else {
      const map = {};
      s.rows.forEach(i => { const m = i.tanggal.slice(0,7); map[m] = (map[m]||0) + i.total; });
      const entries = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
      breakdownHead = '<tr><th>Bulan</th><th class="text-right">Total Pendapatan</th></tr>';
      breakdownRows = entries.map(([m,t]) => `<tr><td>${formatIndoMonth(m)}</td><td class="text-right">${formatRupiah(t)}</td></tr>`).join('')
        || '<tr><td colspan="2" style="text-align:center;color:#aaa">Tidak ada transaksi pada tahun ini</td></tr>';
    }

    const jenisLabel = s.jenis === 'harian' ? '📅 Pendapatan Per Hari' : s.jenis === 'bulanan' ? '🗓️ Pendapatan Per Bulan' : '📆 Pendapatan Per Tahun';

    rekapWrap.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Rekap Pendapatan — ${jenisLabel}</span></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--primary-light);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:14px">
            <div>
              <div style="font-size:.78rem;color:var(--gray-600);font-weight:600">${s.label}</div>
            </div>
            <div style="font-weight:700;color:var(--primary);font-size:1.2rem">${formatRupiah(s.total)}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>${breakdownHead}</thead>
              <tbody>${breakdownRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  setTimeout(() => {
    if (window.onRekapJenisChange) window.onRekapJenisChange();
  }, 50);

  return wrap;
}

window.exportRincianExcel = () => {
  const invs = getRincianRows();
  const rows = invs.map(i=>({ Tanggal:formatDate(i.tanggal), Invoice:i.id, Pelanggan:i.customerNama, Paket:i.items.map(x=>x.nama).join(', '), Total:i.total }));
  downloadExcel('rincian-pendapatan.xlsx', rows, 'Rincian Pendapatan');
};
window.exportRincianPDF = () => {
  const doc = newPDF('landscape');
  doc.setFontSize(14); doc.text('Rincian Pendapatan per Transaksi', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const invs = getRincianRows();
  const rows = invs.map(i=>[formatDate(i.tanggal), i.id, i.customerNama, i.items.map(x=>x.nama).join(', '), formatRupiah(i.total)]);
  doc.autoTable({ startY:26, head:[['Tanggal','Invoice','Pelanggan','Paket','Total']], body: rows });
  doc.save('rincian-pendapatan.pdf');
};
// Kelompokkan invoice per KATEGORI layanan (dipakai khusus utk rekap Bulanan,
// diurutkan dari pendapatan terbesar) — dipusatkan di sini supaya tampilan,
// Excel, dan PDF rekap Bulanan selalu konsisten satu sama lain.
function getRekapKategoriMap(rows) {
  const map = {};
  rows.forEach(i => { i.items.forEach(it => {
    const p = DB.getProduct(it.produkId);
    const kat = (p && p.kategori) || 'Lainnya';
    map[kat] = (map[kat]||0) + (it.harga*it.qty);
  }); });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

// Export mengikuti jenis rekap yang sedang dipilih (Harian/Bulanan/Tahunan)
// saja — bukan gabungan tiga periode, sesuai tabel yang sedang ditampilkan.
window.exportRekapExcel = () => {
  const s = getRekapSummaryData();
  let rows;
  if (s.jenis === 'harian') {
    rows = s.rows.map(i => ({ Invoice:i.id, Pelanggan:i.customerNama, Paket:i.items.map(x=>x.nama).join(', '), Total:i.total }));
  } else if (s.jenis === 'bulanan') {
    rows = getRekapKategoriMap(s.rows).map(([k,t]) => ({ Kategori: k, Total: t }));
  } else {
    const map = {}; s.rows.forEach(i => { const m=i.tanggal.slice(0,7); map[m] = (map[m]||0) + i.total; });
    rows = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,t]) => ({ Bulan: formatIndoMonth(m), Total: t }));
  }
  rows.push({ [Object.keys(rows[0]||{Total:0})[0]||'Total']: 'TOTAL', Total: s.total });
  downloadExcel('rekap-pendapatan.xlsx', rows, 'Rekap Pendapatan');
};
window.exportRekapPDF = () => {
  const doc = newPDF();
  const s = getRekapSummaryData();
  const jenisLabel = s.jenis === 'harian' ? 'Pendapatan Per Hari' : s.jenis === 'bulanan' ? 'Pendapatan Per Bulan' : 'Pendapatan Per Tahun';
  doc.setFontSize(14); doc.text('Rekap ' + jenisLabel, 14, 15);
  doc.setFontSize(9); doc.text('Periode: ' + s.label, 14, 21);
  doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 26);

  let head, body;
  if (s.jenis === 'harian') {
    head = [['Invoice','Pelanggan','Paket','Total']];
    body = s.rows.map(i => [i.id, i.customerNama, i.items.map(x=>x.nama).join(', '), formatRupiah(i.total)]);
  } else if (s.jenis === 'bulanan') {
    head = [['Kategori Layanan','Total Pendapatan']];
    body = getRekapKategoriMap(s.rows).map(([k,t]) => [k, formatRupiah(t)]);
  } else {
    const map = {}; s.rows.forEach(i => { const m=i.tanggal.slice(0,7); map[m] = (map[m]||0) + i.total; });
    head = [['Bulan','Total Pendapatan']];
    body = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,t]) => [formatIndoMonth(m), formatRupiah(t)]);
  }
  doc.autoTable({ startY:31, head, body });
  const finalY = doc.lastAutoTable.finalY || 31;
  doc.setFontSize(11); doc.text('Total: ' + formatRupiah(s.total), 14, finalY + 8);
  doc.save('rekap-pendapatan.pdf');
};

// ── TAB 3: PENGELUARAN KAS ──
function renderLaporanPengeluaran() {
  const wrap = document.createElement('div');

  const formCard = document.createElement('div');
  formCard.className = 'card';
  formCard.style.marginBottom = '20px';
  formCard.innerHTML = `<div class="card-header"><span class="card-title">+ Catat Pengeluaran Kas</span></div>
  <div class="card-body">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end">
      <div class="form-group" style="margin:0"><label>Tanggal</label><input type="date" id="expTanggal" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group" style="margin:0"><label>Jenis Fotografi / Kategori</label>
        <select id="expKategori">${EXPENSE_CATEGORIES.map(k=>`<option value="${k}">${k}</option>`).join('')}</select>
      </div>
      <div class="form-group" style="margin:0"><label>Keterangan</label><input type="text" id="expKeterangan" placeholder="Contoh: Beli lensa 50mm"></div>
      <div class="form-group" style="margin:0"><label>Jumlah (Rp)</label><input type="number" id="expJumlah" placeholder="500000" min="0"></div>
      <button class="btn btn-primary" onclick="saveExpense()">+ Simpan Pengeluaran</button>
    </div>
  </div>`;
  wrap.appendChild(formCard);

  const listWrap = document.createElement('div');
  listWrap.id = 'expenseListWrap';
  wrap.appendChild(listWrap);

  window.saveExpense = () => {
    const tgl = document.getElementById('expTanggal').value;
    const kat = document.getElementById('expKategori').value;
    const ket = document.getElementById('expKeterangan').value.trim();
    const jml = document.getElementById('expJumlah').value;
    if (!tgl || !ket || !jml || +jml <= 0) { showToast('Lengkapi semua data pengeluaran dengan benar!', 'error'); return; }
    DB.addExpense(tgl, kat, ket, jml);
    showToast('Pengeluaran berhasil dicatat ✓', 'success');
    document.getElementById('expKeterangan').value = '';
    document.getElementById('expJumlah').value = '';
    renderExpenseList();
  };

  window.renderExpenseList = () => {
    const exps = [...DB.getExpenses()].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
    const total = exps.reduce((s,e)=>s+e.jumlah,0);
    let rows = exps.map(e=>`<tr>
      <td>${formatDate(e.tanggal)}</td>
      <td><span class="badge badge-gray">${e.kategori}</span></td>
      <td>${e.keterangan}</td>
      <td class="text-right">${formatRupiah(e.jumlah)}</td>
      <td><button class="btn btn-icon btn-sm" onclick="doDeleteExpense('${e.id}')" title="Hapus">🗑</button></td>
    </tr>`).join('');
    listWrap.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <button class="btn btn-outline btn-sm" onclick="exportExpenseExcel()">📤 Excel</button>
      <button class="btn btn-outline btn-sm" onclick="exportExpensePDF()">🖨️ PDF</button>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">Daftar Pengeluaran Kas</span></div><div class="card-body">
      <div class="table-wrap"><table>
        <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="text-right">Jumlah</th><th>Aksi</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#aaa">Belum ada pengeluaran</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">Total Pengeluaran</td><td class="text-right" style="font-weight:700">${formatRupiah(total)}</td><td></td></tr></tfoot>
      </table></div>
    </div></div>`;
  };

  window.doDeleteExpense = (id) => { DB.deleteExpense(id); showToast('Pengeluaran dihapus',''); renderExpenseList(); };

  renderExpenseList();
  return wrap;
}

window.exportExpenseExcel = () => {
  const exps = DB.getExpenses();
  const rows = exps.map(e=>({ Tanggal:formatDate(e.tanggal), Kategori:e.kategori, Keterangan:e.keterangan, Jumlah:e.jumlah }));
  downloadExcel('pengeluaran-kas.xlsx', rows, 'Pengeluaran Kas');
};
window.exportExpensePDF = () => {
  const doc = newPDF();
  doc.setFontSize(14); doc.text('Pengeluaran Kas - E-CRM Studio', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const exps = DB.getExpenses();
  const rows = exps.map(e=>[formatDate(e.tanggal), e.kategori, e.keterangan, formatRupiah(e.jumlah)]);
  doc.autoTable({ startY:26, head:[['Tanggal','Kategori','Keterangan','Jumlah']], body: rows });
  doc.save('pengeluaran-kas.pdf');
};

// ── TAB 4: LABA RUGI (Chart of Accounts) ──
function renderLaporanLabaRugi() {
  const wrap = document.createElement('div');
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap';
  filterBar.innerHTML = `
    <label style="font-size:.82rem;font-weight:600">Dari</label><input type="date" id="labaRugiDari" onchange="renderLabaRugiTable()">
    <label style="font-size:.82rem;font-weight:600">Sampai</label><input type="date" id="labaRugiSampai" onchange="renderLabaRugiTable()">
    <button class="btn btn-outline btn-sm" onclick="exportLabaRugiExcel()">📤 Excel</button>
    <button class="btn btn-outline btn-sm" onclick="exportLabaRugiPDF()">🖨️ PDF</button>
  `;
  wrap.appendChild(filterBar);

  // ── FORM INPUT MANUAL (JURNAL) DENGAN DROPDOWN CHART OF ACCOUNT ──
  const formCard = document.createElement('div');
  formCard.className = 'card';
  formCard.style.marginBottom = '20px';
  formCard.innerHTML = `<div class="card-header"><span class="card-title">+ Input Jurnal Manual (Chart of Account)</span></div>
  <div class="card-body">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;align-items:end">
      <div class="form-group" style="margin:0"><label>Tanggal</label><input type="date" id="jrnTanggal" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group" style="margin:0;grid-column:span 2">
        <label>Chart of Account (Akun)</label>
        <select id="jrnAkun">
          <optgroup label="── PENDAPATAN ──">
            ${COA_PENDAPATAN.map(a=>`<option value="${a}" data-tipe="pendapatan">${a}</option>`).join('')}
          </optgroup>
          <optgroup label="── BEBAN ──">
            ${COA_BEBAN.map(a=>`<option value="${a}" data-tipe="beban">${a}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-group" style="margin:0"><label>Keterangan</label><input type="text" id="jrnKeterangan" placeholder="Contoh: Penyesuaian akhir bulan"></div>
      <div class="form-group" style="margin:0"><label>Jumlah (Rp)</label><input type="number" id="jrnJumlah" placeholder="500000" min="0"></div>
      <button class="btn btn-primary" onclick="saveManualLaba()">+ Simpan Jurnal</button>
    </div>
  </div>`;
  wrap.appendChild(formCard);

  window.saveManualLaba = () => {
    const tgl  = wrap.querySelector('#jrnTanggal').value;
    const akunSel = wrap.querySelector('#jrnAkun');
    const akun = akunSel.value;
    const tipe = akunSel.selectedOptions[0]?.dataset.tipe || 'pendapatan';
    const ket  = wrap.querySelector('#jrnKeterangan').value.trim();
    const jml  = wrap.querySelector('#jrnJumlah').value;
    if (!tgl || !akun || !ket || !jml || +jml <= 0) { showToast('Lengkapi semua data jurnal dengan benar!', 'error'); return; }
    DB.addManualLaba(tgl, tipe, akun, ket, jml);
    showToast('Jurnal manual berhasil disimpan ✓', 'success');
    wrap.querySelector('#jrnKeterangan').value = '';
    wrap.querySelector('#jrnJumlah').value = '';
    renderLabaRugiTable();
  };

  window.doDeleteManualLaba = (id) => { DB.deleteManualLaba(id); showToast('Jurnal manual dihapus',''); renderLabaRugiTable(); };

  const tableWrap = document.createElement('div');
  tableWrap.id = 'labaRugiWrap';
  wrap.appendChild(tableWrap);

  window.getLabaRugiData = () => {
    const dari = wrap.querySelector('#labaRugiDari')?.value;
    const sampai = wrap.querySelector('#labaRugiSampai')?.value;
    let invs = DB.getInvoices().filter(i=>i.status==='Lunas');
    if (dari) invs = invs.filter(i=>i.tanggal>=dari);
    if (sampai) invs = invs.filter(i=>i.tanggal<=sampai);
    let exps = DB.getExpenses();
    if (dari) exps = exps.filter(e=>e.tanggal>=dari);
    if (sampai) exps = exps.filter(e=>e.tanggal<=sampai);
    let manual = DB.getManualLaba();
    if (dari) manual = manual.filter(m=>m.tanggal>=dari);
    if (sampai) manual = manual.filter(m=>m.tanggal<=sampai);

    const revByKat = {};
    invs.forEach(i => i.items.forEach(it => {
      const p = DB.getProduct(it.produkId); const kat = p ? p.kategori : 'Lainnya';
      revByKat[kat] = (revByKat[kat]||0) + it.harga*it.qty;
    }));
    const expByKat = {};
    exps.forEach(e => { expByKat[e.kategori] = (expByKat[e.kategori]||0) + e.jumlah; });

    const manualRev = manual.filter(m=>m.tipe==='pendapatan');
    const manualExp = manual.filter(m=>m.tipe==='beban');
    const manualRevTotal = manualRev.reduce((s,m)=>s+m.jumlah,0);
    const manualExpTotal = manualExp.reduce((s,m)=>s+m.jumlah,0);

    const totalRev = Object.values(revByKat).reduce((s,v)=>s+v,0) + manualRevTotal;
    const totalExp = Object.values(expByKat).reduce((s,v)=>s+v,0) + manualExpTotal;
    return { revByKat, expByKat, manualRev, manualExp, totalRev, totalExp, laba: totalRev-totalExp };
  };

  window.renderLabaRugiTable = () => {
    const { revByKat, expByKat, manualRev, manualExp, totalRev, totalExp, laba } = getLabaRugiData();
    const revRows = Object.entries(revByKat).map(([k,v])=>`<tr><td>Pendapatan Jasa ${k}</td><td class="text-right">${formatRupiah(v)}</td></tr>`).join('');
    const manualRevRows = manualRev.map(m=>`<tr>
      <td>${m.akun} <span class="text-muted text-xs">— ${m.keterangan} (${formatDate(m.tanggal)})</span></td>
      <td class="text-right">${formatRupiah(m.jumlah)} <button class="btn btn-icon btn-sm" onclick="doDeleteManualLaba('${m.id}')" title="Hapus">🗑</button></td>
    </tr>`).join('');
    const expRows = Object.entries(expByKat).map(([k,v])=>`<tr><td>Beban ${k}</td><td class="text-right">${formatRupiah(v)}</td></tr>`).join('');
    const manualExpRows = manualExp.map(m=>`<tr>
      <td>${m.akun} <span class="text-muted text-xs">— ${m.keterangan} (${formatDate(m.tanggal)})</span></td>
      <td class="text-right">${formatRupiah(m.jumlah)} <button class="btn btn-icon btn-sm" onclick="doDeleteManualLaba('${m.id}')" title="Hapus">🗑</button></td>
    </tr>`).join('');
    tableWrap.innerHTML = `<div class="card"><div class="card-header"><span class="card-title">Laporan Laba Rugi</span></div><div class="card-body">
      <h3 style="font-size:.88rem;color:var(--navy);margin-bottom:8px">PENDAPATAN</h3>
      <table style="width:100%;margin-bottom:16px"><tbody>${(revRows||manualRevRows)?'':'<tr><td colspan="2" style="color:#aaa">Tidak ada pendapatan</td></tr>'}
        ${revRows}${manualRevRows}
        <tr style="border-top:2px solid var(--gray-300)"><td style="font-weight:700;padding-top:6px">Total Pendapatan</td><td class="text-right" style="font-weight:700;padding-top:6px">${formatRupiah(totalRev)}</td></tr>
      </tbody></table>
      <h3 style="font-size:.88rem;color:var(--navy);margin-bottom:8px">BEBAN / PENGELUARAN</h3>
      <table style="width:100%;margin-bottom:16px"><tbody>${(expRows||manualExpRows)?'':'<tr><td colspan="2" style="color:#aaa">Tidak ada beban</td></tr>'}
        ${expRows}${manualExpRows}
        <tr style="border-top:2px solid var(--gray-300)"><td style="font-weight:700;padding-top:6px">Total Beban</td><td class="text-right" style="font-weight:700;padding-top:6px">${formatRupiah(totalExp)}</td></tr>
      </tbody></table>
      <hr class="divider">
      <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:800;color:${laba>=0?'var(--green)':'var(--red)'}">
        <span>LABA / RUGI BERSIH</span><span>${formatRupiah(laba)}</span>
      </div>
    </div></div>`;
  };
  renderLabaRugiTable();
  return wrap;
}

window.exportLabaRugiExcel = () => {
  const { revByKat, expByKat, manualRev, manualExp, totalRev, totalExp, laba } = getLabaRugiData();
  const rows = [];
  rows.push({ Akun:'PENDAPATAN', Jumlah:'' });
  Object.entries(revByKat).forEach(([k,v])=>rows.push({ Akun:'Pendapatan Jasa '+k, Jumlah:v }));
  manualRev.forEach(m=>rows.push({ Akun:m.akun+' (Manual - '+m.keterangan+')', Jumlah:m.jumlah }));
  rows.push({ Akun:'Total Pendapatan', Jumlah:totalRev });
  rows.push({ Akun:'BEBAN', Jumlah:'' });
  Object.entries(expByKat).forEach(([k,v])=>rows.push({ Akun:'Beban '+k, Jumlah:v }));
  manualExp.forEach(m=>rows.push({ Akun:m.akun+' (Manual - '+m.keterangan+')', Jumlah:m.jumlah }));
  rows.push({ Akun:'Total Beban', Jumlah:totalExp });
  rows.push({ Akun:'LABA/RUGI BERSIH', Jumlah:laba });
  downloadExcel('laporan-laba-rugi.xlsx', rows, 'Laba Rugi');
};
window.exportLabaRugiPDF = () => {
  const doc = newPDF();
  doc.setFontSize(16); doc.text('LAPORAN LABA RUGI', 14, 15);
  doc.setFontSize(10); doc.text('E-CRM Studio', 14, 21);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 26);
  const { revByKat, expByKat, manualRev, manualExp, totalRev, totalExp, laba } = getLabaRugiData();
  const body = [];
  body.push([{ content:'PENDAPATAN', colSpan:2, styles:{fontStyle:'bold'} }]);
  Object.entries(revByKat).forEach(([k,v])=>body.push(['Pendapatan Jasa '+k, formatRupiah(v)]));
  manualRev.forEach(m=>body.push([m.akun+' (Manual - '+m.keterangan+')', formatRupiah(m.jumlah)]));
  body.push([{ content:'Total Pendapatan', styles:{fontStyle:'bold'} }, { content:formatRupiah(totalRev), styles:{fontStyle:'bold'} }]);
  body.push([{ content:'BEBAN', colSpan:2, styles:{fontStyle:'bold'} }]);
  Object.entries(expByKat).forEach(([k,v])=>body.push(['Beban '+k, formatRupiah(v)]));
  manualExp.forEach(m=>body.push([m.akun+' (Manual - '+m.keterangan+')', formatRupiah(m.jumlah)]));
  body.push([{ content:'Total Beban', styles:{fontStyle:'bold'} }, { content:formatRupiah(totalExp), styles:{fontStyle:'bold'} }]);
  body.push([{ content:'LABA / RUGI BERSIH', styles:{fontStyle:'bold'} }, { content:formatRupiah(laba), styles:{fontStyle:'bold'} }]);
  doc.autoTable({ startY:32, head:[['Akun','Jumlah']], body });
  doc.save('laporan-laba-rugi.pdf');
};

// ── TAB 5: KAS MASUK & KELUAR ──
function renderLaporanKasFlow() {
  const wrap = document.createElement('div');
  const kas  = DB.getKas().map(k=>({ tanggal:k.tanggal, tipe:'Masuk', keterangan:`Pembayaran ${k.invoiceId} - ${k.customerNama}`, jumlah:k.jumlah }));
  const exps = DB.getExpenses().map(e=>({ tanggal:e.tanggal, tipe:'Keluar', keterangan:`${e.kategori} - ${e.keterangan}`, jumlah:-e.jumlah }));
  const all  = [...kas, ...exps].sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
  let saldo = 0;
  const rows = all.map(x => { saldo += x.jumlah; return { ...x, saldo }; });

  const totalMasuk  = kas.reduce((s,k)=>s+k.jumlah,0);
  const totalKeluar = exps.reduce((s,e)=>s+Math.abs(e.jumlah),0);

  wrap.appendChild(kpiGrid(
    createKpiCard('⬆️','Total Pemasukan', formatRupiah(totalMasuk), 'Dari transaksi lunas', '#1DB954','#e6f9ee'),
    createKpiCard('⬇️','Total Pengeluaran', formatRupiah(totalKeluar), 'Beban operasional', '#D7263D','#fde8eb'),
    createKpiCard('💰','Saldo Kas', formatRupiah(totalMasuk-totalKeluar), 'Posisi kas saat ini', '#2255C4','#e8effc')
  ));

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;margin:16px 0';
  btnRow.innerHTML = `<button class="btn btn-outline btn-sm" onclick="exportKasFlowExcel()">📤 Excel</button><button class="btn btn-outline btn-sm" onclick="exportKasFlowPDF()">🖨️ PDF</button>`;
  wrap.appendChild(btnRow);

  let tableRows = rows.map(r=>`<tr>
    <td>${formatDate(r.tanggal)}</td>
    <td><span class="badge ${r.tipe==='Masuk'?'badge-green':'badge-red'}">${r.tipe}</span></td>
    <td>${r.keterangan}</td>
    <td class="text-right" style="color:${r.jumlah>=0?'var(--green)':'var(--red)'}">${r.jumlah>=0?'+':''}${formatRupiah(Math.abs(r.jumlah))}</td>
    <td class="text-right" style="font-weight:700">${formatRupiah(r.saldo)}</td>
  </tr>`).join('');
  wrap.appendChild(createCard('Riwayat Kas Masuk & Keluar', `
    <div class="table-wrap"><table>
      <thead><tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th class="text-right">Jumlah</th><th class="text-right">Saldo</th></tr></thead>
      <tbody>${tableRows||'<tr><td colspan="5" style="text-align:center;color:#aaa">Belum ada data kas</td></tr>'}</tbody>
    </table></div>`));

  window.getKasFlowRows = () => rows;
  return wrap;
}
window.exportKasFlowExcel = () => {
  const rows = getKasFlowRows().map(r=>({ Tanggal:formatDate(r.tanggal), Tipe:r.tipe, Keterangan:r.keterangan, Jumlah:r.jumlah, Saldo:r.saldo }));
  downloadExcel('kas-masuk-keluar.xlsx', rows, 'Kas Masuk Keluar');
};
window.exportKasFlowPDF = () => {
  const doc = newPDF();
  doc.setFontSize(14); doc.text('Laporan Kas Masuk & Keluar', 14, 15);
  doc.setFontSize(9); doc.text('Dicetak: '+new Date().toLocaleString('id-ID'), 14, 21);
  const rows = getKasFlowRows().map(r=>[formatDate(r.tanggal), r.tipe, r.keterangan, formatRupiah(r.jumlah), formatRupiah(r.saldo)]);
  doc.autoTable({ startY:26, head:[['Tanggal','Tipe','Keterangan','Jumlah','Saldo']], body: rows });
  doc.save('kas-masuk-keluar.pdf');
};


