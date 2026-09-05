import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Config technique du build. Rien ici n'est destiné à être modifié pour
// ajuster le contenu du jeu : voir src/config/ pour ça.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Sépare nos assets statiques (public/assets) des chunks JS/CSS
      // buildés par Vite, pour ne jamais mélanger les deux dans dist/assets.
      manifest: {
        name: "Pina Tresolada",
        short_name: "Pina Tresolada",
        description:
          "Chasse au trésor IRL : aide Mixapéro à retrouver les six ingrédients volés par Les Glaçants.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FFF0C4",
        theme_color: "#FF6A45",
        icons: [
          {
            src: "/assets/icons/ico-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/assets/icons/ico-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/assets/icons/ico-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Tous les assets (y compris ceux des jeux non encore atteints)
        // doivent être en cache dès le premier chargement : chasse hors ligne.
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp,mp3,woff2,json}",
        ],
        // Nos plus gros fichiers (backgrounds) avoisinent 1 Mo : marge large.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        // Permet de tester le service worker en environnement de dev.
        enabled: true,
      },
    }),
  ],
  build: {
    assetsDir: "_app",
  },
  server: {
    port: 5173,
  },
});
