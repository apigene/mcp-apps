/* ============================================
   NOTION SEARCH MCP APP (SDK VERSION)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   for utilities only (theme helpers, types, auto-resize).

   It does NOT call app.connect() because the proxy handles initialization.
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


/* ============================================
   Notion Search MCP App
   ============================================
   Renders Notion search API results (body.results) with
   Notion-style layout and typography.
   ============================================ */

const APP_NAME = "Notion Search";
const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2026-01-26";

function unwrapData(data: any): any {
  if (!data) return null;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  const raw = data.body ?? data;
  return raw;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
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
  return t.slice(0, maxLen).trim() + "…";
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
    setTimeout(() => notifySizeChanged(), 50);
  } catch (err: any) {
    console.error("Render error:", err);
    showError("Error rendering results: " + err.message);
    setTimeout(() => notifySizeChanged(), 50);
  }
}

window.addEventListener("message", function (event: MessageEvent) {
  const msg = event.data;
  if (!msg || msg.jsonrpc !== "2.0") return;
  if (msg.id !== undefined && msg.method === "ui/resource-teardown") {
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    window.parent.postMessage({ jsonrpc: "2.0", id: msg.id, result: {} }, "*");
    return;
  }
  if (msg.id !== undefined && !msg.method) return;
  switch (msg.method) {
    case "ui/notifications/tool-result":
      const data = msg.params?.structuredContent ?? msg.params;
      if (data !== undefined) renderData(data);
      else showEmpty("No data received.");
      break;
    case "ui/notifications/host-context-changed":
      if (msg.params?.theme === "dark") document.body.classList.add("dark");
      else if (msg.params?.theme === "light") document.body.classList.remove("dark");
      if (msg.params?.displayMode) handleDisplayModeChange(msg.params.displayMode);
      break;
    case "ui/notifications/tool-cancelled":
      showError("Cancelled: " + (msg.params?.reason || "Tool cancelled"));
      break;
    default:
      if (msg.params) {
        const fallback = msg.params.structuredContent ?? msg.params;
        if (fallback && fallback !== msg) renderData(fallback);
      }
  }
});


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
  setTimeout(() => notifySizeChanged(), 100);
}


sendRequest("ui/initialize", {
  appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
  appInfo: { name: APP_NAME, version: APP_VERSION },
  protocolVersion: PROTOCOL_VERSION,
})
  .then((result: any) => {
    const ctx = result.hostContext ?? result;
    sendNotification("ui/notifications/initialized", {});
    if (ctx?.theme === "dark") document.body.classList.add("dark");
    else if (ctx?.theme === "light") document.body.classList.remove("dark");
    if (ctx?.displayMode) handleDisplayModeChange(ctx.displayMode);
    if (ctx?.containerDimensions) {
      const d = ctx.containerDimensions;
      if (d.width) document.body.style.width = d.width + "px";
      if (d.height) document.body.style.height = d.height + "px";
      if (d.maxWidth) document.body.style.maxWidth = d.maxWidth + "px";
      if (d.maxHeight) document.body.style.maxHeight = d.maxHeight + "px";
    }
  })
  .catch(() => {});

export {};

/* ============================================
   SDK APP INSTANCE (PROXY MODE - NO CONNECT)
   ============================================ */

const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

/* ============================================
   AUTO-RESIZE VIA SDK
   ============================================ */

const cleanupResize = app.setupSizeChangedNotifications();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (proxy mode - SDK utilities only)");

// Export empty object to ensure this file is treated as an ES module
export {};
