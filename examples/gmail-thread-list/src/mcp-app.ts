/* ============================================
   GMAIL THREAD LIST MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().

   Renders Gmail API threads list (users.me.threads) as a
   Gmail-style inbox widget with follow-up actions.
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
const APP_VERSION = "1.0.0";

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
  if (typeof str !== "string") return String(str);
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

// Store threads for reply button handler
let currentThreads: any[] = [];

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
        <button type="button" class="gmail-action-icon gmail-reply-prompt" data-thread-id="${escapeHtml(id)}" data-thread-index="${index}" title="Reply">${iconReply()}</button>
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

    // Store threads for reply handler
    currentThreads = threads;

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
    app.querySelectorAll(".gmail-reply-prompt").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const threadId = (btn as HTMLElement).getAttribute("data-thread-id");
        const threadIndex = parseInt((btn as HTMLElement).getAttribute("data-thread-index") || "0", 10);
        const thread = currentThreads[threadIndex];
        const snippet = thread ? truncateSnippet(thread.snippet || "", 80) : "";
        const msg = `Reply to Gmail thread ${threadId}${snippet ? `: "${snippet}"` : ""}`;
        // Copy to clipboard as fallback action
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
      });
    });

  } catch (err: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(err)}`, logger: APP_NAME });
    showError(`Error rendering inbox: ${err.message}`);
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
  // Add any cleanup logic specific to this app
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

// Export empty object to ensure this file is treated as an ES module
export {};
