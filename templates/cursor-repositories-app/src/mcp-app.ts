/* ============================================
   BASE TEMPLATE (SDK UTILITIES VERSION) FOR MCP APPS
   ============================================

   This file uses the official @modelcontextprotocol/ext-apps SDK
   for utilities only (theme helpers, types, auto-resize).

   Benefits of this approach:
   - SDK utilities for theme, fonts, and styling
   - Full TypeScript type safety
   - Manual message handling for proxy compatibility
   - Works with run-action.html proxy layer
   - No SDK connection conflicts with proxy initialization

   See README.md for customization guidelines.
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
   ============================================
   TEMPLATE-SPECIFIC: Update these values for your app
   ============================================ */

const APP_NAME = "Cursor Repositories";
const APP_VERSION = "1.0.0";

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================
   If you use external libraries (like Chart.js), import or declare them here.
   
   For npm packages:
   import Chart from "chart.js/auto";
   
   For CDN scripts (requires CSP configuration):
   declare const Chart: any;
   ============================================ */

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Unwrap nested API response structures
 * Handles various wrapper formats from different MCP clients
 */
function unwrapData(data: any): any {
  if (!data) return null;

  // Nested in message wrappers (3rd-party MCP clients)
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  if (data.message?.response_content) {
    return data.message.response_content;
  }

  // Common nested payloads
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;

  // Nested rows object: { rows: { columns: [...], rows: [...] } }
  if (
    data.rows &&
    typeof data.rows === "object" &&
    !Array.isArray(data.rows) &&
    data.rows.columns &&
    data.rows.rows
  ) {
    return data.rows;
  }

  // Standard table format { columns: [], rows: [...] }
  if (data.columns || Array.isArray(data.rows)) {
    return data;
  }

  // If data itself is an array
  if (Array.isArray(data)) {
    return { rows: data };
  }

  return data;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show error message in the app
 */
function showError(message: string) {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Show empty state message
 */
function showEmpty(message: string = "No data available.") {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================
   
   Add your template-specific utility functions here.
   Examples:
   - Data normalization functions
   - Formatting functions (dates, numbers, etc.)
   - Data transformation functions
   - Chart rendering functions (if using Chart.js)
   ============================================ */

/**
 * Format repository URL to ensure it's a valid GitHub link
 */
function formatRepositoryUrl(url: string): string {
  if (!url) return '';
  // Ensure the URL starts with https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================
   
   This is the main function you need to implement.
   It receives the data and renders it in the app.
   
   Guidelines:
   1. Always validate data before rendering
   2. Use unwrapData() to handle nested structures
   3. Use escapeHtml() when inserting user content
   4. Handle errors gracefully with try/catch
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No repositories data received");
    return;
  }

  try {
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);

    // Extract repositories array from various possible formats
    const repos = unwrapped.repositories || unwrapped.results || unwrapped.items || [];

    // Validate we have repository data
    if (!Array.isArray(repos) || repos.length === 0) {
      showEmpty("No repositories found");
      return;
    }

    // Build repository table HTML
    const tableRows = repos.map((repo: any) => {
      const owner = escapeHtml(repo.owner || '');
      const name = escapeHtml(repo.name || '');
      const repoUrl = formatRepositoryUrl(repo.repository || '');
      const escapedUrl = escapeHtml(repoUrl);

      return `
        <tr class="repo-row">
          <td class="repo-owner">${owner}</td>
          <td class="repo-name">${name}</td>
          <td class="repo-url">
            <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="repo-link">
              ${escapedUrl}
              <svg class="external-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    // Render the complete UI
    app.innerHTML = `
      <div class="container">
        <div class="header">
          <h1>Cursor Repositories</h1>
          <p class="repo-count">${repos.length} ${repos.length === 1 ? 'repository' : 'repositories'}</p>
        </div>
        <div class="table-container">
          <table class="repo-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Repository Name</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Log data structure to console for debugging
    console.log("Repositories rendered:", {
      count: repos.length,
      repositories: repos,
    });
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering repositories: ${error.message}`);
  }
}

/* ============================================
   SDK UTILITIES ONLY (NO CONNECTION)
   ============================================

   We use the SDK only for utilities (theme helpers, types).
   Message handling is done manually to work with the proxy.
   ============================================ */

// Create app instance
const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

/* ============================================
   DIRECT MESSAGE HANDLING
   ============================================

   Handle messages manually to work with the proxy layer.
   The proxy already handles ui/initialize, so we listen for notifications.
   ============================================ */

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;

  if (!msg) return;

  // Handle JSON-RPC 2.0 protocol messages
  if (msg.jsonrpc === "2.0") {
    // Handle tool result notifications
    if (msg.method === "ui/notifications/tool-result" && msg.params) {
      console.info("Received tool result from proxy");
      const data = msg.params.structuredContent || msg.params;
      renderData(data);
      return;
    }

    // Handle host context changes
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

    // Handle tool cancellation
    if (msg.method === "ui/notifications/tool-cancelled") {
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      return;
    }

    // Handle resource teardown
    if (msg.id !== undefined && msg.method === "ui/resource-teardown") {
      console.info("Resource teardown requested");

      // TODO: Clean up your resources here
      // - Clear any timers
      // - Cancel pending requests
      // - Destroy chart instances
      // - Remove event listeners

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
   ============================================
   
   No SDK connection needed - the proxy handles ui/initialize.
   We only set up auto-resize and lifecycle cleanup.
   ============================================ */

// Setup automatic size change notifications
// The SDK will monitor DOM changes and notify the host automatically
const cleanupResize = app.setupSizeChangedNotifications();

// Optional: Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (SDK utilities mode)");
