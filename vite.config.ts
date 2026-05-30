import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Use injectManifest so our custom sw.ts controls both
      // Workbox precaching AND Firebase Cloud Messaging background handler.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",

      // We manage public/manifest.json ourselves — don't auto-generate one
      manifest: false,

      // Don't inject a <link rel="manifest"> — index.html already has it
      injectRegister: null,

      injectManifest: {
        // Precache all JS, CSS, HTML, fonts, and icons built by Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Exclude Firebase compat SW scripts (fetched at runtime)
        globIgnores: ["**/node_modules/**"],
        // Raise the per-file size warning threshold (monolithic bundle is large)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
      },

      devOptions: {
        // Disable SW in dev mode to avoid cache confusion during development
        enabled: false,
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
