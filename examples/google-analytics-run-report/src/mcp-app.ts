/* ============================================
   GOOGLE ANALYTICS RUN REPORT — MCP APP
   ============================================
   Renders GA4 Data API runReport responses with
   summary cards, sortable table, line/bar/pie charts,
   pagination, CSV export, and dark-mode support.
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

/* ── App Config ── */

const APP_NAME = "Google Analytics Report";
const APP_VERSION = "1.0.0";

/* ── Types ── */

interface DimensionHeader {
  name: string;
}

interface MetricHeader {
  name: string;
  type: string;
}

interface DimensionValue {
  value: string;
}

interface MetricValue {
  value: string;
}

interface GARow {
  dimensionValues: DimensionValue[];
  metricValues: MetricValue[];
}

interface GAResponse {
  dimensionHeaders: DimensionHeader[];
  metricHeaders: MetricHeader[];
  rows: GARow[];
  totals?: GARow[];
  maximums?: GARow[];
  minimums?: GARow[];
  rowCount: number;
  metadata?: { currencyCode?: string; timeZone?: string };
  kind?: string;
}

interface Column {
  key: string;
  label: string;
  type: "dimension" | "metric";
  dataType?: string;
}

interface TransformedRow {
  [key: string]: string | number;
}

/* ── State ── */

let currentView: "table" | "chart" = "table";
let chartType: "line" | "bar" | "pie" = "line";
let sortKey: string | null = null;
let sortDir: "asc" | "desc" = "desc";
let currentPage = 1;
const PAGE_SIZE = 15;

/* keep references for re-render */
let cachedResponse: GAResponse | null = null;
let cachedColumns: Column[] = [];
let cachedRows: TransformedRow[] = [];

/* ── GA4 Colors (Google brand) ── */

const GA_COLORS = [
  "#4285F4", // Blue
  "#EA4335", // Red
  "#FBBC04", // Yellow
  "#34A853", // Green
  "#FF6D01", // Orange
  "#46BDC6", // Teal
  "#7BAAF7", // Light blue
  "#F07B72", // Light red
];

/* ── Utilities ── */

function unwrapData(data: any): any {
  if (!data) return null;

  // Direct GA response with headers
  if (data.message?.response_content) return normalizeGA(data.message.response_content);
  if (data.message?.template_data) return normalizeGA(data.message.template_data);
  if (data.response_content) return normalizeGA(data.response_content);
  if (data.template_data) return normalizeGA(data.template_data);

  // Already a GA response
  if (data.dimensionHeaders && data.metricHeaders && Array.isArray(data.rows)) {
    return normalizeGA(data);
  }

  // Template preview columnar format:
  // { rows: { columns: ["dimensionValues","metricValues"], rows: [[dimArr, metArr], ...] } }
  if (
    data.rows &&
    typeof data.rows === "object" &&
    !Array.isArray(data.rows) &&
    Array.isArray(data.rows.columns) &&
    Array.isArray(data.rows.rows)
  ) {
    return reconstructFromColumnar(data.rows);
  }

  return normalizeGA(data);
}

/**
 * Reconstruct a GA-compatible response from the columnar preview format.
 * The preview format has columns: ["dimensionValues","metricValues"]
 * and rows as arrays: [[dimArray, metricArray], ...]
 */
function reconstructFromColumnar(columnar: any): GAResponse | null {
  const rows: GARow[] = [];
  const rawRows = columnar.rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) return null;

  // Each raw row is an array [dimensionValues, metricValues]
  // dimensionValues = [{value: "..."}, ...]
  // metricValues = [{value: "..."}, ...]
  let dimCount = 0;
  let metricCount = 0;

  for (const raw of rawRows) {
    if (!Array.isArray(raw)) continue;
    const dims: DimensionValue[] = Array.isArray(raw[0]) ? raw[0] : [];
    const mets: MetricValue[] = Array.isArray(raw[1]) ? raw[1] : [];
    dimCount = Math.max(dimCount, dims.length);
    metricCount = Math.max(metricCount, mets.length);
    rows.push({ dimensionValues: dims, metricValues: mets });
  }

  if (rows.length === 0) return null;

  // Infer dimension headers — detect dates by pattern YYYYMMDD
  const dimensionHeaders: DimensionHeader[] = [];
  for (let i = 0; i < dimCount; i++) {
    const sample = rows[0]?.dimensionValues[i]?.value ?? "";
    const isDate = /^\d{8}$/.test(sample);
    dimensionHeaders.push({ name: isDate ? "date" : `dimension${i}` });
  }

  // Infer metric headers — all numeric, default to TYPE_INTEGER
  const metricHeaders: MetricHeader[] = [];
  for (let i = 0; i < metricCount; i++) {
    // Try to guess metric names from common GA patterns
    const defaultNames = [
      "sessions", "activeUsers", "newUsers",
      "screenPageViews", "bounceRate", "eventCount",
      "conversions", "totalRevenue",
    ];
    const name = i < defaultNames.length ? defaultNames[i] : `metric${i}`;
    const sample = rows[0]?.metricValues[i]?.value ?? "0";
    const num = parseFloat(sample);
    const hasDecimal = sample.includes(".");
    const type = hasDecimal ? "TYPE_FLOAT" : "TYPE_INTEGER";
    metricHeaders.push({ name, type });
  }

  return {
    dimensionHeaders,
    metricHeaders,
    rows,
    rowCount: rows.length,
    metadata: {},
    kind: "analyticsData#runReport",
  };
}

/**
 * Normalize a GA response — ensure rows are object-format, not array-format.
 * Some wrappers convert {dimensionValues, metricValues} into [dimArr, metArr].
 */
function normalizeGA(data: any): any {
  if (!data || !data.rows) return data;
  // If rows are already object-format, return as-is
  if (!Array.isArray(data.rows)) return data;
  if (data.rows.length === 0) return data;

  const first = data.rows[0];
  // Already correct format
  if (first.dimensionValues && first.metricValues) return data;

  // Array format: each row is [dimensionValues, metricValues]
  if (Array.isArray(first)) {
    data.rows = data.rows.map((r: any) => ({
      dimensionValues: Array.isArray(r[0]) ? r[0] : [],
      metricValues: Array.isArray(r[1]) ? r[1] : [],
    }));
  }

  return data;
}

function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str ?? "");
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const el = document.getElementById("app");
  if (el) el.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message = "No data available.") {
  const el = document.getElementById("app");
  if (el) el.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/* ── Label Formatting ── */

const DIMENSION_LABELS: Record<string, string> = {
  country: "Country",
  city: "City",
  date: "Date",
  dateHour: "Date & Hour",
  deviceCategory: "Device",
  sessionSource: "Source",
  sessionMedium: "Medium",
  sessionDefaultChannelGrouping: "Channel",
  eventName: "Event Name",
  pagePath: "Page Path",
  pageTitle: "Page Title",
  landingPage: "Landing Page",
  operatingSystem: "OS",
  browser: "Browser",
  language: "Language",
  region: "Region",
  continent: "Continent",
};

const METRIC_LABELS: Record<string, string> = {
  activeUsers: "Active Users",
  sessions: "Sessions",
  screenPageViews: "Page Views",
  bounceRate: "Bounce Rate",
  averageSessionDuration: "Avg Duration",
  conversions: "Conversions",
  eventCount: "Event Count",
  engagedSessions: "Engaged Sessions",
  engagementRate: "Engagement Rate",
  newUsers: "New Users",
  totalUsers: "Total Users",
  totalRevenue: "Revenue",
  transactions: "Transactions",
  userEngagementDuration: "Engagement Duration",
  screenPageViewsPerSession: "Pages / Session",
  sessionsPerUser: "Sessions / User",
  dauPerMau: "DAU / MAU",
  dauPerWau: "DAU / WAU",
  wauPerMau: "WAU / MAU",
};

function humanize(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function dimLabel(name: string): string {
  return DIMENSION_LABELS[name] || humanize(name);
}

function metLabel(name: string): string {
  return METRIC_LABELS[name] || humanize(name);
}

/* ── Value Formatting ── */

function formatDate(v: string): string {
  if (v.length === 8) {
    const y = v.substring(0, 4);
    const m = v.substring(4, 6);
    const d = v.substring(6, 8);
    const dt = new Date(`${y}-${m}-${d}`);
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return v;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatDimValue(val: string, dimName: string): string {
  if (dimName === "date") return formatDate(val);
  if (dimName === "deviceCategory")
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  return val;
}

function formatMetricDisplay(val: number, dataType?: string): string {
  switch (dataType) {
    case "TYPE_INTEGER":
      return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "TYPE_FLOAT":
      return val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "TYPE_CURRENCY":
      return val.toLocaleString("en-US", {
        style: "currency",
        currency: cachedResponse?.metadata?.currencyCode || "USD",
      });
    case "TYPE_SECONDS":
      return formatDuration(val);
    case "TYPE_MILLISECONDS":
      return formatDuration(val / 1000);
    case "TYPE_MINUTES":
      return formatDuration(val * 60);
    case "TYPE_HOURS":
      return formatDuration(val * 3600);
    default:
      if (val >= 0 && val <= 1 && val !== 0) {
        return (val * 100).toFixed(2) + "%";
      }
      return val.toLocaleString("en-US");
  }
}

/* ── Data Transformation ── */

function buildColumns(res: GAResponse): Column[] {
  const cols: Column[] = [];
  for (const h of res.dimensionHeaders) {
    cols.push({ key: h.name, label: dimLabel(h.name), type: "dimension" });
  }
  for (const h of res.metricHeaders) {
    cols.push({
      key: h.name,
      label: metLabel(h.name),
      type: "metric",
      dataType: h.type,
    });
  }
  return cols;
}

function transformRows(res: GAResponse): TransformedRow[] {
  return res.rows.map((row) => {
    const tr: TransformedRow = {};
    res.dimensionHeaders.forEach((h, i) => {
      tr[h.name] = row.dimensionValues[i].value;
    });
    res.metricHeaders.forEach((h, i) => {
      const raw = row.metricValues[i].value;
      tr[h.name] = parseFloat(raw);
      tr[`${h.name}_raw`] = raw;
    });
    return tr;
  });
}

function computeTotals(
  rows: TransformedRow[],
  columns: Column[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const col of columns) {
    if (col.type === "metric") {
      totals[col.key] = rows.reduce(
        (sum, r) => sum + (typeof r[col.key] === "number" ? (r[col.key] as number) : 0),
        0,
      );
    }
  }
  return totals;
}

/* ── Sorting ── */

function sortRows(rows: TransformedRow[]): TransformedRow[] {
  if (!sortKey) return rows;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[`${sortKey}_raw`] ?? a[sortKey!];
    const bv = b[`${sortKey}_raw`] ?? b[sortKey!];
    if (typeof av === "string" && typeof bv === "string")
      return av.localeCompare(bv) * dir;
    return (Number(av) - Number(bv)) * dir;
  });
}

/* ── Chart Type Suggestion ── */

function suggestChartType(res: GAResponse): "line" | "bar" | "pie" {
  const dim0 = res.dimensionHeaders[0]?.name;
  if (dim0 === "date" || dim0 === "dateHour") return "line";
  if (res.rows.length <= 8 && res.metricHeaders.length === 1) return "pie";
  return "bar";
}

/* ── SVG Chart Rendering ── */

function renderLineChart(
  res: GAResponse,
  rows: TransformedRow[],
  columns: Column[],
): string {
  const metrics = columns.filter((c) => c.type === "metric");
  const dimKey = res.dimensionHeaders[0]?.name;
  const isDimDate = dimKey === "date" || dimKey === "dateHour";

  /* Sort by dimension for time series */
  const sorted = isDimDate
    ? [...rows].sort((a, b) =>
        String(a[dimKey] ?? "").localeCompare(String(b[dimKey] ?? "")),
      )
    : rows;

  const labels = sorted.map((r) =>
    formatDimValue(String(r[dimKey] ?? ""), dimKey),
  );
  const n = labels.length;
  if (n === 0) return "<p>No data to chart</p>";

  const W = 800;
  const H = 260;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 50;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  /* compute global max across all metrics */
  let globalMax = 0;
  for (const m of metrics) {
    for (const r of sorted) {
      const v = typeof r[m.key] === "number" ? (r[m.key] as number) : 0;
      if (v > globalMax) globalMax = v;
    }
  }
  if (globalMax === 0) globalMax = 1;
  const ceiling = niceMax(globalMax);

  const xStep = n > 1 ? plotW / (n - 1) : plotW;

  /* grid lines */
  const gridLines = 5;
  let gridHtml = "";
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + plotH - (plotH / gridLines) * i;
    const val = Math.round((ceiling / gridLines) * i);
    gridHtml += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="ga-grid-line"/>`;
    gridHtml += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="ga-axis-label">${shortNum(val)}</text>`;
  }

  /* x labels (show ~10 max) */
  const labelStep = Math.max(1, Math.ceil(n / 10));
  let xLabelsHtml = "";
  for (let i = 0; i < n; i += labelStep) {
    const x = padL + i * xStep;
    const lbl =
      labels[i].length > 12 ? labels[i].substring(0, 12) + "…" : labels[i];
    xLabelsHtml += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="ga-axis-label">${escapeHtml(lbl)}</text>`;
  }

  /* lines + areas + dots */
  let linesHtml = "";
  metrics.forEach((m, mi) => {
    const color = GA_COLORS[mi % GA_COLORS.length];
    const pts = sorted.map((r, i) => {
      const v = typeof r[m.key] === "number" ? (r[m.key] as number) : 0;
      const x = padL + i * xStep;
      const y = padT + plotH - (v / ceiling) * plotH;
      return { x, y, v };
    });

    /* area */
    const areaPath =
      `M${pts[0].x},${padT + plotH}` +
      pts.map((p) => `L${p.x},${p.y}`).join("") +
      `L${pts[pts.length - 1].x},${padT + plotH}Z`;
    linesHtml += `<path d="${areaPath}" fill="${color}" class="ga-chart-area"/>`;

    /* line */
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join("");
    linesHtml += `<path d="${linePath}" stroke="${color}" class="ga-chart-line"/>`;

    /* dots */
    for (const p of pts) {
      linesHtml += `<circle cx="${p.x}" cy="${p.y}" r="3.5" stroke="${color}" class="ga-chart-dot"
        data-tooltip="${escapeHtml(formatMetricDisplay(p.v, m.dataType))}"/>`;
    }
  });

  const legend = metrics
    .map(
      (m, i) =>
        `<span class="ga-legend-item"><span class="ga-legend-dot" style="background:${GA_COLORS[i % GA_COLORS.length]}"></span>${escapeHtml(m.label)}</span>`,
    )
    .join("");

  return `
    <div class="ga-chart-canvas-wrapper">
      <svg viewBox="0 0 ${W} ${H}" class="ga-chart-svg" preserveAspectRatio="xMidYMid meet">
        ${gridHtml}${xLabelsHtml}${linesHtml}
      </svg>
    </div>
    <div class="ga-chart-legend">${legend}</div>`;
}

function renderBarChart(
  res: GAResponse,
  rows: TransformedRow[],
  columns: Column[],
): string {
  const metrics = columns.filter((c) => c.type === "metric");
  const dimKey = res.dimensionHeaders[0]?.name;
  const display = rows.slice(0, 20); /* cap bars */

  const labels = display.map((r) =>
    formatDimValue(String(r[dimKey] ?? ""), dimKey),
  );
  const n = labels.length;
  if (n === 0) return "<p>No data to chart</p>";

  const W = 800;
  const H = 280;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 70;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let globalMax = 0;
  for (const m of metrics)
    for (const r of display) {
      const v = typeof r[m.key] === "number" ? (r[m.key] as number) : 0;
      if (v > globalMax) globalMax = v;
    }
  if (globalMax === 0) globalMax = 1;
  const ceiling = niceMax(globalMax);

  const groupW = plotW / n;
  const barCount = metrics.length;
  const barW = Math.min(28, (groupW - 8) / barCount);

  /* grid */
  const gridLines = 5;
  let gridHtml = "";
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + plotH - (plotH / gridLines) * i;
    const val = Math.round((ceiling / gridLines) * i);
    gridHtml += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="ga-grid-line"/>`;
    gridHtml += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="ga-axis-label">${shortNum(val)}</text>`;
  }

  /* bars */
  let barsHtml = "";
  display.forEach((r, ri) => {
    const groupX = padL + ri * groupW;
    const labelX = groupX + groupW / 2;
    const lbl =
      labels[ri].length > 10
        ? labels[ri].substring(0, 10) + "…"
        : labels[ri];
    barsHtml += `<text x="${labelX}" y="${H - padB + 16}" text-anchor="middle" class="ga-axis-label" transform="rotate(-30 ${labelX} ${H - padB + 16})">${escapeHtml(lbl)}</text>`;

    metrics.forEach((m, mi) => {
      const v = typeof r[m.key] === "number" ? (r[m.key] as number) : 0;
      const barH = (v / ceiling) * plotH;
      const x =
        groupX + (groupW - barCount * barW) / 2 + mi * barW;
      const y = padT + plotH - barH;
      const color = GA_COLORS[mi % GA_COLORS.length];
      barsHtml += `<rect x="${x}" y="${y}" width="${barW - 2}" height="${barH}" fill="${color}" class="ga-chart-bar"/>`;
    });
  });

  const legend = metrics
    .map(
      (m, i) =>
        `<span class="ga-legend-item"><span class="ga-legend-dot" style="background:${GA_COLORS[i % GA_COLORS.length]}"></span>${escapeHtml(m.label)}</span>`,
    )
    .join("");

  return `
    <div class="ga-chart-canvas-wrapper">
      <svg viewBox="0 0 ${W} ${H}" class="ga-chart-svg" preserveAspectRatio="xMidYMid meet">
        ${gridHtml}${barsHtml}
      </svg>
    </div>
    <div class="ga-chart-legend">${legend}</div>`;
}

function renderPieChart(
  res: GAResponse,
  rows: TransformedRow[],
  columns: Column[],
): string {
  const metricCol = columns.find((c) => c.type === "metric");
  if (!metricCol) return "<p>No metrics to chart</p>";
  const dimKey = res.dimensionHeaders[0]?.name;
  const display = rows.slice(0, 10);

  const values = display.map((r) =>
    typeof r[metricCol.key] === "number" ? (r[metricCol.key] as number) : 0,
  );
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return "<p>All values are zero</p>";

  const cx = 120;
  const cy = 120;
  const radius = 100;
  let cumAngle = -Math.PI / 2;

  let slicesHtml = "";
  values.forEach((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(cumAngle);
    const y1 = cy + radius * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + radius * Math.cos(cumAngle);
    const y2 = cy + radius * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = GA_COLORS[i % GA_COLORS.length];
    slicesHtml += `<path d="M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${color}" class="ga-pie-slice"/>`;
  });

  const legendRows = display
    .map((r, i) => {
      const lbl = formatDimValue(String(r[dimKey] ?? ""), dimKey);
      const pct = ((values[i] / total) * 100).toFixed(1);
      return `<div class="ga-pie-legend-row">
        <span class="ga-pie-legend-color" style="background:${GA_COLORS[i % GA_COLORS.length]}"></span>
        <span>${escapeHtml(lbl)}</span>
        <span class="ga-pie-legend-value">${formatMetricDisplay(values[i], metricCol.dataType)} (${pct}%)</span>
      </div>`;
    })
    .join("");

  return `
    <div class="ga-pie-container">
      <svg viewBox="0 0 240 240" width="240" height="240">${slicesHtml}</svg>
      <div class="ga-pie-legend">${legendRows}</div>
    </div>`;
}

/* ── Helpers ── */

function niceMax(val: number): number {
  if (val <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  const norm = val / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/* ── CSV Export ── */

function exportCSV() {
  if (!cachedResponse) return;
  const cols = cachedColumns;
  const rows = cachedRows;

  const header = cols.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c.key];
          if (c.type === "dimension") {
            const formatted = formatDimValue(String(v), c.key);
            return `"${formatted.replace(/"/g, '""')}"`;
          }
          return typeof v === "number"
            ? formatMetricDisplay(v, c.dataType)
            : String(v);
        })
        .join(","),
    )
    .join("\n");

  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ga-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ── GA Logo SVG ── */

const GA_LOGO_SVG = `<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg"><path d="M130 29v132c0 14.77 10.19 23 21 23 10 0 21-7 21-23V30c0-13.54-10-22-21-22s-21 8.46-21 21z" fill="#F9AB00"/><path d="M75 96v65c0 14.77 10.19 23 21 23 10 0 21-7 21-23V97c0-13.54-10-22-21-22s-21 8.46-21 21z" fill="#E37400"/><circle cx="41" cy="163" r="21" fill="#E37400"/></svg>`;

/* ── Main Render ── */

function renderData(data: any) {
  const el = document.getElementById("app");
  if (!el) return;
  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    if (!unwrapped || !unwrapped.dimensionHeaders || !unwrapped.rows) {
      showEmpty("Invalid Google Analytics response — missing headers or rows.");
      return;
    }

    const res = unwrapped as GAResponse;
    if (res.rows.length === 0) {
      showEmpty("No rows returned. Try adjusting your date range or filters.");
      return;
    }

    cachedResponse = res;
    cachedColumns = buildColumns(res);
    cachedRows = transformRows(res);

    /* auto-suggest chart type on first load */
    if (!sortKey) {
      chartType = suggestChartType(res);
    }

    render();
  } catch (err: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(err)}`, logger: APP_NAME });
    showError(`Error rendering data: ${err.message}`);
  }
}

function render() {
  const el = document.getElementById("app");
  if (!el || !cachedResponse) return;

  const res = cachedResponse;
  const columns = cachedColumns;
  const sorted = sortRows(cachedRows);
  const totals = res.totals
    ? buildTotalsFromGA(res)
    : computeTotals(cachedRows, columns);

  /* Summary cards */
  const summaryHtml = columns
    .filter((c) => c.type === "metric")
    .map(
      (c) => `
      <div class="ga-summary-card">
        <div class="ga-card-label">${escapeHtml(c.label)}</div>
        <div class="ga-card-value">${formatMetricDisplay(totals[c.key] ?? 0, c.dataType)}</div>
      </div>`,
    )
    .join("");

  /* Table or chart */
  let contentHtml: string;
  if (currentView === "chart") {
    contentHtml = renderChart(res, sorted, columns);
  } else {
    contentHtml = renderTable(sorted, columns, totals);
  }

  /* Metadata */
  const tz = res.metadata?.timeZone ?? "";
  const curr = res.metadata?.currencyCode ?? "";
  const metaParts = [
    `${res.rowCount.toLocaleString()} rows`,
    tz ? `TZ: ${tz}` : "",
    curr ? `Currency: ${curr}` : "",
  ]
    .filter(Boolean)
    .join(
      ` <span class="ga-meta-sep"></span> `,
    );

  el.innerHTML = `
    <div class="ga-container">
      <div class="ga-header">
        <div class="ga-header-left">
          <span class="ga-logo">${GA_LOGO_SVG}</span>
          <span class="ga-title">Analytics Report</span>
        </div>
        <div class="ga-meta">${metaParts}</div>
      </div>

      <div class="ga-summary-cards">${summaryHtml}</div>

      <div class="ga-controls">
        <div class="ga-view-toggle">
          <button class="ga-view-btn ${currentView === "table" ? "active" : ""}" data-view="table">Table</button>
          <button class="ga-view-btn ${currentView === "chart" ? "active" : ""}" data-view="chart">Chart</button>
        </div>
        ${
          currentView === "chart"
            ? `<select class="ga-chart-select" data-action="chart-type">
                <option value="line" ${chartType === "line" ? "selected" : ""}>Line</option>
                <option value="bar" ${chartType === "bar" ? "selected" : ""}>Bar</option>
                <option value="pie" ${chartType === "pie" ? "selected" : ""}>Pie</option>
              </select>`
            : ""
        }
        <button class="ga-export-btn" data-action="export">Export CSV</button>
      </div>

      ${contentHtml}

      <div class="ga-footer">
        <span>Google Analytics Data API</span>
        <span>${res.kind ?? "analyticsData#runReport"}</span>
      </div>
    </div>`;

  bindEvents();
}

function renderChart(
  res: GAResponse,
  rows: TransformedRow[],
  columns: Column[],
): string {
  const html =
    chartType === "pie"
      ? renderPieChart(res, rows, columns)
      : chartType === "bar"
        ? renderBarChart(res, rows, columns)
        : renderLineChart(res, rows, columns);
  return `<div class="ga-chart-container">${html}</div>`;
}

function renderTable(
  rows: TransformedRow[],
  columns: Column[],
  totals: Record<string, number>,
): string {
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  /* header */
  const thead = columns
    .map((c) => {
      const isSorted = sortKey === c.key;
      const arrow = isSorted ? (sortDir === "asc" ? "&#9650;" : "&#9660;") : "&#9660;";
      return `<th class="${c.type === "metric" ? "metric" : ""} ${isSorted ? "sorted" : ""}" data-sort="${c.key}">
        ${escapeHtml(c.label)}<span class="ga-sort-icon">${arrow}</span>
      </th>`;
    })
    .join("");

  /* body */
  const tbody = pageRows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => {
            if (c.type === "dimension") {
              return `<td>${escapeHtml(formatDimValue(String(r[c.key] ?? ""), c.key))}</td>`;
            }
            const v = typeof r[c.key] === "number" ? (r[c.key] as number) : 0;
            return `<td class="metric">${formatMetricDisplay(v, c.dataType)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  /* totals */
  const tfoot = `<tr>${columns
    .map((c, i) => {
      if (i === 0 && c.type === "dimension") return `<td>Total</td>`;
      if (c.type === "dimension") return `<td></td>`;
      return `<td class="metric">${formatMetricDisplay(totals[c.key] ?? 0, c.dataType)}</td>`;
    })
    .join("")}</tr>`;

  /* pagination */
  let pagHtml = "";
  if (totalPages > 1) {
    const pages: string[] = [];
    pages.push(
      `<button class="ga-page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>&lsaquo;</button>`,
    );
    const range = paginationRange(currentPage, totalPages);
    for (const p of range) {
      if (p === 0) {
        pages.push(`<span style="padding:0 4px;color:#80868b">…</span>`);
      } else {
        pages.push(
          `<button class="ga-page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`,
        );
      }
    }
    pages.push(
      `<button class="ga-page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>&rsaquo;</button>`,
    );
    pagHtml = `<div class="ga-pagination">
      <span>Showing ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length}</span>
      <div class="ga-pagination-controls">${pages.join("")}</div>
    </div>`;
  }

  return `
    <div class="ga-table-wrapper">
      <div class="ga-table-scroll">
        <table class="ga-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
          <tfoot>${tfoot}</tfoot>
        </table>
      </div>
      ${pagHtml}
    </div>`;
}

function buildTotalsFromGA(res: GAResponse): Record<string, number> {
  const totals: Record<string, number> = {};
  const row = res.totals![0];
  res.metricHeaders.forEach((h, i) => {
    totals[h.name] = parseFloat(row.metricValues[i].value);
  });
  return totals;
}

function paginationRange(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: number[] = [];
  pages.push(1);
  if (current > 3) pages.push(0); /* ellipsis */
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push(0);
  pages.push(total);
  return pages;
}

/* ── Event Binding ── */

function bindEvents() {
  /* View toggle */
  document.querySelectorAll<HTMLButtonElement>(".ga-view-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view as "table" | "chart";
      render();
    }),
  );

  /* Chart type */
  const chartSel = document.querySelector<HTMLSelectElement>(
    '[data-action="chart-type"]',
  );
  if (chartSel) {
    chartSel.addEventListener("change", () => {
      chartType = chartSel.value as "line" | "bar" | "pie";
      render();
    });
  }

  /* Export */
  const exportBtn = document.querySelector<HTMLButtonElement>(
    '[data-action="export"]',
  );
  if (exportBtn) exportBtn.addEventListener("click", exportCSV);

  /* Sort */
  document
    .querySelectorAll<HTMLTableCellElement>(".ga-table th[data-sort]")
    .forEach((th) =>
      th.addEventListener("click", () => {
        const key = th.dataset.sort!;
        if (sortKey === key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = key;
          sortDir = "desc";
        }
        currentPage = 1;
        render();
      }),
    );

  /* Pagination */
  document
    .querySelectorAll<HTMLButtonElement>(".ga-page-btn[data-page]")
    .forEach((btn) =>
      btn.addEventListener("click", () => {
        const v = btn.dataset.page!;
        if (v === "prev") currentPage = Math.max(1, currentPage - 1);
        else if (v === "next") currentPage++;
        else currentPage = parseInt(v, 10);
        render();
      }),
    );
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
