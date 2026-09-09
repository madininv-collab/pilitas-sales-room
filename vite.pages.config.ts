import {fileURLToPath, URL} from "node:url";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
