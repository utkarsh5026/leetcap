import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

/**
 * Chrome extension bundle via `@crxjs/vite-plugin`: writes `dist/`, enables sourcemaps only in development,
 * and pins the dev server/HMR client to port 5173.
 */
export default defineConfig(({ mode }) => ({
  plugins: [crx({ manifest })],
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
}));
