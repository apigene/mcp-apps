/* ============================================
   Vercel Deployments MCP App (SDK Utilities Version)
   ============================================

   Uses @modelcontextprotocol/ext-apps SDK for utilities only
   (theme helpers, types, auto-resize).

   Manual message handling for proxy compatibility.
   Works seamlessly with run-action.html proxy layer.
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

import {
  parseDeploymentsData,
  formatRelativeTime,
  formatAbsoluteTime,
  formatDuration,
  getStatusInfo,
  getEnvironmentInfo,
  truncate,
  getCommitTitle,
  type Deployment,
} from "./mcp-app-impl";

const APP_NAME = "Vercel Deployments";
const APP_VERSION = "1.0.0";

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

function showEmpty(message: string = "No deployments found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    // Parse deployments
    const deployments: Deployment[] = parseDeploymentsData(data);

    if (!deployments || deployments.length === 0) {
      showEmpty("No deployments found");
      return;
    }

    // Create container
    const container = document.createElement("div");
    container.className = "deployments-container";

    // Header
    const header = document.createElement("div");
    header.className = "deployments-header";
    header.innerHTML = `
      <div class="header-content">
        <div class="header-title">
          <svg class="vercel-icon" width="24" height="24" viewBox="0 0 76 65" fill="none">
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/>
          </svg>
          <h1>Deployments</h1>
        </div>
        <div class="header-meta">
          ${deployments.length} deployment${deployments.length !== 1 ? "s" : ""}
        </div>
      </div>
    `;
    container.appendChild(header);

    // Deployments list
    const list = document.createElement("div");
    list.className = "deployments-list";

    deployments.forEach((deployment) => {
      const statusInfo = getStatusInfo(deployment);
      const envInfo = getEnvironmentInfo(deployment.target);
      const duration = formatDuration(
        deployment.buildingAt,
        deployment.ready,
      );

      const card = document.createElement("div");
      card.className = `deployment-card ${deployment.state.toLowerCase()}`;

      card.innerHTML = `
        <div class="deployment-main">
          <div class="deployment-status">
            <span class="status-icon" style="color: ${statusInfo.color}">${statusInfo.icon}</span>
            <span class="status-label" style="color: ${statusInfo.color}">${statusInfo.label}</span>
          </div>

          <div class="deployment-info">
            <div class="deployment-name">${escapeHtml(deployment.name)}</div>
            <div class="deployment-meta">
              <span class="deployment-time" title="${formatAbsoluteTime(deployment.created)}">
                ${formatRelativeTime(deployment.created)}
              </span>
              ${deployment.target ? `<span class="deployment-env" style="background: ${envInfo.color}">${envInfo.label}</span>` : ""}
              ${deployment.source !== "git" ? `<span class="deployment-source">${deployment.source}</span>` : ""}
              ${duration !== "-" ? `<span class="deployment-duration">⏱ ${duration}</span>` : ""}
            </div>
          </div>
        </div>

        ${deployment.meta?.githubCommitMessage
          ? `
          <div class="deployment-commit">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span class="commit-message">${escapeHtml(truncate(getCommitTitle(deployment.meta.githubCommitMessage), 80))}</span>
            ${deployment.meta.githubCommitSha ? `<span class="commit-sha">${escapeHtml(deployment.meta.githubCommitSha.slice(0, 7))}</span>` : ""}
          </div>
        `
          : ""}

        ${deployment.creator
          ? `
          <div class="deployment-creator">
            <span class="creator-label">Deployed by</span>
            <span class="creator-name">${escapeHtml(deployment.creator.username || deployment.creator.email)}</span>
          </div>
        `
          : ""}

        ${deployment.errorMessage
          ? `
          <div class="deployment-error">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 4.42 3.58 8 8 8 4.42 0 8-3.58 8-8 0-4.42-3.58-8-8-8zm1 13H7V7h2v6zm0-8H7V3h2v2z"/>
            </svg>
            <span>${escapeHtml(deployment.errorMessage)}</span>
          </div>
        `
          : ""}

        <div class="deployment-actions">
          <a href="${escapeHtml`https://${deployment.url}`}" target="_blank" rel="noopener noreferrer" class="deployment-link">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 4.42 3.58 8 8 8 4.42 0 8-3.58 8-8 0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-3.31 2.69-6 6-6 3.31 0 6 2.69 6 6 0 3.31-2.69 6-6 6z"/>
              <path d="M8 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            Visit
          </a>
          ${deployment.inspectorUrl
            ? `
            <a href="${escapeHtml(deployment.inspectorUrl)}" target="_blank" rel="noopener noreferrer" class="deployment-inspector">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM2.5 2a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zm6.5.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zm6.5.5A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3z"/>
              </svg>
              Inspector
            </a>
          `
            : ""}
        </div>
      `;

      list.appendChild(card);
    });

    container.appendChild(list);

    app.innerHTML = "";
    app.appendChild(container);

    console.log("Rendered deployments:", deployments.length);
  } catch (error: any) {
    console.error("Render error:", error);
    console.error("Received data:", data);
    showError(`Error rendering deployments: ${error.message}`);
  }
}

/* ============================================
   SDK UTILITIES ONLY (NO CONNECTION)
   ============================================ */

const app = new App({ name: APP_NAME, version: APP_VERSION });

/* ============================================
   DIRECT MESSAGE HANDLING
   ============================================ */

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;

  if (!msg) return;

  if (msg.jsonrpc === "2.0") {
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      console.info("Received tool result from proxy");
      const data = msg.params.structuredContent || msg.params;
      renderData(data);
      return;
    }

    if (msg.method === "ui/notifications/host-context-changed" && msg.params) {
      console.info("Host context changed:", msg.params);

      if (msg.params.theme) {
        applyDocumentTheme(msg.params.theme);
      }

      if (msg.params.styles?.css?.fonts) {
        applyHostFonts(msg.params.styles.css.fonts);
      }

      if (msg.params.styles?.variables) {
        applyHostStyleVariables(msg.params.styles.variables);
      }

      if (msg.params.displayMode === "fullscreen") {
        document.body.classList.add("fullscreen-mode");
      } else {
        document.body.classList.remove("fullscreen-mode");
      }

      return;
    }

    if (msg.method === "ui/notifications/tool-cancelled") {
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      return;
    }

    if (msg.id !== undefined && msg.method === "ui/resource-teardown") {
      console.info("Resource teardown requested");

      window.parent.postMessage(
        {
          jsonrpc: "2.0",
          id: msg.id,
          result: {},
        },
        "*",
      );
      return;
    }

    return;
  }

});

/* ============================================
   APP INITIALIZATION
   ============================================ */

const cleanupResize = app.setupSizeChangedNotifications();

window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("✓ Vercel Deployments MCP App initialized (SDK utilities mode)");

export { app };
