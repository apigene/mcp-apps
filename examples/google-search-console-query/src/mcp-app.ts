/* ============================================
   BASE TEMPLATE FOR MCP APPS
   ============================================
   
   This file contains all common logic shared across MCP apps.
   Customize the sections marked with "TEMPLATE-SPECIFIC" below.
   
   Common Features:
   - MCP Protocol message handling (JSON-RPC 2.0)
   - Dark mode support
   - Display mode handling (inline/fullscreen)
   - Size change notifications
   - Data extraction utilities
   - Error handling
   
   See README.md for customization guidelines.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================
   TEMPLATE-SPECIFIC: Update these values for your app
   ============================================ */

const APP_NAME = "Google Search Console";

const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

/** App and operation for run_action_ui (trigger new LLM/tool call with filters) */
const GSC_APP_NAME = "google_search_console";
const GSC_OPERATION_ID = "webmasters.searchanalytics.query";

/** Last tool input from host (may contain app_name, context with siteUrl, etc.) */
let lastToolInput: Record<string, unknown> | null = null;

/** Request context that produced the current view (for Send to LLM). Set from tool-input or when running New query. */
let lastRequestContext: Record<string, unknown> | null = null;

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================ */

import Chart from "chart.js/auto";
import "./global.css";
import "./mcp-app.css";

/* ============================================
   GOOGLE SEARCH CONSOLE QUERY MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect() for full MCP integration.
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


const APP_VERSION = "1.0.0";

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

/** Google Search Console row from API response */
interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Normalized table data for rendering */
interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

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

  // If data itself is an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }

  // Handle API response format with body wrapper
  if (data.body) {
    // body is array (e.g. GitHub API)
    if (Array.isArray(data.body)) {
      return data.body;
    }
    // body is object with rows (e.g. Google Search Console)
    if (data.body.rows && Array.isArray(data.body.rows)) {
      return data.body;
    }
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

/**
 * Show a temporary toast notification (e.g. "Sent to LLM for insights").
 */
function showSendNotification(message: string) {
  let notification = document.getElementById('gsc-send-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'gsc-send-notification';
    notification.className = 'gsc-send-notification';
    document.body.appendChild(notification);
  }
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 2500);
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

/**
 * Show chart error message
 */
function showChartError(container: Element | null | undefined, message: string) {
  if (!container) {
    app.sendLog({ level: "warning", data: `[mcp-app] Cannot show chart error - container not found`, logger: APP_NAME });
    return;
  }
  
  const wrapper = container.querySelector('.chart-wrapper');
  if (wrapper) {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#9aa0a6' : '#5f6368';
    const bgColor = isDark ? '#2a2d35' : '#f8f9fa';
    
    wrapper.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 320px; padding: 40px; background: ${bgColor}; border-radius: 8px; color: ${textColor}; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: ${textColor};">${escapeHtml(message)}</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7; color: ${textColor};">This may be due to Content Security Policy restrictions in Claude's environment</div>
      </div>
    `;
  } else {
    app.sendLog({ level: "warning", data: `[mcp-app] Chart wrapper not found in container`, logger: APP_NAME });
  }
}

/**
 * Color palettes for charts - Google Material Design colors
 */
const CHART_COLORS = [
  "#4285f4", "#34a853", "#fbbc04", "#ea4335",
  "#8ab4f8", "#81c995", "#fdd663", "#f28b82",
  "#669df6", "#66bb6a", "#ffc107", "#ef5350"
];

/* ============================================
   INLINE SVG ICONS (Google Material Icons style)
   ============================================ */

function iconGoogleSearchConsole(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>`;
}

function iconClick(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-4 4v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2M9 9h6m-6 6h6"/>
  </svg>`;
}

function iconImpression(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s5-8 11-8 11 8 11 8-5 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;
}

function iconPosition(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>`;
}

function iconCTR(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 7l5 5-5 5"/>
    <path d="M6 7l5 5-5 5"/>
  </svg>`;
}

function iconDownload(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

function iconTable(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
  </svg>`;
}

function iconChart(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>`;
}

function iconTrendUp(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>`;
}

function iconTrendDown(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>`;
}

function iconFilter(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`;
}

function iconSendToLLM(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"></path>
    <path d="M22 2 11 13"></path>
  </svg>`;
}

/**
 * Get startDate and endDate in YYYY-MM-DD for preset (7d, 30d, 90d).
 * endDate is yesterday so Search Console API accepts it (no data for "today" yet).
 */
function getDateRangeForPreset(preset: string): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday – API often returns 400 if endDate is today
  const start = new Date();
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : 7;
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

/**
 * Format number with commas
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return num.toLocaleString();
}

/**
 * Format percentage
 */
function formatPercentage(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return (num * 100).toFixed(2) + '%';
}

/**
 * Calculate trend (compare with previous period)
 */
function calculateTrend(current: number, previous: number): { value: number; percentage: number; direction: 'up' | 'down' | 'neutral' } {
  if (!previous || previous === 0) {
    return { value: 0, percentage: 0, direction: 'neutral' };
  }
  const change = current - previous;
  const percentage = (change / previous) * 100;
  return {
    value: change,
    percentage: Math.abs(percentage),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
}

/**
 * Animate number counter
 */
function animateCounter(element: HTMLElement, start: number, end: number, duration: number = 1000) {
  const startTime = performance.now();
  const isPercentage = element.textContent?.includes('%');
  
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (end - start) * easeOutQuart;
    
    if (isPercentage) {
      element.textContent = current.toFixed(2) + '%';
    } else {
      element.textContent = formatNumber(Math.floor(current));
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = isPercentage ? formatPercentage(end) : formatNumber(end);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Create sparkline chart
 */
function createSparkline(container: HTMLElement, data: number[], color: string) {
  if (!data || data.length === 0) return;
  
  // Clear container first
  container.innerHTML = '';
  
  const width = container.offsetWidth || 100;
  const height = 32;
  const padding = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.display = 'block';
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  path.setAttribute('points', points);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  
  svg.appendChild(path);
  container.appendChild(svg);
}

/**
 * Export data as CSV
 */
function exportToCSV(tableData: any, filename: string = 'search-console-data.csv') {
  if (!tableData || !tableData.columns || !tableData.rows) return;
  
  const headers = tableData.columns.join(',');
  const rows = tableData.rows.map((row: any[]) => 
    row.map(cell => {
      const str = String(cell || '');
      return str.includes(',') || str.includes('"') || str.includes('\n') 
        ? `"${str.replace(/"/g, '""')}"` 
        : str;
    }).join(',')
  ).join('\n');
  
  const csv = headers + '\n' + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Export data as JSON
 */
function exportToJSON(data: any, filename: string = 'search-console-data.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Normalize data to table format for processing
 */
function normalizeTableData(data: any) {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  // Format 1: Standard table format { columns: [], rows: [] }
  if (Array.isArray(unwrapped.columns) && Array.isArray(unwrapped.rows)) {
    return {
      columns: unwrapped.columns,
      rows: unwrapped.rows
    };
  }

  // Format 2: Array of objects
  if (Array.isArray(unwrapped.rows) && unwrapped.rows.length > 0) {
    const firstRow = unwrapped.rows[0];
    if (typeof firstRow === 'object' && !Array.isArray(firstRow)) {
      // Extract columns from object keys
      const columns: string[] = [];
      const rows: any[] = [];
      
      // Handle keys array (like Google Search Console)
      // keys can contain multiple dimensions: e.g. ["date", "page"] or ["date", "query", "country"]
      if (firstRow.keys && Array.isArray(firstRow.keys)) {
        const keyCount = firstRow.keys.length;
        // Try to get dimension names from lastRequestContext, otherwise use generic names
        const requestedDimensions = (lastRequestContext?.dimensions && Array.isArray(lastRequestContext.dimensions))
          ? (lastRequestContext.dimensions as string[]).filter((d): d is string => typeof d === 'string')
          : [];
        for (let i = 0; i < keyCount; i++) {
          if (requestedDimensions[i]) {
            // Capitalize first letter of dimension name
            columns.push(requestedDimensions[i].charAt(0).toUpperCase() + requestedDimensions[i].slice(1));
          } else {
            columns.push(`Dimension ${i + 1}`);
          }
        }
        Object.keys(firstRow).forEach(key => {
          if (key !== 'keys') {
            columns.push(key.charAt(0).toUpperCase() + key.slice(1));
          }
        });

        unwrapped.rows.forEach((row: GSCRow) => {
          const rowArray: (string | number)[] = [];
          // Add all keys to the row
          if (row.keys && Array.isArray(row.keys)) {
            row.keys.forEach((k: string) => rowArray.push(k ?? ''));
          }
          Object.keys(row).forEach(key => {
            if (key !== 'keys') {
              rowArray.push(row[key as keyof Omit<GSCRow, 'keys'>]);
            }
          });
          rows.push(rowArray);
        });
      } else {
        // Regular object keys
        Object.keys(firstRow).forEach(key => {
          columns.push(key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '));
        });
        
        unwrapped.rows.forEach((row: any) => {
          rows.push(Object.keys(firstRow).map(key => row[key]));
        });
      }
      
      return { columns, rows };
    }
  }

  return null;
}

/**
 * Calculate summary statistics from data
 */
function calculateSummary(tableData: any) {
  if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
    return null;
  }

  const columns = tableData.columns;
  const rows = tableData.rows;
  const summary: any = {};

  // Find numeric columns (skip first column which is usually date/label)
  for (let i = 1; i < columns.length; i++) {
    const colName = columns[i];
    const values = rows.map((row: any) => {
      const val = row[i];
      return typeof val === 'number' ? val : (parseFloat(val) || 0);
    }).filter((v: number) => !isNaN(v));

    if (values.length > 0) {
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      summary[colName] = {
        total: sum,
        average: avg,
        max: max,
        min: min,
        count: values.length
      };
    }
  }

  return summary;
}

/**
 * Normalize data for line chart
 */
function normalizeLineChartData(tableData: any) {
  if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
    return null;
  }

  const columns = tableData.columns;
  const rows = tableData.rows;
  
  // First column is labels (dates/x-axis), rest are series
  const labels = rows.map((row: any) => String(row[0] || ''));
  const series: any[] = [];
  
  for (let i = 1; i < columns.length; i++) {
    series.push({
      name: String(columns[i] || `Series ${i}`),
      data: rows.map((row: any) => {
        const val = row[i];
        return typeof val === 'number' ? val : (parseFloat(val) || 0);
      })
    });
  }
  
  return { labels, series };
}

/**
 * Normalize data for pie chart (uses first numeric column)
 */
function normalizePieChartData(tableData: any) {
  if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
    return null;
  }

  const columns = tableData.columns;
  const rows = tableData.rows;
  
  // Use first column as labels, first numeric column as values
  const labels = rows.map((row: any) => String(row[0] || ''));
  
  // Find first numeric column (skip label column)
  let valueColumnIndex = 1;
  for (let i = 1; i < columns.length; i++) {
    const sampleValue = rows[0]?.[i];
    if (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue))) {
      valueColumnIndex = i;
      break;
    }
  }
  
  const values = rows.map((row: any) => {
    const val = row[valueColumnIndex];
    return typeof val === 'number' ? val : (parseFloat(val) || 0);
  });
  
  return { labels, values };
}

// Store chart instances for cleanup
let lineChartInstance: InstanceType<typeof Chart> | null = null;
let pieChartInstance: InstanceType<typeof Chart> | null = null;

/**
 * Get Chart.js color scheme based on dark mode
 */
function getChartColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    gridColor: isDark ? 'rgba(95, 99, 104, 0.2)' : 'rgba(218, 220, 224, 0.5)',
    textColor: isDark ? '#9aa0a6' : '#5f6368',
    backgroundColor: isDark ? '#202124' : '#ffffff',
    tooltipBg: isDark ? 'rgba(32, 33, 36, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    tooltipBorder: isDark ? 'rgba(66, 133, 244, 0.3)' : 'rgba(66, 133, 244, 0.2)'
  };
}

/**
 * Create gradient for line chart fill
 */
function createGradient(ctx: CanvasRenderingContext2D, color: string, height: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const isDark = document.body.classList.contains('dark');
  
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${isDark ? 0.25 : 0.15})`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${isDark ? 0.15 : 0.08})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  
  return gradient;
}

/**
 * Render line chart with Chart.js
 */
function renderLineChart(canvas: HTMLCanvasElement, chartData: any, visibleSeries: Set<number> | null = null) {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    app.sendLog({ level: "error", data: `[mcp-app] Chart.js is not loaded.`, logger: APP_NAME });
    showChartError(canvas.parentElement?.parentElement, 'Chart.js library not available');
    return;
  }

  // Destroy existing chart if it exists
  if (lineChartInstance) {
    lineChartInstance.destroy();
    lineChartInstance = null;
  }

  const { labels, series } = chartData;
  if (!labels || labels.length === 0 || !series || series.length === 0) {
    app.sendLog({ level: "warning", data: `[mcp-app] Invalid chart data: ${JSON.stringify({ labels, series })}`, logger: APP_NAME });
    return;
  }
  
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) {
    app.sendLog({ level: "warning", data: `[mcp-app] Invalid canvas element or 2d context not available`, logger: APP_NAME });
    return;
  }

  // Filter visible series
  const activeSeries = visibleSeries 
    ? series.filter((_: any, i: number) => visibleSeries.has(i))
    : series;

  const colors = getChartColors();

  const datasets = activeSeries.map((s: any, index: number) => {
    const originalIndex = series.indexOf(s);
    const baseColor = CHART_COLORS[originalIndex % CHART_COLORS.length];
    const gradient = createGradient(ctx, baseColor, canvas.height);
    
    return {
      label: s.name,
      data: s.data,
      borderColor: baseColor,
      backgroundColor: gradient,
      borderWidth: 3,
      pointRadius: 0, // Hide points by default
      pointHoverRadius: 8,
      pointHitRadius: 10,
      pointBackgroundColor: colors.backgroundColor,
      pointBorderColor: baseColor,
      pointBorderWidth: 3,
      pointHoverBorderWidth: 4,
      tension: 0.4, // Smoother curves
      fill: true,
      spanGaps: true,
      stepped: false
    };
  });

  lineChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: 'easeInOutCubic' as const,
        x: {
          duration: 1000,
          easing: 'easeInOutCubic' as const
        },
        y: {
          duration: 1200,
          easing: 'easeInOutCubic' as const
        }
      },
      plugins: {
        legend: {
          display: false // We handle legend separately
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textColor,
          bodyColor: colors.textColor,
          borderColor: colors.tooltipBorder,
          borderWidth: 2,
          padding: 16,
          displayColors: true,
          cornerRadius: 12,
          boxPadding: 8,
          usePointStyle: true,
          titleFont: {
            size: 14,
            weight: '600' as const
          },
          bodyFont: {
            size: 13,
            weight: '500' as const
          },
          callbacks: {
            title: function(context: any) {
              return context[0].label || '';
            },
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatNumber(value)}`;
            },
            labelColor: function(context: any) {
              return {
                borderColor: context.dataset.borderColor,
                backgroundColor: context.dataset.borderColor,
                borderWidth: 2,
                borderRadius: 4
              };
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: colors.gridColor,
            lineWidth: 1,
            drawBorder: false,
            drawOnChartArea: true,
            drawTicks: true,
            tickLength: 6
          },
          ticks: {
            color: colors.textColor,
            font: {
              size: 11,
              weight: '500' as const,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            maxRotation: 45,
            minRotation: 0,
            padding: 10
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            color: colors.gridColor,
            lineWidth: 1,
            drawBorder: false,
            drawOnChartArea: true,
            drawTicks: false,
            tickLength: 6
          },
          ticks: {
            color: colors.textColor,
            font: {
              size: 11,
              weight: '500' as const,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            padding: 12,
            callback: function(value: any) {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value.toFixed(value < 1 ? 2 : 0);
            }
          },
          border: {
            display: false
          },
          beginAtZero: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      elements: {
        point: {
          hoverRadius: 8,
          hoverBorderWidth: 4
        },
        line: {
          borderCapStyle: 'round' as const,
          borderJoinStyle: 'round' as const
        }
      }
    }
  });
}

/**
 * Render pie chart with Chart.js
 */
function renderPieChart(canvas: HTMLCanvasElement, values: number[], colors: string[], labels: string[] | null = null) {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    app.sendLog({ level: "error", data: `[mcp-app] Chart.js is not loaded.`, logger: APP_NAME });
    showChartError(canvas.parentElement?.parentElement, 'Chart.js library not available');
    return;
  }

  // Destroy existing chart if it exists
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }

  if (!values || values.length === 0) {
    app.sendLog({ level: "warning", data: `[mcp-app] Invalid pie chart values: ${JSON.stringify(values)}`, logger: APP_NAME });
    return;
  }
  
  if (!canvas || !canvas.getContext('2d')) {
    app.sendLog({ level: "warning", data: `[mcp-app] Invalid canvas element or 2d context not available`, logger: APP_NAME });
    return;
  }

  const chartColors = getChartColors();
  const isDark = document.body.classList.contains('dark');
  const pieColors = colors.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  
  // Create enhanced colors with gradients
  const enhancedColors = pieColors.map((color, i) => {
    // Add slight variation for depth
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return {
      base: color,
      light: `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 0.8)`,
      dark: `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.9)`
    };
  });

  const data = {
    labels: labels || values.map((_, i) => `Item ${i + 1}`),
    datasets: [{
      data: values,
      backgroundColor: enhancedColors.map(c => c.base),
      borderColor: isDark ? 'rgba(26, 29, 36, 0.8)' : '#ffffff',
      borderWidth: 3,
      hoverOffset: 12,
      hoverBorderWidth: 4
    }]
  };

  pieChartInstance = new Chart(canvas, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeInOutCubic' as const
      },
      plugins: {
        legend: {
          display: false // We handle legend separately
        },
        tooltip: {
          enabled: true,
          backgroundColor: chartColors.tooltipBg,
          titleColor: chartColors.textColor,
          bodyColor: chartColors.textColor,
          borderColor: chartColors.tooltipBorder,
          borderWidth: 2,
          padding: 16,
          cornerRadius: 12,
          boxPadding: 8,
          usePointStyle: true,
          titleFont: {
            size: 14,
            weight: '600' as const
          },
          bodyFont: {
            size: 13,
            weight: '500' as const
          },
          callbacks: {
            title: function(context: any) {
              return context[0].label || '';
            },
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${label}: ${formatNumber(value)} (${percentage}%)`;
            },
            labelColor: function(context: any) {
              return {
                borderColor: context.dataset.backgroundColor[context.dataIndex],
                backgroundColor: context.dataset.backgroundColor[context.dataIndex],
                borderWidth: 2,
                borderRadius: 4
              };
            }
          }
        }
      },
      elements: {
        arc: {
          borderAlign: 'center' as const,
          borderJoinStyle: 'round' as const
        }
      }
    }
  });
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
   4. Call notifySizeChanged() after rendering completes
   5. Handle errors gracefully with try/catch
   ============================================ */

/**
 * Extract API error message from run_action / tool result payloads (e.g. 400 INVALID_ARGUMENT).
 * Returns a user-facing string or null if not an error response.
 */
function getApiErrorMessage(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  const err =
    data.message?.response_content?.error ??
    data.message?.template_data?.error ??
    data.template_data?.error ??
    data.error;
  if (!err || typeof err !== 'object') return null;
  const msg = typeof err.message === 'string' ? err.message : null;
  const first = Array.isArray(err.errors) && err.errors[0] && typeof err.errors[0].message === 'string' ? err.errors[0].message : null;
  const status = typeof err.status === 'string' ? err.status : null;
  const code = err.code != null ? String(err.code) : null;
  if (msg) return msg;
  if (first) return first;
  if (status || code) return `API error${code ? ` ${code}` : ''}${status ? ` (${status})` : ''}.`;
  return 'An API error occurred.';
}

/**
 * Main render function - renders the dashboard
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  const apiError = getApiErrorMessage(data);
  if (apiError) {
    showError(apiError);
    return;
  }

  // Unwrap API response wrappers (e.g. { status_code, headers, body: { rows } }) so table/chart logic sees inner payload
  const payload = unwrapData(data) ?? data;

  try {
    // Normalize data to table format
    const tableData = normalizeTableData(payload);
    
    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
      app.sendLog({ level: "warning", data: `[mcp-app] Invalid or empty data: ${JSON.stringify(data)}`, logger: APP_NAME });
      showEmpty('No valid data available');
      return;
    }

    // Calculate summary
    const summary = calculateSummary(tableData);
    
    // Normalize chart data
    const lineChartData = normalizeLineChartData(tableData);
    const pieChartData = normalizePieChartData(tableData);

    // Create dashboard container
    const container = document.createElement('div');
    container.className = 'dashboard-container';
    
    // Google Search Console Header
    const gscHeader = document.createElement('div');
    gscHeader.className = 'gsc-header';
    gscHeader.innerHTML = `
      <div class="gsc-logo">
        <div class="gsc-logo-icon">
          <span class="icon-inline">${iconGoogleSearchConsole()}</span>
        </div>
        <span class="gsc-title">
          <span class="gsc-google">Google</span>
          <span class="gsc-search-console">Search Console</span>
        </span>
      </div>
    `;
    container.appendChild(gscHeader);
    
    // Dashboard Header
    const header = document.createElement('div');
    header.className = 'dashboard-header';
    header.innerHTML = `
      <h1>Performance</h1>
      <div class="meta">
        <span>${tableData.rows.length} data points</span>
        <span>${tableData.columns.length - 1} metrics</span>
        <span>Last updated: ${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    container.appendChild(header);
    
    // Default date range for query panel; prefer values from last tool input (ui/notifications/tool-input)
    const defaultRange = getDateRangeForPreset('30d');
    const ctx = lastToolInput?.context && typeof lastToolInput.context === 'object' ? (lastToolInput.context as Record<string, unknown>) : null;
    const defaultSiteUrl = (ctx?.siteUrl != null && typeof ctx.siteUrl === 'string') ? ctx.siteUrl : '';
    const defaultStartDate = (ctx?.startDate != null && typeof ctx.startDate === 'string') ? ctx.startDate : defaultRange.startDate;
    const defaultEndDate = (ctx?.endDate != null && typeof ctx.endDate === 'string') ? ctx.endDate : defaultRange.endDate;
    const defaultRowLimit = (ctx?.rowLimit != null && typeof ctx.rowLimit === 'number') ? ctx.rowLimit : (typeof ctx?.rowLimit === 'string' ? parseInt(String(ctx.rowLimit), 10) : 100);
    const defaultDimensions: string[] = Array.isArray(ctx?.dimensions) ? ctx.dimensions.filter((d): d is string => typeof d === 'string') : ['date'];
    const dimChecked = (value: string) => defaultDimensions.includes(value) ? ' checked' : '';

    // Toolbar with controls
    const toolbar = document.createElement('div');
    toolbar.className = 'dashboard-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-right">
        <button type="button" class="action-btn send-to-llm-btn" id="send-to-llm-btn" title="Send request and response to LLM for insights" onclick="sendToLLM()">
          <span class="icon-inline">${iconSendToLLM()}</span>
          Send to LLM
        </button>
        <button type="button" class="action-btn new-query-btn" title="Query with new filters (triggers new LLM call)">
          <span class="icon-inline">${iconFilter()}</span>
          New query
        </button>
        <div class="view-toggle">
          <button class="view-toggle-btn active" data-view="chart">
            <span class="icon-inline">${iconChart()}</span>
            Charts
          </button>
          <button class="view-toggle-btn" data-view="table">
            <span class="icon-inline">${iconTable()}</span>
            Table
          </button>
        </div>
        <button class="action-btn" onclick="exportData('csv')">
          <span class="icon-inline">${iconDownload()}</span>
          Export CSV
        </button>
        <button class="action-btn" onclick="exportData('json')">
          <span class="icon-inline">${iconDownload()}</span>
          Export JSON
        </button>
      </div>
    `;
    container.appendChild(toolbar);

    // Query filters panel (for triggering run_action_ui with new parameters)
    const queryPanel = document.createElement('div');
    queryPanel.className = 'query-filters-panel';
    queryPanel.id = 'query-filters-panel';
    queryPanel.innerHTML = `
      <div class="query-panel-header">
        <h3 class="query-panel-title">Query with new filters</h3>
        <p class="query-panel-desc">Change settings and run a new Search Analytics query. This will trigger a new LLM/tool call.</p>
      </div>
      <div class="query-panel-form">
        <div class="query-form-row">
          <label class="query-form-label" for="gsc-site-url">Site URL <span class="required">*</span></label>
          <input type="text" id="gsc-site-url" class="query-form-input" placeholder="https://www.example.com/" value="${escapeHtml(defaultSiteUrl)}">
        </div>
        <div class="query-form-row query-form-row-inline">
          <div>
            <label class="query-form-label" for="gsc-start-date">Start date</label>
            <input type="date" id="gsc-start-date" class="query-form-input" value="${escapeHtml(defaultStartDate)}">
          </div>
          <div>
            <label class="query-form-label" for="gsc-end-date">End date</label>
            <input type="date" id="gsc-end-date" class="query-form-input" value="${escapeHtml(defaultEndDate)}">
          </div>
        </div>
        <div class="query-form-row">
          <label class="query-form-label">Dimensions</label>
          <div class="query-form-dimensions" id="gsc-dimensions">
            <label class="query-form-check"><input type="checkbox" name="dim" value="date"${dimChecked('date')}> date</label>
            <label class="query-form-check"><input type="checkbox" name="dim" value="page"${dimChecked('page')}> page</label>
            <label class="query-form-check"><input type="checkbox" name="dim" value="query"${dimChecked('query')}> query</label>
            <label class="query-form-check"><input type="checkbox" name="dim" value="country"${dimChecked('country')}> country</label>
            <label class="query-form-check"><input type="checkbox" name="dim" value="device"${dimChecked('device')}> device</label>
            <label class="query-form-check"><input type="checkbox" name="dim" value="searchAppearance"${dimChecked('searchAppearance')}> searchAppearance</label>
          </div>
        </div>
        <div class="query-form-row">
          <label class="query-form-label" for="gsc-row-limit">Row limit</label>
          <input type="number" id="gsc-row-limit" class="query-form-input" min="1" max="25000" value="${isNaN(defaultRowLimit) || defaultRowLimit < 1 ? 100 : Math.min(25000, defaultRowLimit)}">
        </div>
        <div class="query-panel-actions">
          <button type="button" class="action-btn query-panel-cancel">Cancel</button>
          <button type="button" class="action-btn action-btn-primary run-query-btn">Run query</button>
        </div>
      </div>
    `;
    container.appendChild(queryPanel);
    
    
    // Store tableData and summary for export and Send to LLM
    (window as any).currentTableData = tableData;
    (window as any).currentSummary = summary;
    if (lastToolInput?.context && typeof lastToolInput.context === 'object') {
      lastRequestContext = lastToolInput.context as Record<string, unknown>;
    }

    // Setup toolbar interactions
    setTimeout(() => {
      setupToolbarInteractions();
    }, 100);
    
    // Summary Cards
    if (summary && Object.keys(summary).length > 0) {
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'summary-cards';
      
      // Check if we have click, impression, position, and CTR metrics
      const summaryKeys = Object.keys(summary);
      const clickKey = summaryKeys.find(k => k.toLowerCase().includes('click') && !k.toLowerCase().includes('ctr'));
      const impressionKey = summaryKeys.find(k => k.toLowerCase().includes('impression'));
      const positionKey = summaryKeys.find(k => k.toLowerCase().includes('position'));
      const ctrKey = summaryKeys.find(k => k.toLowerCase().includes('ctr') || k.toLowerCase() === 'click-through rate');
      
      const hasSpecialMetrics = clickKey && impressionKey && positionKey && ctrKey;
      
      if (hasSpecialMetrics) {
        // Create horizontal card for click/impression/position/CTR
        const horizontalCard = document.createElement('div');
        horizontalCard.className = 'summary-card horizontal-card';
        
        // Icon helper function
        const getIconSVG = (type: string): string => {
          if (type === 'click') return iconClick();
          if (type === 'impression') return iconImpression();
          if (type === 'position') return iconPosition();
          if (type === 'ctr') return iconCTR();
          return '';
        };
        
        const createMetricItem = (key: string, stat: any, type: string) => {
          const metricDiv = document.createElement('div');
          metricDiv.className = `metric-item ${type}`;
          
          // Format value based on type
          let displayValue = formatNumber(stat.total);
          let displayChange = `Avg: ${formatNumber(stat.average.toFixed(2))}`;
          
          if (type === 'ctr') {
            // CTR is typically a percentage/rate, show average as main value
            displayValue = formatPercentage(stat.average);
            displayChange = `Total: ${formatNumber(stat.total)}`;
          }
          
          // Calculate trend (simplified - compare first half vs second half)
          const rows = tableData.rows;
          const columnIndex = tableData.columns.indexOf(key);
          if (columnIndex === -1) return metricDiv;
          
          const midPoint = Math.floor(rows.length / 2) || 1;
          const firstHalf = rows.slice(0, midPoint).reduce((sum: number, row: any[]) => {
            const val = row[columnIndex];
            return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
          }, 0) / midPoint;
          const secondHalf = rows.slice(midPoint).reduce((sum: number, row: any[]) => {
            const val = row[columnIndex];
            return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
          }, 0) / Math.max(rows.length - midPoint, 1);
          const trend = calculateTrend(secondHalf, firstHalf);
          
          // Get sparkline data
          const sparklineData = rows.map((row: any[]) => {
            const val = row[columnIndex];
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          });
          
          const trendIcon = trend.direction === 'up' ? iconTrendUp() : trend.direction === 'down' ? iconTrendDown() : '';
          const trendClass = trend.direction === 'up' ? 'trend-up' : trend.direction === 'down' ? 'trend-down' : 'trend-neutral';
          const trendText = trend.direction !== 'neutral' ? `${trend.percentage.toFixed(1)}%` : '';
          
          metricDiv.innerHTML = `
            <div class="metric-icon">
              <span class="icon-inline">${getIconSVG(type)}</span>
            </div>
            <div class="metric-content">
              <div class="metric-label">${escapeHtml(key)}</div>
              <div class="metric-value" data-value="${stat.total}">${displayValue}</div>
              <div class="metric-change">
                ${displayChange}
                ${trendText ? `<span class="trend-indicator ${trendClass}">
                  <span class="trend-icon icon-inline">${trendIcon}</span>
                  ${trendText}
                </span>` : ''}
              </div>
              <div class="sparkline-container" data-sparkline="${sparklineData.join(',')}" data-color="${type === 'click' ? '#4285f4' : type === 'impression' ? '#34a853' : type === 'position' ? '#fbbc04' : '#8ab4f8'}"></div>
            </div>
          `;
          
          // Animate counter
          setTimeout(() => {
            const valueEl = metricDiv.querySelector('.metric-value') as HTMLElement;
            if (valueEl) {
              valueEl.classList.add('animating');
              const numericValue = type === 'ctr' ? stat.average * 100 : stat.total;
              animateCounter(valueEl, 0, numericValue, 1000);
            }
            
            // Create sparkline
            const sparklineContainer = metricDiv.querySelector('.sparkline-container') as HTMLElement;
            if (sparklineContainer && sparklineData.length > 0) {
              const color = sparklineContainer.dataset.color || '#4285f4';
              createSparkline(sparklineContainer, sparklineData, color);
            }
          }, 100);
          return metricDiv;
        };
        
        horizontalCard.appendChild(createMetricItem(clickKey, summary[clickKey], 'click'));
        horizontalCard.appendChild(createMetricItem(impressionKey, summary[impressionKey], 'impression'));
        horizontalCard.appendChild(createMetricItem(positionKey, summary[positionKey], 'position'));
        horizontalCard.appendChild(createMetricItem(ctrKey, summary[ctrKey], 'ctr'));
        
        cardsContainer.appendChild(horizontalCard);
        cardsContainer.classList.add('horizontal-layout');
        
        // Add remaining metrics as regular cards
        summaryKeys.filter(k => k !== clickKey && k !== impressionKey && k !== positionKey && k !== ctrKey).slice(0, 3).forEach((key) => {
          const stat = summary[key];
          const card = document.createElement('div');
          card.className = 'summary-card';
          card.innerHTML = `
            <div class="card-label">${escapeHtml(key)}</div>
            <div class="card-value">${formatNumber(stat.total)}</div>
            <div class="card-change">Avg: ${formatNumber(stat.average.toFixed(2))}</div>
            <div class="card-details">
              <div>Max: ${formatNumber(stat.max)}</div>
              <div>Min: ${formatNumber(stat.min)}</div>
              <div>Count: ${stat.count}</div>
            </div>
          `;
          
          card.addEventListener('click', () => {
            card.classList.toggle('active');
          });
          
          cardsContainer.appendChild(card);
        });
      } else {
        // Regular card layout
        Object.keys(summary).slice(0, 4).forEach((key, index) => {
          const stat = summary[key];
          const card = document.createElement('div');
          card.className = 'summary-card';
          card.innerHTML = `
            <div class="card-label">${escapeHtml(key)}</div>
            <div class="card-value">${formatNumber(stat.total)}</div>
            <div class="card-change">Avg: ${formatNumber(stat.average.toFixed(2))}</div>
            <div class="card-details">
              <div>Max: ${formatNumber(stat.max)}</div>
              <div>Min: ${formatNumber(stat.min)}</div>
              <div>Count: ${stat.count}</div>
            </div>
          `;
          
          card.addEventListener('click', () => {
            card.classList.toggle('active');
          });
          
          cardsContainer.appendChild(card);
        });
      }
      
      container.appendChild(cardsContainer);
    }
    
    // Charts Grid
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-grid';
    
    // Line Chart
    if (lineChartData && lineChartData.series.length > 0) {
      const lineCard = document.createElement('div');
      lineCard.className = 'chart-card';
      
      const chartWrapper = document.createElement('div');
      chartWrapper.className = 'chart-wrapper';
      chartWrapper.style.position = 'relative';
      
      const canvas = document.createElement('canvas');
      canvas.id = 'linechart';
      
      chartWrapper.appendChild(canvas);
      
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      legend.id = 'linechart-legend';
      
      // Initialize visible series (all visible by default)
      const visibleSeries = new Set(lineChartData.series.map((_: any, i: number) => i));
      
      lineChartData.series.forEach((s: any, i: number) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.dataset.seriesIndex = i.toString();
        legendItem.innerHTML = `
          <span class="legend-color" style="background: ${CHART_COLORS[i % CHART_COLORS.length]}"></span>
          <span>${escapeHtml(s.name)}</span>
        `;
        
        // Toggle series visibility on click
        legendItem.addEventListener('click', () => {
          if (visibleSeries.has(i)) {
            visibleSeries.delete(i);
            legendItem.classList.add('disabled');
          } else {
            visibleSeries.add(i);
            legendItem.classList.remove('disabled');
          }
          renderLineChart(canvas, lineChartData, visibleSeries);
        });
        
        legend.appendChild(legendItem);
      });
      
      chartWrapper.appendChild(legend);
      
      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = 'Trend Over Time';
      lineCard.appendChild(title);
      lineCard.appendChild(chartWrapper);
      
      chartsContainer.appendChild(lineCard);
    }
    
    // Pie Chart
    if (pieChartData && pieChartData.values.length > 0) {
      const pieCard = document.createElement('div');
      pieCard.className = 'chart-card';
      
      const chartWrapper = document.createElement('div');
      chartWrapper.className = 'chart-wrapper';
      chartWrapper.style.position = 'relative';
      
      const canvas = document.createElement('canvas');
      canvas.id = 'piechart';
      
      chartWrapper.appendChild(canvas);
      
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      
      pieChartData.labels.forEach((label: string, i: number) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const value = pieChartData.values[i];
        const total = pieChartData.values.reduce((a: number, b: number) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
        
        legendItem.innerHTML = `
          <span class="legend-color" style="background: ${CHART_COLORS[i % CHART_COLORS.length]}"></span>
          <span>${escapeHtml(String(label))}</span>
          <span style="margin-left: auto; color: #6b7280; font-weight: 600;">${formatNumber(value)} (${percentage}%)</span>
        `;
        
        legend.appendChild(legendItem);
      });
      
      chartWrapper.appendChild(legend);
      
      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = 'Distribution';
      pieCard.appendChild(title);
      pieCard.appendChild(chartWrapper);
      
      chartsContainer.appendChild(pieCard);
    }
    
    container.appendChild(chartsContainer);
    
    // Data Table View (hidden by default)
    const tableContainer = document.createElement('div');
    tableContainer.className = 'data-table-container';
    tableContainer.id = 'data-table-container';
    tableContainer.style.display = 'none';
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    tableData.columns.forEach((col: string, index: number) => {
      const th = document.createElement('th');
      th.className = index > 0 ? 'sortable' : '';
      th.textContent = col;
      th.dataset.column = String(index);
      if (index > 0) {
        th.addEventListener('click', () => sortTable(table, index));
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    tableData.rows.forEach((row: any[]) => {
      const tr = document.createElement('tr');
      row.forEach((cell: any) => {
        const td = document.createElement('td');
        td.textContent = typeof cell === 'number' ? formatNumber(cell) : String(cell || '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
    
    // Replace app content
    app.innerHTML = '';
    app.appendChild(container);
    
    // Function to render charts
    const renderCharts = () => {
      if (lineChartData && lineChartData.series && lineChartData.series.length > 0) {
        const lineCanvas = document.getElementById('linechart') as HTMLCanvasElement;
        if (lineCanvas?.getContext('2d')) {
          try {
            const visibleSeries = new Set(lineChartData.series.map((_: any, i: number) => i));
            renderLineChart(lineCanvas, lineChartData, visibleSeries);
          } catch (error) {
            app.sendLog({ level: "error", data: `[mcp-app] Error rendering line chart: ${JSON.stringify(error)}`, logger: APP_NAME });
            showChartError(lineCanvas.closest('.chart-card'), 'Failed to render line chart: ' + (error as Error).message);
          }
        } else {
          app.sendLog({ level: "warning", data: `[mcp-app] Line chart canvas not found`, logger: APP_NAME });
        }
      }
      
      if (pieChartData && pieChartData.values && pieChartData.values.length > 0) {
        const pieCanvas = document.getElementById('piechart') as HTMLCanvasElement;
        if (pieCanvas?.getContext('2d')) {
          try {
            renderPieChart(pieCanvas, pieChartData.values, CHART_COLORS, pieChartData.labels);
          } catch (error) {
            app.sendLog({ level: "error", data: `[mcp-app] Error rendering pie chart: ${JSON.stringify(error)}`, logger: APP_NAME });
            showChartError(pieCanvas.closest('.chart-card'), 'Failed to render pie chart: ' + (error as Error).message);
          }
        } else {
          app.sendLog({ level: "warning", data: `[mcp-app] Pie chart canvas not found`, logger: APP_NAME });
        }
      }
      
      // Notify host of size change after rendering completes
    };
    
    // Wait for Chart.js to be available, then render charts
    const waitForChartJS = (attempts = 0, maxAttempts = 100) => {
      // Check if Chart.js is loaded
      const chartJsAvailable = typeof Chart !== 'undefined';
      const chartJsError = (window as any).chartJsLoadError;
      
      if (chartJsAvailable) {
        // Chart.js is loaded, render charts after a short delay
        setTimeout(() => {
          renderCharts();
        }, 100);
      } else if (chartJsError) {
        // Chart.js failed to load
        app.sendLog({ level: "error", data: `[mcp-app] Chart.js failed to load - CDN blocked or unavailable`, logger: APP_NAME });
        const lineCanvas = document.getElementById('linechart');
        const pieCanvas = document.getElementById('piechart');
        if (lineCanvas) {
          showChartError(lineCanvas.closest('.chart-card'), 'Chart.js library failed to load. CDN may be blocked by browser security policies.');
        }
        if (pieCanvas) {
          showChartError(pieCanvas.closest('.chart-card'), 'Chart.js library failed to load. CDN may be blocked by browser security policies.');
        }
      } else if (attempts < maxAttempts) {
        // Chart.js not loaded yet, wait and retry
        setTimeout(() => waitForChartJS(attempts + 1, maxAttempts), 50);
      } else {
        // Timeout - Chart.js didn't load
        app.sendLog({ level: "error", data: `[mcp-app] Chart.js failed to load after ${JSON.stringify(maxAttempts)} attempts`, logger: APP_NAME });
        const lineCanvas = document.getElementById('linechart');
        const pieCanvas = document.getElementById('piechart');
        if (lineCanvas) {
          showChartError(lineCanvas.closest('.chart-card'), 'Chart.js library failed to load. Please check your network connection or browser security settings.');
        }
        if (pieCanvas) {
          showChartError(pieCanvas.closest('.chart-card'), 'Chart.js library failed to load. Please check your network connection or browser security settings.');
        }
      }
    };
    
    // Listen for Chart.js load events
    window.addEventListener('chartjs-loaded', () => {
      setTimeout(() => {
        renderCharts();
      }, 100);
    });
    
    window.addEventListener('chartjs-load-error', () => {
      const lineCanvas = document.getElementById('linechart');
      const pieCanvas = document.getElementById('piechart');
      if (lineCanvas) {
        showChartError(lineCanvas.closest('.chart-card'), 'Chart.js CDN blocked. Please allow external scripts or use a different environment.');
      }
      if (pieCanvas) {
        showChartError(pieCanvas.closest('.chart-card'), 'Chart.js CDN blocked. Please allow external scripts or use a different environment.');
      }
    });
    
    // Start waiting for Chart.js
    waitForChartJS();
    
  } catch (error: any) {
    app.sendLog({ level: "error", data: `[mcp-app] Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering dashboard: ${error.message}`);
  }
}

/* ============================================
   NEW QUERY PANEL (run_action_ui)
   ============================================ */

/**
 * Extract payload for renderData from a tools/call result (same shape as ui/notifications/tool-result params).
 */
function dataFromToolResult(result: any): any {
  if (!result) return undefined;
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (result.template_data !== undefined) return result.template_data;
  if (result.message?.template_data !== undefined) return result.message.template_data;
  return result;
}

/**
 * Open the query filters panel and prefill from last tool input (ui/notifications/tool-input) when available.
 */
function openQueryPanel() {
  const panel = document.getElementById('query-filters-panel');
  if (!panel) return;
  const ctx = lastToolInput?.context && typeof lastToolInput.context === 'object' ? (lastToolInput.context as Record<string, unknown>) : null;
  if (ctx) {
    const siteUrlEl = document.getElementById('gsc-site-url') as HTMLInputElement | null;
    if (siteUrlEl && typeof ctx.siteUrl === 'string') siteUrlEl.value = ctx.siteUrl;
    const startEl = document.getElementById('gsc-start-date') as HTMLInputElement | null;
    if (startEl && typeof ctx.startDate === 'string') startEl.value = ctx.startDate;
    const endEl = document.getElementById('gsc-end-date') as HTMLInputElement | null;
    if (endEl && typeof ctx.endDate === 'string') endEl.value = ctx.endDate;
    const rowLimitEl = document.getElementById('gsc-row-limit') as HTMLInputElement | null;
    if (rowLimitEl && (typeof ctx.rowLimit === 'number' || typeof ctx.rowLimit === 'string')) {
      const n = typeof ctx.rowLimit === 'number' ? ctx.rowLimit : parseInt(String(ctx.rowLimit), 10);
      if (!isNaN(n)) rowLimitEl.value = String(Math.min(25000, Math.max(1, n)));
    }
    if (Array.isArray(ctx.dimensions)) {
      const dims = ctx.dimensions.filter((d): d is string => typeof d === 'string');
      document.querySelectorAll('#gsc-dimensions input[name="dim"]').forEach((el: Element) => {
        const input = el as HTMLInputElement;
        input.checked = dims.includes(input.value);
      });
    }
  }
  panel.classList.add('query-panel-open');
}

/**
 * Close the query filters panel.
 */
function closeQueryPanel() {
  const panel = document.getElementById('query-filters-panel');
  if (panel) {
    panel.classList.remove('query-panel-open');
  }
}

/**
 * Build context and call run_action_ui via tools/call, then render the result.
 */
function runQueryWithFilters() {
  const siteUrlEl = document.getElementById('gsc-site-url') as HTMLInputElement | null;
  const startDateEl = document.getElementById('gsc-start-date') as HTMLInputElement | null;
  const endDateEl = document.getElementById('gsc-end-date') as HTMLInputElement | null;
  const rowLimitEl = document.getElementById('gsc-row-limit') as HTMLInputElement | null;
  const runBtn = document.querySelector('.run-query-btn') as HTMLButtonElement | null;

  const siteUrl = (siteUrlEl?.value || '').trim();
  if (!siteUrl) {
    showError('Please enter a Site URL (e.g. https://www.example.com/)');
    return;
  }

  let startDate = startDateEl?.value || '';
  let endDate = endDateEl?.value || '';
  const rowLimit = Math.min(25000, Math.max(1, parseInt(String(rowLimitEl?.value || 100), 10) || 100));

  // Search Console API often returns 400 if endDate is today (data not yet available). Use yesterday when end is today or in future.
  const today = new Date().toISOString().slice(0, 10);
  if (endDate && endDate >= today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    endDate = yesterday.toISOString().slice(0, 10);
  }

  const dimensionChecks = document.querySelectorAll('#gsc-dimensions input[name="dim"]:checked');
  const dimensions = Array.from(dimensionChecks).map((el: Element) => (el as HTMLInputElement).value);
  if (dimensions.length === 0) {
    dimensions.push('date'); // default
  }

  // Build context in same format as run_action example: operationId, siteUrl, startDate, endDate, dimensions, rowLimit
  const context: Record<string, unknown> = {
    operationId: GSC_OPERATION_ID,
    siteUrl,
    dimensions,
    rowLimit
  };
  if (startDate) context.startDate = startDate;
  if (endDate) context.endDate = endDate;

  lastRequestContext = { ...context };

  const appName = (lastToolInput && typeof (lastToolInput as any).app_name === 'string')
    ? (lastToolInput as any).app_name
    : GSC_APP_NAME;
  const dimensionLabel = dimensions.length === 1 && dimensions[0] === 'date'
    ? 'day'
    : dimensions.join(', ');
  const userInput = startDate && endDate
    ? `Get my site performance from ${startDate} to ${endDate} broken down by ${dimensionLabel}`
    : `Get my site performance for ${siteUrl} broken down by ${dimensionLabel}`;
  

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
  }
  const toolCallPayload = {
    name: 'run_action',
    arguments: {
      app_name: appName,
      user_input: userInput,
      context
    }
  };
  app.sendLog({ level: "debug", data: `[mcp-app] tools/call payload: ${JSON.stringify(JSON.stringify(toolCallPayload, null, 2))}`, logger: APP_NAME });
  app.callTool(toolCallPayload.name, toolCallPayload.arguments)
    .then((result: any) => {
      if (result?.isError) {
        showError(result?.message || 'Query returned an error.');
        return;
      }
      const data = dataFromToolResult(result);
      if (data !== undefined) {
        closeQueryPanel();
        renderData(data);
      } else {
        showError('No data returned from query.');
      }
    })
    .catch((err: Error) => {
      app.sendLog({ level: "error", data: `[mcp-app] Run query failed: ${JSON.stringify(err)}`, logger: APP_NAME });
      showError(`Query failed: ${err.message}`);
    })
    .finally(() => {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = 'Run query';
      }
    });
}

// Expose for inline/cancel button
(window as any).closeQueryPanel = closeQueryPanel;
(window as any).runQueryWithFilters = runQueryWithFilters;

/* ============================================
   SEND TO LLM
   ============================================
   Sends current request context and response data to the host chat
   so the LLM can analyze and provide recommendations.
   ============================================ */

const SEND_TO_LLM_PREAMBLE =
  'I have Google Search Console Search Analytics data below. Please analyze the request parameters and the response data, summarize key metrics and trends, and provide actionable recommendations to improve search performance.';

/**
 * Format request context and response table data for the LLM message.
 */
function formatRequestAndResponseForLLM(
  requestContext: Record<string, unknown> | null,
  tableData: { columns: string[]; rows: any[] } | null
): string {
  const sections: string[] = [];

  if (requestContext && Object.keys(requestContext).length > 0) {
    sections.push('## Request parameters\n');
    sections.push(JSON.stringify(requestContext, null, 2));
    sections.push('');
  }

  if (tableData && tableData.columns && tableData.rows && tableData.rows.length > 0) {
    sections.push('## Response data');
    sections.push(`Columns: ${tableData.columns.join(', ')}`);
    sections.push(`Rows: ${tableData.rows.length}`);
    sections.push('');
    // Include a sample of rows (first 50) so the LLM has enough context without huge payloads
    const maxRows = Math.min(50, tableData.rows.length);
    const header = tableData.columns.join('\t');
    const rowLines = tableData.rows.slice(0, maxRows).map((row: any[]) =>
      row.map((cell: any) => (typeof cell === 'object' ? JSON.stringify(cell) : String(cell))).join('\t')
    );
    sections.push(header);
    sections.push(...rowLines);
    if (tableData.rows.length > maxRows) {
      sections.push(`... and ${tableData.rows.length - maxRows} more rows`);
    }
  }

  return sections.join('\n');
}

/**
 * Send current request and response data to the host chat (LLM) via ui/message
 * for analysis and recommendations.
 */
(window as any).sendToLLM = function () {
  const tableData = (window as any).currentTableData as { columns: string[]; rows: any[] } | null | undefined;
  if (!tableData || !tableData.rows || tableData.rows.length === 0) {
    showSendNotification('No data to send. Run a query first.');
    return;
  }

  const formatted = formatRequestAndResponseForLLM(lastRequestContext, tableData);
  const text = `${SEND_TO_LLM_PREAMBLE}\n\n${formatted}`;

  const btn = document.getElementById('send-to-llm-btn');
  if (btn) {
    (btn as HTMLButtonElement).disabled = true;
    btn.classList.add('send-loading');
  }
  app.sendMessage({
    role: 'user',
    content: { type: 'text', text },
  })
    .then((result: any) => {
      if (result?.isError) {
        showSendNotification('Host could not add message to chat.');
        return;
      }
      showSendNotification('Sent to LLM for analysis and recommendations');
    })
    .catch((err: Error) => {
      app.sendLog({ level: "error", data: `Send to LLM failed: ${JSON.stringify(err)}`, logger: APP_NAME });
      showSendNotification('Failed to send. Check console.');
    })
    .finally(() => {
      if (btn) {
        (btn as HTMLButtonElement).disabled = false;
        btn.classList.remove('send-loading');
      }
    });
};

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
   ADVANCED INTERACTIVE FEATURES
   ============================================ */

/**
 * Setup toolbar interactions
 */
function setupToolbarInteractions() {
  // New query button – open panel
  document.querySelector('.new-query-btn')?.addEventListener('click', () => openQueryPanel());
  document.querySelector('.query-panel-cancel')?.addEventListener('click', () => closeQueryPanel());
  document.querySelector('.run-query-btn')?.addEventListener('click', () => runQueryWithFilters());

  // View toggle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function(this: HTMLElement) {
      const view = this.dataset.view;
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const chartsContainer = document.querySelector('.charts-grid');
      const tableContainer = document.getElementById('data-table-container');
      
      if (view === 'table') {
        if (chartsContainer) (chartsContainer as HTMLElement).style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
      } else {
        if (chartsContainer) (chartsContainer as HTMLElement).style.display = 'grid';
        if (tableContainer) tableContainer.style.display = 'none';
      }
      
    });
  });
  
  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function(this: HTMLElement) {
      if (this.dataset.filter === 'all') {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
      } else {
        document.querySelectorAll('.filter-chip').forEach(c => {
          if (c.dataset.filter === 'all') c.classList.remove('active');
        });
        this.classList.toggle('active');
      }
      // In a real app, this would filter the data
      app.sendLog({ level: "debug", data: `[mcp-app] Filter selected: ${JSON.stringify(this.dataset.filter)}`, logger: APP_NAME });
    });
  });
}

/**
 * Export data function
 */
(window as any).exportData = function(format: 'csv' | 'json') {
  const tableData = (window as any).currentTableData;
  if (!tableData) {
    alert('No data available to export');
    return;
  }
  
  if (format === 'csv') {
    exportToCSV(tableData);
  } else {
    exportToJSON(tableData);
  }
};

/**
 * Sort table by column
 */
function sortTable(table: HTMLTableElement, columnIndex: number) {
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const header = table.querySelector(`th[data-column="${columnIndex}"]`);
  if (!header) return;
  
  const isAscending = header.classList.contains('sort-asc');
  
  // Remove all sort classes
  table.querySelectorAll('th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Add appropriate sort class
  header.classList.add(isAscending ? 'sort-desc' : 'sort-asc');
  
  // Sort rows
  rows.sort((a, b) => {
    const aCell = a.cells[columnIndex]?.textContent || '';
    const bCell = b.cells[columnIndex]?.textContent || '';
    const aNum = parseFloat(aCell.replace(/[^0-9.-]/g, ''));
    const bNum = parseFloat(bCell.replace(/[^0-9.-]/g, ''));
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return isAscending ? bNum - aNum : aNum - bNum;
    }
    return isAscending ? bCell.localeCompare(aCell) : aCell.localeCompare(bCell);
  });
  
  // Re-append sorted rows
  rows.forEach(row => tbody.appendChild(row));
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
  // Clean up chart instances
  if (lineChartInstance) {
    lineChartInstance.destroy();
    lineChartInstance = null;
  }
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }
  return {};
};

app.ontoolinput = (params) => {
  app.sendLog({ level: "info", data: `Tool input received: ${JSON.stringify(params.arguments)}`, logger: APP_NAME });
  const toolArguments = params.arguments;
  if (toolArguments && typeof toolArguments === 'object') {
    lastToolInput = toolArguments as Record<string, unknown>;
    if ((toolArguments as any).context && typeof (toolArguments as any).context === 'object') {
      lastRequestContext = (toolArguments as any).context as Record<string, unknown>;
    }
    app.sendLog({ level: "debug", data: `[mcp-app] Tool input stored for New query panel: ${JSON.stringify(lastToolInput)}`, logger: APP_NAME });
  }
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
  app.sendLog({ level: "info", data: `Tool cancelled: ${JSON.stringify(reason)}`, logger: APP_NAME });
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
