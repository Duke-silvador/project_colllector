

/* ===== data.js ===== */
/* ============================================================
   E-CRM Studio — data.js  v5
   Photo Studio Booking System
   - Slot per jam, maks 2 sesi/jam
   - DP 50% untuk Group Photo & Graduation
   - Full payment untuk Self Photo
   ============================================================ */

'use strict';

const STUDIO_HOURS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
const MAX_PER_SLOT = 2;
const DP_CATEGORIES = ['Group Photo','Graduation'];

// ── LOKASI STUDIO ──────────────────────────────────────────
const LOKASI_STUDIO = [
  {
    id: 'pusat',
    nama: 'Studio Pusat — Karangploso',
    alamat: 'Jl. Raya Kertanegara, RT.003/RW.001, Karangploso, Girimoyo, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65151',
    lat: -7.89965,
    lng: 112.59752
  },
  {
    id: 'dinoyo',
    nama: 'Cabang Dinoyo',
    alamat: 'Ruko Gajayana, Jl. Simpang Gajayana No.Kav.P, Dinoyo, Kec. Lowokwaru, Kota Malang, Jawa Timur 65144',
    lat: -7.95252,
    lng: 112.60741
  }
];
function getLokasiById(id) { return LOKASI_STUDIO.find(l => l.id === id) || LOKASI_STUDIO[0]; }

// Ulasan contoh (seed) — bukti sosial awal
const DEFAULT_ULASAN = [
  { id:'RV001', customerId:'C001', customerNama:'Dinda A.', invoiceId:'INV-DEMO-1', produk:'Self Photo Reguler', lokasi:'pusat', rating:5, komentar:'Hasil fotonya bagus banget, studionya bersih dan stafnya ramah. Puas banget!', tanggal:'2025-11-02', waktu:'2025-11-02 14:20' },
  { id:'RV002', customerId:'C002', customerNama:'Raka P.', invoiceId:'INV-DEMO-2', produk:'Paket Keluarga', lokasi:'dinoyo', rating:5, komentar:'Prosesnya cepat, hasil cetaknya rapi. Bakal booking lagi buat acara ulang tahun.', tanggal:'2025-11-10', waktu:'2025-11-10 10:05' },
  { id:'RV003', customerId:'C003', customerNama:'Sinta W.', invoiceId:'INV-DEMO-3', produk:'Self Photo Couple', lokasi:'pusat', rating:4, komentar:'Bagus, cuma agak antre pas weekend. Overall recommended.', tanggal:'2025-11-15', waktu:'2025-11-15 16:40' }
];
function mapsUrlFor(alamat) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(alamat); }
function mapsDirectionsUrlFor(alamat) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(alamat); }
function mapsEmbedUrlFor(alamat, zoom) {
  return 'https://maps.google.com/maps?q=' + encodeURIComponent(alamat) + '&t=&z=' + (zoom || 16) + '&ie=UTF8&iwloc=&output=embed';
}



// ── STANDARD GOOGLE MAPS EMBED IFRAME (BEBAS ERROR POPUP, 100% BEBAS API KEY) ──
function renderStandardMapEmbed(lokasiId, customHeight) {
  const l = getLokasiById(lokasiId);
  const h = customHeight || '160px';
  return `
    <div class="google-map-embed-wrap" style="height:${h};width:100%;border-radius:12px;overflow:hidden;position:relative;background:#e2e8f0;border:1px solid var(--gray-200);">
      <iframe
        src="${mapsEmbedUrlFor(l.alamat, 16)}"
        title="Peta Lokasi ${l.nama}"
        width="100%"
        height="100%"
        style="border:0;width:100%;height:100%;display:block;border-radius:12px;pointer-events:auto;"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen>
      </iframe>
    </div>
  `;
}

// ── PREVIEW PETA STATIS RINGAN (0 ms loading, 0 KB iframe overhead, responsif mobile) ──
function renderStaticMapPreview(lokasiId, customHeight) {
  const l = getLokasiById(lokasiId);
  const height = customHeight || '120px';
  const mapsSearchUrl = mapsUrlFor(l.alamat);
  
  const isPusat = l.id === 'pusat';
  const roadColor = '#ffffff';
  const roadBorder = '#d4dbe4';
  const majorRoadColor = '#fde68a';
  const majorRoadBorder = '#f59e0b';
  const parkColor = '#dcfce7';
  const waterColor = '#e0f2fe';
  const buildingColor = '#e2e8f0';

  return `
    <div class="static-map-container" style="height:${height};position:relative;border-radius:8px;overflow:hidden;background:#f1f5f9;cursor:pointer;border:1px solid var(--gray-200);user-select:none" onclick="window.open('${mapsSearchUrl}','_blank','noopener,noreferrer')" title="Ketuk untuk membuka Google Maps di HP">
      <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" style="display:block;width:100%;height:100%">
        <rect width="400" height="150" fill="#edf2f7"/>
        ${isPusat ? `
          <path d="M0,0 L120,0 L100,50 L30,60 Z" fill="${parkColor}" opacity="0.85"/>
          <path d="M280,80 L390,70 L400,150 L260,150 Z" fill="${parkColor}" opacity="0.85"/>
          <path d="M10,90 Q50,110 110,95 L120,150 L0,150 Z" fill="${parkColor}" opacity="0.6"/>
        ` : `
          <path d="M0,0 L80,0 L60,80 L0,70 Z" fill="${parkColor}" opacity="0.85"/>
          <path d="M300,10 L390,0 L400,90 L290,70 Z" fill="${parkColor}" opacity="0.85"/>
          <path d="M120,100 L240,110 L230,150 L110,150 Z" fill="${parkColor}" opacity="0.6"/>
        `}
        <path d="${isPusat ? 'M-10,35 Q100,45 200,30 T410,20' : 'M-10,130 Q120,110 220,125 T410,115'}" fill="none" stroke="${waterColor}" stroke-width="12" stroke-linecap="round"/>
        <rect x="50" y="20" width="40" height="24" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <rect x="110" y="15" width="55" height="28" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <rect x="230" y="25" width="50" height="30" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <rect x="60" y="70" width="45" height="35" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <rect x="260" y="75" width="60" height="28" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <rect x="135" y="95" width="45" height="25" rx="2" fill="${buildingColor}" opacity="0.7"/>
        <line x1="30" y1="0" x2="45" y2="150" stroke="${roadBorder}" stroke-width="5"/>
        <line x1="30" y1="0" x2="45" y2="150" stroke="${roadColor}" stroke-width="3.5"/>
        <line x1="120" y1="0" x2="110" y2="150" stroke="${roadBorder}" stroke-width="5"/>
        <line x1="120" y1="0" x2="110" y2="150" stroke="${roadColor}" stroke-width="3.5"/>
        <line x1="280" y1="0" x2="270" y2="150" stroke="${roadBorder}" stroke-width="5"/>
        <line x1="280" y1="0" x2="270" y2="150" stroke="${roadColor}" stroke-width="3.5"/>
        <line x1="350" y1="0" x2="365" y2="150" stroke="${roadBorder}" stroke-width="5"/>
        <line x1="350" y1="0" x2="365" y2="150" stroke="${roadColor}" stroke-width="3.5"/>
        <line x1="0" y1="120" x2="400" y2="120" stroke="${roadBorder}" stroke-width="5"/>
        <line x1="0" y1="120" x2="400" y2="120" stroke="${roadColor}" stroke-width="3.5"/>
        <path d="${isPusat ? 'M-10,75 C100,70 180,85 410,72' : 'M-10,65 C120,68 250,55 410,68'}" fill="none" stroke="${majorRoadBorder}" stroke-width="9" stroke-linecap="round"/>
        <path d="${isPusat ? 'M-10,75 C100,70 180,85 410,72' : 'M-10,65 C120,68 250,55 410,68'}" fill="none" stroke="${majorRoadColor}" stroke-width="6" stroke-linecap="round"/>
        <path d="M190,-10 L205,160" fill="none" stroke="${roadBorder}" stroke-width="9" stroke-linecap="round"/>
        <path d="M190,-10 L205,160" fill="none" stroke="${roadColor}" stroke-width="6" stroke-linecap="round"/>
        <g transform="translate(198, 62)">
          <circle cx="0" cy="0" r="14" fill="#D7263D" opacity="0.25">
            <animate attributeName="r" values="10;18;10" dur="2.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.35;0.05;0.35" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="2" r="5" fill="rgba(0,0,0,0.22)"/>
          <path d="M0,0 C-6,-6 -8,-12 -8,-17 C-8,-23 -3,-27 0,-27 C3,-27 8,-23 8,-17 C8,-12 6,-6 0,0 Z" fill="#D7263D"/>
          <circle cx="0" cy="-17" r="3" fill="#ffffff"/>
        </g>
      </svg>
      <div style="position:absolute;top:8px;left:8px;background:rgba(255,255,255,0.94);backdrop-filter:blur(4px);padding:3px 8px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.12);display:flex;align-items:center;gap:5px;max-width:calc(100% - 16px);pointer-events:none">
        <span style="font-size:.85rem;line-height:1">📍</span>
        <span style="font-weight:700;font-size:.73rem;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.nama}</span>
      </div>
      <div style="position:absolute;bottom:6px;right:8px;background:rgba(15,23,42,0.78);color:#fff;font-size:.65rem;font-weight:600;padding:3px 7px;border-radius:4px;display:flex;align-items:center;gap:4px;backdrop-filter:blur(2px);pointer-events:none">
        <span>🗺️ Ketuk untuk Buka Maps</span>
      </div>
    </div>
  `;
}

// ── PETA GOOGLE MAPS: RESPONSIF DIPERBESAR DENGAN MOUSE / JARI ──
// Google membatasi peta embed gratis supaya TIDAK bisa di-zoom langsung dengan
// scroll mouse biasa (wajib Ctrl+scroll) — ini pembatasan dari pihak Google,
// bukan bug pada halaman ini, dan berlaku untuk semua peta embed gratis di
// internet manapun. Karena peta berjalan di iframe terpisah (cross-origin),
// halaman ini tidak bisa "menembus" ke dalam iframe untuk mengubah perilaku
// ── INTERAKSI PETA STANDAR LANGSUNG (TANPA OVERLAY PENGHALANG SENTUHAN) ──
// iFrame Google Maps standar langsung menerima interaksi 2 jari (pinch zoom) di HP,
// scroll mouse di desktop, dan pan/geser tanpa lapisan overlay yang memblokir.
function mapEmbedBlock(iframeId, lokasiId, iframeStyle) {
  const l = getLokasiById(lokasiId);
  const style = iframeStyle || 'border:0;width:100%;height:160px;display:block;border-radius:12px;pointer-events:auto;';
  return `
    <div class="google-map-embed-wrap" style="width:100%;border-radius:12px;overflow:hidden;position:relative;background:#e2e8f0;border:1px solid var(--gray-200);pointer-events:auto;">
      <iframe id="${iframeId || ''}" src="${mapsEmbedUrlFor(l.alamat, 16)}" style="${style}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>
  `;
}

// Kategori pengeluaran kas terkait kebutuhan operasional fotografi studio
const EXPENSE_CATEGORIES = [
  'Peralatan Kamera & Lensa',
  'Sewa Studio & Listrik',
  'Cetak & Bahan Foto (Kertas/Tinta)',
  'Props & Kostum',
  'Gaji Fotografer/Crew',
  'Marketing & Promosi',
  'Maintenance Alat',
  'Lainnya'
];

// Chart of Account (COA) untuk input manual Laporan Laba Rugi
const COA_PENDAPATAN = [
  'Pendapatan Jasa Self Photo',
  'Pendapatan Jasa Group Photo',
  'Pendapatan Jasa Graduation',
  'Pendapatan Jasa Pass Photo',
  'Pendapatan Sewa Alat',
  'Pendapatan Jasa Editing Tambahan',
  'Pendapatan Lain-lain'
];
const COA_BEBAN = [
  'Beban Peralatan Kamera & Lensa',
  'Beban Sewa Studio & Listrik',
  'Beban Cetak & Bahan Foto (Kertas/Tinta)',
  'Beban Props & Kostum',
  'Beban Gaji Fotografer/Crew',
  'Beban Marketing & Promosi',
  'Beban Maintenance Alat',
  'Beban Administrasi & Bank',
  'Beban Penyusutan Peralatan',
  'Beban Lain-lain'
];

const DEFAULT_USERS = [
  { id:'U001', email:'admin@ecrm.com',    password:'admin123', role:'admin',    name:'Admin E-CRM' },
  { id:'C001', email:'andi@ecrm.com',     password:'123456',   role:'customer', name:'Andi Pratama' },
  { id:'C002', email:'siti@example.com',  password:'123456',   role:'customer', name:'Siti Rahma' },
  { id:'C003', email:'budi@example.com',  password:'123456',   role:'customer', name:'Budi Santoso' },
  { id:'C004', email:'nadia@example.com', password:'123456',   role:'customer', name:'Nadia Putri' },
];

const DEFAULT_CUSTOMERS = [
  { id:'C001', nama:'Andi Pratama',  email:'andi@ecrm.com',    hp:'081234567890', totalBelanja:605000,  poin:60,  status:'Active Customer' },
  { id:'C002', nama:'Siti Rahma',    email:'siti@example.com', hp:'082345678901', totalBelanja:1530000, poin:153, status:'Loyal Customer'  },
  { id:'C003', nama:'Budi Santoso',  email:'budi@example.com', hp:'083456789012', totalBelanja:0,       poin:0,   status:'New Customer'    },
  { id:'C004', nama:'Nadia Putri',   email:'nadia@example.com',hp:'084567890123', totalBelanja:0,       poin:0,   status:'New Customer'    },
];

/*
  ── PRODUK ─────────────────────────────────────────────────
  ① Self Photo    → Pembayaran PENUH di muka
  ② Group Photo   → DP 50%, pelunasan saat/setelah sesi
  ③ Graduation    → DP 50%, pelunasan saat/setelah sesi
*/
const DEFAULT_PRODUCTS = [
  {
    id:'P001', nama:'Self Photo Reguler', kategori:'Self Photo', harga:75000, stok:50, icon:'🤳',
    deskripsi:'1 orang · 1 background pilihan · Durasi 30 menit · Cetak 4R 1 lembar.',
    includes:['1 Background','30 Menit Sesi','Cetak 4R 1 Lembar'],
    paymentNote:'Pembayaran penuh di muka'
  },
  {
    id:'P002', nama:'Self Photo Premium', kategori:'Self Photo', harga:125000, stok:30, icon:'📸',
    deskripsi:'1 orang · 2 background pilihan · Durasi 45 menit · Cetak 4R 2 lembar + soft file HD.',
    includes:['2 Background','45 Menit Sesi','Cetak 4R 2 Lembar','Soft File HD'],
    paymentNote:'Pembayaran penuh di muka'
  },
  {
    id:'P003', nama:'Group Photo Small (2–4 Orang)', kategori:'Group Photo', harga:180000, stok:40, icon:'👥',
    deskripsi:'2–4 orang · 1 background pilihan · Durasi 45 menit · Cetak 4R 1 lembar per orang.',
    includes:['2–4 Orang','1 Background','45 Menit Sesi','Cetak 4R per Orang'],
    paymentNote:'DP 50% saat booking · Pelunasan saat/setelah sesi'
  },
  {
    id:'P004', nama:'Group Photo Large (5–10 Orang)', kategori:'Group Photo', harga:320000, stok:25, icon:'🫂',
    deskripsi:'5–10 orang · 2 background pilihan · Durasi 60 menit · Cetak 4R per orang + soft file.',
    includes:['5–10 Orang','2 Background','60 Menit Sesi','Cetak 4R per Orang','Soft File HD'],
    paymentNote:'DP 50% saat booking · Pelunasan saat/setelah sesi'
  },
  {
    id:'P005', nama:'Graduation Basic', kategori:'Graduation', harga:200000, stok:20, icon:'🎓',
    deskripsi:'1 wisudawan · Toga disediakan · 1 background formal · Durasi 45 menit · Cetak 4R 2 lembar.',
    includes:['1 Wisudawan','Toga Disediakan','1 Background Formal','45 Menit Sesi','Cetak 4R 2 Lembar'],
    paymentNote:'DP 50% saat booking · Pelunasan saat/setelah sesi'
  },
  {
    id:'P006', nama:'Graduation Premium', kategori:'Graduation', harga:350000, stok:15, icon:'🏆',
    deskripsi:'1 wisudawan · Toga disediakan · 3 background · Durasi 60 menit · Cetak 4R 4 lembar + frame + soft file.',
    includes:['1 Wisudawan','Toga Disediakan','3 Background','60 Menit Sesi','Cetak 4R 4 Lembar','Frame Foto','Soft File HD'],
    paymentNote:'DP 50% saat booking · Pelunasan saat/setelah sesi'
  },
  {
    id:'P007', nama:'Graduation Family', kategori:'Graduation', harga:500000, stok:12, icon:'👨‍👩‍👧‍👦',
    deskripsi:'Wisudawan + keluarga (maks 6 orang) · 2 background · Durasi 75 menit · Cetak 4R per orang + soft file.',
    includes:['Wisudawan + Keluarga (maks 6)','Toga Disediakan','2 Background','75 Menit Sesi','Cetak 4R per Orang','Soft File HD'],
    paymentNote:'DP 50% saat booking · Pelunasan saat/setelah sesi'
  },
  /*
    ── PASS PHOTO ────────────────────────────────────────────
    Foto untuk dokumen resmi (KTP, paspor, ijazah, dll.)
    Pembayaran PENUH di muka (seperti Self Photo)
    Ukuran standar Indonesia:
      2×3 cm → KTP, SIM, kartu pelajar
      3×4 cm → ijazah, SKCK, lamaran kerja
      4×6 cm → paspor, visa, buku nikah
  */
  {
    id:'P008', nama:'Pass Photo 2×3', kategori:'Pass Photo', harga:20000, stok:100, icon:'🪪',
    deskripsi:'Ukuran 2×3 cm · Latar merah/biru · Cetak 4 lembar · Cocok untuk KTP, SIM, kartu pelajar.',
    includes:['Ukuran 2×3 cm','Latar Merah/Biru','Cetak 4 Lembar','File Digital'],
    paymentNote:'Pembayaran penuh di muka'
  },
  {
    id:'P009', nama:'Pass Photo 3×4', kategori:'Pass Photo', harga:20000, stok:100, icon:'🪪',
    deskripsi:'Ukuran 3×4 cm · Latar merah/biru · Cetak 4 lembar · Cocok untuk ijazah, SKCK, lamaran kerja.',
    includes:['Ukuran 3×4 cm','Latar Merah/Biru','Cetak 4 Lembar','File Digital'],
    paymentNote:'Pembayaran penuh di muka'
  },
  {
    id:'P010', nama:'Pass Photo 4×6', kategori:'Pass Photo', harga:25000, stok:100, icon:'🛂',
    deskripsi:'Ukuran 4×6 cm · Latar putih/merah/biru · Cetak 4 lembar · Cocok untuk paspor, visa, buku nikah.',
    includes:['Ukuran 4×6 cm','Latar Putih/Merah/Biru','Cetak 4 Lembar','File Digital'],
    paymentNote:'Pembayaran penuh di muka'
  },
];

/*
  ── INVOICES ───────────────────────────────────────────────
  Contoh jadwal agar terlihat slot penuh:
  → 2026-09-05 jam 09:00 : INV001 + INV002  → PENUH
  → 2026-09-15 jam 10:00 : INV003 + INV004  → PENUH

  Alur status DP:
    'Menunggu DP'
    → 'Menunggu Konfirmasi DP'
    → 'DP Terkonfirmasi'
    → 'Menunggu Pelunasan'      (tombol dari customer side)
    → 'Menunggu Konfirmasi Pelunasan'
    → 'Lunas'

  Alur status FULL (Self Photo only):
    'Menunggu Pembayaran'
    → 'Menunggu Konfirmasi'
    → 'Lunas'
*/
const DEFAULT_INVOICES = [
  {
    id:'INV001', customerId:'C001', customerNama:'Andi Pratama',
    tanggal:'2026-09-03', bookingDate:'2026-09-05', bookingTime:'09:00',
    total:605000, metodePembayaran:'Transfer',
    paymentType:'dp', dpAmount:302500, pelunasanAmount:302500,
    status:'Lunas',
    items:[
      { produkId:'P006', nama:'Graduation Premium',            harga:350000, qty:1 },
      { produkId:'P003', nama:'Group Photo Small (2–4 Orang)', harga:180000, qty:1 },
      { produkId:'P001', nama:'Self Photo Reguler',            harga:75000,  qty:1 },
    ]
  },
  {
    id:'INV002', customerId:'C002', customerNama:'Siti Rahma',
    tanggal:'2026-09-04', bookingDate:'2026-09-05', bookingTime:'09:00',
    total:1530000, metodePembayaran:'QRIS',
    paymentType:'dp', dpAmount:765000, pelunasanAmount:765000,
    status:'Lunas',
    items:[
      { produkId:'P007', nama:'Graduation Family',             harga:500000, qty:2 },
      { produkId:'P006', nama:'Graduation Premium',            harga:350000, qty:1 },
      { produkId:'P003', nama:'Group Photo Small (2–4 Orang)', harga:180000, qty:1 },
    ]
  },
  {
    id:'INV003', customerId:'C003', customerNama:'Budi Santoso',
    tanggal:'2026-09-11', bookingDate:'2026-09-15', bookingTime:'10:00',
    total:530000, metodePembayaran:'Transfer',
    paymentType:'dp', dpAmount:265000, pelunasanAmount:265000,
    status:'Menunggu Konfirmasi DP',
    items:[
      { produkId:'P006', nama:'Graduation Premium',            harga:350000, qty:1 },
      { produkId:'P003', nama:'Group Photo Small (2–4 Orang)', harga:180000, qty:1 },
    ]
  },
  {
    id:'INV004', customerId:'C004', customerNama:'Nadia Putri',
    tanggal:'2026-09-12', bookingDate:'2026-09-15', bookingTime:'10:00',
    total:325000, metodePembayaran:'Transfer',
    paymentType:'dp', dpAmount:162500, pelunasanAmount:162500,
    status:'Menunggu DP',
    items:[
      { produkId:'P005', nama:'Graduation Basic',   harga:200000, qty:1 },
      { produkId:'P002', nama:'Self Photo Premium', harga:125000, qty:1 },
    ]
  },
];

const DEFAULT_KAS = [
  { tanggal:'2026-09-05', invoiceId:'INV001', customerId:'C001', customerNama:'Andi Pratama', metode:'Transfer', jumlah:605000  },
  { tanggal:'2026-09-05', invoiceId:'INV002', customerId:'C002', customerNama:'Siti Rahma',   metode:'QRIS',     jumlah:1530000 },
];

// Contoh data pengeluaran kas (untuk demo Laporan Laba Rugi & Kas Masuk-Keluar)
const DEFAULT_EXPENSES = [
  { id:'EXP001', tanggal:'2026-09-04', kategori:'Cetak & Bahan Foto (Kertas/Tinta)', keterangan:'Beli kertas foto glossy 4R 500 lembar', jumlah:450000 },
  { id:'EXP002', tanggal:'2026-09-06', kategori:'Sewa Studio & Listrik', keterangan:'Tagihan listrik bulan September', jumlah:800000 },
  { id:'EXP003', tanggal:'2026-09-10', kategori:'Props & Kostum', keterangan:'Sewa toga wisuda tambahan', jumlah:300000 },
];

const DEFAULT_AKTIVITAS = {
  C001:[
    { waktu:'2026-09-03 09:30', desc:'Booking Graduation Premium + Group Photo Small + Self Photo Reguler — 5 Sep 2026 Pkl. 09:00 — Invoice INV001 dibuat' },
    { waktu:'2026-09-03 10:00', desc:'DP Rp302.500 dikirim via Transfer — Menunggu Konfirmasi Admin' },
    { waktu:'2026-09-03 14:00', desc:'DP INV001 dikonfirmasi Admin — Sesi terjadwal ✓' },
    { waktu:'2026-09-05 12:30', desc:'Pelunasan Rp302.500 dibayarkan setelah sesi foto' },
    { waktu:'2026-09-05 14:00', desc:'Pelunasan INV001 dikonfirmasi — STATUS LUNAS ✓' },
    { waktu:'2026-09-05 14:01', desc:'Memperoleh 60 poin loyalitas (Rp605.000 ÷ Rp10.000)' },
  ],
  C002:[
    { waktu:'2026-09-04 10:00', desc:'Booking Graduation Family (×2) + Graduation Premium + Group Photo Small — 5 Sep 2026 Pkl. 09:00 — Invoice INV002 dibuat' },
    { waktu:'2026-09-04 10:30', desc:'DP Rp765.000 dikirim via QRIS — Menunggu Konfirmasi Admin' },
    { waktu:'2026-09-04 11:00', desc:'DP INV002 dikonfirmasi Admin — Sesi terjadwal ✓' },
    { waktu:'2026-09-05 12:30', desc:'Pelunasan Rp765.000 dibayarkan setelah sesi foto' },
    { waktu:'2026-09-05 14:00', desc:'Pelunasan INV002 dikonfirmasi — STATUS LUNAS ✓' },
    { waktu:'2026-09-05 14:01', desc:'Memperoleh 153 poin loyalitas (Rp1.530.000 ÷ Rp10.000)' },
  ],
  C003:[
    { waktu:'2026-09-11 09:00', desc:'Booking Graduation Premium + Group Photo Small — 15 Sep 2026 Pkl. 10:00 — Invoice INV003 dibuat' },
    { waktu:'2026-09-11 09:30', desc:'DP Rp265.000 dikirim via Transfer — Menunggu Konfirmasi Admin' },
  ],
  C004:[
    { waktu:'2026-09-12 09:00', desc:'Booking Graduation Basic + Self Photo Premium — 15 Sep 2026 Pkl. 10:00 — Invoice INV004 dibuat' },
  ],
};

// ── LOCALSTORAGE ──────────────────────────────────────────
const LS = {
  get: (k,d) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):d; } catch { return d; } },
  set: (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); FBSync.push(k,v); } catch {} }
};

// ══════════════════════════════════════════════════════════
//  FIREBASE CLOUD FIRESTORE — SINKRONISASI DATA ONLINE
// ══════════════════════════════════════════════════════════
// Tujuan: supaya booking yang dibuat pelanggan lewat HP langsung
// muncul juga di komputer Admin (dan perangkat lain), karena data
// pelanggan, produk, transaksi/invoice, dan poin loyalitas disimpan
// di Cloud Firestore (database online), bukan hanya di localStorage
// HP masing-masing orang.
//
// CARA MENGAKTIFKAN (wajib dilakukan sekali oleh Admin):
//   1. Buka https://console.firebase.google.com → buat Project baru.
//   2. Di menu kiri, buka "Build" → "Firestore Database" → klik
//      "Create database" → pilih mode "Start in test mode" (untuk
//      mulai cepat; sesuaikan security rules nanti bila perlu).
//   3. Buka ⚙️ Project Settings → tab "General" → scroll ke
//      "Your apps" → klik ikon Web ( </> ) untuk daftarkan Web App.
//   4. Firebase akan menampilkan object "firebaseConfig" — salin
//      semua isinya dan tempelkan menggantikan FIREBASE_CONFIG di
//      bawah ini (ganti seluruh isi objeknya).
//   5. Simpan file ini lalu buka lagi di browser. Setelah itu, semua
//      perangkat yang membuka file HTML ini (boleh upload ke hosting
//      apapun / dibuka langsung) akan berbagi data yang sama secara
//      realtime.
//
// Jika FIREBASE_CONFIG di bawah TIDAK diisi/masih placeholder,
// aplikasi tetap berjalan normal seperti sebelumnya (localStorage
// per-perangkat saja, tanpa sinkron online) — tidak akan error.
const FIREBASE_CONFIG = {
  apiKey: "GANTI_DENGAN_API_KEY_ANDA",
  authDomain: "GANTI_DENGAN_PROJECT_ID.firebaseapp.com",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID"
};

// Semua "tabel" data (kunci localStorage) yang disinkronkan ke Firestore.
// Ini mencakup: pelanggan (& poin loyalitasnya), produk, transaksi/invoice,
// kas, riwayat aktivitas, pengeluaran, jurnal laba, dan ulasan pelanggan.
const FB_SYNCED_KEYS = [
  'ecrm_customers', 'ecrm_products', 'ecrm_invoices', 'ecrm_kas',
  'ecrm_aktivitas', 'ecrm_expenses', 'ecrm_manual_laba', 'ecrm_ulasan'
];
const FB_COLLECTION = 'ecrm_studio_data';

const FBSync = {
  db: null,
  ready: false,
  applyingRemote: false, // true saat sedang menyalin data dari Firestore → localStorage (mencegah loop kirim-balik)

  init() {
    try {
      if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('GANTI') === 0) {
        console.warn('[E-CRM] Firebase belum dikonfigurasi (lihat komentar FIREBASE_CONFIG). Aplikasi berjalan lokal saja, data TIDAK akan sinkron ke perangkat lain.');
        return;
      }
      if (typeof firebase === 'undefined') {
        console.warn('[E-CRM] SDK Firebase gagal dimuat (cek koneksi internet). Aplikasi berjalan lokal saja.');
        return;
      }
      firebase.initializeApp(FIREBASE_CONFIG);
      this.db = firebase.firestore();
      this.ready = true;
      this.bootstrap();
    } catch (err) {
      console.warn('[E-CRM] Gagal inisialisasi Firebase:', err);
    }
  },

  // Tarik data terbaru dari Firestore (kalau sudah ada) supaya semua
  // perangkat mulai dari data yang sama, lalu pasang listener realtime.
  async bootstrap() {
    for (const key of FB_SYNCED_KEYS) {
      try {
        const ref = this.db.collection(FB_COLLECTION).doc(key);
        const snap = await ref.get();
        if (snap.exists) {
          const remote = snap.data().value;
          this.applyingRemote = true;
          localStorage.setItem(key, JSON.stringify(remote));
          this.applyingRemote = false;
        } else {
          // Belum ada di cloud (pertama kali dipakai) → unggah data lokal sebagai data awal
          const local = LS.get(key, key === 'ecrm_aktivitas' ? {} : []);
          await ref.set({ value: local, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
      } catch (err) {
        console.warn('[E-CRM] Gagal sinkron awal untuk', key, err);
      }
    }
    this.listenAll();
    if (typeof window.refreshCurrentPage === 'function') window.refreshCurrentPage();
    if (typeof updateCartBadge === 'function') updateCartBadge();
  },

  // Dengarkan perubahan realtime dari Firestore (mis. booking baru dari HP
  // pelanggan lain) dan langsung perbarui tampilan di perangkat ini.
  listenAll() {
    FB_SYNCED_KEYS.forEach(key => {
      this.db.collection(FB_COLLECTION).doc(key).onSnapshot((snap) => {
        if (!snap.exists || snap.metadata.hasPendingWrites) return; // abaikan gema tulisan sendiri
        const remote = snap.data().value;
        const current = LS.get(key, key === 'ecrm_aktivitas' ? {} : []);
        if (JSON.stringify(remote) === JSON.stringify(current)) return;
        this.applyingRemote = true;
        localStorage.setItem(key, JSON.stringify(remote));
        this.applyingRemote = false;
        if (typeof window.refreshCurrentPage === 'function') window.refreshCurrentPage();
        if (typeof updateCartBadge === 'function') updateCartBadge();
      }, (err) => console.warn('[E-CRM] Listener Firestore error untuk', key, err));
    });
  },

  // Kirim perubahan data lokal ke Firestore. Dipanggil otomatis oleh LS.set()
  // setiap kali ada data baru disimpan (booking, konfirmasi bayar, poin, dst).
  push(key, value) {
    if (!this.ready || this.applyingRemote) return;
    if (FB_SYNCED_KEYS.indexOf(key) === -1) return;
    this.db.collection(FB_COLLECTION).doc(key)
      .set({ value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(err => console.warn('[E-CRM] Gagal mengirim data ke Firestore:', key, err));
  }
};

// ── MIGRASI SATU KALI: rapikan pelanggan yang mungkin sudah terlanjur
// tercatat "kembar" dari sesi/versi sebelumnya (mis. sebelum aturan
// pencocokan-berdasarkan-nama ini diterapkan). Pelanggan dengan NAMA yang
// sama (tanpa peduli besar/kecil huruf & spasi) digabung jadi 1 profil;
// seluruh invoice & riwayat aktivitas milik salinan yang dihapus dipindah ke
// profil yang dipertahankan (yang ID-nya paling awal). Dengan ini, Jumlah
// Pelanggan, Data Pelanggan, Profil Pelanggan, dan Poin Loyalitas dijamin
// selalu sesuai jumlah NAMA pemesan yang benar-benar berbeda — walau ada
// data lama yang sempat kembar sebelum perbaikan ini dipasang.
function dedupeCustomersByName() {
  if (localStorage.getItem('ecrm_dedupe_v1')) return;
  try {
    const custs = LS.get('ecrm_customers', DEFAULT_CUSTOMERS);
    const invs  = LS.get('ecrm_invoices', DEFAULT_INVOICES);
    const akt   = LS.get('ecrm_aktivitas', DEFAULT_AKTIVITAS);

    const groups = {};
    custs.forEach(c => {
      const key = (c.nama || '').trim().toLowerCase();
      if (!key) return;
      (groups[key] = groups[key] || []).push(c);
    });

    const idRemap = {};
    const keepList = [];
    let changed = false;

    Object.values(groups).forEach(list => {
      list.sort((a,b) => (a.id||'').localeCompare(b.id||''));
      const keep = list[0];
      keepList.push(keep);
      if (list.length > 1) {
        changed = true;
        list.slice(1).forEach(dup => {
          idRemap[dup.id] = keep.id;
          if (!keep.email && dup.email) keep.email = dup.email;
          if (!keep.hp && dup.hp) keep.hp = dup.hp;
        });
      }
    });

    if (changed) {
      invs.forEach(i => { if (idRemap[i.customerId]) i.customerId = idRemap[i.customerId]; });
      Object.keys(idRemap).forEach(oldId => {
        if (akt[oldId]) {
          const keepId = idRemap[oldId];
          akt[keepId] = (akt[keepId] || []).concat(akt[oldId]);
          delete akt[oldId];
        }
      });
      LS.set('ecrm_customers', keepList);
      LS.set('ecrm_invoices', invs);
      LS.set('ecrm_aktivitas', akt);
    }
    localStorage.setItem('ecrm_dedupe_v1', '1');
  } catch (err) {
    console.warn('[E-CRM] Gagal menjalankan migrasi dedupe pelanggan:', err);
  }
}

function initData() {
  if (!localStorage.getItem('ecrm_v5_init')) {
    // Hapus data lama jika ada
    ['ecrm_v4_init','ecrm_v3_init','ecrm_initialized'].forEach(k=>localStorage.removeItem(k));
    LS.set('ecrm_customers', DEFAULT_CUSTOMERS);
    LS.set('ecrm_products',  DEFAULT_PRODUCTS);
    LS.set('ecrm_invoices',  DEFAULT_INVOICES);
    LS.set('ecrm_kas',       DEFAULT_KAS);
    LS.set('ecrm_aktivitas', DEFAULT_AKTIVITAS);
    LS.set('ecrm_expenses',  DEFAULT_EXPENSES);
    LS.set('ecrm_ulasan',    DEFAULT_ULASAN);
    localStorage.setItem('ecrm_v5_init','1');
  }
  // Samakan ulasan contoh di SEMUA perangkat sekali saja
  if (!localStorage.getItem('ecrm_ulasan_synced_v1')) {
    LS.set('ecrm_ulasan', DEFAULT_ULASAN);
    localStorage.setItem('ecrm_ulasan_synced_v1','1');
  }
}

// ── DATABASE ─────────────────────────────────────────────
const DB = {
  getUsers:    ()          => DEFAULT_USERS,
  findUser:    (e,p)       => DEFAULT_USERS.find(u=>u.email===e&&u.password===p),

  getRawCustomers:   ()    => LS.get('ecrm_customers', DEFAULT_CUSTOMERS),
  getCustomers:      ()    => {
    const custs = LS.get('ecrm_customers', DEFAULT_CUSTOMERS);
    const invs  = LS.get('ecrm_invoices', DEFAULT_INVOICES);
    const kas   = LS.get('ecrm_kas', DEFAULT_KAS);
    return custs.map(c => {
      const cInvs = invs.filter(i => i.customerId === c.id);
      const cKas  = kas.filter(k => k.customerId === c.id);
      let kasTotal = cKas.reduce((s, k) => s + (Number(k.jumlah) || 0), 0);
      let lunasTotal = cInvs.filter(i => i.status === 'Lunas').reduce((s, i) => s + (Number(i.total) || 0), 0);
      let calcTotal = Math.max(kasTotal, lunasTotal);
      if (calcTotal === 0 && c.totalBelanja > 0) {
        calcTotal = c.totalBelanja;
      }
      const calcPoin = Math.floor(calcTotal / 10000);
      const calcStatus = calcTotal >= 1500000 || calcPoin >= 150 ? 'Loyal Customer' : calcTotal > 0 ? 'Active Customer' : 'New Customer';
      return {
        ...c,
        totalPesanan: cInvs.length,
        totalBelanja: calcTotal,
        poin: calcPoin,
        status: calcStatus
      };
    });
  },
  saveCustomers:     (d)   => LS.set('ecrm_customers', d),
  getCustomer:       (id)  => DB.getCustomers().find(c=>c.id===id),
  getCustomerByEmail:(em)  => DB.getCustomers().find(c=>c.email===em),

  getProducts:  () => LS.get('ecrm_products', DEFAULT_PRODUCTS),
  saveProducts: (d) => LS.set('ecrm_products', d),
  getProduct:   (id)=> DB.getProducts().find(p=>p.id===id),

  // ── JENIS PRODUK / KATEGORI (dengan foto sendiri, terpisah dari foto
  // masing-masing paket) — supaya foto Jenis Produk bisa ditambah & selalu
  // tersimpan/muncul, walau produk di dalam jenis itu belum atau sudah
  // punya foto sendiri-sendiri. ──
  getCategories: () => {
    const stored = LS.get('ecrm_categories', null);
    if (stored) return stored;
    // Seed otomatis dari 4 jenis produk bawaan
    const iconMap = { 'Self Photo':'🤳','Group Photo':'👥','Graduation':'🎓','Pass Photo':'🪪' };
    const seeded = Object.keys(iconMap).map(nama => ({ nama, icon: iconMap[nama], foto: '' }));
    LS.set('ecrm_categories', seeded);
    return seeded;
  },
  saveCategories: (d) => LS.set('ecrm_categories', d),
  getCategory: (nama) => DB.getCategories().find(c => c.nama === nama),
  // Pastikan kategori tercatat di daftar Jenis Produk (dipanggil setiap kali
  // produk baru dengan kategori baru dibuat, supaya jenisnya otomatis
  // "bertambah" dan langsung muncul di dropdown maupun katalog).
  ensureCategory: (nama, icon) => {
    const cats = DB.getCategories();
    let c = cats.find(x => x.nama === nama);
    if (!c) {
      c = { nama, icon: icon || '📷', foto: '' };
      cats.push(c);
      DB.saveCategories(cats);
    }
    return c;
  },
  addCategory: (nama, icon, foto) => {
    const namaClean = (nama||'').trim();
    const cats = DB.getCategories();
    let existing = cats.find(c => c.nama.toLowerCase() === namaClean.toLowerCase());
    if (existing) {
      // Sudah ada → jangan duplikat, cukup update foto/icon-nya
      if (icon) existing.icon = icon;
      if (foto) existing.foto = foto;
      DB.saveCategories(cats);
      return existing;
    }
    const c = { nama: namaClean, icon: icon || '📷', foto: foto || '' };
    cats.push(c);
    DB.saveCategories(cats);
    return c;
  },
  updateCategoryFoto: (nama, fotoDataUrl) => {
    const cats = DB.getCategories();
    const c = cats.find(x => x.nama === nama);
    if (!c) return false;
    c.foto = fotoDataUrl;
    DB.saveCategories(cats);
    return true;
  },

  getInvoices:           ()    => LS.get('ecrm_invoices', DEFAULT_INVOICES),
  saveInvoices:          (d)   => LS.set('ecrm_invoices', d),
  getInvoice:            (id)  => DB.getInvoices().find(i=>i.id===id),
  getInvoicesByCustomer: (cid) => DB.getInvoices().filter(i=>i.customerId===cid),

  getKas:  ()  => LS.get('ecrm_kas', DEFAULT_KAS),
  saveKas: (d) => LS.set('ecrm_kas', d),

  // ── PENGELUARAN KAS (Modul Laporan) ───────────────────
  getExpenses:  ()  => LS.get('ecrm_expenses', DEFAULT_EXPENSES),
  saveExpenses: (d) => LS.set('ecrm_expenses', d),
  nextExpenseId: () => {
    const nums = DB.getExpenses().map(e=>parseInt((e.id||'EXP0').replace('EXP','')));
    return 'EXP'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },
  addExpense: (tanggal, kategori, keterangan, jumlah) => {
    const id = DB.nextExpenseId();
    const e = { id, tanggal, kategori, keterangan, jumlah:+jumlah };
    const es = DB.getExpenses(); es.push(e); DB.saveExpenses(es); return e;
  },
  deleteExpense: (id) => { DB.saveExpenses(DB.getExpenses().filter(e=>e.id!==id)); },

  // ── JURNAL MANUAL LABA RUGI (Chart of Account) ────────
  getManualLaba:  ()  => LS.get('ecrm_manual_laba', []),
  saveManualLaba: (d) => LS.set('ecrm_manual_laba', d),
  nextManualLabaId: () => {
    const nums = DB.getManualLaba().map(e=>parseInt((e.id||'JRN0').replace('JRN','')));
    return 'JRN'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },
  addManualLaba: (tanggal, tipe, akun, keterangan, jumlah) => {
    const id = DB.nextManualLabaId();
    const e = { id, tanggal, tipe, akun, keterangan, jumlah:+jumlah };
    const es = DB.getManualLaba(); es.push(e); DB.saveManualLaba(es); return e;
  },
  deleteManualLaba: (id) => { DB.saveManualLaba(DB.getManualLaba().filter(e=>e.id!==id)); },

  // ── ULASAN / REVIEW PELANGGAN ──────────────────────────
  getUlasan:  ()  => LS.get('ecrm_ulasan', DEFAULT_ULASAN),
  saveUlasan: (d) => LS.set('ecrm_ulasan', d),
  nextUlasanId: () => {
    const nums = DB.getUlasan().map(u=>parseInt((u.id||'RV0').replace('RV','')));
    return 'RV'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },
  addUlasan: (customerId, customerNama, invoiceId, produk, lokasi, rating, komentar) => {
    const id = DB.nextUlasanId();
    const u = { id, customerId, customerNama, invoiceId, produk, lokasi, rating:+rating, komentar, tanggal:new Date().toISOString().slice(0,10), waktu:nowDateTime() };
    const us = DB.getUlasan(); us.push(u); DB.saveUlasan(us);
    const akt = DB.getAktivitas(); if(!akt[customerId])akt[customerId]=[];
    akt[customerId].push({ waktu:nowDateTime(), desc:`Memberi ulasan ⭐${rating}/5 untuk Invoice ${invoiceId}` });
    DB.saveAktivitas(akt);
    return u;
  },
  getUlasanByInvoice:  (invId) => DB.getUlasan().find(u=>u.invoiceId===invId),
  getUlasanByCustomer: (cid)   => DB.getUlasan().filter(u=>u.customerId===cid),
  deleteUlasan: (id) => { DB.saveUlasan(DB.getUlasan().filter(u=>u.id!==id)); },
  getAvgRating: () => {
    const us = DB.getUlasan().filter(u => u.rating > 0); // abaikan ulasan yang tidak diberi rating (0 = dilewati)
    if (!us.length) return 0;
    return us.reduce((s,u)=>s+u.rating,0) / us.length;
  },

  getAktivitas:           ()    => LS.get('ecrm_aktivitas', DEFAULT_AKTIVITAS),
  saveAktivitas:          (d)   => LS.set('ecrm_aktivitas', d),
  getAktivitasByCustomer: (cid) => { const a=DB.getAktivitas(); return (a[cid]||[]).slice().reverse(); },

  // ── BOOKING ──────────────────────────────────────────
  // Jumlah booking pada tanggal + jam tertentu
  // Catatan: invoice berstatus 'Dibatalkan' TIDAK dihitung, sehingga begitu sebuah
  // booking dibatalkan (baik oleh pelanggan maupun admin, termasuk kasus pelanggan
  // gagal foto/no-show), kuota slot tsb otomatis bertambah kembali tanpa aksi manual.
  getSlotCount: (date, time) =>
    DB.getInvoices().filter(i => i.bookingDate===date && i.bookingTime===time && i.status!=='Dibatalkan').length,

  // Jam-jam yang masih tersedia pada tanggal tertentu (count < MAX_PER_SLOT)
  getAvailableTimes: (date) =>
    STUDIO_HOURS.filter(h => DB.getSlotCount(date,h) < MAX_PER_SLOT),

  // Info slot untuk tampilan kalender: { time, count, available }
  getSlotInfo: (date) =>
    STUDIO_HOURS.map(h => ({ time:h, count:DB.getSlotCount(date,h), available:DB.getSlotCount(date,h)<MAX_PER_SLOT })),

  // Apakah tanggal ini ada minimal 1 slot tersedia?
  isDateAvailable: (date) => DB.getAvailableTimes(date).length > 0,

  // ── PAYMENT TYPE ─────────────────────────────────────
  // Tentukan apakah cart perlu DP (jika ada item Group Photo / Graduation)
  // 'Pass Photo' juga termasuk full payment (seperti Self Photo)
  getPaymentTypeForCart: (cartItems) => {
    return cartItems.some(it => {
      const prod = DB.getProducts().find(p => p.id===it.id);
      return prod && DP_CATEGORIES.includes(prod.kategori);
    }) ? 'dp' : 'full';
  },

  // ── ID GENERATORS ────────────────────────────────────
  nextInvoiceId: () => {
    const nums = DB.getInvoices().map(i=>parseInt(i.id.replace('INV','')));
    return 'INV'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },
  nextCustomerId: () => {
    const nums = DB.getCustomers().map(c=>parseInt(c.id.replace('C','')));
    return 'C'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },
  nextProductId: () => {
    const nums = DB.getProducts().map(p=>parseInt(p.id.replace('P','')));
    return 'P'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  },

  // ── ACTIONS ──────────────────────────────────────────

  // Customer: checkout & buat invoice
  checkout: (customerId, cartItems, bookingDate, bookingTime, metode, lokasiId) => {
    if (DB.getSlotCount(bookingDate, bookingTime) >= MAX_PER_SLOT) return null;
    const invId = DB.nextInvoiceId();
    const cust  = DB.getCustomer(customerId);
    const total = cartItems.reduce((s,it)=>s+it.harga*it.qty, 0);
    const pType = DB.getPaymentTypeForCart(cartItems);
    const dp    = pType==='dp' ? Math.ceil(total*0.5) : total;
    const pel   = pType==='dp' ? total-Math.ceil(total*0.5) : 0;
    const lokasi = getLokasiById(lokasiId).id;

    const newInv = {
      id:invId, customerId, customerNama:cust?cust.nama:customerId,
      tanggal:new Date().toISOString().slice(0,10), bookingDate, bookingTime, lokasi,
      total, metodePembayaran:metode||'Transfer',
      paymentType:pType, dpAmount:dp, pelunasanAmount:pel,
      status: pType==='dp' ? 'Menunggu DP' : 'Menunggu Pembayaran',
      items:cartItems.map(it=>({produkId:it.id,nama:it.nama,harga:it.harga,qty:it.qty}))
    };
    const invs = DB.getInvoices(); invs.push(newInv); DB.saveInvoices(invs);

    const akt = DB.getAktivitas(); if(!akt[customerId])akt[customerId]=[];
    const namaItems = cartItems.map(it=>it.nama+(it.qty>1?` (×${it.qty})`:'') ).join(', ');
    akt[customerId].push({ waktu:nowDateTime(), desc:`Booking ${namaItems} di ${getLokasiById(lokasi).nama} — ${formatDate(bookingDate)} Pkl. ${bookingTime} — Invoice ${invId} dibuat` });
    DB.saveAktivitas(akt);
    return newInv;
  },

  // Customer: bayar DP (Menunggu DP → Menunggu Konfirmasi DP)
  payDP: (invoiceId, metode) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    if(!inv||inv.status!=='Menunggu DP') return false;
    inv.status='Menunggu Konfirmasi DP';
    if(metode) inv.metodePembayaran=metode;
    DB.saveInvoices(invs);
    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    akt[inv.customerId].push({ waktu:nowDateTime(), desc:`DP ${formatRupiah(inv.dpAmount)} (50%) dikirim via ${inv.metodePembayaran} — Menunggu Konfirmasi Admin` });
    DB.saveAktivitas(akt);
    return true;
  },

  // Admin: konfirmasi DP (Menunggu Konfirmasi DP → DP Terkonfirmasi)
  confirmDP: (invoiceId) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    if(!inv||inv.status!=='Menunggu Konfirmasi DP') return false;
    inv.status='DP Terkonfirmasi';
    DB.saveInvoices(invs);
    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    akt[inv.customerId].push({ waktu:nowDateTime(), desc:`DP ${formatRupiah(inv.dpAmount)} dikonfirmasi Admin — Sesi ${formatDate(inv.bookingDate)} Pkl. ${inv.bookingTime} terjadwal ✓` });
    DB.saveAktivitas(akt);
    return true;
  },

  // Customer: bayar pelunasan (DP Terkonfirmasi → Menunggu Konfirmasi Pelunasan)
  payPelunasan: (invoiceId, metode) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    if(!inv||inv.status!=='DP Terkonfirmasi') return false;
    inv.status='Menunggu Konfirmasi Pelunasan';
    if(metode) inv.metodePelunasan=metode;
    DB.saveInvoices(invs);
    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    akt[inv.customerId].push({ waktu:nowDateTime(), desc:`Pelunasan ${formatRupiah(inv.pelunasanAmount)} (50%) dikirim via ${metode||inv.metodePembayaran} — Menunggu Konfirmasi Admin` });
    DB.saveAktivitas(akt);
    return true;
  },

  // Customer: bayar penuh Self Photo (Menunggu Pembayaran → Menunggu Konfirmasi)
  payFull: (invoiceId, metode) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    if(!inv||inv.status!=='Menunggu Pembayaran') return false;
    inv.status='Menunggu Konfirmasi';
    if(metode) inv.metodePembayaran=metode;
    DB.saveInvoices(invs);
    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    akt[inv.customerId].push({ waktu:nowDateTime(), desc:`Pembayaran penuh ${formatRupiah(inv.total)} dikirim via ${inv.metodePembayaran} — Menunggu Konfirmasi Admin` });
    DB.saveAktivitas(akt);
    return true;
  },

  // Admin: konfirmasi pelunasan ATAU pembayaran penuh → LUNAS (cascade update)
  confirmFinal: (invoiceId) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    const validStatus=['Menunggu Konfirmasi Pelunasan','Menunggu Konfirmasi'];
    if(!inv||!validStatus.includes(inv.status)) return false;

    inv.status='Lunas';
    DB.saveInvoices(invs);

    // Kas
    const kas=DB.getKas();
    kas.push({ tanggal:new Date().toISOString().slice(0,10), invoiceId:inv.id, customerId:inv.customerId, customerNama:inv.customerNama, metode:inv.metodoPelunasan||inv.metodePembayaran, jumlah:inv.total });
    DB.saveKas(kas);

    // Customer poin + totalBelanja + status
    const custs=DB.getCustomers(); const cust=custs.find(c=>c.id===inv.customerId);
    const earned=Math.floor(inv.total/10000);
    if(cust){
      cust.poin+=earned; cust.totalBelanja+=inv.total;
      cust.status=cust.totalBelanja>=1500000||cust.poin>=150?'Loyal Customer':cust.totalBelanja>0?'Active Customer':'New Customer';
      DB.saveCustomers(custs);
    }

    // Aktivitas
    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    const waktu=nowDateTime();
    const label=inv.paymentType==='dp'?'Pelunasan':'Pembayaran';
    akt[inv.customerId].push(
      { waktu, desc:`${label} ${inv.id} dikonfirmasi Admin — STATUS LUNAS ✓` },
      { waktu, desc:`Memperoleh ${earned} poin loyalitas (${formatRupiah(inv.total)} ÷ Rp10.000)` }
    );
    DB.saveAktivitas(akt);
    return earned;
  },

  // Batalkan booking — dipakai oleh pelanggan (batal sendiri) ATAU admin
  // (mis. pelanggan gagal foto/tidak hadir di hari sesi). Begitu status berubah
  // menjadi 'Dibatalkan', getSlotCount() otomatis tidak menghitungnya lagi,
  // sehingga kuota jam tsb langsung terbuka untuk pelanggan lain — tanpa perlu
  // tombol "tambah kuota" manual. Invoice yang sudah LUNAS tidak bisa dibatalkan
  // lewat sini (perlu proses refund terpisah di luar sistem ini).
  cancelBooking: (invoiceId, alasan, dibatalkanOleh) => {
    const invs=DB.getInvoices(); const inv=invs.find(i=>i.id===invoiceId);
    if(!inv || inv.status==='Lunas' || inv.status==='Dibatalkan') return false;

    const statusSebelum = inv.status;
    inv.statusSebelumBatal = statusSebelum;
    inv.status = 'Dibatalkan';
    inv.dibatalkanOleh = dibatalkanOleh || 'customer';
    inv.alasanBatal = alasan && alasan.trim() ? alasan.trim()
      : (inv.dibatalkanOleh==='admin' ? 'Pelanggan tidak hadir / gagal foto pada jadwal' : 'Dibatalkan oleh pelanggan');
    inv.waktuBatal = nowDateTime();
    inv.notifDibacaAdmin = false; // trigger lonceng notifikasi admin sampai dibuka
    DB.saveInvoices(invs);

    const akt=DB.getAktivitas(); if(!akt[inv.customerId])akt[inv.customerId]=[];
    const olehLabel = inv.dibatalkanOleh==='admin' ? 'Admin' : 'Pelanggan';
    akt[inv.customerId].push({ waktu:nowDateTime(),
      desc:`Booking ${inv.id} dibatalkan oleh ${olehLabel} (${inv.alasanBatal}) — Slot ${formatDate(inv.bookingDate)} Pkl. ${inv.bookingTime} otomatis tersedia kembali` });
    DB.saveAktivitas(akt);
    return true;
  },

  // Add customer / product
  // PENTING: Jumlah Pelanggan, Data Pelanggan, Profil Pelanggan, dan Poin
  // Loyalitas harus selalu SAMA dengan jumlah nama pemesan yang benar-benar
  // berbeda (mengikuti jumlah pesanan/booking). Kalau nama yang sama booking
  // lebih dari satu kali, itu tetap dihitung 1 pelanggan (tidak nambah data
  // baru) — profil & poin lama yang dipakai/di-update. Kalau namanya beda,
  // baru dianggap pelanggan baru. Aturan dedup-by-nama ini dipusatkan di sini
  // supaya berlaku untuk SEMUA jalur pembuatan pelanggan: booking pelanggan,
  // tambah manual oleh admin, maupun import massal.
  addCustomer: (nama,email,hp) => {
    const namaClean = (nama||'').trim();
    const namaLower = namaClean.toLowerCase();
    const cs = DB.getCustomers();

    // 1) Cocokkan dulu berdasarkan Nama (case-insensitive) — penentu utama.
    let existing = namaLower ? cs.find(c => (c.nama||'').trim().toLowerCase() === namaLower) : null;
    // 2) Kalau nama belum pernah tercatat, coba cocokkan No. HP...
    if (!existing && hp) existing = cs.find(c => c.hp && c.hp.replace(/\D/g,'') === String(hp).replace(/\D/g,''));
    // 3) ...atau Email, untuk pelanggan lama yang mungkin sedikit beda nama.
    if (!existing && email) existing = cs.find(c => c.email && c.email.toLowerCase() === String(email).toLowerCase());

    if (existing) {
      // Nama (atau HP/email) sudah pernah tercatat → JANGAN buat data baru.
      // Cukup perbarui kontak terbarunya supaya tetap 1 pelanggan = 1 profil.
      existing.nama = namaClean || existing.nama;
      if (hp) existing.hp = hp;
      if (email) existing.email = email;
      DB.saveCustomers(cs.map(c => c.id===existing.id ? existing : c));
      return existing;
    }

    const id=DB.nextCustomerId();
    const c={id,nama:namaClean,email,hp,totalBelanja:0,poin:0,status:'New Customer'};
    cs.push(c); DB.saveCustomers(cs); return c;
  },
  addProduct: (nama,kategori,harga,stok,icon,deskripsi,foto) => {
    const id = DB.nextProductId();
    const dpCat=DP_CATEGORIES.includes(kategori);
    const fotoVal = foto || '';
    const p={id,nama,kategori,harga:+harga,stok:+stok,icon:icon||'📷',deskripsi:deskripsi||'',foto:fotoVal,image:fotoVal,image_url:fotoVal,imageUrl:fotoVal,includes:[],paymentNote:dpCat?'DP 50% saat booking · Pelunasan saat/setelah sesi':'Pembayaran penuh di muka'};
    const ps=DB.getProducts(); ps.push(p); DB.saveProducts(ps);
    DB.ensureCategory(kategori, icon); // jenis produk baru otomatis tercatat & muncul di daftar Jenis Produk
    return p;
  },
  updateProduct: (id, data) => {
    const ps = DB.getProducts();
    const p = ps.find(x => x.id === id);
    if (!p) return false;
    const dpCat = DP_CATEGORIES.includes(data.kategori);
    const icons = {'Self Photo':'📸','Group Photo':'👥','Graduation':'🎓','Pass Photo':'🪪'};
    p.nama = data.nama;
    p.kategori = data.kategori;
    p.harga = +data.harga;
    p.stok = +data.stok;
    p.deskripsi = data.deskripsi || '';
    if (data.icon) p.icon = data.icon;
    else if (icons[data.kategori]) p.icon = icons[data.kategori];
    const fotoVal = data.foto !== undefined ? data.foto : (data.image !== undefined ? data.image : (data.image_url !== undefined ? data.image_url : data.imageUrl));
    if (fotoVal !== undefined) {
      p.foto = fotoVal;
      p.image = fotoVal;
      p.image_url = fotoVal;
      p.imageUrl = fotoVal;
    }
    p.paymentNote = dpCat ? 'DP 50% saat booking · Pelunasan saat/setelah sesi' : 'Pembayaran penuh di muka';
    DB.saveProducts(ps);
    DB.ensureCategory(data.kategori, p.icon);
    return true;
  },
  updateProductFoto: (id, fotoDataUrl) => {
    const ps = DB.getProducts();
    const p = ps.find(x=>x.id===id);
    if (!p) return false;
    const val = fotoDataUrl || '';
    p.foto = val;
    p.image = val;
    p.image_url = val;
    p.imageUrl = val;
    DB.saveProducts(ps);
    return true;
  },
  deleteProduct:  (id) => { DB.saveProducts(DB.getProducts().filter(p=>p.id!==id)); },
  deleteCustomer: (id) => { DB.saveCustomers(DB.getCustomers().filter(c=>c.id!==id)); },
  resetData:      ()   => { ['ecrm_v5_init','ecrm_v4_init','ecrm_v3_init','ecrm_initialized','ecrm_active_customer_id','ecrm_expenses'].forEach(k=>localStorage.removeItem(k)); initData(); }
};

// Logo Alviero Studio (dipakai sbg background notifikasi "Selamat Datang")
const ALVIERO_LOGO_B64 = "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";

// ── HELPERS ──────────────────────────────────────────────
function formatRupiah(n) {
  if(n==null) return 'Rp0';
  return 'Rp'+Number(n).toLocaleString('id-ID');
}
function formatRupiahShort(n) {
  n = Number(n)||0;
  if (Math.abs(n) >= 1000000000) return (n/1000000000).toFixed(1).replace(/\.0$/,'')+'M';
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'')+'jt';
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(0)+'rb';
  return String(n);
}

// ── GRAFIK SVG BAWAAN (tidak butuh library eksternal) ──
// Dipakai sebagai fallback kalau Chart.js gagal dimuat dari CDN,
// supaya grafik tetap tampil walau tanpa koneksi internet.
function renderLineChartSVG(container, labels, values, opts) {
  opts = opts || {};
  const color = opts.color || '#2255C4';
  const fill  = opts.fill  || 'rgba(34,85,196,0.12)';
  if (!labels.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray-400);font-size:.82rem">Belum ada data untuk ditampilkan</div>';
    return;
  }
  const w = 560, h = 240, pad = { top:14, right:16, bottom:28, left:56 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const maxV = Math.max(...values, 1);
  const stepX = labels.length > 1 ? plotW/(labels.length-1) : 0;
  const points = values.map((v,i) => [
    pad.left + i*stepX,
    pad.top + plotH - (v/maxV)*plotH
  ]);
  const pointsStr = points.map(p=>p.join(',')).join(' ');
  const areaPath = `M${pad.left},${pad.top+plotH} L${points.map(p=>p.join(',')).join(' L')} L${pad.left+plotW},${pad.top+plotH} Z`;

  let gridLines = '', yLabels = '';
  const div = 4;
  for (let i=0;i<=div;i++) {
    const y = pad.top + plotH - (i/div)*plotH;
    gridLines += `<line x1="${pad.left}" y1="${y}" x2="${pad.left+plotW}" y2="${y}" stroke="#E2E6EA" stroke-width="1"/>`;
    yLabels += `<text x="${pad.left-8}" y="${y+3}" text-anchor="end" font-size="9" fill="#6C757D" font-family="Inter,sans-serif">${formatRupiahShort((maxV/div)*i)}</text>`;
  }
  let xLabels = '';
  const maxShown = 7;
  const step = Math.max(1, Math.ceil(labels.length/maxShown));
  labels.forEach((l,i) => {
    if (i % step === 0 || i === labels.length-1) {
      xLabels += `<text x="${points[i][0]}" y="${h-8}" text-anchor="middle" font-size="9" fill="#6C757D" font-family="Inter,sans-serif">${l}</text>`;
    }
  });
  const circles = points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${color}"><title>${labels[i]}: ${formatRupiah(values[i])}</title></circle>`).join('');

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
    ${gridLines}${yLabels}
    <path d="${areaPath}" fill="${fill}" stroke="none"/>
    <polyline points="${pointsStr}" fill="none" stroke="${color}" stroke-width="2.2"/>
    ${circles}
    ${xLabels}
  </svg>`;
}

function renderBarChartSVG(container, labels, values, opts) {
  opts = opts || {};
  const color = opts.color || '#1DB954';
  if (!labels.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray-400);font-size:.82rem">Belum ada data untuk ditampilkan</div>';
    return;
  }
  const w = 560, h = Math.max(240, labels.length*34+20);
  const pad = { top:10, right:70, bottom:10, left:110 };
  const plotW = w - pad.left - pad.right;
  const maxV = Math.max(...values, 1);
  const barH = Math.min(26, (h - pad.top - pad.bottom)/labels.length - 8);
  const gap = (h - pad.top - pad.bottom - barH*labels.length) / labels.length;

  let bars = '';
  labels.forEach((l,i) => {
    const y = pad.top + i*(barH+gap) + gap/2;
    const bw = (values[i]/maxV) * plotW;
    const labelShort = l.length > 14 ? l.slice(0,13)+'…' : l;
    bars += `
      <text x="${pad.left-8}" y="${y+barH/2+3.5}" text-anchor="end" font-size="10" fill="#495057" font-family="Inter,sans-serif">${labelShort}</text>
      <rect x="${pad.left}" y="${y}" width="${Math.max(bw,2)}" height="${barH}" rx="4" fill="${color}"><title>${l}: ${formatRupiah(values[i])}</title></rect>
      <text x="${pad.left+bw+8}" y="${y+barH/2+3.5}" font-size="9.5" fill="#495057" font-family="Inter,sans-serif">${formatRupiahShort(values[i])}</text>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">${bars}</svg>`;
}

function formatDate(s) {
  if(!s) return '-';
  const d=new Date(s+'T00:00:00'); if(isNaN(d)) return s;
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}
function formatIndoFullDate(dateStr) {
  if (!dateStr) return 'Seluruh Tanggal';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function formatIndoMonth(monthStr) {
  if (!monthStr) return 'Seluruh Bulan';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const mIndex = parseInt(parts[1], 10) - 1;
  return (months[mIndex] || parts[1]) + ' ' + parts[0];
}
function nowDateTime() {
  const n=new Date(); return n.toISOString().slice(0,10)+' '+n.toTimeString().slice(0,5);
}
function statusBadge(s) {
  const m={
    'Lunas':'badge-green',
    'DP Terkonfirmasi':'badge-blue',
    'Menunggu Konfirmasi Pelunasan':'badge-amber',
    'Menunggu Konfirmasi DP':'badge-amber',
    'Menunggu Konfirmasi':'badge-amber',
    'Menunggu Pelunasan':'badge-amber',
    'Menunggu DP':'badge-red',
    'Menunggu Pembayaran':'badge-red',
    'Dibatalkan':'badge-gray',
  };
  return `<span class="badge ${m[s]||'badge-gray'}">${s}</span>`;
}
function customerStatusBadge(s) {
  const m={'Loyal Customer':'badge-navy','Active Customer':'badge-blue','New Customer':'badge-gray'};
  return `<span class="badge ${m[s]||'badge-gray'}">${s}</span>`;
}

initData();
dedupeCustomersByName();
FBSync.init();


