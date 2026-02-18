/* ============================================
   GOOGLE CALENDAR EVENTS MCP APP (SDK VERSION)
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
   Google Calendar Events MCP App
   ============================================
   Renders Google Calendar API events list (calendar#events)
   in Google Calendar style with icon actions.
   ============================================ */

const APP_NAME = "Google Calendar Events";
const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2026-01-26";

function unwrapData(data: any): any {
  if (!data) return null;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  if (data.body) return data.body;
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
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No events found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/** Get events from API response (body wrapper or direct) */
function getEventsFromResponse(data: any): { items: any[]; summary?: string; timeZone?: string } {
  const raw = unwrapData(data);
  if (!raw) return { items: [] };
  const body = raw.body ?? raw;
  const items = body.items ?? body.events ?? [];
  return {
    items: Array.isArray(items) ? items : [],
    summary: body.summary ?? "",
    timeZone: body.timeZone ?? "UTC",
  };
}

/** Format event start/end for display */
function formatEventTime(ev: any): { timeLabel: string; isAllDay: boolean } {
  const start = ev.start ?? {};
  const end = ev.end ?? {};
  const startDate = start.dateTime || start.date;
  const endDate = end.dateTime || end.date;
  if (!startDate) return { timeLabel: "—", isAllDay: false };

  const isAllDay = !!start.date;
  if (isAllDay) {
    const s = new Date(start.date);
    const e = end.date ? new Date(end.date) : s;
    if (s.getTime() === e.getTime()) {
      return { timeLabel: s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " (All day)", isAllDay: true };
    }
    return { timeLabel: s.toLocaleDateString() + " – " + e.toLocaleDateString() + " (All day)", isAllDay: true };
  }

  const s = new Date(startDate);
  const e = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const startStr = s.toLocaleTimeString(undefined, opts);
  const endStr = e.toLocaleTimeString(undefined, opts);
  const dateStr = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return { timeLabel: dateStr + ", " + startStr + " – " + endStr, isAllDay: false };
}

/** Get video/conference link from event */
function getVideoLink(ev: any): string | null {
  const entryPoints = ev.conferenceData?.entryPoints;
  if (!Array.isArray(entryPoints)) return null;
  const video = entryPoints.find((p: any) => p.entryPointType === "video");
  return video?.uri ?? null;
}

/** Check if event has recurrence */
function hasRecurrence(ev: any): boolean {
  const r = ev.recurrence;
  return Array.isArray(r) && r.some((s: string) => String(s).startsWith("RRULE"));
}

/** Calendar icon (Material style) */
function iconCalendar(): string {
  return `<svg class="gcal-icon gcal-icon-lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>`;
}

/** Open in new tab */
function iconOpenInNew(): string {
  return `<svg class="gcal-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
}

/** Video call */
function iconVideocam(): string {
  return `<svg class="gcal-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`;
}

function renderEventRow(ev: any): string {
  const summary = ev.summary || "(No title)";
  const htmlLink = ev.htmlLink || "";
  const { timeLabel, isAllDay } = formatEventTime(ev);
  const videoLink = getVideoLink(ev);
  const recurring = hasRecurrence(ev);
  const location = ev.location || "";
  const confName = ev.conferenceData?.conferenceSolution?.name || "Join meeting";

  let html = '<div class="gcal-event">';
  html += '<div class="gcal-event-main">';
  html += '<div class="gcal-event-time">' + escapeHtml(timeLabel) + '</div>';
  html += '<div class="gcal-event-title">' + escapeHtml(summary) + '</div>';
  if (location) {
    html += '<div class="gcal-event-meta">' + escapeHtml(location) + '</div>';
  }
  if (recurring) {
    html += '<span class="gcal-badge gcal-badge-repeat">Repeats</span>';
  }
  html += '</div>';
  html += '<div class="gcal-event-actions">';
  if (videoLink) {
    html += '<a href="' + escapeHtml(videoLink) + '" target="_blank" rel="noopener noreferrer" class="gcal-action-icon gcal-join" title="' + escapeHtml(confName) + '">' + iconVideocam() + '</a>';
  }
  if (htmlLink) {
    html += '<a href="' + escapeHtml(htmlLink) + '" target="_blank" rel="noopener noreferrer" class="gcal-action-icon gcal-open" title="Open in Calendar">' + iconOpenInNew() + '</a>';
  }
  html += '</div>';
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
    const { items, summary } = getEventsFromResponse(data);
    if (!items.length) {
      showEmpty("No events in this range.");
      return;
    }

    // Sort by start time (all-day first by date, then by dateTime)
    const sorted = [...items].sort((a, b) => {
      const aStart = a.start?.dateTime || a.start?.date || "";
      const bStart = b.start?.dateTime || b.start?.date || "";
      return aStart.localeCompare(bStart);
    });

    let html = '<div class="gcal-widget">';
    html += '<header class="gcal-header">';
    html += '<span class="gcal-logo-wrap">' + iconCalendar() + '</span>';
    html += '<span class="gcal-brand">Calendar</span>';
    if (summary) html += '<span class="gcal-summary">' + escapeHtml(summary) + '</span>';
    html += '</header>';

    html += '<div class="gcal-toolbar">';
    html += '<span class="gcal-count">' + sorted.length + ' event' + (sorted.length !== 1 ? "s" : "") + '</span>';
    html += '</div>';

    html += '<div class="gcal-list">';
    sorted.forEach((ev) => { html += renderEventRow(ev); });
    html += '</div>';

    html += '<div class="gcal-followup">';
    html += '<span class="gcal-followup-label">Follow-up:</span> Open in Calendar or join video link above.';
    html += '</div>';
    html += '</div>';

    app.innerHTML = html;
      } catch (err: any) {
    console.error("Render error:", err);
    showError("Error rendering calendar: " + err.message);
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
    const el = document.querySelector(".gcal-widget");
    if (el) (el as HTMLElement).style.maxWidth = "100%";
  } else {
    document.body.classList.remove("fullscreen-mode");
    const el = document.querySelector(".gcal-widget");
    if (el) (el as HTMLElement).style.maxWidth = "";
  }
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
