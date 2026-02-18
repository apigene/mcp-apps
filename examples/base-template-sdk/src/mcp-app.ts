/* ============================================
   BASE TEMPLATE (SDK UTILITIES VERSION) FOR MCP APPS
   ============================================

   This template uses the official @modelcontextprotocol/ext-apps SDK
   for utilities only (theme helpers, types, auto-resize).

   It does NOT call app.connect() because the proxy handles initialization.

   Use this template when:
   - Running behind run-action.html or similar proxy
   - Deploying to MCP Apps Playground
   - Working with APIGINE

   Do NOT use this template when:
   - Connecting directly to Claude Desktop, ChatGPT, etc.
   - Need full SDK capabilities (use base-template instead)

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

const APP_NAME = "[Your App Name]"; // TODO: Replace with your app name
const APP_VERSION = "1.0.0"; // TODO: Replace with your app version

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

// TODO: Add your template-specific utility functions here
// Example:
// function formatDate(date: string): string { ... }
// function normalizeData(data: any): any { ... }

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
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);

    // TODO: Implement your rendering logic here
    // This is a basic example that just shows the JSON data
    app.innerHTML = `
      <div class="container">
        <p class="mcp-app-badge">Called from MCP App</p>
        <h1>Data Received</h1>
        <pre>${escapeHtml(JSON.stringify(unwrapped, null, 2))}</pre>
      </div>
    `;

    // Log data structure to console for debugging
    console.log("Data received:", {
      original: data,
      unwrapped: unwrapped,
      type: Array.isArray(unwrapped) ? "array" : typeof unwrapped,
      keys: Array.isArray(unwrapped)
        ? unwrapped.length + " items"
        : Object.keys(unwrapped || {}).join(", "),
    });
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering data: ${error.message}`);
  }
}

/* ============================================
   SDK APP INSTANCE (PROXY MODE - NO CONNECT)
   ============================================

   We create the SDK App instance for utilities only.
   The proxy handles ui/initialize, so we do NOT call app.connect().
   ============================================ */

const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

/* ============================================
   MANUAL MESSAGE HANDLING FOR PROXY COMPATIBILITY
   ============================================

   Handle messages manually to work with the proxy layer.
   The proxy already handles ui/initialize, so we only
   listen for notifications.
   ============================================ */

window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;

  if (!msg || msg.jsonrpc !== "2.0") return;

  switch (msg.method) {
    // Handle tool result notifications (main data)
    case "ui/notifications/tool-result":
      console.info("Tool result received");
      const data = msg.params?.structuredContent || msg.params;
      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn("Tool result received but no data found:", msg);
        showEmpty("No data received");
      }
      break;

    // Handle tool input notifications (optional - for loading states)
    case "ui/notifications/tool-input":
      console.info("Tool input received:", msg.params?.arguments);
      // TODO: You can use this for initial rendering or context
      // Example: Show loading state with input parameters
      break;

    // Handle host context changes (theme, display mode, fonts)
    case "ui/notifications/host-context-changed":
      console.info("Host context changed:", msg.params);

      if (msg.params?.theme) {
        applyDocumentTheme(msg.params.theme);
      }

      if (msg.params?.styles?.css?.fonts) {
        applyHostFonts(msg.params.styles.css.fonts);
      }

      if (msg.params?.styles?.variables) {
        applyHostStyleVariables(msg.params.styles.variables);
      }

      if (msg.params?.displayMode === "fullscreen") {
        document.body.classList.add("fullscreen-mode");
      } else {
        document.body.classList.remove("fullscreen-mode");
      }
      break;

    // Handle tool cancellation
    case "ui/notifications/tool-cancelled":
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      break;

    // Handle resource teardown (requires response)
    case "ui/resource-teardown":
      console.info("Resource teardown requested");

      // TODO: Clean up your resources here
      // - Clear any timers
      // - Cancel pending requests
      // - Destroy chart instances
      // - Remove event listeners

      // Send response to host (required for teardown)
      if (msg.id !== undefined) {
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: msg.id,
            result: {},
          },
          "*"
        );
      }
      break;
  }
});

/* ============================================
   AUTO-RESIZE VIA SDK
   ============================================

   Use SDK's setupSizeChangedNotifications() to automatically
   notify the host when content size changes.
   ============================================ */

const cleanupResize = app.setupSizeChangedNotifications();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (proxy mode - SDK utilities only)");

// Export empty object to ensure this file is treated as an ES module
export {};
