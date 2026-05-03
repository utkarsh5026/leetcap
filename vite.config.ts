import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

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
