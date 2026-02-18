/* ============================================
   BASE TEMPLATE FOR MCP APPS
   ============================================

   This template uses the official @modelcontextprotocol/ext-apps SDK
   with full app.connect() pattern for direct MCP host integration.

   Use this template when:
   - Connecting directly to Claude Desktop, ChatGPT, or other MCP hosts
   - Building standalone MCP Apps
   - Need full SDK capabilities (callServerTool, sendMessage, openLink)

   Do NOT use this template when:
   - Running behind a proxy (use base-template-sdk instead)
   - Deploying to MCP Apps Playground
   - Working with APIGINE

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
   HOST CONTEXT HANDLER
   ============================================

   Handles theme, fonts, styles, and display mode changes
   from the MCP host.
   ============================================ */

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;

  // Apply theme
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }

  // Apply host fonts
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  // Apply host style variables
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  // Handle display mode
  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }

  // Handle container dimensions if provided
  if (ctx.containerDimensions) {
    const dims = ctx.containerDimensions;
    if (dims.width) {
      document.body.style.width = dims.width + "px";
    }
    if (dims.height) {
      document.body.style.height = dims.height + "px";
    }
    if (dims.maxWidth) {
      document.body.style.maxWidth = dims.maxWidth + "px";
    }
    if (dims.maxHeight) {
      document.body.style.maxHeight = dims.maxHeight + "px";
    }
  }
}

/* ============================================
   SDK APP INSTANCE (STANDALONE MODE)
   ============================================

   Creates the SDK App instance and registers event handlers
   BEFORE calling connect().
   ============================================ */

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

// Register event handlers BEFORE connect()

/**
 * Handle resource teardown
 * Clean up any resources (timers, observers, chart instances, etc.)
 */
app.onteardown = async () => {
  console.info("Resource teardown requested");
  // TODO: Clean up your resources here
  // - Clear any timers
  // - Cancel pending requests
  // - Destroy chart instances
  // - Remove event listeners
  return {};
};

/**
 * Handle tool input notification
 * Provides tool arguments before the result arrives
 */
app.ontoolinput = (params) => {
  console.info("Tool input received:", params.arguments);
  // TODO: You can use this for initial rendering or context
  // Example: Show loading state with input parameters
};

/**
 * Handle tool result notification
 * This is where the main data arrives
 */
app.ontoolresult = (params) => {
  console.info("Tool result received");
  const data = params.structuredContent || params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    console.warn("Tool result received but no data found:", params);
    showEmpty("No data received");
  }
};

/**
 * Handle tool cancellation
 */
app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  console.info("Tool cancelled:", reason);
  showError(`Operation cancelled: ${reason}`);
};

/**
 * Handle errors
 */
app.onerror = (error) => {
  console.error("App error:", error);
};

/**
 * Handle host context changes
 * Theme, display mode, fonts, and style variables
 */
app.onhostcontextchanged = (ctx) => {
  console.info("Host context changed:", ctx);
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================

   app.connect() performs the ui/initialize handshake
   automatically and sets up all event handlers.
   ============================================ */

app
  .connect()
  .then(() => {
    console.info("MCP App connected to host");

    // Apply initial host context
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    console.error("Failed to connect to MCP host:", error);
    // App can still work in degraded mode
  });

// Export empty object to ensure this file is treated as an ES module
export {};
