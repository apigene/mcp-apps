/* ============================================
   AHREFS BACKLINKS MCP APP (SDK VERSION)
   ============================================
   Displays Ahrefs Site Explorer all-backlinks API response.
   Uses body.backlinks only; search, filter, and sort in-app.
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Ahrefs Backlinks";
const APP_VERSION = "1.0.0";

/* ============================================
   ICONS (inline SVG for CSP)
   ============================================ */

function iconSearch(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;
}

function iconSortUp(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>`;
}

function iconSortDown(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`;
}

function iconExternal(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

function unwrapData(data: any): { backlinks: any[] } | null {
  if (!data) return null;

  // Full response: { status_code, headers, body: { backlinks: [...] } }
  if (data.body && Array.isArray(data.body.backlinks)) {
    return { backlinks: data.body.backlinks };
  }
  // Nested in structuredContent
  if (data.structuredContent?.body?.backlinks) {
    return { backlinks: data.structuredContent.body.backlinks };
  }
  // Direct body from proxy
  if (data.backlinks && Array.isArray(data.backlinks)) {
    return { backlinks: data.backlinks };
  }
  // Message wrappers
  if (data.message?.template_data?.backlinks) {
    return { backlinks: data.message.template_data.backlinks };
  }
  if (data.message?.response_content?.body?.backlinks) {
    return { backlinks: data.message.response_content.body.backlinks };
  }

  return null;
}

function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str ?? "");
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No backlinks found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/* ============================================
   TEMPLATE-SPECIFIC HELPERS
   ============================================ */

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function formatTraffic(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function truncate(str: string | null | undefined, len: number): string {
  if (str == null) return "";
  const s = String(str).trim();
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

function drClass(dr: number | null | undefined): string {
  if (dr == null || Number.isNaN(dr)) return "dr-none";
  if (dr >= 70) return "dr-high";
  if (dr >= 40) return "dr-mid";
  if (dr >= 20) return "dr-low";
  return "dr-very-low";
}

/** Safe URL for href: allow only http/https */
function safeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "#";
  const t = url.trim();
  if (t.startsWith("https://") || t.startsWith("http://")) return t;
  return "#";
}

/* ============================================
   STATE (search, sort, full list)
   ============================================ */

let allBacklinks: any[] = [];
let searchQuery = "";
type SortKey = "domain_rating_source" | "traffic_domain" | "first_seen" | "last_visited" | "url_from" | "url_to" | "anchor";
let sortKey: SortKey = "domain_rating_source";
let sortDir: "asc" | "desc" = "desc";

function getFilteredAndSorted(): any[] {
  const q = searchQuery.trim().toLowerCase();
  let list = allBacklinks;
  if (q) {
    list = list.filter((b) => {
      const from = (b.url_from ?? "").toLowerCase();
      const to = (b.url_to ?? "").toLowerCase();
      const anchor = (b.anchor ?? "").toLowerCase();
      return from.includes(q) || to.includes(q) || anchor.includes(q);
    });
  }
  list = [...list].sort((a, b) => {
    let va: string | number | undefined = a[sortKey];
    let vb: string | number | undefined = b[sortKey];
    if (sortKey === "first_seen" || sortKey === "last_visited") {
      va = va ? new Date(va as string).getTime() : 0;
      vb = vb ? new Date(vb as string).getTime() : 0;
    }
    if (va === undefined || va === null) va = sortKey === "url_from" || sortKey === "url_to" || sortKey === "anchor" ? "" : 0;
    if (vb === undefined || vb === null) vb = sortKey === "url_from" || sortKey === "url_to" || sortKey === "anchor" ? "" : 0;
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });
  return list;
}

function renderTable() {
  const list = getFilteredAndSorted();
  const tableWrap = document.getElementById("backlinks-table-wrap");
  const countEl = document.getElementById("backlinks-count");
  if (!tableWrap || !countEl) return;

  countEl.textContent = list.length === allBacklinks.length
    ? `${list.length} backlink${list.length !== 1 ? "s" : ""}`
    : `${list.length} of ${allBacklinks.length} backlinks`;

  const tbody = document.getElementById("backlinks-tbody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7" class="empty-cell">No backlinks match your search.</td></tr>`;
    document.querySelectorAll(".sortable").forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
      if ((th as HTMLElement).dataset.sort === sortKey) {
        th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
      }
    });
    return;
  }

  tbody.innerHTML = list
    .map(
      (b) => `
    <tr>
      <td class="cell-url cell-url-from">
        <a href="${escapeHtml(safeUrl(b.url_from))}" target="_blank" rel="noopener noreferrer" class="link-from" title="${escapeHtml(b.url_from || "")}">
          ${escapeHtml(truncate(b.url_from, 50))}
          <span class="icon-external">${iconExternal()}</span>
        </a>
      </td>
      <td class="cell-url cell-url-to" title="${escapeHtml(b.url_to || "")}">${escapeHtml(truncate(b.url_to, 40))}</td>
      <td class="cell-num"><span class="dr-pill ${drClass(b.domain_rating_source)}">${escapeHtml(String(b.domain_rating_source ?? "—"))}</span></td>
      <td class="cell-num cell-traffic">${escapeHtml(formatTraffic(b.traffic_domain))}</td>
      <td class="cell-anchor" title="${escapeHtml(b.anchor || "")}">${escapeHtml(truncate(b.anchor || "—", 45))}</td>
      <td class="cell-date">${escapeHtml(formatDate(b.first_seen))}</td>
      <td class="cell-date">${escapeHtml(formatDate(b.last_visited))}</td>
    </tr>
  `
    )
    .join("");

  // Update sort header indicators
  document.querySelectorAll(".sortable").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if ((th as HTMLElement).dataset.sort === sortKey) {
      th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}

function bindControls() {
  const searchInput = document.getElementById("backlinks-search") as HTMLInputElement | null;
  const sortSelect = document.getElementById("backlinks-sort") as HTMLSelectElement | null;

  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderTable();
  });

  sortSelect?.addEventListener("change", () => {
    const v = sortSelect.value as SortKey;
    if (v === sortKey) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = v;
      sortDir = "desc";
    }
    renderTable();
  });

  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const key = (th as HTMLElement).dataset.sort as SortKey;
      if (key === sortKey) sortDir = sortDir === "asc" ? "desc" : "asc";
      else {
        sortKey = key;
        sortDir = "desc";
      }
      if (sortSelect) sortSelect.value = sortKey;
      renderTable();
    });
  });
}

/* ============================================
   RENDER
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const parsed = unwrapData(data);
    if (!parsed || !parsed.backlinks.length) {
      showEmpty("No backlinks in this response.");
      return;
    }

    allBacklinks = parsed.backlinks;
    searchQuery = "";
    sortKey = "domain_rating_source";
    sortDir = "desc";

    app.innerHTML = `
      <div class="ahrefs-container">
        <header class="ahrefs-header">
          <div class="ahrefs-brand">
            <span class="ahrefs-logo">Ahrefs</span>
            <span class="ahrefs-title">Backlinks</span>
          </div>
          <div class="ahrefs-summary" id="backlinks-count">${allBacklinks.length} backlink${allBacklinks.length !== 1 ? "s" : ""}</div>
        </header>

        <div class="ahrefs-toolbar">
          <div class="search-wrap">
            <span class="search-icon">${iconSearch()}</span>
            <input type="text" id="backlinks-search" class="search-input" placeholder="Search URL or anchor..." aria-label="Search backlinks" />
          </div>
          <div class="sort-wrap">
            <label for="backlinks-sort" class="sort-label">Sort by</label>
            <select id="backlinks-sort" class="sort-select" aria-label="Sort by">
              <option value="domain_rating_source">Domain Rating</option>
              <option value="traffic_domain">Traffic</option>
              <option value="first_seen">First seen</option>
              <option value="last_visited">Last visited</option>
              <option value="url_from">Source URL</option>
              <option value="url_to">Target URL</option>
              <option value="anchor">Anchor</option>
            </select>
          </div>
        </div>

        <div class="table-wrap" id="backlinks-table-wrap">
          <table class="ahrefs-table" role="grid">
            <thead>
              <tr>
                <th class="sortable" data-sort="url_from">Linking page</th>
                <th class="sortable" data-sort="url_to">Target URL</th>
                <th class="sortable sort-desc" data-sort="domain_rating_source">DR</th>
                <th class="sortable" data-sort="traffic_domain">Traffic</th>
                <th class="sortable" data-sort="anchor">Anchor</th>
                <th class="sortable" data-sort="first_seen">First seen</th>
                <th class="sortable" data-sort="last_visited">Last visited</th>
              </tr>
            </thead>
            <tbody id="backlinks-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    bindControls();
    renderTable();
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering data: ${error.message}`);
  }
}

/* ============================================
   SDK & MESSAGE HANDLING
   ============================================ */

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
      showError(`Cancelled: ${msg.params?.reason || "Unknown"}`);
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

console.info("Ahrefs Backlinks MCP App initialized");

// Export empty object to ensure this file is treated as an ES module
export {};
