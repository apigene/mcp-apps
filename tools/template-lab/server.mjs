import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const publicDir = path.join(__dirname, "public");
const mockDir = path.join(__dirname, "mock-data");
const port = Number(process.env.PORT || 4311);
const host = process.env.HOST || "127.0.0.1";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function sendText(res, status, content, contentType) {
  res.writeHead(status, {
    "content-type": `${contentType}; charset=utf-8`,
    "cache-control": "no-store",
  });
  res.end(content);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html";
  if (ext === ".js" || ext === ".mjs") return "text/javascript";
  if (ext === ".css") return "text/css";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

async function listTemplates() {
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  const templates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "tools") continue;

    const dirPath = path.join(repoRoot, entry.name);
    const srcHtml = path.join(dirPath, "mcp-app.html");
    const distHtml = path.join(dirPath, "dist", "mcp-app.html");
    const responseJson = path.join(dirPath, "response.json");

    const hasSource = await fs
      .access(srcHtml)
      .then(() => true)
      .catch(() => false);

    if (!hasSource) continue;

    const hasDist = await fs
      .access(distHtml)
      .then(() => true)
      .catch(() => false);
    const hasResponse = await fs
      .access(responseJson)
      .then(() => true)
      .catch(() => false);

    templates.push({
      name: entry.name,
      hasSource,
      hasDist,
      hasResponse,
      distPath: `/${entry.name}/dist/mcp-app.html`,
    });
  }

  templates.sort((a, b) => a.name.localeCompare(b.name));
  return templates;
}

async function loadMockPayloadForTemplate(templateName) {
  const templates = await listTemplates();
  const template = templates.find((t) => t.name === templateName);
  if (!template) {
    return null;
  }

  const templateResponsePath = path.join(repoRoot, templateName, "response.json");
  if (template.hasResponse) {
    const content = await fs.readFile(templateResponsePath, "utf8");
    return {
      payload: JSON.parse(content),
      source: `${templateName}/response.json`,
    };
  }

  const defaultPath = path.join(mockDir, "default.json");
  const defaultContent = await fs.readFile(defaultPath, "utf8");
  return {
    payload: JSON.parse(defaultContent),
    source: "tools/template-lab/mock-data/default.json",
  };
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) {
    return null;
  }
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/templates") {
      const templates = await listTemplates();
      sendJson(res, 200, { templates });
      return;
    }

    if (pathname === "/api/mock/default") {
      const mockPath = path.join(mockDir, "default.json");
      const content = await fs.readFile(mockPath, "utf8");
      sendText(res, 200, content, "application/json");
      return;
    }

    if (pathname === "/api/mock/template") {
      const templateName = url.searchParams.get("name");
      if (!templateName) {
        sendJson(res, 400, { error: "Missing template name" });
        return;
      }

      const result = await loadMockPayloadForTemplate(templateName);
      if (!result) {
        sendJson(res, 404, { error: `Template not found: ${templateName}` });
        return;
      }

      sendJson(res, 200, result);
      return;
    }

    if (pathname.startsWith("/template/")) {
      const rel = pathname.replace(/^\/template\//, "");
      const filePath = safeJoin(repoRoot, rel);
      if (!filePath) {
        sendText(res, 400, "Invalid path", "text/plain");
        return;
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        "content-type": contentTypeFor(filePath),
        "cache-control": "no-store",
      });
      res.end(content);
      return;
    }

    const publicFile = pathname === "/" ? "/index.html" : pathname;
    const publicPath = safeJoin(publicDir, `.${publicFile}`);
    if (!publicPath) {
      sendText(res, 400, "Invalid path", "text/plain");
      return;
    }

    const content = await fs.readFile(publicPath);
    res.writeHead(200, {
      "content-type": contentTypeFor(publicPath),
      "cache-control": "no-store",
    });
    res.end(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      sendText(res, 404, "Not found", "text/plain");
      return;
    }

    console.error(error);
    sendText(res, 500, "Internal server error", "text/plain");
  }
});

server.listen(port, host, () => {
  console.log(`Template Lab running at http://${host}:${port}`);
});
