/* ============================================
   CURSOR LIST AGENTS MCP APP (STANDALONE MODE)
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

const APP_NAME = "Cursor List Agents";
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


/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
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
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
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
  app.sendLog({ level: "error", data: `App error: ${JSON.stringify(error)}`, logger: APP_NAME });
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
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${JSON.stringify(error)}`, logger: APP_NAME });
  });

export {};
