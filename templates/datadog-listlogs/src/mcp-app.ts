/* ============================================
   DATADOG LIST LOGS MCP APP (SDK VERSION)
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
   ============================================ */

const APP_NAME = "Datadog List Logs";
const APP_VERSION = "1.0.0";

/* ============================================
   INLINE ICON FUNCTIONS (Embedded to avoid CSP)
   ============================================ */

function iconSearch(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>`;
}

function iconCopy(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`;
}

function iconCode(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`;
}

function iconX(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}

function iconCheck(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`;
}

function iconInbox(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>`;
}

function iconSearchLarge(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>`;
}

function iconDatadogSmall(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
    <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
    <path d="M12 9c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm0 4c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/>
  </svg>`;
}

function iconRefresh(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
    <path d="M16 21h5v-5"></path>
  </svg>`;
}

function iconSendToLLM(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"></path>
    <path d="M22 2 11 13"></path>
  </svg>`;
}

function iconChevronDown(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m6 9 6 6 6-6"></path>
  </svg>`;
}

function iconChevronUp(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m18 15-6-6-6 6"></path>
  </svg>`;
}

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Unwrap nested API response structures
 * Handles various wrapper formats from different MCP clients
 * Special handling for Datadog log structures
 */
function unwrapData(data: any): any {
  if (!data) return null;

  // If data is a string, try to parse it as JSON
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      console.warn('Failed to parse string data as JSON');
      return null;
    }
  }

  // Handle nested content structure
  if (data.content && Array.isArray(data.content) && data.content.length > 0) {
    const contentItem = data.content[0];

    if (typeof contentItem?.text === 'string') {
      try {
        const parsedText = JSON.parse(contentItem.text);
        if (parsedText?.body?.data) {
          return parsedText.body;
        }
        return parsedText;
      } catch {
        // Not JSON, continue
      }
    }

    if (contentItem?.text?.body?.data) {
      return contentItem.text.body;
    }
  }

  // Handle body.data structure directly
  if (data.body?.data) {
    return data.body;
  }

  // Handle structuredContent.body.data
  if (data.structuredContent?.body?.data) {
    return data.structuredContent.body;
  }

  // If data itself has data array, return it
  if (data.data && Array.isArray(data.data)) {
    return data;
  }

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

  // Standard table format { columns: [], rows: [] }
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
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show error message in the app
 */
function showError(message: string) {
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Show empty state message
 */
function showEmpty(message: string = 'No data available.') {
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon icon-inline">${iconInbox()}</span>
        <h3 class="empty-state-title">No logs found</h3>
        <p class="empty-state-message">${escapeHtml(message)}</p>
        <button type="button" class="empty-state-refresh" onclick="refreshLogs()">Refresh logs</button>
      </div>
    `;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Datadog List Logs)
   ============================================ */

let allLogs: any[] = [];
let filteredLogs: any[] = [];
let filters = {
  search: '',
  service: '',
  host: '',
  status: '',
  levelname: ''
};

/** Selected log IDs for "Send to LLM" (stable id: log.id or fallback index in list) */
let selectedLogIds = new Set<string>();

/** Whether the filters section is expanded (collapsible) */
let filtersExpanded = true;

function getLogId(log: any, index: number): string {
  return log?.id != null ? String(log.id) : `idx-${index}`;
}

/**
 * Format timestamp - returns both relative and absolute
 */
function formatTimestamp(timestamp: string | number | null | undefined): { relative: string; absolute: string } {
  if (!timestamp) return { relative: 'Unknown', absolute: 'Unknown time' };
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    let relative = '';
    if (diffSec < 60) {
      relative = `${diffSec}s ago`;
    } else if (diffMin < 60) {
      relative = `${diffMin}m ago`;
    } else if (diffHour < 24) {
      relative = `${diffHour}h ago`;
    } else if (diffDay < 7) {
      relative = `${diffDay}d ago`;
    } else {
      relative = date.toLocaleDateString();
    }

    const absolute = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return { relative, absolute };
  } catch {
    return { relative: 'Unknown', absolute: String(timestamp) };
  }
}

/**
 * Get status badge class
 */
function getStatusBadgeClass(status: string | null | undefined, levelname: string | null | undefined): string {
  const level = (levelname || status || '').toUpperCase();
  if (level.includes('ERROR') || status === 'error') return 'error';
  if (level.includes('WARN') || level.includes('WARNING')) return 'warn';
  if (level.includes('INFO')) return 'info';
  if (level.includes('SUCCESS') || level.includes('DEBUG')) return 'success';
  return 'info';
}

/**
 * Get log level class for card border
 */
function getLogLevelClass(status: string | null | undefined, levelname: string | null | undefined): string {
  const level = (levelname || status || '').toUpperCase();
  if (level.includes('ERROR') || status === 'error') return 'level-error';
  if (level.includes('WARN') || level.includes('WARNING')) return 'level-warn';
  if (level.includes('INFO')) return 'level-info';
  if (level.includes('SUCCESS') || level.includes('DEBUG')) return 'level-success';
  return 'level-info';
}

/** Remove IPv4 and IPv6 addresses from text (for list display) */
function stripIpFromMessage(text: string): string {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '') // IPv4
    .replace(/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, '') // IPv6 full
    .replace(/\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b/g, '') // IPv6 partial
    .replace(/\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g, '') // IPv6 with ::
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Render log card (compact: time, message; metadata in detail view)
 */
function renderLogCard(log: any, index: number): string {
  const attrs = log.attributes || {};
  const nestedAttrs = attrs.attributes || {};
  const rawMessage = attrs.message || 'No message';
  const message = stripIpFromMessage(rawMessage) || rawMessage;
  const status = attrs.status || 'info';
  const levelname = nestedAttrs.levelname || '';
  const timestamp = attrs.timestamp || '';
  const levelClass = getLogLevelClass(status, levelname);
  const logId = getLogId(log, index);
  const isSelected = selectedLogIds.has(logId);
  const logIdAttr = escapeHtml(logId).replace(/"/g, '&quot;');
  const timeFormatted = timestamp ? formatTimestamp(timestamp) : null;

  return `
    <div class="log-card log-card-compact ${levelClass}" onclick="showLogDetail(${index})">
      <div class="log-card-select" onclick="event.stopPropagation()">
        <input type="checkbox" class="log-select-checkbox" data-log-id="${logIdAttr}" ${isSelected ? 'checked' : ''}
          aria-label="Select log for LLM"
          onchange="toggleLogSelection(this)">
      </div>
      <div class="log-level-indicator ${levelClass}"></div>
      <div class="log-card-content">
        <div class="log-message">${escapeHtml(message)}</div>
        ${timeFormatted ? `
        <div class="log-card-time" title="${escapeHtml(timeFormatted.absolute)}">${escapeHtml(timeFormatted.relative)}</div>
        ` : ''}
      </div>
      <div class="log-card-actions" onclick="event.stopPropagation()">
        <button class="log-action-btn" onclick="copyLogMessage(${index})" title="Copy log message">
          <span class="icon-inline">${iconCopy()}</span>
        </button>
        <button class="log-action-btn" onclick="copyLogJson(${index})" title="Copy as JSON">
          <span class="icon-inline">${iconCode()}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render log detail
 */
function renderLogDetail(log: any): string {
  const attrs = log.attributes || {};
  const nestedAttrs = attrs.attributes || {};
  const service = attrs.service || nestedAttrs.service || 'Unknown';
  const host = attrs.host || nestedAttrs.host || 'Unknown';
  const message = attrs.message || 'No message';
  const status = attrs.status || 'info';
  const levelname = nestedAttrs.levelname || '';
  const timestamp = attrs.timestamp || '';
  const tags = attrs.tags || [];
  const asctime = nestedAttrs.asctime || '';

  const statusClass = getStatusBadgeClass(status, levelname);

  let detailHtml = `
    <div class="detail-header">
      <div>
        <div class="detail-title">Log Details</div>
        <div style="margin-top: 8px;">
          <span class="status-badge ${statusClass}">${escapeHtml((levelname || status || 'info').toUpperCase())}</span>
        </div>
      </div>
      <button class="close-btn" onclick="closeDetailView()" aria-label="Close">
        <span class="icon-inline">${iconX()}</span>
      </button>
    </div>
  `;

  // Message section
  detailHtml += `
    <div class="detail-section">
      <div class="detail-section-title">Message</div>
      <div class="detail-message">${escapeHtml(message)}</div>
    </div>
  `;

  // Metadata section
  detailHtml += `
    <div class="detail-section">
      <div class="detail-section-title">Metadata</div>
      <div class="detail-metadata">
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Service</div>
          <div class="detail-metadata-value">${escapeHtml(service)}</div>
        </div>
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Host</div>
          <div class="detail-metadata-value">${escapeHtml(host)}</div>
        </div>
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Status</div>
          <div class="detail-metadata-value">${escapeHtml(status)}</div>
        </div>
        ${levelname ? `
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Level</div>
          <div class="detail-metadata-value">${escapeHtml(levelname)}</div>
        </div>
        ` : ''}
        ${timestamp ? (() => {
          const timeFormatted = formatTimestamp(timestamp);
          return `
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Timestamp</div>
          <div class="detail-metadata-value">
            <div>${escapeHtml(timeFormatted.relative)}</div>
            <div style="font-size: 12px; color: var(--dd-gray-500); margin-top: 2px;">${escapeHtml(timeFormatted.absolute)}</div>
          </div>
        </div>
        `;
        })() : ''}
        ${asctime ? `
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Time</div>
          <div class="detail-metadata-value">${escapeHtml(asctime)}</div>
        </div>
        ` : ''}
        <div class="detail-metadata-item">
          <div class="detail-metadata-label">Log ID</div>
          <div class="detail-metadata-value" style="font-family: monospace; font-size: 12px;">${escapeHtml(log.id || 'N/A')}</div>
        </div>
      </div>
    </div>
  `;

  // Tags section
  if (tags.length > 0) {
    detailHtml += `
      <div class="detail-section">
        <div class="detail-section-title">Tags</div>
        <div class="log-tags">
          ${tags.map((tag: any) => `<span class="log-tag">${escapeHtml(String(tag))}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Additional attributes section
  const additionalAttrs: any = {};
  Object.keys(attrs).forEach(key => {
    if (!['service', 'host', 'message', 'status', 'timestamp', 'tags'].includes(key)) {
      additionalAttrs[key] = attrs[key];
    }
  });
  Object.keys(nestedAttrs).forEach(key => {
    if (!['levelname', 'asctime'].includes(key)) {
      additionalAttrs[key] = nestedAttrs[key];
    }
  });

  if (Object.keys(additionalAttrs).length > 0) {
    detailHtml += `
      <div class="detail-section">
        <div class="detail-section-title">Additional Attributes</div>
        <div class="log-attributes">
          ${Object.entries(additionalAttrs).map(([key, value]) => `
            <div class="log-attribute">
              <div class="log-attribute-label">${escapeHtml(key)}</div>
              <div class="log-attribute-value">${escapeHtml(String(value))}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return detailHtml;
}

/**
 * Extract unique values for filters
 */
function extractUniqueValues(logs: any[], field: string): string[] {
  const values = new Set<string>();
  logs.forEach(log => {
    const attrs = log.attributes || {};
    const nestedAttrs = attrs.attributes || {};
    const value = attrs[field] || nestedAttrs[field];
    if (value) {
      values.add(String(value));
    }
  });
  return Array.from(values).sort();
}

/**
 * Filter logs
 */
function filterLogs() {
  const searchTerm = (filters.search || '').toLowerCase();
  const serviceFilter = (filters.service || '').toLowerCase();
  const hostFilter = (filters.host || '').toLowerCase();
  const statusFilter = (filters.status || '').toLowerCase();
  const levelnameFilter = (filters.levelname || '').toLowerCase();

  // Clear selection when filters change so indices don't refer to different logs
  selectedLogIds.clear();

  filteredLogs = allLogs.filter(log => {
    const attrs = log.attributes || {};
    const nestedAttrs = attrs.attributes || {};

    const service = String(attrs.service || nestedAttrs.service || '').toLowerCase();
    const host = String(attrs.host || nestedAttrs.host || '').toLowerCase();
    const message = String(attrs.message || '').toLowerCase();
    const status = String(attrs.status || '').toLowerCase();
    const levelname = String(nestedAttrs.levelname || '').toLowerCase();
    const tags = (attrs.tags || []).map((t: any) => String(t).toLowerCase()).join(' ');

    if (searchTerm && !message.includes(searchTerm) && !tags.includes(searchTerm)) {
      return false;
    }
    if (serviceFilter && !service.includes(serviceFilter)) {
      return false;
    }
    if (hostFilter && !host.includes(hostFilter)) {
      return false;
    }
    if (statusFilter && !status.includes(statusFilter)) {
      return false;
    }
    if (levelnameFilter && !levelname.includes(levelnameFilter)) {
      return false;
    }

    return true;
  });

  renderLogsList();
}

/**
 * Render logs list
 */
function renderLogsList() {
  const appEl = document.getElementById('app');
  const container = appEl?.querySelector('.container');

  if (!container) return;

  const logsHtml = filteredLogs.length > 0
    ? filteredLogs.map((log, index) => renderLogCard(log, index)).join('')
    : `
      <div class="empty-state">
        <span class="empty-state-icon icon-inline">${iconSearchLarge()}</span>
        <h3 class="empty-state-title">No logs found</h3>
        <p class="empty-state-message">Try adjusting your filters or search query</p>
      </div>
    `;

  const logsList = container.querySelector('.logs-list');
  if (logsList) {
    logsList.innerHTML = logsHtml;
  }

  // Update results count
  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = String(filteredLogs.length);
  }

  updateSendToLLMButton();
}

/**
 * Show log detail
 */
(window as any).showLogDetail = function(index: number) {
  const log = filteredLogs[index];
  if (!log) return;

  const detailView = document.getElementById('detail-view');
  const detailContent = document.getElementById('detail-content');

  if (detailContent) {
    detailContent.innerHTML = renderLogDetail(log);
  }
  if (detailView) {
    detailView.classList.add('active');
  }

  document.body.style.overflow = 'hidden';
};

/**
 * Close detail view
 */
(window as any).closeDetailView = function() {
  const detailView = document.getElementById('detail-view');
  if (detailView) {
    detailView.classList.remove('active');
  }
  document.body.style.overflow = '';
};

/**
 * Copy log message to clipboard
 */
(window as any).copyLogMessage = function(index: number) {
  const log = filteredLogs[index];
  if (!log) return;

  const attrs = log.attributes || {};
  const message = attrs.message || 'No message';

  navigator.clipboard.writeText(message).then(() => {
    showCopyNotification('Message copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};

/**
 * Copy log as JSON to clipboard
 */
(window as any).copyLogJson = function(index: number) {
  const log = filteredLogs[index];
  if (!log) return;

  const jsonStr = JSON.stringify(log, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showCopyNotification('Log JSON copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};

/**
 * Show copy notification
 */
function showCopyNotification(message: string) {
  let notification = document.getElementById('copy-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'copy-notification';
    notification.className = 'copy-notification';
    document.body.appendChild(notification);
  }

  notification.innerHTML = `
    <span class="icon-inline">${iconCheck()}</span>
    <span>${escapeHtml(message)}</span>
  `;

  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

/**
 * Toggle log selection for Send to LLM
 */
(window as any).toggleLogSelection = function(checkboxEl: HTMLInputElement) {
  const logId = checkboxEl?.getAttribute?.('data-log-id');
  if (logId == null) return;
  if (checkboxEl.checked) {
    selectedLogIds.add(logId);
  } else {
    selectedLogIds.delete(logId);
  }
  updateSendToLLMButton();
};

/**
 * Update Send to LLM button state (enabled/disabled and count)
 */
function updateSendToLLMButton() {
  const btn = document.getElementById('send-to-llm-btn');
  const countEl = document.getElementById('send-to-llm-count');
  const n = selectedLogIds.size;
  if (btn) {
    (btn as HTMLButtonElement).disabled = n === 0;
    btn.setAttribute('aria-label', n === 0 ? 'Select logs to send to LLM' : `Send ${n} selected log(s) to LLM`);
  }
  if (countEl) {
    countEl.textContent = String(n);
    countEl.style.display = n === 0 ? 'none' : 'inline';
  }
}

const SEND_TO_LLM_PREAMBLE = 'please explain to me the following log and detect issue and provide recommendation:';

/**
 * Format a single log for the LLM message
 */
function formatLogForLLM(log: any): string {
  const attrs = log.attributes || {};
  const nestedAttrs = attrs.attributes || {};
  const service = attrs.service || nestedAttrs.service || 'Unknown';
  const host = attrs.host || nestedAttrs.host || 'Unknown';
  const message = attrs.message || 'No message';
  const status = attrs.status || 'info';
  const levelname = nestedAttrs.levelname || '';
  const timestamp = attrs.timestamp || '';
  const tags = attrs.tags || [];
  const timeStr = timestamp ? formatTimestamp(timestamp).absolute : '';
  const lines = [
    `[${levelname || status}] ${timeStr}`,
    `Service: ${service} | Host: ${host}`,
    message,
  ];
  if (tags.length > 0) {
    lines.push(`Tags: ${tags.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Send selected logs to the host chat (LLM) via ui/message
 */
(window as any).sendToLLM = function() {
  const selected = filteredLogs.filter((_log, index) => selectedLogIds.has(getLogId(_log, index)));
  if (selected.length === 0) {
    showCopyNotification('No logs selected');
    return;
  }
  const formatted = selected.map((log) => formatLogForLLM(log)).join('\n\n---\n\n');
  const text = `${SEND_TO_LLM_PREAMBLE}\n\n${formatted}`;

  const btn = document.getElementById('send-to-llm-btn');
  if (btn) {
    (btn as HTMLButtonElement).disabled = true;
    btn.classList.add('send-loading');
  }
  sendRequest('ui/message', {
    role: 'user',
    content: [{ type: 'text', text }],
  })
    .then((result: any) => {
      if (result?.isError) {
        showCopyNotification('Host could not add message to chat.');
        return;
      }
      selectedLogIds.clear();
      renderLogsList();
      updateSendToLLMButton();
      showCopyNotification('Sent to LLM for investigation');
    })
    .catch((err: Error) => {
      console.error('Send to LLM failed:', err);
      showCopyNotification('Failed to send. Check console.');
    })
    .finally(() => {
      if (btn) {
        (btn as HTMLButtonElement).disabled = selectedLogIds.size === 0;
        btn.classList.remove('send-loading');
      }
    });
};

/**
 * Update filter
 */
(window as any).updateFilter = function(field: string, value: string) {
  filters[field as keyof typeof filters] = value;
  filterLogs();
};

/**
 * Toggle filters section expand/collapse
 */
(window as any).toggleFilters = function() {
  filtersExpanded = !filtersExpanded;
  const section = document.querySelector('.filters-section');
  const chevronEl = document.getElementById('filters-chevron');
  if (section) {
    section.classList.toggle('collapsed', !filtersExpanded);
    section.setAttribute('aria-expanded', String(filtersExpanded));
  }
  if (chevronEl) {
    chevronEl.innerHTML = filtersExpanded ? iconChevronUp() : iconChevronDown();
    chevronEl.setAttribute('aria-label', filtersExpanded ? 'Collapse filters' : 'Expand filters');
  }
};

/** Parameters for run_action_ui server tool (refresh logs from last 5 minutes) */
const REFRESH_LOGS_TOOL_PARAMS = {
  app_name: 'datadog',
  user_input: 'Get logs from the last 5 minutes',
  context: {
    operationId: 'ListLogs',
    filter: { from: 'now-5m', to: 'now' },
    page: { limit: 25 }
  },
  reasoning: "User requested last 5 minutes of logs. I'm using the ListLogs operation with time range from 'now-5m' to 'now' to capture logs from the last 5 minutes."
};

/**
 * Extract payload for renderData from a tools/call result (same shape as ui/notifications/tool-result params).
 */
function dataFromToolResult(result: any): any {
  if (!result) return undefined;
  if (result.structuredContent !== undefined) return result.structuredContent;
  return result;
}

/**
 * Call server tool run_action_ui to refresh logs (last 5 minutes).
 */
(window as any).refreshLogs = function() {
  const btn = document.getElementById('refresh-logs-btn');
  if (btn) {
    btn.classList.add('refresh-loading');
    btn.setAttribute('aria-busy', 'true');
    (btn as HTMLButtonElement).disabled = true;
  }
  sendRequest('tools/call', {
    name: 'run_action_ui',
    arguments: REFRESH_LOGS_TOOL_PARAMS
  })
    .then((result: any) => {
      if (result?.isError) {
        showCopyNotification('Refresh returned an error.');
        return;
      }
      const data = dataFromToolResult(result);
      if (data !== undefined) {
        renderData(data);
      }
    })
    .catch(err => {
      console.error('Refresh logs failed:', err);
      showCopyNotification('Refresh failed. Check console.');
    })
    .finally(() => {
      if (btn) {
        btn.classList.remove('refresh-loading');
        btn.setAttribute('aria-busy', 'false');
        (btn as HTMLButtonElement).disabled = false;
      }
    });
};

/**
 * Main render function
 */
function renderData(data: any) {
  const appEl = document.getElementById('app');

  if (!appEl) {
    console.error('App element not found!');
    return;
  }

  appEl.innerHTML = '';

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);

    // Extract logs from the structure
    let logs: any[] = [];

    if (unwrapped?.data && Array.isArray(unwrapped.data)) {
      logs = unwrapped.data;
    } else if (Array.isArray(unwrapped)) {
      logs = unwrapped;
    } else {
      console.error('Unable to extract logs. Data structure:', unwrapped);
      showError('Unable to extract logs from data structure. Check console for details.');
      return;
    }

    if (!Array.isArray(logs) || logs.length === 0) {
      showEmpty('No logs found');
      return;
    }

    allLogs = logs;
    filteredLogs = logs;

    // Extract unique values for filter dropdowns
    const services = extractUniqueValues(logs, 'service');
    const hosts = extractUniqueValues(logs, 'host');
    const statuses = extractUniqueValues(logs, 'status');
    const levelnames = extractUniqueValues(logs, 'levelname');

    const htmlContent = `
      <div class="container container-with-scroll">
        <div class="sticky-top">
        <div class="header header-sticky">
          <div class="header-brand">
            <span class="datadog-logo icon-inline">${iconDatadogSmall()}</span>
            <h1>Datadog Logs</h1>
            <button type="button" class="refresh-btn" id="refresh-logs-btn" onclick="refreshLogs()" title="Refresh logs (last 5 minutes)" aria-label="Refresh logs">
              <span class="icon-inline">${iconRefresh()}</span>
            </button>
          </div>
        </div>

        <div class="search-container">
          <span class="search-icon icon-inline">${iconSearch()}</span>
          <input
            type="text"
            class="search-input"
            id="search-input"
            placeholder="Search logs by message or tags..."
            oninput="updateFilter('search', this.value)"
          >
        </div>

        <div class="filters-section ${filtersExpanded ? '' : 'collapsed'}" aria-expanded="${filtersExpanded}">
          <button type="button" class="filters-header filters-toggle" onclick="toggleFilters()" aria-expanded="${filtersExpanded}" aria-controls="filters-body" id="filters-toggle-btn">
            <div class="filters-title">Filters</div>
            <span class="filters-chevron icon-inline" id="filters-chevron" aria-label="${filtersExpanded ? 'Collapse filters' : 'Expand filters'}">${filtersExpanded ? iconChevronUp() : iconChevronDown()}</span>
          </button>
          <div class="filters-body" id="filters-body">
          <div class="filters-grid">
            <div class="filter-group">
              <label class="filter-label">Service</label>
              <select class="filter-select" id="filter-service" onchange="updateFilter('service', this.value)">
                <option value="">All Services</option>
                ${services.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Host</label>
              <select class="filter-select" id="filter-host" onchange="updateFilter('host', this.value)">
                <option value="">All Hosts</option>
                ${hosts.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Status</label>
              <select class="filter-select" id="filter-status" onchange="updateFilter('status', this.value)">
                <option value="">All Statuses</option>
                ${statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Level</label>
              <select class="filter-select" id="filter-levelname" onchange="updateFilter('levelname', this.value)">
                <option value="">All Levels</option>
                ${levelnames.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('')}
              </select>
            </div>
          </div>
          </div>
        </div>

        <div class="results-header">
          <div class="results-count">
            Showing <span id="results-count">${filteredLogs.length}</span> of ${logs.length} logs
          </div>
          <div class="results-actions">
            <button type="button" class="send-to-llm-btn" id="send-to-llm-btn" onclick="sendToLLM()"
              disabled title="Select logs with the checkboxes, then click to send to LLM for investigation"
              aria-label="Send selected logs to LLM">
              <span class="icon-inline">${iconSendToLLM()}</span>
              <span>Send to LLM</span>
              <span class="send-to-llm-count" id="send-to-llm-count" style="display: none;">0</span>
            </button>
          </div>
        </div>
        </div>

        <div class="logs-list-wrapper">
        <div class="logs-list" id="logs-list">
          ${logs.map((log, index) => renderLogCard(log, index)).join('')}
        </div>
        </div>
      </div>
    `;

    appEl.innerHTML = htmlContent;

  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
  }

  updateSendToLLMButton();

  // Log data structure to console for debugging
  console.log("Data rendered:", {
    original: data,
    logCount: allLogs.length,
  });
}

/* ============================================
   MCP COMMUNICATION
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
      let data = msg.params.structuredContent || msg.params;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          console.warn('Failed to parse data as JSON');
        }
      }

      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
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
      } else if (msg.params.displayMode) {
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

      // Clean up resources
      cleanupResize();

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

    // Fallback: try to render unknown methods that have data
    if (msg.method && msg.params) {
      let fallbackData = msg.params.structuredContent || msg.params;

      if (typeof fallbackData === 'string') {
        try {
          fallbackData = JSON.parse(fallbackData);
        } catch {
          console.warn('Failed to parse fallback data as JSON');
        }
      }

      if (fallbackData && fallbackData !== msg) {
        console.warn('Unknown method:', msg.method, '- attempting to render data');
        renderData(fallbackData);
      }
    }

    return;
  }
});

// Close detail view on escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    (window as any).closeDetailView();
  }
});

// Close detail view on backdrop click
const detailViewEl = document.getElementById('detail-view');
if (detailViewEl) {
  detailViewEl.addEventListener('click', function(this: HTMLElement, e) {
    if (e.target === this) {
      (window as any).closeDetailView();
    }
  });
}

/* ============================================
   APP INITIALIZATION
   ============================================

   No SDK connection needed - the proxy handles ui/initialize.
   We only set up auto-resize and lifecycle cleanup.
   ============================================ */

// Setup automatic size change notifications
// The SDK will monitor DOM changes and notify the host automatically
const cleanupResize = app.setupSizeChangedNotifications();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (SDK utilities mode)");
