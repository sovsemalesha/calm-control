import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.webmanifest",

      // ✅ В dev включаем PWA, но без precache-сканирования файлов (оно и даёт warning)
      devOptions: {
        enabled: true,
      },

      // ✅ Важно: отключаем workbox precache именно в dev
      workbox: {
        globPatterns: [], // <— ключевая строка: убирает предупреждение
      },

      manifest: {
        name: "calm-control",
        short_name: "calm-control",
        description: "Calm task control with reminders",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
