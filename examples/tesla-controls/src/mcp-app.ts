/* ============================================
   TESLA CONTROLS MCP APP
   ============================================
   
   Interactive Tesla vehicle control interface
   ============================================ */


const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   TESLA CONTROLS MCP APP (SDK VERSION)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   for utilities only (theme helpers, types, auto-resize).

   It does NOT call app.connect() because the proxy handles initialization.
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
  
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.data.records;
  
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return { rows: data };
  }
  
  return data;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
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
    const result = await sendRequest('ui/request-data', {
      type: 'tesla-control-action',
      action: action,
      params: params || {}
    });
    
    // Update state based on action
    updateStateFromAction(action, result);
    
    // Show feedback
    showActionFeedback(action, true);
    
    return result;
  } catch (error: any) {
    console.error(`Failed to execute ${action}:`, error);
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
          console.error('Action failed:', error);
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
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER
   ============================================ */

let sizeChangeTimeout: NodeJS.Timeout | null = null;
let resizeObserver: ResizeObserver | null = null;

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    return;
  }
  
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    const reason = msg.params?.reason || 'Resource teardown requested';
    
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    window.parent.postMessage({
      jsonrpc: "2.0",
      id: msg.id,
      result: {}
    }, '*');
    
    return;
  }
  
  if (msg.id !== undefined && !msg.method) {
    return;
  }
  
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params;
      if (data !== undefined) {
        renderData(data);
      } else {
        renderTeslaControls();
      }
      break;
      
    case 'ui/notifications/host-context-changed':
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

      if (msg.params?.displayMode === 'fullscreen') {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
      break;

    // Handle tool cancellation
    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      break;

    // Handle resource teardown (requires response)
    case 'ui/resource-teardown':
      console.info("Resource teardown requested");

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
      
    case 'ui/notifications/tool-input':
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        console.log('Tool input received:', toolArguments);
      }
      break;

    case 'ui/notifications/initialized':
      break;
      
    default:
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('Unknown method:', msg.method, '- attempting to render data');
          renderData(fallbackData);
        }
      }
  }
});

/* ============================================
   SDK APP INSTANCE (PROXY MODE - NO CONNECT)
   ============================================ */

const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

/* ============================================
   AUTO-RESIZE VIA SDK
   ============================================ */

const cleanupResize = app.setupSizeChangedNotifications();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (proxy mode - SDK utilities only)");

// Export empty object to ensure this file is treated as an ES module
export {};
