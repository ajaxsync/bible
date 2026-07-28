import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isCapacitor = mode === "capacitor";
  const base = isCapacitor ? "/" : env.VITE_BASE || "/";

  return {
    base,
    build: isCapacitor
      ? {
          emptyOutDir: false,
          modulePreload: false,
          minify: "terser",
          cssTarget: "chrome61",
        }
      : undefined,
    plugins: [
      react(),
      isCapacitor &&
        legacy({
          targets: ["chrome >= 61", "android >= 5"],
          renderModernChunks: false,
        }),
      !isCapacitor &&
        VitePWA({
          registerType: "prompt",
          devOptions: { enabled: true },
          includeAssets: [
            "favicon.svg",
            "icon-192.png",
            "icon-512.png",
            "icon-192-maskable.png",
            "icon-512-maskable.png",
            "apple-touch-icon.png",
          ],
          manifest: {
            id: base === "/" ? "/" : base.replace(/\/$/, ""),
            name: env.VITE_APP_TITLE || "Bible · Reader",
            short_name: env.VITE_APP_NAME || "Bible",
            description: "圣经阅读器",
            theme_color: env.VITE_ACCENT_COLOR || "#2383e2",
            background_color: "#f7f6f3",
            display: "standalone",
            start_url: base,
            scope: base,
            icons: [
              {
                src: `${base}icon-192.png`.replace(/\/+/g, "/"),
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${base}icon-512.png`.replace(/\/+/g, "/"),
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${base}icon-192-maskable.png`.replace(/\/+/g, "/"),
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
              },
              {
                src: `${base}icon-512-maskable.png`.replace(/\/+/g, "/"),
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2}"],
            globIgnores: ["**/json/**", "**/cache-manifest.json"],
            navigateFallback: "index.html",
            navigateFallbackDenylist: [/^\/json\//],
          },
        }),
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
    server: {
      port: Number(env.DEV_PORT) || 3650,
      host: true,
    },
  };
});
