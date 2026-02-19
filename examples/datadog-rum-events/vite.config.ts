import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const INPUT = "mcp-app.html";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: INPUT,
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
