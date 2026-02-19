/* ============================================
   NOTION SEARCH MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect() for initialization.
   ============================================ */

/* ============================================
   SDK IMPORTS
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

// Import styles (will be bundled by Vite)
import "./global.css";
import "./mcp-app.css";

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Notion Search";
const APP_VERSION = "1.0.0";

/* ============================================
   Notion Search MCP App
   ============================================
   Renders Notion search API results (body.results) with
   Notion-style layout and typography.
   ============================================ */

function unwrapData(data: any): any {
  if (!data) return null;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  const raw = data.body ?? data;
  return raw;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No results found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

function getResultsFromResponse(data: any): any[] {
  const raw = unwrapData(data);
  if (!raw) return [];
  const results = raw.results ?? raw.items ?? [];
  return Array.isArray(results) ? results : [];
}

function truncate(str: string, maxLen: number): string {
  if (!str || typeof str !== "string") return "";
  const t = str.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "...";
}

/** Notion-style page/document icon */
function iconPage(): string {
  return `<svg class="notion-icon-page" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`;
}

/** Open in new tab (external link) */
function iconOpen(): string {
  return `<svg class="notion-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

function renderResultRow(item: any): string {
  const title = item.title || "Untitled";
  const url = item.url || "#";
  const highlight = truncate(item.highlight || "", 140);
  const timestamp = item.timestamp || "";
  const typeLabel = item.type === "page" ? "Page" : (item.type || "");

  let html = '<div class="notion-result">';
  html += '<div class="notion-result-icon">' + iconPage() + '</div>';
  html += '<div class="notion-result-body">';
  html += '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" class="notion-result-title">' + escapeHtml(title) + '</a>';
  if (typeLabel) {
    html += '<span class="notion-result-type">' + escapeHtml(typeLabel) + '</span>';
  }
  if (highlight) {
    html += '<p class="notion-result-highlight">' + escapeHtml(highlight) + '</p>';
  }
  if (timestamp) {
    html += '<span class="notion-result-time">' + escapeHtml(timestamp) + '</span>';
  }
  html += '</div>';
  html += '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" class="notion-result-open" title="Open in Notion">' + iconOpen() + '</a>';
  html += '</div>';
  return html;
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;
  if (!data) {
    showEmpty("No data received.");
    return;
  }
  try {
    const results = getResultsFromResponse(data);
    if (!results.length) {
      showEmpty("No search results.");
      return;
    }

    let html = '<div class="notion-widget">';
    html += '<header class="notion-header">';
    html += '<span class="notion-logo-wrap">' + iconPage() + '</span>';
    html += '<span class="notion-brand">Notion</span>';
    html += '<span class="notion-subtitle">Search</span>';
    html += '</header>';

    html += '<div class="notion-toolbar">';
    html += '<span class="notion-count">' + results.length + ' result' + (results.length !== 1 ? "s" : "") + '</span>';
    html += '</div>';

    html += '<div class="notion-list">';
    results.forEach((item: any) => { html += renderResultRow(item); });
    html += '</div>';

    html += '<div class="notion-footer">';
    html += 'Open any result in Notion to view the full page.';
    html += '</div>';
    html += '</div>';

    app.innerHTML = html;
      } catch (err: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(err)}`, logger: APP_NAME });
    showError("Error rendering results: " + err.message);
      }
}

let currentDisplayMode = "inline";
function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
    const el = document.querySelector(".notion-widget");
    if (el) (el as HTMLElement).style.maxWidth = "100%";
  } else {
    document.body.classList.remove("fullscreen-mode");
    const el = document.querySelector(".notion-widget");
    if (el) (el as HTMLElement).style.maxWidth = "";
  }
}

/* ============================================
   HOST CONTEXT HANDLER
   ============================================ */

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;

  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
    // Also toggle body.dark class for CSS compatibility
    if (ctx.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }
}

/* ============================================
   SDK APP INSTANCE (STANDALONE MODE)
   ============================================ */

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

app.onteardown = async () => {
  app.sendLog({ level: "info", data: "Resource teardown requested", logger: APP_NAME });
  return {};
};

app.ontoolinput = (params) => {
  app.sendLog({ level: "info", data: `Tool input received: ${JSON.stringify(params.arguments)}`, logger: APP_NAME });
};

app.ontoolresult = (params) => {
  app.sendLog({ level: "info", data: "Tool result received", logger: APP_NAME });

  // Check for tool execution errors
  if (params.isError) {
    app.sendLog({ level: "error", data: `Tool execution failed: ${JSON.stringify(params.content)}`, logger: APP_NAME });
    const errorText =
      params.content?.map((c: any) => c.text || "").join("\n") ||
      "Tool execution failed";
    showError(errorText);
    return;
  }

  const data = params.structuredContent || params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    app.sendLog({ level: "warning", data: `Tool result received but no data found: ${JSON.stringify(params)}`, logger: APP_NAME });
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  app.sendLog({ level: "info", data: `Tool cancelled: ${reason}`, logger: APP_NAME });
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  app.sendLog({ level: "error", data: `App error: ${JSON.stringify(error)}`, logger: APP_NAME });
};

app.onhostcontextchanged = (ctx) => {
  app.sendLog({ level: "info", data: `Host context changed: ${JSON.stringify(ctx)}`, logger: APP_NAME });
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    app.sendLog({ level: "info", data: "MCP App connected to host", logger: APP_NAME });
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${JSON.stringify(error)}`, logger: APP_NAME });
  });

export {};
