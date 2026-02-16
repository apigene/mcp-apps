import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const templatesRoot = path.join(repoRoot, "templates");
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

const METADATA_FILE = "template-metadata.json";

async function loadTemplateMetadata(dirPath) {
  const metaPath = path.join(dirPath, METADATA_FILE);
  try {
    const content = await fs.readFile(metaPath, "utf8");
    const data = JSON.parse(content);
    return {
      uiElements: Array.isArray(data.uiElements) ? data.uiElements : [],
      mcpFeatures: Array.isArray(data.mcpFeatures) ? data.mcpFeatures : [],
    };
  } catch {
    return { uiElements: [], mcpFeatures: [] };
  }
}

async function listTemplates() {
  const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
  const templates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const dirPath = path.join(templatesRoot, entry.name);
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

    const metadata = await loadTemplateMetadata(dirPath);

    templates.push({
      name: entry.name,
      hasSource,
      hasDist,
      hasResponse,
      distPath: `/templates/${entry.name}/dist/mcp-app.html`,
      uiElements: metadata.uiElements,
      mcpFeatures: metadata.mcpFeatures,
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

  const templateResponsePath = path.join(templatesRoot, templateName, "response.json");
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

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed (${code})\n${stderr || stdout}`));
    });
  });
}

async function ensureTemplateBuilt(templateName) {
  const templates = await listTemplates();
  const template = templates.find((t) => t.name === templateName);
  if (!template) {
    return { ok: false, error: `Template not found: ${templateName}` };
  }

  if (template.hasDist) {
    return { ok: true, built: false, message: "already_built" };
  }

  const templateDir = path.join(templatesRoot, templateName);
  let installAttempted = false;

  try {
    await runCommand("npm", ["run", "build"], templateDir);
  } catch {
    installAttempted = true;
    await runCommand("npm", ["install"], templateDir);
    await runCommand("npm", ["run", "build"], templateDir);
  }

  return {
    ok: true,
    built: true,
    installed: installAttempted,
    message: installAttempted ? "installed_and_built" : "built",
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

    if (pathname === "/api/template/prepare") {
      const templateName = url.searchParams.get("name");
      if (!templateName) {
        sendJson(res, 400, { ok: false, error: "Missing template name" });
        return;
      }

      try {
        const result = await ensureTemplateBuilt(templateName);
        const status = result.ok ? 200 : 404;
        sendJson(res, status, result);
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to build template",
        });
      }
      return;
    }

    if (pathname.startsWith("/template/")) {
      let rel = pathname.replace(/^\/template\//, "").replace(/^templates\//, "");
      let filePath = safeJoin(repoRoot, path.join("templates", rel));
      if (!filePath) {
        sendText(res, 400, "Invalid path", "text/plain");
        return;
      }

      if (rel.endsWith("dist/mcp-app.html")) {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
          const fallback = path.join(path.dirname(path.dirname(filePath)), "mcp-app.html");
          const fallbackExists = await fs.access(fallback).then(() => true).catch(() => false);
          if (fallbackExists) filePath = fallback;
        }
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

const tty = process.stdout?.isTTY;
const dim = (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
const cyan = (s) => (tty ? `\x1b[36m${s}\x1b[0m` : s);

server.listen(port, host, () => {
  console.log(cyan(`Playground: http://${host}:${port}`));
});
