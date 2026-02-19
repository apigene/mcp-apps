/* ============================================
   BRIGHTDATA BATCH SCRAPE MCP APP (STANDALONE MODE)
   ============================================

   Displays multiple scrape results in a tabbed interface.
   Each scrape result is shown in its own dedicated tab.

   Uses app.connect() for standalone MCP Apps protocol communication.
   ============================================ */

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================
   Marked.js is loaded from CDN for markdown parsing
   ============================================ */

declare const marked: any;

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

const APP_NAME = "BrightData Batch Scrape";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Unwrap nested API response structures
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
  if (typeof str !== "string") return String(str || '');
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
 */
function showEmpty(message: string = 'No scrape results found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Truncate text to a certain length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Batch Scrape)
   ============================================ */

/**
 * Extract scrape results from BrightData API response
 */
function extractScrapes(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle BrightData format: {status_code: 200, body: [{url: "...", content: "..."}, ...]}
  const content = unwrapped.body || unwrapped.response_content;

  if (content && Array.isArray(content)) {
    return content;
  }

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Format content for display using markdown parser
 * Handles both markdown and HTML content
 */
function formatContent(content: string, baseUrl?: string): string {
  if (!content) return '<p class="no-content">No content available</p>';

  // Check if marked is available
  if (typeof marked === 'undefined') {
    // Fallback to simple formatting if marked is not loaded
    const escaped = escapeHtml(content);
    const withBreaks = escaped.replace(/\n/g, '<br>');
    return `<div class="scrape-content">${withBreaks}</div>`;
  }

  try {
    // Configure marked options
    marked.setOptions({
      breaks: true, // Convert \n to <br>
      gfm: true, // GitHub Flavored Markdown
      headerIds: false, // Don't add IDs to headers
      mangle: false, // Don't mangle email addresses
    });

    // Process relative URLs in markdown links
    let processedContent = content;

    // Convert relative URLs in markdown links to absolute URLs
    if (baseUrl) {
      try {
        const baseUrlObj = new URL(baseUrl);

        // Process markdown links [text](/path)
        processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
          // If URL is already absolute, keep it
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return match;
          }
          // Convert relative URL to absolute
          try {
            const absoluteUrl = new URL(url, baseUrlObj.href).href;
            return `[${text}](${absoluteUrl})`;
          } catch {
            return match;
          }
        });

        // Process HTML links <a href="/path">text</a>
        processedContent = processedContent.replace(/<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, (match, url, text) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return match;
          }
          try {
            const absoluteUrl = new URL(url, baseUrlObj.href).href;
            return `<a href="${escapeHtml(absoluteUrl)}" target="_blank" rel="noopener">${text}</a>`;
          } catch {
            return match;
          }
        });
      } catch (e) {
        // If baseUrl is invalid, continue without URL processing
        app.sendLog({ level: "warning", data: `Invalid base URL: ${JSON.stringify(baseUrl)}`, logger: APP_NAME });
      }
    }

    // Check if content looks like HTML (contains HTML tags)
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(processedContent);

    if (hasHtmlTags) {
      // Content appears to be HTML, but may also contain markdown
      // First, try to parse as markdown (which handles HTML too)
      const html = marked.parse(processedContent);
      return `<div class="scrape-content markdown-body">${html}</div>`;
    } else {
      // Content appears to be plain text/markdown
      const html = marked.parse(processedContent);
      return `<div class="scrape-content markdown-body">${html}</div>`;
    }
  } catch (error) {
    app.sendLog({ level: "error", data: `Markdown parsing error: ${JSON.stringify(error)}`, logger: APP_NAME });
    // Fallback to escaped content
    const escaped = escapeHtml(content);
    const withBreaks = escaped.replace(/\n/g, '<br>');
    return `<div class="scrape-content">${withBreaks}</div>`;
  }
}

/**
 * Switch to a specific tab
 */
let currentTabIndex = 0;

function switchTab(index: number) {
  currentTabIndex = index;

  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach((panel, i) => {
    if (i === index) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// Make switchTab globally accessible
(window as any).switchTab = switchTab;

/**
 * Render scrape tab button
 */
function renderTabButton(scrape: any, index: number): string {
  const url = scrape.url || 'Untitled';
  const domain = extractDomain(url) || url;
  const tabLabel = truncateText(domain, 30);
  const isActive = index === 0 ? 'active' : '';

  return `
    <button
      class="tab-button ${isActive}"
      onclick="switchTab(${index})"
      title="${escapeHtml(url)}"
    >
      <span class="tab-icon">🌐</span>
      <span class="tab-label">${escapeHtml(tabLabel)}</span>
    </button>
  `;
}

/**
 * Render scrape tab panel
 */
function renderTabPanel(scrape: any, index: number): string {
  const url = scrape.url || '';
  const content = scrape.content || '';
  const domain = extractDomain(url);
  const isActive = index === 0 ? 'active' : '';

  return `
    <div class="tab-panel ${isActive}" data-index="${index}">
      <div class="panel-header">
        <div class="panel-url">
          <span class="url-icon">🔗</span>
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="url-link">
            ${escapeHtml(url)}
          </a>
        </div>
        ${domain ? `<div class="panel-domain">Domain: ${escapeHtml(domain)}</div>` : ''}
      </div>
      <div class="panel-content">
        ${formatContent(content, url)}
      </div>
    </div>
  `;
}

/**
 * Main render function
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Extract scrapes
    const scrapes = extractScrapes(data);

    if (!scrapes || scrapes.length === 0) {
      showEmpty('No scrape results found');
      return;
    }

    currentTabIndex = 0;

    // Create container
    const container = document.createElement('div');
    container.className = 'batch-scrape-container';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-content">
        <div class="header-title-row">
          <div class="brightdata-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1>Batch Scrape Results</h1>
        </div>
        <div class="meta-info">
          <span id="total-scrapes">${scrapes.length} URL${scrapes.length !== 1 ? 's' : ''} scraped</span>
        </div>
      </div>
    `;
    container.appendChild(header);

    // Tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';

    // Tabs header
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'tabs-header';
    tabsHeader.id = 'tabs-header';

    scrapes.forEach((scrape: any, index: number) => {
      tabsHeader.innerHTML += renderTabButton(scrape, index);
    });

    tabsContainer.appendChild(tabsHeader);

    // Tabs content
    const tabsContent = document.createElement('div');
    tabsContent.className = 'tabs-content';
    tabsContent.id = 'tabs-content';

    scrapes.forEach((scrape: any, index: number) => {
      tabsContent.innerHTML += renderTabPanel(scrape, index);
    });

    tabsContainer.appendChild(tabsContent);
    container.appendChild(tabsContainer);

    app.innerHTML = '';
    app.appendChild(container);

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering scrape results: ${error.message}`);
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
