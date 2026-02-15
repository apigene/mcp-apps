import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const TEMPLATES_ROOT = path.join(REPO_ROOT, "templates");
const DEFAULT_MOCK_PATH = path.join(
  REPO_ROOT,
  "tools",
  "template-lab",
  "mock-data",
  "default.json",
);

type TemplateInfo = {
  name: string;
  toolName: string;
  resourceUri: string;
};

const buildInFlight = new Map<string, Promise<void>>();

function normalizeTemplateName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseTemplateName(args: Record<string, unknown> | undefined): string {
  const template = typeof args?.template === "string" ? args.template : "";
  if (template.trim()) return normalizeTemplateName(template);

  const request = typeof args?.request === "string" ? args.request : "";
  const match = request.match(/show\s+demo\s+app\s+(.+)/i) ?? request.match(/show\s+demo\s+for\s+(.+)/i);
  if (match?.[1]) return normalizeTemplateName(match[1]);

  return "";
}

function toToolName(templateName: string): string {
  return `show_demo_${templateName.replace(/[^a-z0-9_\-]/gi, "_")}`;
}

function listTemplates(): TemplateInfo[] {
  const entries = readdirSync(TEMPLATES_ROOT, { withFileTypes: true });
  const templates: TemplateInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const sourceHtml = path.join(TEMPLATES_ROOT, entry.name, "mcp-app.html");
    if (!existsSync(sourceHtml)) continue;

    templates.push({
      name: entry.name,
      toolName: toToolName(entry.name),
      resourceUri: `ui://template-demo/${entry.name}/mcp-app.html`,
    });
  }

  templates.sort((a, b) => a.name.localeCompare(b.name));
  return templates;
}

async function readMockPayload(templateName: string): Promise<unknown> {
  const templateResponse = path.join(TEMPLATES_ROOT, templateName, "response.json");
  const content = await fs
    .readFile(templateResponse, "utf8")
    .catch(async () => fs.readFile(DEFAULT_MOCK_PATH, "utf8"));
  return JSON.parse(content);
}

function toStructuredContent(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (Array.isArray(payload)) {
    return { rows: payload };
  }
  return { value: payload ?? null };
}

const distPath = (name: string) =>
  path.join(TEMPLATES_ROOT, name, "dist", "mcp-app.html");
const sourcePath = (name: string) =>
  path.join(TEMPLATES_ROOT, name, "mcp-app.html");

function readTemplateHtmlSync(templateName: string): string {
  const dist = distPath(templateName);
  const src = sourcePath(templateName);
  if (existsSync(dist)) return readFileSync(dist, "utf8");
  if (existsSync(src)) return readFileSync(src, "utf8");
  throw new Error(`No mcp-app.html found for template: ${templateName}`);
}

function isTemplateBuilt(templateName: string): boolean {
  return existsSync(distPath(templateName));
}

function templateHasBuildScript(templateName: string): boolean {
  const pkgPath = path.join(TEMPLATES_ROOT, templateName, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg?.scripts?.build === "string";
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let out = "";
    let err = "";

    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      err += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed (${code})\n${err || out}`));
    });
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function ensureTemplateBuilt(templateName: string): Promise<void> {
  if (isTemplateBuilt(templateName)) return;

  const existing = buildInFlight.get(templateName);
  if (existing) {
    await existing;
    return;
  }

  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  const buildPromise = (async () => {
    try {
      await runCommand("npm", ["run", "build"], templateDir);
    } catch {
      await runCommand("npm", ["install"], templateDir);
      await runCommand("npm", ["run", "build"], templateDir);
    }
  })();

  buildInFlight.set(templateName, buildPromise);

  try {
    await buildPromise;
  } finally {
    buildInFlight.delete(templateName);
  }
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Template Demo MCP Server",
    version: "0.2.0",
  });

  const templates = listTemplates();

  // List all apps available to demo (no UI binding).
  registerAppTool(
    server,
    "list_demo_apps",
    {
      title: "List Demo Apps",
      description:
        "List all MCP app templates available to demo. Returns template names and the tool to open each one.",
      inputSchema: {},
      _meta: {},
    },
    async () => {
      const currentTemplates = listTemplates();
      const apps = currentTemplates.map((t) => ({
        name: t.name,
        tool: t.toolName,
      }));
      return {
        content: [
          {
            type: "text",
            text: `Available demo apps (${apps.length}): ${apps.map((a) => a.name).join(", ")}. Use show_demo_app with template name, or call the specific tool (e.g. ${apps[0]?.tool ?? "show_demo_<name>"}) to open one.`,
          },
        ],
        structuredContent: {
          ok: true,
          count: apps.length,
          apps,
        },
      };
    },
  );

  // Lookup/helper tool: show_demo_app (no UI binding).
  registerAppTool(
    server,
    "show_demo_app",
    {
      title: "Show Demo App",
      description:
        "Open an MCP app demo by template name. Pass template or request like 'show demo app xyz-users'. Use list_demo_apps to see all available apps.",
      inputSchema: {
        request: z
          .string()
          .optional()
          .describe("Natural-language request like: show demo app xyz-users"),
        template: z
          .string()
          .optional()
          .describe("Template folder name, e.g. xyz-users"),
      },
      _meta: {},
    },
    async (args) => {
      const currentTemplates = listTemplates();
      const templateName = parseTemplateName(args as Record<string, unknown> | undefined);
      const availableTemplates = currentTemplates.map((t) => t.name);

      if (!templateName) {
        return {
          content: [
            {
              type: "text",
              text:
                "Template name is missing. Use show_demo_app with template argument, or say 'show demo app <name>'. Use list_demo_apps to see all available apps.",
            },
          ],
          structuredContent: {
            ok: false,
            reason: "missing_template_name",
            availableTemplates,
          },
        };
      }

      const found = currentTemplates.find((t) => t.name === templateName);
      if (!found) {
        return {
          content: [{ type: "text", text: `Template not found: ${templateName}` }],
          structuredContent: {
            ok: false,
            reason: "template_not_found",
            template: templateName,
            availableTemplates,
          },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Use tool '${found.toolName}' to open demo for ${templateName}. If needed, it will be built automatically.`,
          },
        ],
        structuredContent: {
          ok: true,
          template: templateName,
          tool: found.toolName,
        },
      };
    },
  );

  // One UI resource + one UI tool per template (prevents stale previous template view).
  for (const template of templates) {
    registerAppResource(
      server,
      `Template Demo UI: ${template.name}`,
      template.resourceUri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => {
        try {
          await ensureTemplateBuilt(template.name);
          const html = readTemplateHtmlSync(template.name);

          return {
            contents: [
              {
                uri: template.resourceUri,
                mimeType: RESOURCE_MIME_TYPE,
                text: html,
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown build error";
          const html = `<!doctype html><html><body style="font-family:sans-serif;padding:16px;"><h3>Template build failed</h3><pre style="white-space:pre-wrap;">${escapeHtml(message)}</pre></body></html>`;

          return {
            contents: [
              {
                uri: template.resourceUri,
                mimeType: RESOURCE_MIME_TYPE,
                text: html,
              },
            ],
          };
        }
      },
    );

    registerAppTool(
      server,
      template.toolName,
      {
        title: `Show Demo: ${template.name}`,
        description: `Open MCP app demo for template '${template.name}'.`,
        inputSchema: {
          _: z.string().optional().describe("Optional placeholder; tool needs no arguments."),
        },
        _meta: {
          ui: { resourceUri: template.resourceUri },
        },
      },
      async () => {
        try {
          await ensureTemplateBuilt(template.name);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Template build failed for '${template.name}': ${error instanceof Error ? error.message : "unknown error"}`,
              },
            ],
            structuredContent: {
              ok: false,
              reason: "template_build_failed",
              template: template.name,
            },
          };
        }

        const payload = await readMockPayload(template.name);
        const structuredContent = toStructuredContent(payload);

        return {
          content: [{ type: "text", text: `Opening demo for ${template.name}` }],
          structuredContent,
        };
      },
    );
  }

  return server;
}
