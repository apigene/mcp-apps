/* ============================================
   TESLA CONTROLS MCP APP
   ============================================

   Interactive Tesla vehicle control interface
   ============================================ */


const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   TESLA CONTROLS MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   with app.connect() for standalone initialization.
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

const APP_NAME = "Tesla Controls";
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

function showEmpty(message: string = 'No data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TESLA CONTROL FUNCTIONS
   ============================================ */

interface TeslaState {
  locked: boolean;
  frunkOpen: boolean;
  trunkOpen: boolean;
  charging: boolean;
  chargingPortOpen: boolean;
}

let teslaState: TeslaState = {
  locked: true,
  frunkOpen: false,
  trunkOpen: false,
  charging: false,
  chargingPortOpen: false
};

/**
 * Send control action to the host
 */
async function sendControlAction(action: string, params?: any) {
  try {
    // Note: In standalone mode, control actions would need to be handled differently
    // This is a placeholder - the host would need to provide this capability
    app.sendLog({ level: "info", data: `Control action requested: ${action} ${params ? JSON.stringify(params) : ''}`, logger: APP_NAME });

    // Update state based on action (simulated)
    updateStateFromAction(action, null);

    // Show feedback
    showActionFeedback(action, true);

    return {};
  } catch (error: any) {
    app.sendLog({ level: "error", data: `Failed to execute ${action}: ${error}`, logger: APP_NAME });
    showActionFeedback(action, false);
    throw error;
  }
}

/**
 * Update local state based on action result
 */
function updateStateFromAction(action: string, result: any) {
  switch (action) {
    case 'lock':
      teslaState.locked = true;
      break;
    case 'unlock':
      teslaState.locked = false;
      break;
    case 'open-frunk':
      teslaState.frunkOpen = true;
      break;
    case 'close-frunk':
      teslaState.frunkOpen = false;
      break;
    case 'open-trunk':
      teslaState.trunkOpen = true;
      break;
    case 'close-trunk':
      teslaState.trunkOpen = false;
      break;
    case 'open-charge-port':
      teslaState.chargingPortOpen = true;
      break;
    case 'close-charge-port':
      teslaState.chargingPortOpen = false;
      break;
    case 'start-charging':
      teslaState.charging = true;
      break;
    case 'stop-charging':
      teslaState.charging = false;
      break;
  }

  // Re-render to update UI
  renderTeslaControls();
}

/**
 * Show visual feedback for actions
 */
function showActionFeedback(action: string, success: boolean) {
  const button = document.querySelector(`[data-action="${action}"]`) as HTMLElement;
  if (button) {
    button.classList.add(success ? 'action-success' : 'action-error');
    setTimeout(() => {
      button.classList.remove('action-success', 'action-error');
    }, 1000);
  }
}

/**
 * Render Tesla controls interface
 */
function renderTeslaControls() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="tesla-container">
      <!-- Header -->
      <div class="tesla-header">
        <button class="back-button" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="tesla-title">Controls</h1>
        <button class="psi-button" aria-label="Tire Pressure">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
          <span>psi</span>
        </button>
      </div>

      <!-- Car Visualization -->
      <div class="tesla-car-container">
        <div class="tesla-car">
          <!-- Front Trunk (Frunk) -->
          <button
            class="car-control frunk-control ${teslaState.frunkOpen ? 'open' : ''}"
            data-action="${teslaState.frunkOpen ? 'close-frunk' : 'open-frunk'}"
            aria-label="${teslaState.frunkOpen ? 'Close' : 'Open'} front trunk"
          >
            <span class="control-label">${teslaState.frunkOpen ? 'Close' : 'Open'}</span>
          </button>

          <!-- Lock/Unlock -->
          <button
            class="car-control lock-control ${teslaState.locked ? 'locked' : 'unlocked'}"
            data-action="${teslaState.locked ? 'unlock' : 'lock'}"
            aria-label="${teslaState.locked ? 'Unlock' : 'Lock'} vehicle"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${teslaState.locked
                ? '<path d="M6 10V8a6 6 0 0 1 12 0v2M4 10h16v10H4V10z"/><rect x="11" y="14" width="2" height="4" rx="1"/>'
                : '<path d="M6 10V8a6 6 0 0 1 12 0v2M4 10h16v10H4V10z"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/><line x1="12" y1="14" x2="12" y2="18"/>'}
            </svg>
          </button>

          <!-- Rear Trunk -->
          <button
            class="car-control trunk-control ${teslaState.trunkOpen ? 'open' : ''}"
            data-action="${teslaState.trunkOpen ? 'close-trunk' : 'open-trunk'}"
            aria-label="${teslaState.trunkOpen ? 'Close' : 'Open'} rear trunk"
          >
            <span class="control-label">${teslaState.trunkOpen ? 'Close' : 'Open'}</span>
          </button>

          <!-- Charging Port -->
          <button
            class="car-control charge-control ${teslaState.chargingPortOpen ? 'open' : ''} ${teslaState.charging ? 'charging' : ''}"
            data-action="${teslaState.chargingPortOpen ? 'close-charge-port' : 'open-charge-port'}"
            aria-label="${teslaState.chargingPortOpen ? 'Close' : 'Open'} charge port"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom Control Bar -->
      <div class="tesla-controls-bar">
        <button
          class="control-button"
          data-action="flash"
          aria-label="Flash headlights"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Flash</span>
        </button>

        <button
          class="control-button"
          data-action="honk"
          aria-label="Honk horn"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M12 3v18"/>
            <path d="M8 8l8 8M16 8l-8 8"/>
          </svg>
          <span>Honk</span>
        </button>

        <button
          class="control-button"
          data-action="start"
          aria-label="Start vehicle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          <span>Start</span>
        </button>

        <button
          class="control-button"
          data-action="vent"
          aria-label="Vent windows"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
            <path d="M3 12h18"/>
          </svg>
          <span>Vent</span>
        </button>
      </div>
    </div>
  `;

  // Attach event listeners
  attachEventListeners();

  // Notify size change
}

/**
 * Attach event listeners to control buttons
 */
function attachEventListeners() {
  const buttons = document.querySelectorAll('[data-action]');
  buttons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const action = (button as HTMLElement).dataset.action;
      if (action) {
        try {
          await sendControlAction(action);
        } catch (error) {
          app.sendLog({ level: "error", data: `Action failed: ${error}`, logger: APP_NAME });
        }
      }
    });
  });
}

/* ============================================
   MAIN RENDER FUNCTION
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    // If no data, render default Tesla controls
    renderTeslaControls();
    return;
  }

  try {
    const unwrapped = unwrapData(data);

    // Update state from data if provided
    if (unwrapped && typeof unwrapped === 'object') {
      if ('locked' in unwrapped) teslaState.locked = unwrapped.locked;
      if ('frunkOpen' in unwrapped) teslaState.frunkOpen = unwrapped.frunkOpen;
      if ('trunkOpen' in unwrapped) teslaState.trunkOpen = unwrapped.trunkOpen;
      if ('charging' in unwrapped) teslaState.charging = unwrapped.charging;
      if ('chargingPortOpen' in unwrapped) teslaState.chargingPortOpen = unwrapped.chargingPortOpen;
    }

    renderTeslaControls();

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${error}`, logger: APP_NAME });
    showError(`Error rendering data: ${error.message}`);
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
    renderTeslaControls();
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

export {};
