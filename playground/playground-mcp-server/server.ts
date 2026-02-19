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
const EXAMPLES_ROOT = path.join(REPO_ROOT, "examples");
const DEFAULT_MOCK_PATH = path.join(
  REPO_ROOT,
  "playground",
  "playground-app",
  "mock-data",
  "default.json",
);

type TemplateInfo = {
  name: string;
  toolName: string;
  resourceUri: string;
};

// CSP configuration per template
// Maps template names to their required external domains
type CSPConfig = {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  baseUriDomains?: string[];
};

const TEMPLATE_CSP_CONFIGS: Record<string, CSPConfig> = {
  // Spotify - music streaming API
  "spotify-search": {
    connectDomains: ["https://api.spotify.com"],
    resourceDomains: ["https://i.scdn.co", "https://*.spotifycdn.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // GitHub - repository and user data
  "github-contributors": {
    connectDomains: ["https://api.github.com"],
    resourceDomains: ["https://avatars.githubusercontent.com", "https://ui-avatars.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "github-list-commits": {
    connectDomains: ["https://api.github.com"],
    resourceDomains: ["https://avatars.githubusercontent.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "github-commit-diff": {
    connectDomains: ["https://api.github.com"],
    resourceDomains: ["https://avatars.githubusercontent.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Ahrefs - SEO and backlinks
  "ahrefs-backlinks": {
    connectDomains: ["https://api.ahrefs.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Apollo - sales intelligence
  "apollo-companies-search": {
    connectDomains: ["https://api.apollo.io"],
    resourceDomains: ["https://www.google.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "apollo-people-search": {
    connectDomains: ["https://api.apollo.io"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Google APIs
  "google-calendar-events": {
    connectDomains: ["https://www.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-drive-files-list": {
    connectDomains: ["https://www.googleapis.com"],
    resourceDomains: ["https://drive-thirdparty.googleusercontent.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-maps-search": {
    connectDomains: ["https://maps.googleapis.com", "https://places.googleapis.com"],
    resourceDomains: ["https://maps.gstatic.com", "https://lh3.googleusercontent.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-analytics-run-report": {
    connectDomains: ["https://analyticsdata.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-sheet": {
    connectDomains: ["https://sheets.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-sheetv2": {
    connectDomains: ["https://sheets.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-search-console-query": {
    connectDomains: ["https://www.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-search-console-query-v2": {
    connectDomains: ["https://www.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "google-search-console-guery-v2": {
    connectDomains: ["https://www.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "gmail-thread-list": {
    connectDomains: ["https://gmail.googleapis.com", "https://www.googleapis.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Slack
  "slack-search-messages": {
    connectDomains: ["https://slack.com"],
    resourceDomains: ["https://*.slack-edge.com", "https://avatars.slack-edge.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // BrightData web scraping
  "brightdata-amazon-product-details": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://m.media-amazon.com", "https://images-na.ssl-images-amazon.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-amazon-products-search": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://m.media-amazon.com", "https://images-na.ssl-images-amazon.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-batch-scrape": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-instagram-post": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://*.cdninstagram.com", "https://scontent.cdninstagram.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-instagram-profile": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://*.cdninstagram.com", "https://scontent.cdninstagram.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-linkedin-post": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://media.licdn.com", "https://*.licdn.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-linkedin-profile": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://media.licdn.com", "https://*.licdn.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-search": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-tiktok-post": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://*.tiktokcdn.com", "https://p16-sign.tiktokcdn-us.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "brightdata-zara-product": {
    connectDomains: ["https://api.brightdata.com"],
    resourceDomains: ["https://static.zara.net"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Shopify
  "shopify-get-product-details": {
    connectDomains: ["https://*.myshopify.com"],
    resourceDomains: ["https://cdn.shopify.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "shopify-search-global-product-v1": {
    connectDomains: ["https://*.myshopify.com"],
    resourceDomains: ["https://cdn.shopify.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  "shopify-search-global-product-v2": {
    connectDomains: ["https://*.myshopify.com"],
    resourceDomains: ["https://cdn.shopify.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Notion
  "notion-search": {
    connectDomains: ["https://api.notion.com"],
    resourceDomains: ["https://www.notion.so"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Firecrawl
  "firecrawl-scrape-url": {
    connectDomains: ["https://api.firecrawl.dev"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Cursor
  "cursor-list-agents": {
    connectDomains: [],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  "cursor-list-repositories": {
    connectDomains: [],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Datadog
  "datadog-listlogs": {
    connectDomains: ["https://api.datadoghq.com", "https://api.us5.datadoghq.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Vercel
  "vercel-get-deployments": {
    connectDomains: ["https://api.vercel.com"],
    resourceDomains: ["https://vercel.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Ashby
  "ashby-list-candidates": {
    connectDomains: ["https://api.ashbyhq.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Rebrickable (LEGO)
  "rebrickable-lego-parts-3d": {
    connectDomains: ["https://rebrickable.com"],
    resourceDomains: ["https://cdn.rebrickable.com", "https://www.bricklink.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Tavily search
  "tavily-search": {
    connectDomains: ["https://api.tavily.com"],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Fakestore (demo API)
  "fakestore-list-products": {
    connectDomains: ["https://fakestoreapi.com"],
    resourceDomains: ["https://fakestoreapi.com"],
    frameDomains: [],
    baseUriDomains: [],
  },
  // Default CSP for templates with no external dependencies
};

function getTemplateCSP(templateName: string): CSPConfig {
  return TEMPLATE_CSP_CONFIGS[templateName] ?? {
    connectDomains: [],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: [],
  };
}

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
  const entries = readdirSync(EXAMPLES_ROOT, { withFileTypes: true });
  const templates: TemplateInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const sourceHtml = path.join(EXAMPLES_ROOT, entry.name, "mcp-app.html");
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
  const templateResponse = path.join(EXAMPLES_ROOT, templateName, "response.json");
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
  path.join(EXAMPLES_ROOT, name, "dist", "mcp-app.html");
const sourcePath = (name: string) =>
  path.join(EXAMPLES_ROOT, name, "mcp-app.html");

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
  const pkgPath = path.join(EXAMPLES_ROOT, templateName, "package.json");
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

  const templateDir = path.join(EXAMPLES_ROOT, templateName);
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
      _meta: {
        visibility: ["model", "app"],
      },
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
      _meta: {
        visibility: ["model", "app"],
      },
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
          const csp = getTemplateCSP(template.name);

          return {
            contents: [
              {
                uri: template.resourceUri,
                mimeType: RESOURCE_MIME_TYPE,
                text: html,
                _meta: {
                  ui: {
                    csp,
                    prefersBorder: true,
                  },
                },
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown build error";
          const errorCode = "BUILD_FAILED";
          // Minimal error HTML for visual feedback in the UI
          const html = `<!doctype html><html><body style="font-family:sans-serif;padding:16px;"><h3>Template build failed</h3><pre style="white-space:pre-wrap;">${escapeHtml(message)}</pre></body></html>`;

          return {
            contents: [
              {
                uri: template.resourceUri,
                mimeType: RESOURCE_MIME_TYPE,
                text: html,
                _meta: {
                  ui: {
                    csp: {
                      connectDomains: [],
                      resourceDomains: [],
                      frameDomains: [],
                      baseUriDomains: [],
                    },
                    prefersBorder: true,
                    // Structured error metadata for programmatic handling
                    error: {
                      code: errorCode,
                      message: message,
                      template: template.name,
                    },
                  },
                },
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
          visibility: ["model", "app"],
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
