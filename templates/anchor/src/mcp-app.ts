/* ============================================
   ANCHOR MCP APP – Screenshot display
   ============================================
   Displays a single screenshot from API response:
   { status_code, headers, body: { media_type, format, data } }
   body.data = base64 image string
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Anchor";
const APP_VERSION = "1.0.0";

function unwrapData(data: any): any {
  if (!data) return null;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;
  if (
    data.rows &&
    typeof data.rows === "object" &&
    !Array.isArray(data.rows) &&
    data.rows.columns &&
    data.rows.rows
  ) {
    return data.rows;
  }
  if (data.columns || Array.isArray(data.rows)) return data;
  if (Array.isArray(data)) return { rows: data };
  // Anchor screenshot: { status_code, body: { media_type, format, data } }
  if (data.body && typeof data.body.data === "string") return data;
  return data;
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

function showEmpty(message: string = "No screenshot available.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/** Allow only image/* MIME types for data URL */
function sanitizeMediaType(mime: any): string {
  if (typeof mime !== "string") return "image/png";
  const s = mime.trim().toLowerCase();
  if (s.startsWith("image/")) return s;
  return "image/png";
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const raw = unwrapData(data);
    // Support both shapes: { body: { media_type, data } } and top-level { media_type, data }
    const body =
      raw?.body && typeof raw.body.data === "string"
        ? raw.body
        : typeof raw?.data === "string" && raw?.media_type
          ? { media_type: raw.media_type, format: raw.format, data: raw.data }
          : null;
    if (!body || typeof body.data !== "string") {
      showEmpty("No screenshot data (missing body.data).");
      return;
    }

    const mediaType = sanitizeMediaType(body.media_type || "image/png");
    const dataUrl = `data:${mediaType};base64,${body.data}`;

    const statusCode = raw?.status_code;
    const caption =
      statusCode != null
        ? `Screenshot (${escapeHtml(String(statusCode))})`
        : "Screenshot";

    const container = document.createElement("div");
    container.className = "container anchor-screenshot";
    container.innerHTML = `
      <p class="mcp-app-badge">Anchor</p>
      <div class="anchor-screenshot-wrap">
        <img class="anchor-screenshot-image" src="" alt="Screenshot" decoding="async" />
        <p class="anchor-screenshot-caption">${caption}</p>
      </div>
    `;
    const img = container.querySelector(".anchor-screenshot-image") as HTMLImageElement;
    img.src = dataUrl;

    app.innerHTML = "";
    app.appendChild(container);
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering screenshot: ${error.message}`);
  }
}

const app = new App({ name: APP_NAME, version: APP_VERSION });

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.jsonrpc === "2.0") {
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      const data = msg.params.structuredContent || msg.params;
      renderData(data);
      return;
    }
    if (msg.method === "ui/notifications/host-context-changed" && msg.params) {
      if (msg.params.theme) applyDocumentTheme(msg.params.theme);
      if (msg.params.styles?.css?.fonts) applyHostFonts(msg.params.styles.css.fonts);
      if (msg.params.styles?.variables) applyHostStyleVariables(msg.params.styles.variables);
      if (msg.params.displayMode === "fullscreen") {
        document.body.classList.add("fullscreen-mode");
      } else {
        document.body.classList.remove("fullscreen-mode");
      }
      return;
    }
    if (msg.method === "ui/notifications/tool-cancelled") {
      showError(`Operation cancelled: ${msg.params?.reason || "Unknown reason"}`);
      return;
    }
    if (msg.id !== undefined && msg.method === "ui/resource-teardown") {
      window.parent.postMessage({ jsonrpc: "2.0", id: msg.id, result: {} }, "*");
      return;
    }
  }
});

const cleanupResize = app.setupSizeChangedNotifications();
window.addEventListener("beforeunload", () => cleanupResize());

console.info("MCP App Anchor initialized");
