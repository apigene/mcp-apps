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

const APP_NAME = "XYZ Users";
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

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  address?: {
    street?: string;
    city?: string;
    zipcode?: string;
  };
  isActive?: boolean;
};

function normalizeUsers(data: any): User[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function addressText(user: User): string {
  if (!user.address) return "-";
  const parts = [user.address.street, user.address.city, user.address.zipcode]
    .filter(Boolean)
    .map((value) => escapeHtml(value));
  return parts.length ? parts.join(", ") : "-";
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
    showEmpty("No data received");
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    const users = normalizeUsers(unwrapped);

    if (!users.length) {
      showEmpty("No users found in response.");
      return;
    }

    app.innerHTML = `
      <div class="container">
        <h1>Users</h1>
        <div class="table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (user) => `
                    <tr>
                      <td>${escapeHtml(user.id)}</td>
                      <td>${escapeHtml(user.name)}</td>
                      <td>${escapeHtml(user.username)}</td>
                      <td><a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></td>
                      <td>${addressText(user)}</td>
                      <td>
                        <span class="status ${user.isActive ? "active" : "inactive"}">
                          ${user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    console.log("Users rendered:", users.length);
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering data: ${error.message}`);
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
