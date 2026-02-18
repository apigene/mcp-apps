/* ============================================
   GMAIL THREAD LIST MCP APP (SDK VERSION)
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

const APP_NAME = "Gmail Thread List";


/* ============================================
   Gmail Inbox MCP App
   ============================================
   Renders Gmail API threads list (users.me.threads) as a
   Gmail-style inbox widget with follow-up actions.
   ============================================ */


const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2026-01-26";

const GMAIL_INBOX_URL = "https://mail.google.com/mail/u/0/#inbox/";

function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

function unwrapData(data: any): any {
  if (!data) return null;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (Array.isArray(data.rows)) return data;
  if (Array.isArray(data)) return { rows: data };
  return data;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

function showEmpty(message: string = "No threads in this range.") {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/**
 * Decode HTML entities in Gmail snippet (e.g. &#39; &amp; &quot;)
 */
function decodeSnippet(text: string): string {
  if (!text || typeof text !== "string") return "";
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || text;
}

/**
 * Truncate snippet for display
 */
function truncateSnippet(text: string, maxLen: number = 120): string {
  const decoded = decodeSnippet(text).trim();
  if (decoded.length <= maxLen) return decoded;
  return decoded.slice(0, maxLen).trim() + "…";
}

/**
 * Get threads array from API response (handles body wrapper and status_code wrapper)
 */
function getThreadsFromResponse(data: any): { threads: any[]; nextPageToken?: string; resultSizeEstimate?: number } {
  const raw = unwrapData(data);
  if (!raw) return { threads: [] };

  // Full response shape: { status_code, headers, body: { threads, nextPageToken, resultSizeEstimate } }
  const body = raw.body ?? raw;
  const threads = body.threads ?? body.messages ?? [];
  const list = Array.isArray(threads) ? threads : [];
  return {
    threads: list,
    nextPageToken: body.nextPageToken,
    resultSizeEstimate: body.resultSizeEstimate,
  };
}

function getGmailThreadUrl(threadId: string): string {
  return GMAIL_INBOX_URL + encodeURIComponent(threadId);
}

/** Gmail-style logo: white envelope on red + 4-color stripe */
function gmailLogoSvg(): string {
  return `<svg class="gmail-logo-svg" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#fff" fill-opacity="0.95" d="M4 6v20h32V6L24 14 4 6zm0 0l20 8 20-8v-2L24 12 4 4v2z"/>
    <rect x="0" y="26" width="10" height="6" rx="1" fill="#EA4335"/>
    <rect x="10" y="26" width="10" height="6" rx="1" fill="#FBBC04"/>
    <rect x="20" y="26" width="10" height="6" rx="1" fill="#34A853"/>
    <rect x="30" y="26" width="10" height="6" rx="1" fill="#4285F4"/>
  </svg>`;
}

/** Open in new tab icon (Material style) */
function iconOpenInNew(): string {
  return `<svg class="gmail-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
}

/** Reply icon */
function iconReply(): string {
  return `<svg class="gmail-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1.5-1.4-3-2.4-4.5-3-2.5-.9-4.5-1.4-6.5-1.4z"/></svg>`;
}

/** Mail / envelope outline for thread row */
function iconMail(): string {
  return `<svg class="gmail-icon gmail-icon-thread" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;
}

function renderThreadRow(thread: any, index: number): string {
  const id = thread.id || "";
  const snippet = truncateSnippet(thread.snippet || "");
  const url = getGmailThreadUrl(id);

  return `
    <div class="gmail-thread" data-thread-id="${escapeHtml(id)}">
      <div class="gmail-thread-icon">${iconMail()}</div>
      <div class="gmail-thread-main">
        <span class="gmail-thread-snippet">${escapeHtml(snippet)}</span>
      </div>
      <div class="gmail-thread-actions">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="gmail-action-icon gmail-open" title="Open in Gmail">${iconOpenInNew()}</a>
        <button type="button" class="gmail-action-icon gmail-reply-prompt" data-thread-id="${escapeHtml(id)}" title="Reply">${iconReply()}</button>
      </div>
    </div>
  `;
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received.");
    return;
  }

  try {
    const { threads, nextPageToken, resultSizeEstimate } = getThreadsFromResponse(data);

    if (!threads || threads.length === 0) {
      showEmpty("No threads in this date range.");
      return;
    }

    let html = '<div class="gmail-widget">';
    html += '<header class="gmail-header">';
    html += '<span class="gmail-logo-wrap">' + gmailLogoSvg() + '</span>';
    html += '<span class="gmail-brand">Gmail</span>';
    html += '<span class="gmail-title">Inbox</span>';
    html += '</header>';

    html += '<div class="gmail-toolbar">';
    html += `<span class="gmail-count">${threads.length} thread${threads.length !== 1 ? "s" : ""}`;
    if (resultSizeEstimate != null) {
      html += ` · ${resultSizeEstimate} total`;
    }
    html += "</span>";
    if (nextPageToken) {
      html += '<span class="gmail-more">More results available</span>';
    }
    html += "</div>";

    html += '<div class="gmail-list">';
    threads.forEach((t: any, i: number) => {
      html += renderThreadRow(t, i);
    });
    html += "</div>";

    html += '<div class="gmail-followup">';
    html += '<span class="gmail-followup-label">Follow-up:</span>';
    html += ' <span class="gmail-followup-hint">Open any thread in Gmail, or ask to "reply to thread X" or "summarize this inbox".</span>';
    html += "</div>";

    html += "</div>";

    app.innerHTML = html;

    // Reply buttons: suggest a follow-up to the host
    app.querySelectorAll(".gmail-reply-prompt").forEach((btn, i) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const threadId = (btn as HTMLElement).getAttribute("data-thread-id");
        const thread = threads[i];
        const snippet = thread ? truncateSnippet(thread.snippet || "", 80) : "";
        const msg = `Reply to Gmail thread ${threadId}${snippet ? `: "${snippet}"` : ""}`;
        sendNotification("ui/notifications/follow-up-suggestion", { message: msg, threadId });
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
      });
    });

      } catch (err: any) {
    console.error("Render error:", err);
    showError(`Error rendering inbox: ${err.message}`);
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
      if (data !== undefined) {
        renderData(data);
      } else {
        showEmpty("No data received.");
      }
      break;
    case "ui/notifications/host-context-changed":
      if (msg.params?.theme === "dark") document.body.classList.add("dark");
      else if (msg.params?.theme === "light") document.body.classList.remove("dark");
      if (msg.params?.displayMode) handleDisplayModeChange(msg.params.displayMode);
      break;
    case "ui/notifications/tool-input":
      break;
    case "ui/notifications/tool-cancelled":
      showError(`Cancelled: ${msg.params?.reason || "Tool cancelled"}`);
      break;
    case "ui/notifications/initialized":
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
    const container = document.querySelector(".gmail-widget");
    if (container) (container as HTMLElement).style.maxWidth = "100%";
  } else {
    document.body.classList.remove("fullscreen-mode");
    const container = document.querySelector(".gmail-widget");
    if (container) (container as HTMLElement).style.maxWidth = "";
  }
  }

function requestDisplayMode(mode: string): Promise<any> {
  return sendRequest("ui/request-display-mode", { mode })
    .then((result) => {
      if (result?.mode) handleDisplayModeChange(result.mode);
      return result;
    })
    .catch((err) => {
      console.warn("Failed to request display mode:", err);
      throw err;
    });
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
