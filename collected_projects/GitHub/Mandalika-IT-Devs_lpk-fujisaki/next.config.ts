import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md adalah berkas terlindungi: `next dev` tidak boleh menambahkan bloknya sendiri ke sana.
  agentRules: false,
  experimental: {
    // forbidden(): rute khusus Admin menjawab 403 kepada Staf (src/app/panel/penjaga.ts).
    authInterrupts: true,
    serverActions: {
      // Foto galeri paling besar 5 MB (PRD §3.4). Batas bawaan 1 MB terlalu kecil; 6 MB memberi ruang untuk isian lain
      // dan pembungkus multipart, supaya foto sedikit di atas 5 MB tetap sampai dan ditolak aturan domain dengan
      // alasannya. Foto yang lebih besar sudah ditolak formulir di browser sebelum dikirim.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
