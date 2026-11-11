import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trang trợ giúp (Astro Starlight build ra public/help, mỗi bài là một file .html):
  //   /help -> trang chủ trợ giúp; /help/<bài> (không đuôi) -> /help/<bài>.html.
  // Rewrite mặc định chạy SAU khi tìm file tĩnh, nên file có thật (.html, _astro/, pagefind/, ảnh) vẫn được phục vụ thẳng.
  async rewrites() {
    return [
      { source: "/help", destination: "/help/index.html" },
      { source: "/help/:path+", destination: "/help/:path+.html" },
    ];
  },
  async redirects() {
    return [
      // Phòng hờ: link cũ /dashboard.html (do router VitePress gắn đuôi .html) -> /dashboard.
      { source: "/dashboard.html", destination: "/dashboard", permanent: false },
      // Link cũ của VitePress tới trang mục lục nhóm (vd /help/thiet-ke/index.html) -> /help/thiet-ke.html.
      { source: "/help/:path+/index.html", destination: "/help/:path+.html", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Service worker luôn lấy bản mới nhất để cập nhật ứng dụng ngay khi deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
