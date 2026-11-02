import type { NextConfig } from "next";

/**
 * Prototipo estático para GitHub Pages.
 * - En desarrollo (`npm run dev`) el sitio vive en la raíz.
 * - Al publicar (`npm run deploy:pages`) el script define GITHUB_PAGES=1 y PAGES_BASE_PATH=/<repo>.
 */
const isPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  output: "export",
  // Carpeta de salida propia: no choca con un `next dev` en marcha (que usa .next/).
  distDir: isPages ? "out" : ".next",
  basePath: isPages ? (process.env.PAGES_BASE_PATH ?? "") : "",
  trailingSlash: true,
  poweredByHeader: false,
  // GitHub Pages no puede optimizar imágenes al vuelo: se suben ya en WebP y tamaño web.
  images: { unoptimized: true },
  // Conserva aquí el bloque que haya generado create-next-app para Tailwind con Turbopack:
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
