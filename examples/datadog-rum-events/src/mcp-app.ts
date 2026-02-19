/**
 * Datadog RUM Events viewer – list and detail view with Datadog-style UI.
 * Consumes API response from GET .../api/v2/rum/events (body.data array).
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Datadog RUM Events";
const APP_VERSION = "1.0.0";

/* ---------- Unwrap & escape ---------- */

function unwrapData(data: unknown): { data?: unknown[]; meta?: unknown; links?: unknown } | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  if (o.body && typeof o.body === "object") {
    const body = o.body as Record<string, unknown>;
    if (Array.isArray(body.data)) return body as { data: unknown[]; meta?: unknown; links?: unknown };
  }
  if (Array.isArray(o.data)) return o as { data: unknown[]; meta?: unknown; links?: unknown };
  if (o.message?.template_data) return unwrapData((o.message as Record<string, unknown>).template_data);
  if (o.message?.response_content) return unwrapData((o.message as Record<string, unknown>).response_content);
  return o as { data?: unknown[]; meta?: unknown; links?: unknown };
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No RUM events found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/* ---------- RUM event shape (per your sample) ---------- */

interface RumView {
  name?: string;
  url?: string;
  url_host?: string;
  url_path?: string;
  loading_type?: string;
  time_spent?: number;
  error?: { count?: number };
  action?: { count?: number };
  frustration?: { count?: number };
  resource?: { count?: number };
  loading_time?: number;
  performance?: {
    fcp?: { timestamp?: number };
    lcp?: { timestamp?: number; target_selector?: string };
    inp?: { duration?: number };
    cls?: { score?: number };
  };
  [key: string]: unknown;
}

interface RumAttrs {
  service?: string;
  view?: RumView;
  application?: { name?: string; id?: string };
  usr?: { name?: string; email?: string; orgName?: string; id?: string };
  geo?: { country?: string; city?: string; country_iso_code?: string; country_subdivision?: string };
  device?: { type?: string; name?: string; brand?: string };
  browser?: { name?: string; version?: string };
  connectivity?: { status?: string; effective_type?: string };
  session?: { id?: string; has_replay?: boolean; is_replay_available?: boolean };
  attributes?: RumAttrs;
  [key: string]: unknown;
}

/** Datadog can put view/usr/application at top level or inside attributes.attributes */
function getAttrsSection<T>(attrs: RumAttrs, key: keyof RumAttrs): T | undefined {
  const top = attrs[key];
  if (top !== undefined && top !== null) return top as T;
  const nested = attrs.attributes as Record<string, unknown> | undefined;
  return nested?.[key as string] as T | undefined;
}

interface RumEvent {
  id?: string;
  type?: string;
  attributes?: RumAttrs;
  timestamp?: string;
}

function isRumEvent(x: unknown): x is RumEvent {
  return x !== null && typeof x === "object" && Array.isArray((x as RumEvent).attributes) === false;
}

/* ---------- Formatting ---------- */

function formatNs(ns: number | undefined): string {
  if (ns === undefined || ns === null) return "—";
  const ms = ns / 1e6;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return escapeHtml(iso);
  }
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (s < 60) return `${s}s ago`;
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return formatTimestamp(iso);
  } catch {
    return escapeHtml(iso);
  }
}

/* ---------- State ---------- */

let rumEvents: RumEvent[] = [];

function renderList() {
  const app = document.getElementById("app");
  if (!app) return;

  const meta = rumEvents.length ? "" : "";
  const header = `
    <div class="dd-header">
      <div class="dd-header-title">
        <span class="dd-logo">RUM</span>
        <h1>View events</h1>
      </div>
      <div class="dd-meta">${escapeHtml(String(rumEvents.length))} event${rumEvents.length !== 1 ? "s" : ""}</div>
    </div>`;

  const listHtml = rumEvents
    .map((evt, i) => {
      const attrs = evt.attributes ?? {};
      const view = getAttrsSection<RumView>(attrs, "view") ?? {};
      const usr = getAttrsSection<RumAttrs["usr"]>(attrs, "usr") ?? {};
      const application = getAttrsSection<RumAttrs["application"]>(attrs, "application");
      const appName = application?.name ?? attrs.service ?? "—";
      const path = view.name ?? view.url_path ?? "—";
      const host = view.url_host ?? "—";
      const user = [usr?.name, usr?.email].filter(Boolean).join(" · ") || "—";
      const timeSpent = formatNs(view.time_spent);
      const errors = view.error?.count ?? 0;
      const loadingType = view.loading_type ?? "—";
      const ts = formatRelativeTime(evt.timestamp);

      return `
      <div class="dd-card dd-card-clickable" data-index="${i}">
        <div class="dd-card-main">
          <div class="dd-card-path">${escapeHtml(path)}</div>
          <div class="dd-card-host">${escapeHtml(host)}</div>
          <div class="dd-card-meta">
            <span class="dd-badge dd-badge-app">${escapeHtml(appName)}</span>
            <span class="dd-meta-text">${escapeHtml(user)}</span>
            <span class="dd-meta-text">${escapeHtml(ts)}</span>
          </div>
        </div>
        <div class="dd-card-metrics">
          <span class="dd-metric" title="Time on view">${escapeHtml(timeSpent)}</span>
          <span class="dd-metric dd-metric-loading">${escapeHtml(loadingType)}</span>
          ${errors > 0 ? `<span class="dd-badge dd-badge-error">${errors} error${errors !== 1 ? "s" : ""}</span>` : ""}
        </div>
      </div>`;
    })
    .join("");

  app.innerHTML = `
    <div class="dd-container dd-view-list">
      ${header}
      <div class="dd-list">${listHtml}</div>
    </div>`;

  app.querySelectorAll(".dd-card-clickable").forEach((el) => {
    el.addEventListener("click", () => {
      const i = parseInt((el as HTMLElement).getAttribute("data-index") ?? "-1", 10);
      if (i >= 0 && i < rumEvents.length) renderDetail(i);
    });
  });
}

function renderDetail(index: number) {
  const app = document.getElementById("app");
  const evt = rumEvents[index];
  if (!app || !evt) return;

  const attrs = evt.attributes ?? {};
  const view = getAttrsSection<RumView>(attrs, "view") ?? {};
  const usr = getAttrsSection<RumAttrs["usr"]>(attrs, "usr") ?? {};
  const application = getAttrsSection<RumAttrs["application"]>(attrs, "application") ?? {};
  const geo = getAttrsSection<RumAttrs["geo"]>(attrs, "geo") ?? {};
  const device = getAttrsSection<RumAttrs["device"]>(attrs, "device") ?? {};
  const browser = getAttrsSection<RumAttrs["browser"]>(attrs, "browser") ?? {};
  const connectivity = getAttrsSection<RumAttrs["connectivity"]>(attrs, "connectivity") ?? {};
  const session = getAttrsSection<RumAttrs["session"]>(attrs, "session") ?? {};
  const perf = view.performance ?? {};

  const section = (title: string, rows: Array<[string, string]>) => {
    if (!rows.length) return "";
    const trs = rows
      .filter(([, v]) => v !== "" && v !== "—")
      .map(([k, v]) => `<tr><td class="dd-detail-key">${escapeHtml(k)}</td><td class="dd-detail-val">${v}</td></tr>`)
      .join("");
    if (!trs) return "";
    return `
      <div class="dd-section">
        <h3 class="dd-section-title">${escapeHtml(title)}</h3>
        <table class="dd-table"><tbody>${trs}</tbody></table>
      </div>`;
  };

  const viewRows: Array<[string, string]> = [
    ["Name", view.name ?? "—"],
    ["URL", view.url ? `<a href="${escapeHtml(view.url)}" target="_blank" rel="noopener" class="dd-link">${escapeHtml(view.url)}</a>` : "—"],
    ["Host", view.url_host ?? "—"],
    ["Path", view.url_path ?? "—"],
    ["Loading type", view.loading_type ?? "—"],
    ["Time spent", formatNs(view.time_spent)],
    ["Loading time", formatNs(view.loading_time)],
    ["Errors", String(view.error?.count ?? 0)],
    ["Actions", String(view.action?.count ?? 0)],
    ["Resources", String(view.resource?.count ?? 0)],
    ["Frustrations", String(view.frustration?.count ?? 0)],
  ];

  const userRows: Array<[string, string]> = [
    ["Name", usr.name ?? "—"],
    ["Email", usr.email ?? "—"],
    ["Org", usr.orgName ?? "—"],
    ["ID", usr.id ?? "—"],
  ];

  const appRows: Array<[string, string]> = [
    ["Application", application.name ?? "—"],
    ["Service", (attrs as RumAttrs).service ?? "—"],
    ["Application ID", application.id ?? "—"],
  ];

  const geoRows: Array<[string, string]> = [
    ["Country", [geo.country, geo.country_iso_code].filter(Boolean).join(" ") || "—"],
    ["City", geo.city ?? "—"],
    ["Subdivision", geo.country_subdivision ?? "—"],
  ];

  const deviceRows: Array<[string, string]> = [
    ["Type", device.type ?? "—"],
    ["Name", device.name ?? "—"],
    ["Brand", device.brand ?? "—"],
  ];

  const browserRows: Array<[string, string]> = [
    ["Browser", browser.name ?? "—"],
    ["Version", browser.version ?? "—"],
  ];

  const perfRows: Array<[string, string]> = [
    ["FCP", formatNs(perf.fcp?.timestamp)],
    ["LCP", formatNs(perf.lcp?.timestamp)],
    ["INP", formatNs(perf.inp?.duration)],
    ["CLS", perf.cls?.score != null ? String(perf.cls.score) : "—"],
  ];

  const connRows: Array<[string, string]> = [
    ["Status", connectivity.status ?? "—"],
    ["Effective type", connectivity.effective_type ?? "—"],
  ];

  const sessionRows: Array<[string, string]> = [
    ["Session ID", session.id ?? "—"],
    ["Replay available", session.has_replay != null ? String(session.has_replay) : session.is_replay_available != null ? String(session.is_replay_available) : "—"],
  ];

  const path = view.name ?? view.url_path ?? "Event";
  const ts = formatTimestamp(evt.timestamp);

  app.innerHTML = `
    <div class="dd-container dd-view-detail">
      <div class="dd-detail-header">
        <button type="button" class="dd-btn dd-btn-back" id="dd-back">← Back to list</button>
        <div class="dd-detail-title-wrap">
          <h1 class="dd-detail-title">${escapeHtml(path)}</h1>
          <div class="dd-detail-meta">${escapeHtml(ts)} · ${escapeHtml(evt.id ?? "")}</div>
        </div>
      </div>
      <div class="dd-detail-body">
        ${section("View", viewRows)}
        ${section("User", userRows)}
        ${section("Application", appRows)}
        ${section("Geo", geoRows)}
        ${section("Device", deviceRows)}
        ${section("Browser", browserRows)}
        ${section("Performance", perfRows)}
        ${section("Connectivity", connRows)}
        ${section("Session", sessionRows)}
      </div>
    </div>`;

  document.getElementById("dd-back")?.addEventListener("click", () => renderList());
}

function renderData(data: unknown) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received.");
    return;
  }

  try {
    let parsed: unknown = data;
    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data);
      } catch {
        showError("Response body is not valid JSON.");
        return;
      }
    }
    const payload = unwrapData(parsed);
    const rawList = payload?.data ?? (Array.isArray(parsed) ? parsed : []);
    rumEvents = rawList.filter(isRumEvent);

    if (rumEvents.length === 0) {
      showEmpty("No RUM view events in this response.");
      return;
    }

    renderList();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Render error:", err);
    showError(`Error rendering data: ${escapeHtml(message)}`);
  }
}

/* ---------- SDK (theme/resize only) ---------- */

const app = new App({ name: APP_NAME, version: APP_VERSION });

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.jsonrpc === "2.0") {
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      const raw = msg.params.structuredContent ?? msg.params;
      const data = raw?.body != null ? raw.body : raw;
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
      showError(`Operation cancelled: ${escapeHtml(msg.params?.reason ?? "Unknown")}`);
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

console.info("Datadog RUM Events app initialized");
