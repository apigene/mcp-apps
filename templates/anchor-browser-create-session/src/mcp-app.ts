/* ============================================
   ANCHOR BROWSER CREATE SESSION – MCP APP
   ============================================
   View and control live Anchor Browser sessions.
   Data: id, cdp_url, live_view_url from anchor-browser-create-session API.
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Anchor Browser Create Session";
const APP_VERSION = "1.0.0";

export interface AnchorSessionData {
  id: string;
  cdp_url: string;
  live_view_url: string;
}

/**
 * Unwrap nested API response (e.g. body.data or tool result wrapper)
 */
function unwrapData(data: any): AnchorSessionData | null {
  if (!data) return null;

  // Full API response: { body: { data: { id, cdp_url, live_view_url } } }
  const fromBody = data.body?.data;
  const d = fromBody ?? data.data ?? data;

  if (d && typeof d.id === "string" && typeof d.live_view_url === "string") {
    return {
      id: d.id,
      cdp_url: typeof d.cdp_url === "string" ? d.cdp_url : "",
      live_view_url: d.live_view_url,
    };
  }
  return null;
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

function showEmpty(message: string = "No session data available.") {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

function copyToClipboard(text: string, buttonEl: HTMLElement) {
  const label = buttonEl.textContent || "";
  navigator.clipboard.writeText(text).then(
    () => {
      buttonEl.textContent = "Copied!";
      buttonEl.classList.add("copied");
      setTimeout(() => {
        buttonEl.textContent = label;
        buttonEl.classList.remove("copied");
      }, 2000);
    },
    () => {
      buttonEl.textContent = "Copy failed";
      setTimeout(() => (buttonEl.textContent = label), 2000);
    }
  );
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  const session = unwrapData(data);
  if (!session) {
    showEmpty("Invalid session data: expected id and live_view_url");
    return;
  }

  const liveViewUrl = session.live_view_url;
  const cdpUrl = session.cdp_url || "";
  const sessionId = session.id;

  app.innerHTML = `
    <div class="anchor-session">
      <section class="live-view">
        <h2>Live view</h2>
        <div class="live-view-frame-wrap">
          <iframe
            src="${escapeHtml(liveViewUrl)}"
            title="Anchor Browser live session"
            class="live-view-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="fullscreen"
          ></iframe>
        </div>
        <p class="live-view-hint">Session is streamed live. Use “Open live view in new tab” for a larger view or to interact in a separate window.</p>
      </section>

      <section class="session-meta">
        <p class="session-id" title="${escapeHtml(sessionId)}">
          <span class="label">Session ID</span>
          <code>${escapeHtml(sessionId)}</code>
          <button type="button" class="btn btn-ghost btn-copy" data-copy="${escapeHtml(sessionId)}" aria-label="Copy session ID">Copy ID</button>
        </p>
        <div class="control-buttons">
          <a href="${escapeHtml(liveViewUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Open live view in new tab
          </a>
          ${cdpUrl ? `
          <button type="button" class="btn btn-secondary btn-copy" data-copy="${escapeHtml(cdpUrl)}">
            Copy CDP URL
          </button>
          ` : ""}
        </div>
      </section>
    </div>
  `;

  app.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const copy = (btn as HTMLElement).getAttribute("data-copy");
      if (copy) copyToClipboard(copy, btn as HTMLElement);
    });
  });
}

const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.jsonrpc === "2.0") {
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      const data = msg.params.structuredContent ?? msg.params;
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

console.info("Anchor Browser Create Session MCP App initialized");
