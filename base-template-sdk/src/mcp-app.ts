/* ============================================
   BASE TEMPLATE (SDK VERSION) FOR MCP APPS
   ============================================
   
   This file uses the official @modelcontextprotocol/ext-apps SDK
   to handle MCP protocol communication.
   
   Benefits of SDK:
   - Official protocol implementation
   - Automatic updates for protocol changes
   - Full TypeScript type safety
   - Less boilerplate code (~50 lines vs ~540 lines)
   - Built-in utilities (theme, fonts, size notifications)
   
   Customize the sections marked with "TEMPLATE-SPECIFIC" below.
   
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
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";

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

  // Format 1: Standard table format { columns: [], rows: [] }
  if (
    data.columns ||
    (Array.isArray(data.rows) && data.rows.length > 0) ||
    (typeof data === "object" && !data.message)
  ) {
    return data;
  }

  // Format 2: Nested in message.template_data (3rd party MCP clients)
  if (data.message?.template_data) {
    return data.message.template_data;
  }

  // Format 3: Nested in message.response_content (3rd party MCP clients)
  if (data.message?.response_content) {
    return data.message.response_content;
  }

  // Format 4: Common nested patterns
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;

  // Format 5: Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }

  // Format 6: If data itself is an array
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
   SDK APP INSTANCE AND CALLBACKS
   ============================================
   
   The SDK handles all MCP protocol communication.
   Register your callbacks here before connecting.
   ============================================ */

// Create app instance
const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

// Register callbacks BEFORE connecting

/**
 * Called when tool result data is received
 * This is where you render your data
 */
app.ontoolresult = (result: CallToolResult) => {
  console.info("Tool result received:", result);
  const data = result.structuredContent || result;
  renderData(data);
};

/**
 * Called when tool input is received (optional)
 * Use this to show loading state or prepare for data
 */
app.ontoolinput = (params) => {
  console.info("Tool input received:", params);
  // Optional: Show loading state with input parameters
  // Optional: Store for later use in renderData()
};

/**
 * Called when host context changes (theme, display mode, etc.)
 */
app.onhostcontextchanged = (ctx: McpUiHostContext) => {
  console.info("Host context changed:", ctx);

  // Apply theme (dark/light mode)
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }

  // Apply host fonts (optional)
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  // Apply host style variables (optional)
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  // Handle display mode changes (inline/fullscreen)
  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }

  // Optional: Re-render if your content needs theme updates
  // Example: Re-render charts with new colors
};

/**
 * Called when tool execution is cancelled
 */
app.ontoolcancelled = (params) => {
  console.info("Tool cancelled:", params.reason);
  showError(`Operation cancelled: ${params.reason || "Unknown reason"}`);
};

/**
 * Called when app is being torn down
 * Clean up resources here (timers, subscriptions, etc.)
 */
app.onteardown = async (params) => {
  console.info("App teardown:", params);

  // TODO: Clean up your resources here
  // - Clear any timers
  // - Cancel pending requests
  // - Destroy chart instances
  // - Remove event listeners

  return {}; // Must return empty object
};

/**
 * Error handler
 */
app.onerror = (error) => {
  console.error("App error:", error);
  showError(error.message || "An error occurred");
};

/* ============================================
   APP INITIALIZATION
   ============================================
   
   Connect to the host and setup auto-resize.
   ============================================ */

// Connect to host
app
  .connect()
  .then(() => {
    console.info("Connected to MCP host");

    // Apply initial host context if available
    const ctx = app.getHostContext();
    if (ctx) {
      if (ctx.theme) {
        applyDocumentTheme(ctx.theme);
      }
      if (ctx.styles?.css?.fonts) {
        applyHostFonts(ctx.styles.css.fonts);
      }
      if (ctx.styles?.variables) {
        applyHostStyleVariables(ctx.styles.variables);
      }
    }

    // Development/Testing: Render demo data if no tool result received within 2 seconds
    // Remove this timeout in production or when tool results are expected
    setTimeout(() => {
      const appElement = document.getElementById("app");
      if (appElement?.querySelector(".loading")) {
        console.info(
          "No tool result received, rendering demo data for testing",
        );
        renderData({
          message: "Demo Mode - No MCP Host Connected",
          description:
            "This is demo data displayed because no tool result was received. " +
            "In production, this app will receive real data from MCP tool calls.",
          timestamp: new Date().toISOString(),
          environment: "development",
        });
      }
    }, 2000);
  })
  .catch((err) => {
    console.error("Failed to connect to host:", err);
    showError("Failed to connect to MCP host");
  });

// Setup automatic size change notifications
// The SDK will monitor DOM changes and notify the host automatically
const cleanupResize = app.setupSizeChangedNotifications();

// Optional: Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

/* ============================================
   OPTIONAL: HELPER FUNCTIONS FOR CALLING SERVER
   ============================================
   
   If you need to call server tools from your UI,
   use these patterns:
   ============================================ */

/**
 * Example: Call a server tool
 */
export async function callServerTool(
  toolName: string,
  args: Record<string, any>,
) {
  try {
    const result = await app.callServerTool({
      name: toolName,
      arguments: args,
    });
    return result;
  } catch (error) {
    console.error("Error calling server tool:", error);
    throw error;
  }
}

/**
 * Example: Send a message to the host
 */
export async function sendMessageToHost(text: string) {
  try {
    const result = await app.sendMessage({
      role: "user",
      content: [{ type: "text", text }],
    });
    return result;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Example: Open a link in the host
 */
export async function openLink(url: string) {
  try {
    const result = await app.openLink({ url });
    if (result.isError) {
      console.warn("Link open rejected:", url);
    }
    return result;
  } catch (error) {
    console.error("Error opening link:", error);
    throw error;
  }
}

// Export app instance for advanced use cases
export { app };
