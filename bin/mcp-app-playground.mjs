#!/usr/bin/env node

import { exec, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const templatesRoot = path.join(repoRoot, "templates");
const labDir = path.join(repoRoot, "tools", "template-lab");
const mcpMain = path.join(repoRoot, "tools", "template-mcp-server", "main.ts");

const tty = process.stdout?.isTTY;
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
function style(use, ...parts) {
  if (!tty || !use) return parts.join("");
  return use + parts.join("") + c.reset;
}

function help() {
  const title = style(c.bold, "mcp-app-playground");
  const dim = (s) => style(c.dim, s);
  const cmd = (s) => style(c.cyan, s);
  const opt = (s) => style(c.blue, s);
  console.log(`
 ${title}  ${dim("Local tooling for MCP App templates")}

 ${style(c.bold, "Usage")}
   npx mcp-app-playground ${opt("[command]")}
   ${dim("No command → starts Lab + MCP server and opens the lab in your browser.")}

 ${style(c.bold, "Commands")}
   ${cmd("start")}        Start MCP Apps Playground + MCP server (HTTP). Optionally opens the lab in your browser.
   ${cmd("list")}        List all available templates in templates/
   ${cmd("build")}       Install deps and build every template that has a build script
   ${cmd("lab")}         Run only the MCP Apps Playground (web preview server)
   ${cmd("mcp")} ${opt("http")}   Run only the MCP demo server over HTTP
   ${cmd("mcp")} ${opt("stdio")}  Run only the MCP demo server over stdio (for CLI hosts)
   ${cmd("help")}        Show this help

 ${style(c.bold, "Examples")}
   ${dim("# Full dev setup (lab + MCP):")}
   npx mcp-app-playground start

   ${dim("# Preview templates in the browser:")}
   npx mcp-app-playground lab
   ${dim("Then open")} http://localhost:4311

   ${dim("# Build all templates (e.g. before CI):")}
   npx mcp-app-playground build
`);
}

function run(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

function runDev(shouldOpenBrowser = false) {
  const procs = [];

  function spawnNamed(name, command, args, cwd) {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`${name} exited with code ${code}`);
      }
      shutdown();
    });

    procs.push(child);
  }

  function shutdown() {
    while (procs.length) {
      const p = procs.pop();
      if (p && !p.killed) p.kill("SIGTERM");
    }
  }

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  console.log(style(c.bold, "\n MCP Apps Playground\n"));
  console.log(style(c.dim, " Starting servers...\n"));
  console.log("  " + style(c.cyan, "Playground") + "  " + style(c.blue, "http://localhost:4311") + style(c.dim, "  — preview templates in the browser"));
  console.log("  " + style(c.cyan, "MCP server") + "  " + style(c.blue, "http://127.0.0.1:3001/mcp") + style(c.dim, "  — add this URL in Cursor / Claude / your MCP client\n"));
  console.log(style(c.bold, " MCP tools (use after adding the server URL above):\n"));
  console.log("  " + style(c.green, "list_demo_apps") + style(c.dim, "  — list all app templates you can demo; call this first to see available apps"));
  console.log("  " + style(c.green, "show_demo_app") + style(c.dim, "  — open a demo by name, e.g. show_demo_app with template: \"xyz-users\" or say \"show demo app xyz-users\"\n"));
  if (shouldOpenBrowser) {
    console.log(style(c.dim, " Opening playground in your browser in a moment.\n"));
    setTimeout(() => openBrowser("http://127.0.0.1:4311"), 1800);
  }
  console.log(style(c.dim, " Press Ctrl+C to stop.\n"));

  spawnNamed("MCP Apps Playground", "node", ["server.mjs"], labDir);
  spawnNamed("MCP HTTP Server", "node", ["--import", "tsx", mcpMain], repoRoot);
}

function listTemplates() {
  if (!fs.existsSync(templatesRoot)) {
    console.error(style(c.red, " Error: ") + "templates/ directory not found.");
    process.exit(1);
  }

  const items = fs
    .readdirSync(templatesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .filter((entry) => fs.existsSync(path.join(templatesRoot, entry.name, "mcp-app.html")))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (!items.length) {
    console.log(style(c.yellow, " No templates found.") + style(c.dim, " Add templates in templates/ with mcp-app.html."));
    return;
  }

  console.log(style(c.bold, " Available templates") + style(c.dim, ` (${items.length})`) + "\n");
  for (const name of items) {
    console.log("  " + style(c.cyan, name));
  }
  console.log(style(c.dim, "\n Use one as a base: cp -r templates/base-template-sdk templates/my-app"));
}

function getTemplatesWithBuild() {
  if (!fs.existsSync(templatesRoot)) return [];
  return fs
    .readdirSync(templatesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .filter((entry) => fs.existsSync(path.join(templatesRoot, entry.name, "mcp-app.html")))
    .map((entry) => entry.name)
    .filter((name) => {
      const pkgPath = path.join(templatesRoot, name, "package.json");
      if (!fs.existsSync(pkgPath)) return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        return pkg.scripts && typeof pkg.scripts.build === "string";
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b));
}

function buildAllTemplates() {
  const templates = getTemplatesWithBuild();
  if (!templates.length) {
    console.log(style(c.yellow, " No templates with a build script found.") + style(c.dim, " Add a \"build\" script in template package.json to include it."));
    return;
  }
  console.log(style(c.bold, " Build all templates") + style(c.dim, ` (${templates.length} template${templates.length === 1 ? "" : "s"})`) + "\n");
  console.log(style(c.dim, " Each template: npm install → npm run build\n"));
  let failed = 0;
  for (const name of templates) {
    const cwd = path.join(templatesRoot, name);
    console.log(style(c.cyan, " ▶ " + name));
    const install = spawnSync("npm", ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (install.status !== 0) {
      console.error(style(c.red, "   ✗ npm install failed"));
      failed += 1;
      continue;
    }
    const r = spawnSync("npm", ["run", "build"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (r.status !== 0) {
      console.error(style(c.red, "   ✗ build failed"));
      failed += 1;
    } else {
      console.log(style(c.green, "   ✓ built"));
    }
  }
  if (failed) {
    console.error("\n" + style(c.red, " ✗ ") + style(c.bold, `${failed} template(s) failed to build.`));
    process.exit(1);
  }
  console.log("\n" + style(c.green, " ✓ All templates built successfully."));
}

const [, , cmd, sub] = process.argv;

if (cmd === "help" || cmd === "--help" || cmd === "-h") {
  help();
  process.exit(0);
}

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === "darwin"
      ? `open "${url}"`
      : platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(command, (err) => {
    if (err) console.error("Could not open browser:", err.message);
  });
}

if (cmd === "list") {
  listTemplates();
  process.exit(0);
} else if (cmd === "build") {
  buildAllTemplates();
  process.exit(0);
} else if (cmd === "start" || cmd === "dev" || !cmd) {
  runDev(!cmd);
} else if (cmd === "lab") {
  console.log(style(c.bold, "\n MCP Apps Playground") + style(c.dim, " (preview only)\n"));
  console.log("  " + style(c.blue, "http://localhost:4311") + style(c.dim, "  — open in your browser to preview templates\n"));
  console.log(style(c.dim, " Press Ctrl+C to stop.\n"));
  run("node", ["server.mjs"], labDir);
} else if (cmd === "mcp") {
  if (sub === "stdio") {
    console.log(style(c.bold, "\n MCP server (stdio)") + style(c.dim, " — for CLI hosts\n"));
    run("node", ["--import", "tsx", mcpMain, "--stdio"], repoRoot);
  } else {
    console.log(style(c.bold, "\n MCP server (HTTP)\n"));
    console.log("  " + style(c.blue, "http://127.0.0.1:3001/mcp") + style(c.dim, "  — connect MCP clients to this endpoint\n"));
    console.log(style(c.dim, " Press Ctrl+C to stop.\n"));
    run("node", ["--import", "tsx", mcpMain], repoRoot);
  }
} else {
  console.error(style(c.red, " Unknown command: ") + cmd + "\n");
  help();
  process.exit(1);
}
