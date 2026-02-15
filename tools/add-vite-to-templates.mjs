#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.resolve(__dirname, "../templates");

const packageJson = (name, description) => ({
  name: `mcp-app-${name}`,
  version: "1.0.0",
  description: description || `${name} MCP App`,
  type: "module",
  private: true,
  scripts: { build: "vite build", dev: "vite build --watch" },
  devDependencies: {
    typescript: "^5.6.0",
    vite: "^6.0.0",
    "vite-plugin-singlefile": "^2.0.0",
  },
});

const viteConfig = `import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: "mcp-app.html",
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
`;

const entries = fs.readdirSync(templatesRoot, { withFileTypes: true });
const toAdd = [];

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  const dir = path.join(templatesRoot, entry.name);
  const hasHtml = fs.existsSync(path.join(dir, "mcp-app.html"));
  if (!hasHtml) continue;

  const pkgPath = path.join(dir, "package.json");
  let needsBuild = true;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && typeof pkg.scripts.build === "string") needsBuild = false;
    } catch (_) {}
  }

  if (needsBuild) toAdd.push(entry.name);
}

for (const name of toAdd) {
  const dir = path.join(templatesRoot, name);
  const pkgPath = path.join(dir, "package.json");
  const vitePath = path.join(dir, "vite.config.ts");

  const desc = name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  fs.writeFileSync(pkgPath, JSON.stringify(packageJson(name, `${desc} MCP App`), null, 2) + "\n");
  fs.writeFileSync(vitePath, viteConfig);
  console.log("Added build to:", name);
}

console.log("\nDone. Added Vite build to", toAdd.length, "templates.");
