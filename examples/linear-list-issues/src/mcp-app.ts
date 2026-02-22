/* ============================================
   LINEAR LIST ISSUES MCP APP
   ============================================
   Lists Linear issues with table + filters; detail view on row click.
   Data: content[].text.issues or direct .issues
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Linear List Issues";
const APP_VERSION = "1.0.0";

function escapeHtml(str: any): string {
  if (str == null) return "";
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

function showEmpty(message: string = "No issues found.") {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/**
 * Extract issues from MCP payload.
 * Supports: content[0].text.issues (sample format), data.issues, or array of issues.
 */
function extractIssues(data: any): { issues: any[]; hasNextPage?: boolean } {
  if (!data) return { issues: [] };

  // content[].text.issues (user sample format)
  const content = data.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (first?.type === "text" && first.text && typeof first.text === "object") {
      const issues = first.text.issues;
      const hasNextPage = first.text.hasNextPage;
      if (Array.isArray(issues)) {
        return { issues, hasNextPage };
      }
    }
    if (first?.type === "text" && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text);
        if (parsed?.issues && Array.isArray(parsed.issues)) {
          return { issues: parsed.issues, hasNextPage: parsed.hasNextPage };
        }
      } catch (_) {}
    }
  }

  if (Array.isArray(data.issues)) {
    return { issues: data.issues, hasNextPage: (data as any).hasNextPage };
  }
  if (Array.isArray(data)) {
    return { issues: data };
  }
  return { issues: [] };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type View = "list" | "detail";
let allIssues: any[] = [];
let filteredIssues: any[] = [];
let selectedIssue: any = null;
let currentView: View = "list";

function getPriorityClass(name: string): string {
  const n = (name || "").toLowerCase();
  if (n === "urgent") return "priority-urgent";
  if (n === "high") return "priority-high";
  if (n === "medium") return "priority-medium";
  if (n === "low") return "priority-low";
  return "priority-none";
}

function getStatusClass(status: string): string {
  const s = (status || "").toLowerCase().replace(/\s+/g, "-");
  return "status-" + (s || "unknown");
}

function renderDetailView(issue: any): string {
  const priorityName = issue.priority?.name ?? "None";
  const priorityClass = getPriorityClass(priorityName);
  const statusClass = getStatusClass(issue.status || "");

  let html = '<div class="linear-detail-view">';
  html += '<div class="linear-detail-header">';
  html += '<button type="button" class="linear-back-btn" id="linear-back-btn">← Back to list</button>';
  html += `<a href="${escapeHtml(issue.url || "#")}" target="_blank" rel="noopener noreferrer" class="linear-open-link">Open in Linear ↗</a>`;
  html += "</div>";

  html += '<div class="linear-detail-card">';
  html += `<div class="linear-detail-id">${escapeHtml(issue.identifier || "")}</div>`;
  html += `<h1 class="linear-detail-title">${escapeHtml(issue.title || "Untitled")}</h1>`;
  html += '<div class="linear-detail-meta">';
  html += `<span class="linear-badge ${statusClass}">${escapeHtml(issue.status || "—")}</span>`;
  html += `<span class="linear-badge ${priorityClass}">${escapeHtml(priorityName)}</span>`;
  if (issue.team) {
    html += `<span class="linear-badge linear-badge-team">${escapeHtml(issue.team)}</span>`;
  }
  html += "</div>";

  html += '<div class="linear-detail-grid">';
  html += `<div class="linear-detail-row"><span class="label">Assignee</span><span>${escapeHtml(issue.assignee ?? "Unassigned")}</span></div>`;
  html += `<div class="linear-detail-row"><span class="label">Created by</span><span>${escapeHtml(issue.createdBy ?? "—")}</span></div>`;
  html += `<div class="linear-detail-row"><span class="label">Created</span><span>${formatDateTime(issue.createdAt)}</span></div>`;
  html += `<div class="linear-detail-row"><span class="label">Updated</span><span>${formatDateTime(issue.updatedAt)}</span></div>`;
  if (issue.dueDate) {
    html += `<div class="linear-detail-row"><span class="label">Due date</span><span>${formatDate(issue.dueDate)}</span></div>`;
  }
  if (issue.completedAt) {
    html += `<div class="linear-detail-row"><span class="label">Completed</span><span>${formatDateTime(issue.completedAt)}</span></div>`;
  }
  if (issue.gitBranchName) {
    html += `<div class="linear-detail-row"><span class="label">Branch</span><span><code class="linear-code">${escapeHtml(issue.gitBranchName)}</code></span></div>`;
  }
  html += "</div>";

  if (issue.labels && issue.labels.length > 0) {
    html += '<div class="linear-detail-section"><span class="label">Labels</span><div class="linear-labels">';
    issue.labels.forEach((l: any) => {
      const labelName = typeof l === "string" ? l : (l.name || l);
      html += `<span class="linear-label-tag">${escapeHtml(labelName)}</span>`;
    });
    html += "</div></div>";
  }

  if (issue.description) {
    const desc = escapeHtml(issue.description).replace(/\n/g, "<br>");
    html += '<div class="linear-detail-section"><span class="label">Description</span><div class="linear-description">' + desc + "</div></div>";
  }

  html += "</div></div>";
  return html;
}

function renderListView(): string {
  let html = '<div class="linear-container">';

  html += '<div class="linear-toolbar">';
  html += '<div class="linear-toolbar-left">';
  html += '<input type="text" id="linear-search" class="linear-search" placeholder="Search issues..." />';
  html += '<select id="linear-filter-status" class="linear-filter">';
  html += '<option value="">All statuses</option>';
  const statuses = [...new Set(allIssues.map((i) => i.status).filter(Boolean))].sort();
  statuses.forEach((s) => {
    html += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
  });
  html += "</select>";
  html += '<select id="linear-filter-priority" class="linear-filter">';
  html += '<option value="">All priorities</option>';
  const priorities = [...new Set(allIssues.map((i) => i.priority?.name).filter(Boolean))].sort();
  priorities.forEach((p) => {
    html += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
  });
  html += "</select>";
  html += '<select id="linear-filter-assignee" class="linear-filter">';
  html += '<option value="">All assignees</option>';
  const assignees = [...new Set(allIssues.map((i) => i.assignee).filter(Boolean))].sort();
  assignees.forEach((a) => {
    html += `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`;
  });
  html += "</select>";
  html += "</div>";
  html += '<div class="linear-toolbar-right">';
  html += `<span class="linear-count" id="linear-count">${filteredIssues.length} issue${filteredIssues.length !== 1 ? "s" : ""}</span>`;
  html += "</div>";
  html += "</div>";

  html += '<div class="linear-table-wrap">';
  html += '<table class="linear-table">';
  html += "<thead><tr>";
  html += "<th>Identifier</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Team</th>";
  html += "</tr></thead><tbody>";

  filteredIssues.forEach((issue) => {
    const isSelected = selectedIssue?.id === issue.id;
    const priorityName = issue.priority?.name ?? "—";
    const priorityClass = getPriorityClass(priorityName);
    const statusClass = getStatusClass(issue.status || "");
    html += `<tr class="linear-row ${isSelected ? "linear-row-selected" : ""}" data-issue-id="${escapeHtml(issue.id)}">`;
    html += `<td class="linear-cell-id">${escapeHtml(issue.identifier || "")}</td>`;
    html += `<td class="linear-cell-title">${escapeHtml(issue.title || "—")}</td>`;
    html += `<td><span class="linear-badge ${statusClass}">${escapeHtml(issue.status || "—")}</span></td>`;
    html += `<td><span class="linear-badge ${priorityClass}">${escapeHtml(priorityName)}</span></td>`;
    html += `<td>${escapeHtml(issue.assignee ?? "—")}</td>`;
    html += `<td>${escapeHtml(issue.team ?? "—")}</td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  html += "</div>";

  html += "</div>";
  return html;
}

function applyFilters() {
  const searchEl = document.getElementById("linear-search") as HTMLInputElement;
  const statusEl = document.getElementById("linear-filter-status") as HTMLSelectElement;
  const priorityEl = document.getElementById("linear-filter-priority") as HTMLSelectElement;
  const assigneeEl = document.getElementById("linear-filter-assignee") as HTMLSelectElement;

  const q = (searchEl?.value ?? "").toLowerCase().trim();
  const status = statusEl?.value ?? "";
  const priority = priorityEl?.value ?? "";
  const assignee = assigneeEl?.value ?? "";

  filteredIssues = allIssues.filter((issue) => {
    if (status && issue.status !== status) return false;
    if (priority && issue.priority?.name !== priority) return false;
    if (assignee && issue.assignee !== assignee) return false;
    if (q) {
      const title = (issue.title || "").toLowerCase();
      const id = (issue.identifier || "").toLowerCase();
      const desc = (issue.description || "").toLowerCase();
      if (!title.includes(q) && !id.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const countEl = document.getElementById("linear-count");
  if (countEl) countEl.textContent = `${filteredIssues.length} issue${filteredIssues.length !== 1 ? "s" : ""}`;

  const tbody = document.querySelector(".linear-table tbody");
  if (tbody) {
    tbody.innerHTML = filteredIssues
      .map((issue) => {
        const isSelected = selectedIssue?.id === issue.id;
        const priorityName = issue.priority?.name ?? "—";
        const priorityClass = getPriorityClass(priorityName);
        const statusClass = getStatusClass(issue.status || "");
        return (
          `<tr class="linear-row ${isSelected ? "linear-row-selected" : ""}" data-issue-id="${escapeHtml(issue.id)}">` +
          `<td class="linear-cell-id">${escapeHtml(issue.identifier || "")}</td>` +
          `<td class="linear-cell-title">${escapeHtml(issue.title || "—")}</td>` +
          `<td><span class="linear-badge ${statusClass}">${escapeHtml(issue.status || "—")}</span></td>` +
          `<td><span class="linear-badge ${priorityClass}">${escapeHtml(priorityName)}</span></td>` +
          `<td>${escapeHtml(issue.assignee ?? "—")}</td>` +
          `<td>${escapeHtml(issue.team ?? "—")}</td>` +
          "</tr>"
        );
      })
      .join("");
  }
  attachListListeners();
}

function attachListListeners() {
  document.querySelectorAll(".linear-row").forEach((row) => {
    row.addEventListener("click", () => {
      const id = (row as HTMLElement).dataset.issueId;
      const issue = allIssues.find((i) => i.id === id);
      if (issue) {
        selectedIssue = issue;
        currentView = "detail";
        const appEl = document.getElementById("app");
        if (appEl) {
          appEl.innerHTML = renderDetailView(issue);
          const back = document.getElementById("linear-back-btn");
          back?.addEventListener("click", () => {
            currentView = "list";
            selectedIssue = null;
            const el = document.getElementById("app");
            if (el) {
              el.innerHTML = renderListView();
              setupToolbarListeners();
              applyFilters();
            }
          });
        }
      }
    });
  });
}

function setupToolbarListeners() {
  const searchEl = document.getElementById("linear-search");
  const statusEl = document.getElementById("linear-filter-status");
  const priorityEl = document.getElementById("linear-filter-priority");
  const assigneeEl = document.getElementById("linear-filter-assignee");

  const run = () => applyFilters();
  searchEl?.addEventListener("input", run);
  statusEl?.addEventListener("change", run);
  priorityEl?.addEventListener("change", run);
  assigneeEl?.addEventListener("change", run);
}

function renderData(data: any) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  try {
    const { issues } = extractIssues(data);
    if (!issues || issues.length === 0) {
      showEmpty("No issues to display.");
      return;
    }

    allIssues = issues;
    filteredIssues = [...issues];
    selectedIssue = null;
    currentView = "list";

    appEl.innerHTML = renderListView();
    setupToolbarListeners();
    attachListListeners();
  } catch (err: any) {
    app.sendLog({ level: "error", data: `Render error: ${err?.message}`, logger: APP_NAME });
    showError(`Error: ${err?.message}`);
  }
}

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
    document.body.classList.toggle("dark", ctx.theme === "dark");
  }
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }
}

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

app.onteardown = async () => ({});
app.ontoolinput = () => {};
app.ontoolresult = (params) => {
  if (params.isError) {
    const text = params.content?.map((c: any) => c.text || "").join("\n") || "Tool execution failed";
    showError(text);
    return;
  }
  const data = params.structuredContent ?? params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    showEmpty("No data received.");
  }
};
app.ontoolcancelled = (params) => showError(`Cancelled: ${params.reason || "Unknown"}`);
app.onerror = () => {};
app.onhostcontextchanged = (ctx) => handleHostContextChanged(ctx);

app
  .connect()
  .then(() => {
    const ctx = app.getHostContext();
    if (ctx) handleHostContextChanged(ctx);
  })
  .catch(() => {});

export {};
