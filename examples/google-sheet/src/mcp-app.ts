/* ============================================
   GOOGLE SHEET MCP APP (STANDALONE MODE)
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

const APP_NAME = "Google Sheet";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

function unwrapData(data: any): any {
  if (!data) return null;

  // If data itself is an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }

  // Handle GitHub API response format - check for body array
  if (data.body && Array.isArray(data.body)) {
    return data.body;
  }

  // Nested formats
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  if (data.message?.response_content) {
    return data.message.response_content;
  }

  // Common nested patterns - check these BEFORE generic object check
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;

  // Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }

  // Standard table format
  if (data.columns) {
    return data;
  }

  return data;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

function showEmpty(message: string = 'No sheet data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Extract spreadsheet ID from Google Sheets API URL
 * Format: https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/...
 */
function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;

  try {
    // Match pattern: /spreadsheets/{ID}/
    const match = url.match(/\/spreadsheets\/([a-zA-Z0-9_-]+)\//);
    if (match && match[1]) {
      return match[1];
    }

    // Also try without trailing slash
    const match2 = url.match(/\/spreadsheets\/([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      return match2[1];
    }
  } catch (error) {
    app.sendLog({ level: "error", data: `Error extracting spreadsheet ID: ${error}`, logger: APP_NAME });
  }

  return null;
}

/**
 * Extract spreadsheet ID from various data formats
 *
 * The data structure from apigene-mcp-next can be:
 * - Direct: { status_code, body, ... }
 * - Nested in message: { message: { status_code, response_content, template_data, input, request, ... } }
 * - In template_data/response_content: { template_data: { status_code, body, ... } }
 */
function getSpreadsheetId(data: any): string | null {
  // First, check if data is nested in message structure (from run-action.html unwrapping)
  // The message might contain: status_code, response_content, template_data, input, request, etc.

  // Try to get from message.input.url (if backend includes input in message)
  if (data.message?.input?.url) {
    const id = extractSpreadsheetId(data.message.input.url);
    if (id) return id;
  }

  // Try to get from message.request.url (if backend includes request in message)
  if (data.message?.request?.url) {
    const id = extractSpreadsheetId(data.message.request.url);
    if (id) return id;
  }

  // Try to get from input at root level
  if (data.input?.url) {
    const id = extractSpreadsheetId(data.input.url);
    if (id) return id;
  }

  // Try to get from request URL (most common case)
  if (data.request?.url) {
    const id = extractSpreadsheetId(data.request.url);
    if (id) return id;
  }

  // Try to get from URL field at root level
  if (data.url) {
    const id = extractSpreadsheetId(data.url);
    if (id) return id;
  }

  // Try to get from body if it contains URL
  if (data.body?.url) {
    const id = extractSpreadsheetId(data.body.url);
    if (id) return id;
  }

  // Try to get from response body if it contains URL
  if (data.response?.body?.url) {
    const id = extractSpreadsheetId(data.response.body.url);
    if (id) return id;
  }

  // Try to get from response URL
  if (data.response?.url) {
    const id = extractSpreadsheetId(data.response.url);
    if (id) return id;
  }

  // Try to get from method/url at root (some APIs structure it this way)
  if (data.method && data.url) {
    const id = extractSpreadsheetId(data.url);
    if (id) return id;
  }

  // Deep search: recursively search for any URL field containing 'spreadsheets'
  function deepSearch(obj: any, depth: number = 0): string | null {
    if (depth > 5) return null; // Prevent infinite recursion

    if (typeof obj === 'string' && obj.includes('spreadsheets')) {
      const id = extractSpreadsheetId(obj);
      if (id) return id;
    }

    if (typeof obj === 'object' && obj !== null) {
      // First, check common URL field names
      const urlFields = ['url', 'requestUrl', 'request_url', 'apiUrl', 'api_url', 'endpoint'];
      for (const field of urlFields) {
        if (obj[field] && typeof obj[field] === 'string') {
          const id = extractSpreadsheetId(obj[field]);
          if (id) return id;
        }
      }

      // Then search recursively
      for (const key in obj) {
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('request')) {
          const id = deepSearch(obj[key], depth + 1);
          if (id) return id;
        }
      }

      // Also search all values
      for (const key in obj) {
        const id = deepSearch(obj[key], depth + 1);
        if (id) return id;
      }
    }

    return null;
  }

  const deepId = deepSearch(data);
  if (deepId) return deepId;

  return null;
}

/**
 * Build Google Sheets embed URL
 */
function buildEmbedUrl(spreadsheetId: string, options: { gid?: string; widget?: boolean } = {}): string {
  let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview`;

  const params: string[] = [];
  if (options.gid) {
    params.push(`gid=${options.gid}`);
  }
  if (options.widget !== undefined) {
    params.push(`widget=${options.widget}`);
  }

  if (params.length > 0) {
    url += '?' + params.join('&');
  }

  return url;
}

/**
 * Extract sheet data from API response
 */
function extractSheetData(data: any): any {
  const unwrapped = unwrapData(data);

  // Handle API response format: { status_code: 200, body: {...} }
  if (unwrapped?.body) {
    return unwrapped.body;
  }

  // Handle direct response body
  if (unwrapped?.response?.body) {
    return unwrapped.response.body;
  }

  // Handle direct sheet data
  if (unwrapped?.range || unwrapped?.values) {
    return unwrapped;
  }

  return unwrapped;
}

/**
 * Setup interactive features for the table
 */
function setupTableInteractivity() {
  const table = document.getElementById('sheetTable') as HTMLTableElement;
  if (!table) return;

  const cells = table.querySelectorAll('td, th');
  let selectedCell: HTMLElement | null = null;

  // Cell selection
  cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      // Remove previous selection
      if (selectedCell) {
        selectedCell.classList.remove('selected');
      }

      // Add selection to clicked cell
      const target = e.target as HTMLElement;
      target.classList.add('selected');
      selectedCell = target;
    });

    // Show full text on hover for truncated cells
    cell.addEventListener('mouseenter', (e) => {
      const target = e.target as HTMLElement;
      if (target.scrollWidth > target.clientWidth) {
        // Cell is truncated, show tooltip
        target.setAttribute('data-tooltip', target.textContent || '');
      }
    });
  });

  // Column header hover effect
  const headers = table.querySelectorAll('th');
  headers.forEach(header => {
    header.addEventListener('mouseenter', () => {
      const colIndex = header.getAttribute('data-col');
      if (colIndex !== null) {
        const cellsInColumn = table.querySelectorAll(`td[data-col="${colIndex}"]`);
        cellsInColumn.forEach((cell: Element) => {
          (cell as HTMLElement).style.backgroundColor = '#f1f3f4';
        });
      }
    });

    header.addEventListener('mouseleave', () => {
      const colIndex = header.getAttribute('data-col');
      if (colIndex !== null) {
        const cellsInColumn = table.querySelectorAll(`td[data-col="${colIndex}"]`);
        cellsInColumn.forEach((cell: Element) => {
          (cell as HTMLElement).style.backgroundColor = '';
        });
      }
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;

    const currentRow = parseInt(selectedCell.getAttribute('data-row') || '0');
    const currentCol = parseInt(selectedCell.getAttribute('data-col') || '0');
    let newRow = currentRow;
    let newCol = currentCol;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRow = currentRow + 1;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newCol = Math.max(0, currentCol - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newCol = currentCol + 1;
        break;
      default:
        return;
    }

    const newCell = table.querySelector(`td[data-row="${newRow}"][data-col="${newCol}"]`) as HTMLElement;
    if (newCell) {
      selectedCell.classList.remove('selected');
      newCell.classList.add('selected');
      newCell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      selectedCell = newCell;
    }
  });

  // Copy cell value on double click
  cells.forEach(cell => {
    cell.addEventListener('dblclick', async (e) => {
      const target = e.target as HTMLElement;
      const text = target.textContent || '';
      if (text && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          // Visual feedback
          const originalBg = target.style.backgroundColor;
          target.style.backgroundColor = '#c8e6c9';
          setTimeout(() => {
            target.style.backgroundColor = originalBg;
          }, 200);
        } catch (err) {
          app.sendLog({ level: "warning", data: `Failed to copy: ${err}`, logger: APP_NAME });
        }
      }
    });
  });
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================ */

function renderData(data: any) {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  if (!data) {
    showEmpty('No sheet data received');
    return;
  }

  try {
    // First, unwrap data but preserve message structure for request info
    const unwrapped = unwrapData(data);

    // Extract spreadsheet ID - try multiple methods
    // Check both unwrapped data and original data to catch all cases
    let spreadsheetId = getSpreadsheetId(unwrapped) || getSpreadsheetId(data);

    // If not found, try extracting from the entire data structure as JSON string
    if (!spreadsheetId) {
      try {
        const dataString = JSON.stringify(data);
        const urlMatch = dataString.match(/spreadsheets\/([a-zA-Z0-9_-]+)/);
        if (urlMatch && urlMatch[1]) {
          spreadsheetId = urlMatch[1];
        }
      } catch (e) {
        // Ignore JSON stringify errors
      }
    }

    // Log for debugging
    if (!spreadsheetId) {
      app.sendLog({ level: "debug", data: `Data structure received: ${JSON.stringify(data, null, 2).substring(0, 500)}`, logger: APP_NAME });
    }

    // Extract sheet data for metadata display
    // Use unwrapped data for sheet content, but keep original for ID extraction
    const sheetData = extractSheetData(unwrapped || data);
    const range = sheetData?.range || 'Sheet';
    const rowCount = sheetData?.values?.length || 0;
    const values = sheetData?.values || [];

    // If we have spreadsheet ID, render as iframe
    if (spreadsheetId) {
      const embedUrl = buildEmbedUrl(spreadsheetId);

      appElement.innerHTML = `
        <div class="container">
          <div class="sheet-header">
            <div class="sheet-info">
              <h2 class="sheet-title">Google Sheet</h2>
              ${range ? `<span class="sheet-range">${escapeHtml(range)}</span>` : ''}
              ${rowCount > 0 ? `<span class="sheet-rows">${rowCount} rows</span>` : ''}
            </div>
            <a href="${escapeHtml(embedUrl)}" target="_blank" rel="noopener noreferrer" class="open-sheet-btn">
              Open in Google Sheets →
            </a>
          </div>
          <div class="sheet-container">
            <iframe
              class="sheet-iframe"
              src="${escapeHtml(embedUrl)}"
              frameborder="0"
              allowfullscreen
              loading="lazy"
              title="Google Sheet"
            ></iframe>
          </div>
        </div>
      `;
    } else {
      // Fallback: render as table if no spreadsheet ID found
      // This allows users to at least see the data
      const headers = values.length > 0 ? values[0] : [];
      const rows = values.slice(1);

      appElement.innerHTML = `
        <div class="container">
          <div class="sheet-header">
            <div class="sheet-info">
              <h2 class="sheet-title">Google Sheet Data</h2>
              ${range ? `<span class="sheet-range">${escapeHtml(range)}</span>` : ''}
              ${rowCount > 0 ? `<span class="sheet-rows">${rowCount} rows</span>` : ''}
            </div>
            <div class="sheet-warning">
              ⚠️ Spreadsheet ID not found - showing data table. To embed the sheet, include the request URL in the response.
            </div>
          </div>
          <div class="table-container" id="tableContainer">
            <table class="sheet-table" id="sheetTable">
              ${headers.length > 0 ? `
                <thead>
                  <tr>
                    ${headers.map((header: any, idx: number) =>
                      `<th data-col="${idx}" title="${escapeHtml(String(header || ''))}">${escapeHtml(String(header || ''))}</th>`
                    ).join('')}
                  </tr>
                </thead>
              ` : ''}
              <tbody>
                ${rows.map((row: any[], rowIdx: number) => `
                  <tr data-row="${rowIdx}">
                    ${headers.map((_: any, idx: number) => {
                      const cellValue = row && row[idx] !== undefined ? row[idx] : '';
                      return `<td data-col="${idx}" data-row="${rowIdx}" title="${escapeHtml(String(cellValue || ''))}">${escapeHtml(String(cellValue || ''))}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Add interactive features
      setupTableInteractivity();
    }

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${error}`, logger: APP_NAME });
    showError(`Error rendering sheet: ${error.message}`);
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
  app.sendLog({ level: "info", data: "Resource teardown requested", logger: APP_NAME });
  // Add any cleanup logic specific to this app
  return {};
};

app.ontoolinput = (params) => {
  app.sendLog({ level: "info", data: `Tool input received: ${JSON.stringify(params.arguments)}`, logger: APP_NAME });
};

app.ontoolresult = (params) => {
  app.sendLog({ level: "info", data: "Tool result received", logger: APP_NAME });

  // Check for tool execution errors
  if (params.isError) {
    app.sendLog({ level: "error", data: `Tool execution failed: ${JSON.stringify(params.content)}`, logger: APP_NAME });
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
    app.sendLog({ level: "warning", data: `Tool result received but no data found: ${JSON.stringify(params)}`, logger: APP_NAME });
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  app.sendLog({ level: "info", data: `Tool cancelled: ${reason}`, logger: APP_NAME });
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  app.sendLog({ level: "error", data: `App error: ${error}`, logger: APP_NAME });
};

app.onhostcontextchanged = (ctx) => {
  app.sendLog({ level: "info", data: `Host context changed: ${JSON.stringify(ctx)}`, logger: APP_NAME });
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    app.sendLog({ level: "info", data: "MCP App connected to host", logger: APP_NAME });
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${error}`, logger: APP_NAME });
  });

// Export empty object to ensure this file is treated as an ES module
export {};
