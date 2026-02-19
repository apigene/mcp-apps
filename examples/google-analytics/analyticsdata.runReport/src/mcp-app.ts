/* ============================================
   GOOGLE ANALYTICS MCP APP (SDK VERSION)
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

const APP_NAME = "Google Analytics";
const APP_VERSION = "1.0.0";

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================
   If you use external libraries (like Chart.js), declare them here.
   ============================================ */

// Chart.js is loaded via script tag in HTML
declare const Chart: any;

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

   Google Analytics specific utility functions.
   Handles GA4 runReport response format:
   - dimensionHeaders / metricHeaders
   - rows with dimensionValues / metricValues
   - metadata (currencyCode, timeZone)
   ============================================ */

/**
 * Show chart error message
 */
function showChartError(container: Element | null | undefined, message: string) {
  if (!container) {
    app.sendLog({ level: "warning", data: 'Cannot show chart error - container not found', logger: APP_NAME });
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
    app.sendLog({ level: "warning", data: 'Chart wrapper not found in container', logger: APP_NAME });
  }
}

/**
 * Color palettes for charts - Google Material Design colors
 */
const CHART_COLORS = [
  "#4285f4", "#34a853", "#fbbc04", "#ea4335",
  "#f57c00", "#8ab4f8", "#81c995", "#fdd663",
  "#f28b82", "#ff9800", "#669df6", "#66bb6a"
];

/* ============================================
   INLINE SVG ICONS (Google Material Icons style)
   ============================================ */

function iconGoogleAnalytics(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2v-8c0-1.1-.9-2-2-2zM6 15c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2z"/>
  </svg>`;
}

function iconPageView(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`;
}

function iconUsers(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`;
}

function iconSessions(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`;
}

function iconBounce(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
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
  return num.toFixed(2) + '%';
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
 * Export data as CSV
 */
function exportToCSV(tableData: any, filename: string = 'google-analytics-data.csv') {
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
function exportToJSON(data: any, filename: string = 'google-analytics-data.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Deep-search for the GA4 response object anywhere in the data tree.
 * Looks for an object that has dimensionHeaders or rows with dimensionValues.
 */
function findGAData(obj: any, depth: number = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 5) return null;

  // Direct GA4 format: has dimensionHeaders + rows
  if (obj.dimensionHeaders && Array.isArray(obj.rows)) {
    return obj;
  }

  // Rows with GA4-shaped items (dimensionValues/metricValues)
  if (Array.isArray(obj.rows) && obj.rows.length > 0) {
    const first = obj.rows[0];
    if (first && (first.dimensionValues || first.metricValues)) {
      return obj;
    }
  }

  // Recurse into known wrapper keys
  const searchKeys = ['body', 'data', 'result', 'response', 'message',
                      'template_data', 'response_content', 'structuredContent',
                      'rows'];
  for (const key of searchKeys) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findGAData(obj[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Try to extract GA4 row data from various transformed formats.
 * The preview system may reshape rows into arrays like:
 *   [[{value: "/"}], [{value: "1468"}]]
 * where each element is an array of {value} objects.
 */
function extractGARowsFromTransformed(data: any): { dimensions: string[][]; metrics: string[][] } | null {
  // Check for the transformed format: rows is an array where each row is an array of arrays
  // e.g. rows: [  [ [{value:"/"}], [{value:"1468"}] ], ... ]
  let rows: any[] | null = null;

  if (Array.isArray(data?.rows)) {
    rows = data.rows;
  } else if (data?.rows?.rows && Array.isArray(data.rows.rows)) {
    rows = data.rows.rows;
  }

  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];

  // Check if first row is an array of arrays (transformed format)
  if (!Array.isArray(firstRow)) return null;
  if (firstRow.length < 2) return null;

  // Each element should be an array of {value: ...} objects
  const isTransformedFormat = firstRow.every((col: any) =>
    Array.isArray(col) && col.length > 0 && col[0] && typeof col[0].value !== 'undefined'
  );

  if (!isTransformedFormat) return null;

  // Extract: first array(s) = dimensions, last array(s) = metrics
  // We determine which is which by checking if values are numeric
  const dimensions: string[][] = [];
  const metrics: string[][] = [];

  rows.forEach((row: any[]) => {
    const dimRow: string[] = [];
    const metRow: string[] = [];

    row.forEach((col: any[], colIdx: number) => {
      if (!Array.isArray(col)) return;
      col.forEach((item: any) => {
        const val = String(item?.value || '');
        // Last columns are typically metrics (numeric)
        // First columns are dimensions (non-numeric like paths)
        if (colIdx === 0) {
          dimRow.push(val);
        } else {
          metRow.push(val);
        }
      });
    });

    dimensions.push(dimRow);
    metrics.push(metRow);
  });

  return { dimensions, metrics };
}

/**
 * Parse Google Analytics GA4 runReport response format
 * Converts dimensionHeaders/metricHeaders/rows into a standard table format.
 * Also handles various transformed/wrapped formats from the preview system.
 */
function parseGAResponse(data: any): { columns: string[]; rows: any[][]; metadata: any } | null {
  // ---- Strategy 1: Find native GA4 data with dimensionHeaders ----
  const gaData = findGAData(data);

  if (gaData && gaData.dimensionHeaders) {
    const dimensionHeaders = gaData.dimensionHeaders || [];
    const metricHeaders = gaData.metricHeaders || [];

    const columns: string[] = [];
    dimensionHeaders.forEach((h: any) => columns.push(formatHeaderName(h.name || 'Dimension')));
    metricHeaders.forEach((h: any) => columns.push(formatHeaderName(h.name || 'Metric')));

    const rows: any[][] = [];
    (gaData.rows || []).forEach((row: any) => {
      const rowData: any[] = [];
      (row.dimensionValues || []).forEach((dv: any) => rowData.push(dv.value || ''));
      (row.metricValues || []).forEach((mv: any, idx: number) => {
        const val = mv.value || '0';
        const metricType = metricHeaders[idx]?.type || '';
        if (metricType === 'TYPE_FLOAT' || metricType === 'TYPE_CURRENCY') {
          rowData.push(parseFloat(val) || 0);
        } else {
          rowData.push(parseInt(val, 10) || 0);
        }
      });
      rows.push(rowData);
    });

    if (rows.length === 0) return null;

    return {
      columns,
      rows,
      metadata: {
        rowCount: gaData.rowCount || rows.length,
        currencyCode: gaData.metadata?.currencyCode || '',
        timeZone: gaData.metadata?.timeZone || '',
        kind: gaData.kind || ''
      }
    };
  }

  // ---- Strategy 2: GA4 rows without headers (dimensionValues/metricValues present) ----
  if (gaData && Array.isArray(gaData.rows) && gaData.rows.length > 0) {
    const firstRow = gaData.rows[0];
    if (firstRow.dimensionValues || firstRow.metricValues) {
      const numDims = (firstRow.dimensionValues || []).length;
      const numMetrics = (firstRow.metricValues || []).length;

      const columns: string[] = [];
      for (let i = 0; i < numDims; i++) columns.push(`Dimension ${i + 1}`);
      for (let i = 0; i < numMetrics; i++) columns.push(`Metric ${i + 1}`);

      const rows: any[][] = [];
      gaData.rows.forEach((row: any) => {
        const rowData: any[] = [];
        (row.dimensionValues || []).forEach((dv: any) => rowData.push(dv.value || ''));
        (row.metricValues || []).forEach((mv: any) => {
          const val = mv.value || '0';
          const num = parseFloat(val);
          rowData.push(isNaN(num) ? val : (Number.isInteger(num) ? parseInt(val, 10) : num));
        });
        rows.push(rowData);
      });

      if (rows.length === 0) return null;

      return {
        columns,
        rows,
        metadata: {
          rowCount: gaData.rowCount || rows.length,
          currencyCode: gaData.metadata?.currencyCode || '',
          timeZone: gaData.metadata?.timeZone || '',
          kind: gaData.kind || ''
        }
      };
    }
  }

  // ---- Strategy 3: Transformed format from preview system ----
  // The preview may reshape GA rows into: [[{value:"/"}], [{value:"1468"}]]
  const transformed = extractGARowsFromTransformed(data);
  if (transformed && transformed.dimensions.length > 0) {
    const numDims = transformed.dimensions[0].length;
    const numMetrics = transformed.metrics[0].length;

    const columns: string[] = [];
    for (let i = 0; i < numDims; i++) columns.push(numDims === 1 ? 'Page Path' : `Dimension ${i + 1}`);
    for (let i = 0; i < numMetrics; i++) columns.push(numMetrics === 1 ? 'Page Views' : `Metric ${i + 1}`);

    const rows: any[][] = [];
    for (let i = 0; i < transformed.dimensions.length; i++) {
      const rowData: any[] = [];
      transformed.dimensions[i].forEach(v => rowData.push(v));
      transformed.metrics[i].forEach(v => {
        const num = parseFloat(v);
        rowData.push(isNaN(num) ? v : (Number.isInteger(num) ? parseInt(v, 10) : num));
      });
      rows.push(rowData);
    }

    if (rows.length === 0) return null;

    return {
      columns,
      rows,
      metadata: {
        rowCount: rows.length,
        currencyCode: '',
        timeZone: '',
        kind: ''
      }
    };
  }

  return null;
}

/**
 * Convert GA header names from camelCase to human-readable format
 * e.g. "screenPageViews" -> "Page Views", "pagePath" -> "Page Path"
 */
function formatHeaderName(name: string): string {
  // Known GA4 dimension/metric mappings for cleaner display
  const nameMap: Record<string, string> = {
    'pagePath': 'Page Path',
    'pageTitle': 'Page Title',
    'screenPageViews': 'Page Views',
    'sessions': 'Sessions',
    'totalUsers': 'Total Users',
    'newUsers': 'New Users',
    'activeUsers': 'Active Users',
    'bounceRate': 'Bounce Rate',
    'averageSessionDuration': 'Avg Session Duration',
    'screenPageViewsPerSession': 'Pages / Session',
    'engagedSessions': 'Engaged Sessions',
    'engagementRate': 'Engagement Rate',
    'eventCount': 'Event Count',
    'conversions': 'Conversions',
    'userEngagementDuration': 'Engagement Duration',
    'date': 'Date',
    'country': 'Country',
    'city': 'City',
    'deviceCategory': 'Device',
    'operatingSystem': 'OS',
    'browser': 'Browser',
    'source': 'Source',
    'medium': 'Medium',
    'campaign': 'Campaign',
    'landingPage': 'Landing Page',
    'sessionSource': 'Session Source',
    'sessionMedium': 'Session Medium',
    'sessionDefaultChannelGroup': 'Channel Group',
  };

  if (nameMap[name]) {
    return nameMap[name];
  }

  // Fallback: convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Normalize data to table format for processing
 * Handles both GA4 format and generic table format
 */
function normalizeTableData(data: any): { columns: string[]; rows: any[][]; metadata?: any } | null {
  // Try GA4 format first
  const gaResult = parseGAResponse(data);
  if (gaResult) {
    return gaResult;
  }

  // Fallback: unwrap and try generic format
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
      const columns: string[] = [];
      const rows: any[] = [];

      Object.keys(firstRow).forEach(key => {
        columns.push(key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '));
      });

      unwrapped.rows.forEach((row: any) => {
        rows.push(Object.keys(firstRow).map(key => row[key]));
      });

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

  // Find numeric columns (skip dimension columns - check for numeric values)
  for (let i = 0; i < columns.length; i++) {
    const sampleValue = rows[0]?.[i];
    const isNumeric = typeof sampleValue === 'number' ||
                      (!isNaN(parseFloat(sampleValue)) && String(sampleValue).match(/^\d/));

    if (!isNumeric) continue;

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

// Store chart instances for cleanup
let barChartInstance: any = null;
let pieChartInstance: any = null;

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
    tooltipBorder: isDark ? 'rgba(245, 124, 0, 0.3)' : 'rgba(245, 124, 0, 0.2)'
  };
}

/**
 * Render horizontal bar chart with Chart.js
 */
function renderBarChart(canvas: HTMLCanvasElement, labels: string[], values: number[], maxItems: number = 15) {
  if (typeof Chart === 'undefined' || !Chart.Chart) {
    app.sendLog({ level: "error", data: 'Chart.js is not loaded.', logger: APP_NAME });
    showChartError(canvas.parentElement?.parentElement, 'Chart.js library not available');
    return;
  }

  if (barChartInstance) {
    barChartInstance.destroy();
    barChartInstance = null;
  }

  if (!labels || labels.length === 0 || !values || values.length === 0) {
    return;
  }

  if (!canvas || !canvas.getContext) {
    return;
  }

  // Take top N items
  const displayLabels = labels.slice(0, maxItems);
  const displayValues = values.slice(0, maxItems);

  // Truncate long labels for display
  const truncatedLabels = displayLabels.map(l => l.length > 40 ? l.substring(0, 37) + '...' : l);

  const colors = getChartColors();
  const isDark = document.body.classList.contains('dark');

  // Generate gradient colors for bars
  const barColors = displayValues.map((_, i) => {
    const baseColor = CHART_COLORS[i % CHART_COLORS.length];
    return baseColor;
  });

  barChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: truncatedLabels,
      datasets: [{
        data: displayValues,
        backgroundColor: barColors.map(c => {
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.85)`;
        }),
        borderColor: barColors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.85
      }]
    },
    options: {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeInOutCubic' as const
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: colors.tooltipBg,
          titleColor: colors.textColor,
          bodyColor: colors.textColor,
          borderColor: colors.tooltipBorder,
          borderWidth: 2,
          padding: 16,
          cornerRadius: 12,
          boxPadding: 8,
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
              // Show full label in tooltip
              return displayLabels[context[0].dataIndex] || '';
            },
            label: function(context: any) {
              return `${formatNumber(context.parsed.x)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: colors.gridColor,
            lineWidth: 1,
            drawBorder: false
          },
          ticks: {
            color: colors.textColor,
            font: {
              size: 11,
              weight: '500' as const
            },
            callback: function(value: any) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
              return value;
            }
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: colors.textColor,
            font: {
              size: 11,
              weight: '500' as const,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            padding: 8
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Render pie/doughnut chart with Chart.js
 */
function renderPieChart(canvas: HTMLCanvasElement, values: number[], chartLabels: string[], maxItems: number = 10) {
  if (typeof Chart === 'undefined' || !Chart.Chart) {
    app.sendLog({ level: "error", data: 'Chart.js is not loaded.', logger: APP_NAME });
    showChartError(canvas.parentElement?.parentElement, 'Chart.js library not available');
    return;
  }

  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }

  if (!values || values.length === 0) {
    return;
  }

  if (!canvas || !canvas.getContext) {
    return;
  }

  // Take top N items, group rest as "Other"
  let displayLabels = chartLabels.slice(0, maxItems);
  let displayValues = values.slice(0, maxItems);

  if (values.length > maxItems) {
    const otherSum = values.slice(maxItems).reduce((a, b) => a + b, 0);
    displayLabels.push('Other');
    displayValues.push(otherSum);
  }

  const chartColors = getChartColors();
  const isDark = document.body.classList.contains('dark');
  const pieColors = displayValues.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  pieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: displayLabels,
      datasets: [{
        data: displayValues,
        backgroundColor: pieColors,
        borderColor: isDark ? 'rgba(26, 29, 36, 0.8)' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 12,
        hoverBorderWidth: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeInOutCubic' as const
      },
      plugins: {
        legend: {
          display: false
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
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${formatNumber(value)} (${percentage}%)`;
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

   This is the main function that renders the Google Analytics dashboard.
   It handles the GA4 runReport response format.
   ============================================ */

/**
 * Main render function - renders the GA dashboard
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Normalize data to table format (handles GA4 format)
    const tableData = normalizeTableData(data);

    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
      app.sendLog({ level: "warning", data: `Invalid or empty data: ${JSON.stringify(data)}`, logger: APP_NAME });
      showEmpty('No valid data available');
      return;
    }

    // Calculate summary
    const summary = calculateSummary(tableData);

    // Identify dimension and metric columns
    const dimensionCols: number[] = [];
    const metricCols: number[] = [];

    tableData.rows[0].forEach((val: any, idx: number) => {
      if (typeof val === 'number') {
        metricCols.push(idx);
      } else {
        dimensionCols.push(idx);
      }
    });

    // Create dashboard container
    const container = document.createElement('div');
    container.className = 'dashboard-container';

    // Google Analytics Header
    const gaHeader = document.createElement('div');
    gaHeader.className = 'ga-header';
    gaHeader.innerHTML = `
      <div class="ga-logo">
        <div class="ga-logo-icon">
          <span class="icon-inline">${iconGoogleAnalytics()}</span>
        </div>
        <span class="ga-title">
          <span class="ga-google">Google</span>
          <span class="ga-analytics">Analytics</span>
        </span>
      </div>
    `;
    container.appendChild(gaHeader);

    // Dashboard Header
    const header = document.createElement('div');
    header.className = 'dashboard-header';

    const metaInfo: string[] = [];
    metaInfo.push(`${formatNumber(tableData.metadata?.rowCount || tableData.rows.length)} total rows`);
    metaInfo.push(`Showing ${tableData.rows.length} rows`);
    if (tableData.metadata?.timeZone) {
      metaInfo.push(`Timezone: ${escapeHtml(tableData.metadata.timeZone)}`);
    }
    if (tableData.metadata?.currencyCode) {
      metaInfo.push(`Currency: ${escapeHtml(tableData.metadata.currencyCode)}`);
    }

    header.innerHTML = `
      <h1>Page Analytics</h1>
      <div class="meta">
        ${metaInfo.map(m => `<span>${m}</span>`).join('')}
      </div>
    `;
    container.appendChild(header);

    // Toolbar with controls
    const toolbar = document.createElement('div');
    toolbar.className = 'dashboard-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-left">
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
      </div>
      <div class="toolbar-right">
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

    // Store tableData globally for export
    (window as any).currentTableData = tableData;

    // Summary Cards (one per metric column)
    if (summary && Object.keys(summary).length > 0) {
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'summary-cards';

      const summaryKeys = Object.keys(summary);

      summaryKeys.forEach((key, index) => {
        const stat = summary[key];
        const card = document.createElement('div');
        card.className = 'summary-card';

        // Determine icon and type based on metric name
        const lowerKey = key.toLowerCase();
        let iconSvg = iconGoogleAnalytics();
        let metricType = '';

        if (lowerKey.includes('page view') || lowerKey.includes('pageview') || lowerKey.includes('screen')) {
          iconSvg = iconPageView();
          metricType = 'pageviews';
        } else if (lowerKey.includes('user')) {
          iconSvg = iconUsers();
          metricType = 'users';
        } else if (lowerKey.includes('session')) {
          iconSvg = iconSessions();
          metricType = 'sessions';
        } else if (lowerKey.includes('bounce')) {
          iconSvg = iconBounce();
          metricType = 'bounce';
        } else if (lowerKey.includes('conversion')) {
          iconSvg = iconGoogleAnalytics();
          metricType = 'conversions';
        }

        card.innerHTML = `
          <div class="metric-item ${metricType}">
            <div class="metric-icon">
              <span class="icon-inline">${iconSvg}</span>
            </div>
            <div class="metric-content">
              <div class="metric-label">${escapeHtml(key)}</div>
              <div class="metric-value" data-value="${stat.total}">${formatNumber(stat.total)}</div>
              <div class="metric-change">Avg: ${formatNumber(Math.round(stat.average * 100) / 100)} per page</div>
            </div>
          </div>
          <div class="card-details">
            <div>Max: ${formatNumber(stat.max)}</div>
            <div>Min: ${formatNumber(stat.min)}</div>
            <div>Pages: ${stat.count}</div>
          </div>
        `;

        card.addEventListener('click', () => {
          card.classList.toggle('active');
        });

        // Animate counter on load
        setTimeout(() => {
          const valueEl = card.querySelector('.metric-value') as HTMLElement;
          if (valueEl) {
            valueEl.classList.add('animating');
            animateCounter(valueEl, 0, stat.total, 1000);
          }
        }, 100 + index * 100);

        cardsContainer.appendChild(card);
      });

      container.appendChild(cardsContainer);
    }

    // Charts Grid
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-grid';

    // Prepare chart data from first dimension and first metric
    const firstDimCol = dimensionCols[0] !== undefined ? dimensionCols[0] : 0;
    const firstMetricCol = metricCols[0] !== undefined ? metricCols[0] : 1;

    const chartLabels = tableData.rows.map((row: any[]) => String(row[firstDimCol] || ''));
    const chartValues = tableData.rows.map((row: any[]) => {
      const val = row[firstMetricCol];
      return typeof val === 'number' ? val : (parseFloat(val) || 0);
    });

    // Bar Chart (Top Pages)
    if (chartLabels.length > 0 && chartValues.length > 0) {
      const barCard = document.createElement('div');
      barCard.className = 'chart-card';

      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = `Top Pages by ${tableData.columns[firstMetricCol] || 'Metric'}`;
      barCard.appendChild(title);

      const chartWrapper = document.createElement('div');
      chartWrapper.className = 'chart-wrapper';
      chartWrapper.style.position = 'relative';
      chartWrapper.style.height = Math.max(320, Math.min(chartLabels.length, 15) * 32 + 60) + 'px';

      const canvas = document.createElement('canvas');
      canvas.id = 'barchart';
      chartWrapper.appendChild(canvas);
      barCard.appendChild(chartWrapper);

      chartsContainer.appendChild(barCard);
    }

    // Pie Chart (Distribution)
    if (chartLabels.length > 0 && chartValues.length > 0) {
      const pieCard = document.createElement('div');
      pieCard.className = 'chart-card';

      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = `${tableData.columns[firstMetricCol] || 'Metric'} Distribution`;
      pieCard.appendChild(title);

      const chartWrapper = document.createElement('div');
      chartWrapper.className = 'chart-wrapper';
      chartWrapper.style.position = 'relative';

      const canvas = document.createElement('canvas');
      canvas.id = 'piechart';
      chartWrapper.appendChild(canvas);

      // Legend
      const legend = document.createElement('div');
      legend.className = 'chart-legend';

      const total = chartValues.reduce((a: number, b: number) => a + b, 0);
      const maxLegendItems = 10;
      const legendLabels = chartLabels.slice(0, maxLegendItems);
      const legendValues = chartValues.slice(0, maxLegendItems);

      if (chartLabels.length > maxLegendItems) {
        const otherSum = chartValues.slice(maxLegendItems).reduce((a: number, b: number) => a + b, 0);
        legendLabels.push('Other');
        legendValues.push(otherSum);
      }

      legendLabels.forEach((label: string, i: number) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const val = legendValues[i];
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

        legendItem.innerHTML = `
          <span class="legend-color" style="background: ${CHART_COLORS[i % CHART_COLORS.length]}"></span>
          <span>${escapeHtml(String(label))}</span>
          <span style="margin-left: auto; color: #6b7280; font-weight: 600;">${formatNumber(val)} (${pct}%)</span>
        `;

        legend.appendChild(legendItem);
      });

      chartWrapper.appendChild(legend);
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

    // Add rank column
    const rankTh = document.createElement('th');
    rankTh.textContent = '#';
    headerRow.appendChild(rankTh);

    tableData.columns.forEach((col: string, index: number) => {
      const th = document.createElement('th');
      th.className = metricCols.includes(index) ? 'sortable' : '';
      th.textContent = col;
      th.dataset.column = String(index + 1); // +1 for rank column offset
      if (metricCols.includes(index)) {
        th.addEventListener('click', () => sortTable(table, index + 1));
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    tableData.rows.forEach((row: any[], rowIndex: number) => {
      const tr = document.createElement('tr');

      // Rank number
      const rankTd = document.createElement('td');
      rankTd.textContent = String(rowIndex + 1);
      tr.appendChild(rankTd);

      row.forEach((cell: any, cellIndex: number) => {
        const td = document.createElement('td');
        if (dimensionCols.includes(cellIndex)) {
          td.className = 'page-path';
          td.textContent = String(cell || '');
          td.title = String(cell || ''); // Full path on hover
        } else {
          td.textContent = typeof cell === 'number' ? formatNumber(cell) : String(cell || '');
        }
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

    // Setup toolbar interactions
    setTimeout(() => {
      setupToolbarInteractions();
    }, 100);

    // Function to render charts
    const renderCharts = () => {
      if (chartLabels.length > 0 && chartValues.length > 0) {
        const barCanvas = document.getElementById('barchart') as HTMLCanvasElement;
        if (barCanvas && barCanvas.getContext) {
          try {
            renderBarChart(barCanvas, chartLabels, chartValues, 15);
          } catch (error) {
            app.sendLog({ level: "error", data: `Error rendering bar chart: ${JSON.stringify(error)}`, logger: APP_NAME });
            showChartError(barCanvas.closest('.chart-card'), 'Failed to render bar chart: ' + (error as Error).message);
          }
        }

        const pieCanvas = document.getElementById('piechart') as HTMLCanvasElement;
        if (pieCanvas && pieCanvas.getContext) {
          try {
            renderPieChart(pieCanvas, chartValues, chartLabels, 10);
          } catch (error) {
            app.sendLog({ level: "error", data: `Error rendering pie chart: ${JSON.stringify(error)}`, logger: APP_NAME });
            showChartError(pieCanvas.closest('.chart-card'), 'Failed to render pie chart: ' + (error as Error).message);
          }
        }
      }

    };

    // Wait for Chart.js to be available, then render charts
    const waitForChartJS = (attempts = 0, maxAttempts = 100) => {
      const chartJsAvailable = typeof Chart !== 'undefined' && Chart.Chart;
      const chartJsError = (window as any).chartJsLoadError;

      if (chartJsAvailable) {
        setTimeout(() => {
          renderCharts();
        }, 100);
      } else if (chartJsError) {
        app.sendLog({ level: "error", data: 'Chart.js failed to load', logger: APP_NAME });
        const barCanvas = document.getElementById('barchart');
        const pieCanvas = document.getElementById('piechart');
        if (barCanvas) {
          showChartError(barCanvas.closest('.chart-card'), 'Chart.js library failed to load.');
        }
        if (pieCanvas) {
          showChartError(pieCanvas.closest('.chart-card'), 'Chart.js library failed to load.');
        }
      } else if (attempts < maxAttempts) {
        setTimeout(() => waitForChartJS(attempts + 1, maxAttempts), 50);
      } else {
        app.sendLog({ level: "error", data: `Chart.js failed to load after ${maxAttempts} attempts`, logger: APP_NAME });
        const barCanvas = document.getElementById('barchart');
        const pieCanvas = document.getElementById('piechart');
        if (barCanvas) {
          showChartError(barCanvas.closest('.chart-card'), 'Chart.js library failed to load. Please check your browser security settings.');
        }
        if (pieCanvas) {
          showChartError(pieCanvas.closest('.chart-card'), 'Chart.js library failed to load. Please check your browser security settings.');
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
      const barCanvas = document.getElementById('barchart');
      const pieCanvas = document.getElementById('piechart');
      if (barCanvas) {
        showChartError(barCanvas.closest('.chart-card'), 'Chart.js CDN blocked.');
      }
      if (pieCanvas) {
        showChartError(pieCanvas.closest('.chart-card'), 'Chart.js CDN blocked.');
      }
    });

    // Start waiting for Chart.js
    waitForChartJS();

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering dashboard: ${error.message}`);
  }
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
    return;
  }

  // Handle requests that require responses (like ui/resource-teardown)
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    // Clean up chart instances
    if (barChartInstance) {
      barChartInstance.destroy();
      barChartInstance = null;
    }
    if (pieChartInstance) {
      pieChartInstance.destroy();
      pieChartInstance = null;
    }

    // Send response to host
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
        app.sendLog({ level: "warning", data: `ui/notifications/tool-result received but no data found: ${JSON.stringify(msg)}`, logger: APP_NAME });
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
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        app.sendLog({ level: "debug", data: `Tool input received: ${JSON.stringify(toolArguments)}`, logger: APP_NAME });
      }
      break;

    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || 'Tool execution was cancelled';
      showError(`Operation cancelled: ${reason}`);
      break;

    case 'ui/notifications/initialized':
      break;

    default:
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          app.sendLog({ level: "warning", data: `Unknown method: ${msg.method} - attempting to render data`, logger: APP_NAME });
          renderData(fallbackData);
        }
      }
  }
});

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

    setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

/* ============================================
   DISPLAY MODE HANDLING
   ============================================ */

let currentDisplayMode = 'inline';

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
    const container = document.querySelector('.dashboard-container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    const container = document.querySelector('.dashboard-container');
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
      app.sendLog({ level: "warning", data: `Failed to request display mode: ${JSON.stringify(err)}`, logger: APP_NAME });
      throw err;
    });
}

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

app.sendLog({ level: "info", data: "MCP App initialized (proxy mode - SDK utilities only)", logger: APP_NAME });

/* ============================================
   ADVANCED INTERACTIVE FEATURES
   ============================================ */

/**
 * Setup toolbar interactions
 */
function setupToolbarInteractions() {
  // View toggle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function(this: HTMLElement) {
      const view = this.dataset.view;
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const chartsContainer = document.querySelector('.charts-grid');
      const summaryCards = document.querySelector('.summary-cards');
      const tableContainer = document.getElementById('data-table-container');

      if (view === 'table') {
        if (chartsContainer) (chartsContainer as HTMLElement).style.display = 'none';
        if (summaryCards) (summaryCards as HTMLElement).style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
      } else {
        if (chartsContainer) (chartsContainer as HTMLElement).style.display = 'grid';
        if (summaryCards) (summaryCards as HTMLElement).style.display = 'grid';
        if (tableContainer) tableContainer.style.display = 'none';
      }
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

  table.querySelectorAll('th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });

  header.classList.add(isAscending ? 'sort-desc' : 'sort-asc');

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

  rows.forEach(row => tbody.appendChild(row));
}

export {};
