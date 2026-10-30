import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Test e2e selalu memakai .env.ci (database app_test). Override menimpa nilai dari shell,
// sehingga server e2e tidak pernah memakai database pengembangan.
config({ path: ".env.ci", override: true, quiet: true });

const port = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Mengosongkan database test, menerapkan migrasi, dan mengisi pegawai uji.
  globalSetup: "./tests/e2e/siapkan-database.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore:
        /(statistik-lembaga|kontak|galeri|konter-cek-usia|formulir-pendaftaran)\.spec\.ts$/,
    },
    // Statistik lembaga berisi satu angka per bidang kerja aktif. Test program dan bidang kerja menambah dan
    // menonaktifkan bidang kerja, jadi test statistik baru berjalan sesudah semua test lain selesai.
    {
      name: "statistik-lembaga",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /statistik-lembaga\.spec\.ts$/,
      dependencies: ["chromium"],
    },
    // Test kontak mengubah kontak lembaga yang tampil di loket Beranda, jadi berjalan sesudah test Beranda dan test
    // lain yang membuka Beranda selesai.
    {
      name: "kontak",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /kontak\.spec\.ts$/,
      dependencies: ["chromium"],
    },
    // Test galeri mengunggah dan menghapus foto yang tampil di Beranda, jadi berjalan sesudah test Beranda dan test
    // lain yang membuka Beranda selesai. Test bingkai kosong di berkas itu juga butuh galeri yang belum berisi foto.
    {
      name: "galeri",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /galeri\.spec\.ts$/,
      dependencies: ["chromium"],
    },
    // Test formulir pendaftaran menambah program dan bidang kerja nonaktif untuk memeriksa pilihan formulir, jadi
    // berjalan sesudah test program dan bidang kerja, yang memeriksa daftar lengkap keduanya di panel pegawai.
    {
      name: "formulir-pendaftaran",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /formulir-pendaftaran\.spec\.ts$/,
      dependencies: ["chromium"],
    },
    // Test konter cek usia menonaktifkan program Pelajar sebentar untuk memeriksa pilihan program di Beranda, jadi
    // berjalan sesudah test program dan test lain yang membaca daftar program aktif selesai.
    {
      name: "konter-cek-usia",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /konter-cek-usia\.spec\.ts$/,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    // Playwright menunggu server siap sebelum globalSetup menerapkan migrasi, jadi di CI database test masih
    // kosong saat itu. Kesiapan diperiksa di halaman yang isinya dari kode dan tidak membaca database.
    url: `${baseURL}/kebijakan-privasi`,
    // Server yang sudah jalan bisa saja memuat .env pengembangan, jadi selalu mulai server sendiri.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
