/* ============================================
   CURSOR LIST AGENTS MCP APP (SDK VERSION)
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

const APP_NAME = "Cursor List Agents";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Extract data from MCP protocol messages
 * Handles standard JSON-RPC 2.0 format from run-action.html
 */
function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

/**
 * Unwrap nested API response structures
 * Handles various wrapper formats from different MCP clients
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
  // Format 1: Direct response_content (common API wrapper format)
  if (data.response_content) {
    return data.response_content;
  }
  
  // Format 2: Standard table format { columns: [], rows: [] }
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0)) {
    return data;
  }
  
  // Format 3: Nested in message.template_data (3rd party MCP clients)
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  // Format 4: Nested in message.response_content (3rd party MCP clients)
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  // Format 5: Common nested patterns
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;
  
  // Format 6: Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  // Format 7: If data itself is an array
  if (Array.isArray(data)) {
    return { rows: data };
  }
  
  // Format 8: If it's an object without message, return as-is (but only if it has meaningful content)
  if (typeof data === 'object' && !data.message && !data.status_code) {
    return data;
  }
  
  return data;
}


/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show error message in the app
 */
function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Show empty state message
 * Override the default message by passing a custom message
 */
function showEmpty(message: string = 'No data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================
   
   Cursor Agents Display - Utility Functions
   ============================================ */

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  } catch {
    return dateString;
  }
}

/**
 * Get status badge class based on status
 */
function getStatusClass(status: string): string {
  const statusLower = (status || '').toLowerCase();
  if (statusLower === 'finished' || statusLower === 'completed') return 'status-finished';
  if (statusLower === 'running' || statusLower === 'in_progress') return 'status-running';
  if (statusLower === 'failed' || statusLower === 'error') return 'status-failed';
  if (statusLower === 'pending' || statusLower === 'queued') return 'status-pending';
  return 'status-unknown';
}

/**
 * Format summary text (handle markdown-like formatting)
 */
function formatSummary(summary: string): string {
  if (!summary) return '';
  // Convert markdown-style bullet points to HTML
  return escapeHtml(summary)
    .replace(/\n/g, '<br>')
    .replace(/\*\s+/g, '• ');
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

let selectedAgentId: string | null = null;
let agentsData: any[] = [];

// Global navigation functions
function viewAgentDetail(agentId: string) {
  selectedAgentId = agentId;
  renderData({ body: { agents: agentsData } });
}

function viewAgentList() {
  selectedAgentId = null;
  renderData({ body: { agents: agentsData } });
}

// Make functions globally accessible
(window as any).viewAgentDetail = viewAgentDetail;
(window as any).viewAgentList = viewAgentList;

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    
    // Extract agents from the response structure
    let agents: any[] = [];
    if (unwrapped?.body?.agents && Array.isArray(unwrapped.body.agents)) {
      agents = unwrapped.body.agents;
    } else if (unwrapped?.agents && Array.isArray(unwrapped.agents)) {
      agents = unwrapped.agents;
    } else if (Array.isArray(unwrapped)) {
      agents = unwrapped;
    }
    
    agentsData = agents;
    
    if (agents.length === 0) {
      showEmpty('No agents found');
      return;
    }
    
    // Render list view or detail view
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent) {
        renderAgentDetail(agent);
      } else {
        selectedAgentId = null;
        renderAgentList(agents);
      }
    } else {
      renderAgentList(agents);
    }

  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
  }
}

function renderAgentList(agents: any[]) {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = `
    <div class="cursor-container">
      <div class="cursor-header">
        <h1 class="cursor-title">Agents</h1>
        <div class="cursor-subtitle">${agents.length} agent${agents.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="agents-list">
        ${agents.map(agent => `
          <div class="agent-card" data-agent-id="${escapeHtml(agent.id)}">
            <div class="agent-card-header">
              <div class="agent-card-title-row">
                <h3 class="agent-name">${escapeHtml(agent.name || 'Unnamed Agent')}</h3>
                <span class="status-badge ${getStatusClass(agent.status)}">${escapeHtml(agent.status || 'Unknown')}</span>
              </div>
              <div class="agent-meta">
                <span class="agent-time">${formatDate(agent.createdAt)}</span>
              </div>
            </div>
            ${agent.summary ? `
              <div class="agent-summary-preview">
                ${formatSummary(agent.summary).substring(0, 150)}${agent.summary.length > 150 ? '...' : ''}
              </div>
            ` : ''}
            <div class="agent-card-footer">
              <button class="cursor-button cursor-button-primary" onclick="viewAgentDetail('${escapeHtml(agent.id)}')">
                View Details
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Add click handlers for cards
  const cards = app.querySelectorAll('.agent-card');
  cards.forEach(card => {
    const agentId = card.getAttribute('data-agent-id');
    if (agentId) {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking the button
        if ((e.target as HTMLElement).closest('.cursor-button')) return;
        viewAgentDetail(agentId);
      });
    }
  });
}

function renderAgentDetail(agent: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = `
    <div class="cursor-container">
      <div class="cursor-header">
        <button class="cursor-button cursor-button-secondary cursor-button-icon" onclick="viewAgentList()" title="Back to list">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 2 L6 8 L10 14"/>
          </svg>
          Back
        </button>
        <div>
          <h1 class="cursor-title">${escapeHtml(agent.name || 'Unnamed Agent')}</h1>
          <div class="cursor-subtitle">
            <span class="status-badge ${getStatusClass(agent.status)}">${escapeHtml(agent.status || 'Unknown')}</span>
            <span class="agent-time">${formatDate(agent.createdAt)}</span>
          </div>
        </div>
      </div>
      
      <div class="agent-detail">
        <div class="detail-section">
          <h2 class="detail-section-title">Summary</h2>
          <div class="detail-content">
            ${agent.summary ? `<div class="agent-summary">${formatSummary(agent.summary)}</div>` : '<p class="detail-empty">No summary available</p>'}
          </div>
        </div>
        
        ${agent.source ? `
          <div class="detail-section">
            <h2 class="detail-section-title">Source</h2>
            <div class="detail-content">
              <div class="detail-item">
                <span class="detail-label">Repository:</span>
                <span class="detail-value">${escapeHtml(agent.source.repository || 'N/A')}</span>
              </div>
              ${agent.source.ref ? `
                <div class="detail-item">
                  <span class="detail-label">Ref:</span>
                  <span class="detail-value">${escapeHtml(agent.source.ref)}</span>
                </div>
              ` : ''}
              ${agent.source.prUrl ? `
                <div class="detail-item">
                  <span class="detail-label">PR:</span>
                  <a href="${escapeHtml(agent.source.prUrl)}" target="_blank" class="detail-link">${escapeHtml(agent.source.prUrl)}</a>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
        
        ${agent.target ? `
          <div class="detail-section">
            <h2 class="detail-section-title">Target</h2>
            <div class="detail-content">
              ${agent.target.branchName ? `
                <div class="detail-item">
                  <span class="detail-label">Branch:</span>
                  <span class="detail-value">${escapeHtml(agent.target.branchName)}</span>
                </div>
              ` : ''}
              ${agent.target.url ? `
                <div class="detail-item">
                  <span class="detail-label">URL:</span>
                  <a href="${escapeHtml(agent.target.url)}" target="_blank" class="detail-link">${escapeHtml(agent.target.url)}</a>
                </div>
              ` : ''}
              ${agent.target.prUrl ? `
                <div class="detail-item">
                  <span class="detail-label">PR:</span>
                  <a href="${escapeHtml(agent.target.prUrl)}" target="_blank" class="detail-link">${escapeHtml(agent.target.prUrl)}</a>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="detail-section">
          <h2 class="detail-section-title">Details</h2>
          <div class="detail-content">
            <div class="detail-item">
              <span class="detail-label">ID:</span>
              <span class="detail-value detail-value-monospace">${escapeHtml(agent.id || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Created:</span>
              <span class="detail-value">${formatDate(agent.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}


/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================
   
   This handles all incoming messages from the MCP host.
   You typically don't need to modify this section.
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    console.warn('Invalid message received 1:', msg);
    return;
  }
  
  // Handle requests that require responses (like ui/resource-teardown)
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    const reason = msg.params?.reason || 'Resource teardown requested';
    console.log('Resource teardown requested:', reason);
    // Clean up resources
    // - Cancel any pending requests (if you track them)
    // - Destroy chart instances, etc. (template-specific cleanup)
    
    // Send response to host
    window.parent.postMessage({
      jsonrpc: "2.0",
      id: msg.id,
      result: {}
    }, '*');
    
    return; // Don't process further
  }
  
  if (msg.id !== undefined && !msg.method) {
    console.warn('Invalid message received 2:', msg);
    return;
  }
  
  console.log('Message received:', msg);
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params;
      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;
      
    case 'ui/notifications/host-context-changed':
      if (msg.params?.theme) {
        applyDocumentTheme(msg.params.theme);
      }
      if (msg.params?.styles?.css?.fonts) {
        applyHostFonts(msg.params.styles.css.fonts);
      }
      if (msg.params?.styles?.variables) {
        applyHostStyleVariables(msg.params.styles.variables);
      }
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;
      
    case 'ui/notifications/tool-input':
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        // Template-specific: You can use this for initial rendering or context
        console.log('Tool input received:', toolArguments);
        // Example: Show loading state with input parameters
        // Example: Store for later use in renderData()
      }
      break;
      
    case 'ui/notifications/tool-cancelled':
      // Tool cancellation notification - Host MUST send this if tool is cancelled
      const reason = msg.params?.reason || 'Tool execution was cancelled';
      showError(`Operation cancelled: ${reason}`);
      // Clean up any ongoing operations
      // - Stop timers
      // - Cancel pending requests
      // - Reset UI state
      break;
      
    case 'ui/notifications/initialized':
      // Initialization notification (optional - handle if needed)
      break;
      
    default:
      // Unknown method - try to extract data as fallback
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
   MCP COMMUNICATION
   ============================================
   
   Functions for communicating with the MCP host.
   You typically don't need to modify this section.
   ============================================ */

let requestIdCounter = 1;
function sendRequest(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestIdCounter++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, '*');
    
    const listener = (event: MessageEvent) => {
      if (event.data?.id === id) {
        window.removeEventListener('message', listener);
        if (event.data?.result) {
          resolve(event.data.result);
        } else if (event.data?.error) {
          reject(new Error(event.data.error.message || 'Unknown error'));
        }
      }
    };
    window.addEventListener('message', listener);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

function sendNotification(method: string, params: any) {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, '*');
}

/* ============================================
   DISPLAY MODE HANDLING
   ============================================
   
   Handles switching between inline and fullscreen display modes.
   You may want to customize handleDisplayModeChange() to adjust
   your layout for fullscreen mode.
   ============================================ */

let currentDisplayMode = 'inline';

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
    // Adjust layout for fullscreen if needed
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '';
      (container as HTMLElement).style.padding = '';
    }
  }
}

function requestDisplayMode(mode: string): Promise<any> {
  return sendRequest('ui/request-display-mode', { mode: mode })
    .then(result => {
      if (result?.mode) {
        handleDisplayModeChange(result.mode);
      }
      return result;
    })
    .catch(err => {
      console.warn('Failed to request display mode:', err);
      throw err;
    });
}

// Make function globally accessible for testing/debugging
(window as any).requestDisplayMode = requestDisplayMode;

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
