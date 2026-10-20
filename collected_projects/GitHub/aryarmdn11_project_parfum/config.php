<?php
// Memuat pengaturan. Data asli (password DB, rekening, WhatsApp) taruh di config.local.php,
// file itu di-ignore oleh git sehingga tidak ikut terupload ke GitHub.
// Lihat config.example.php untuk daftar pengaturan.
require is_file(__DIR__ . '/config.local.php') ? __DIR__ . '/config.local.php' : __DIR__ . '/config.example.php';
