import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const INPUT = "mcp-app.html";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    // Inline everything into a single HTML file
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: INPUT,
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
