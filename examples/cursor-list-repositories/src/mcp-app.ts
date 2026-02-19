/* ============================================
   CURSOR REPOSITORIES MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().
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

const APP_NAME = "Cursor Repositories";
const APP_VERSION = "1.0.0";

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
   HOST CONTEXT HANDLER
   ============================================ */

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;

  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
    // Also toggle body.dark class for CSS compatibility
    if (ctx.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }
}

/* ============================================
   SDK APP INSTANCE (STANDALONE MODE)
   ============================================ */

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

app.onteardown = async () => {
  console.info("Resource teardown requested");
  return {};
};

app.ontoolinput = (params) => {
  console.info("Tool input received:", params.arguments);
};

app.ontoolresult = (params) => {
  console.info("Tool result received");

  // Check for tool execution errors
  if (params.isError) {
    console.error("Tool execution failed:", params.content);
    const errorText =
      params.content?.map((c: any) => c.text || "").join("\n") ||
      "Tool execution failed";
    showError(errorText);
    return;
  }

  const data = params.structuredContent || params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    console.warn("Tool result received but no data found:", params);
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  console.info("Tool cancelled:", reason);
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  console.error("App error:", error);
};

app.onhostcontextchanged = (ctx) => {
  console.info("Host context changed:", ctx);
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    console.info("MCP App connected to host");
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    console.error("Failed to connect to MCP host:", error);
  });

export {};
