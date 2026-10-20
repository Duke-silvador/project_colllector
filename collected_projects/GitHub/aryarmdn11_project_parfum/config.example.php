<?php
// ============================================================
//  CONTOH PENGATURAN ATEA PARFUMS  (file ini ikut di-commit ke GitHub)
//
//  Cara pakai: salin file ini menjadi  config.local.php  lalu isi data aslimu
//  di sana. config.local.php TIDAK ikut ke GitHub (ada di .gitignore).
//  Kalau config.local.php belum ada, website memakai isi file ini (default XAMPP).
// ============================================================

// Koneksi database (default XAMPP: user root, password kosong)
const DB_HOST = 'localhost';
const DB_NAME = 'atea_parfums';
const DB_USER = 'root';
const DB_PASS = '';

const APP_TIMEZONE = 'Asia/Jakarta';

// Info pembayaran yang tampil di halaman "Pesanan berhasil". Ganti dengan data toko kamu.
const PAYMENT_INSTRUCTIONS = [
    'Transfer Bank' => 'Transfer ke rekening BCA 0000000000 a.n. ATEA Parfums (ganti di config.php), lalu kirim bukti transfer ke WhatsApp admin.',
    'QRIS'          => 'Scan QRIS toko (tambahkan gambar QRIS kamu), lalu kirim bukti pembayaran ke WhatsApp admin.',
    'E-Wallet'      => 'Kirim ke GoPay/OVO/DANA 0800000000 a.n. ATEA Parfums (ganti di config.php), lalu kirim bukti ke WhatsApp admin.',
];

// Nomor WhatsApp admin (format 62812xxxx), dipakai untuk tombol konfirmasi pembayaran. Kosongkan jika belum ada.
const WHATSAPP_NUMBER = '';
