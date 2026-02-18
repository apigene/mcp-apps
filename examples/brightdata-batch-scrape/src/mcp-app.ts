/* ============================================
   BRIGHTDATA BATCH SCRAPE MCP APP
   ============================================
   
   Displays multiple scrape results in a tabbed interface.
   Each scrape result is shown in its own dedicated tab.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "BrightData Batch Scrape";

const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================
   Marked.js is loaded from CDN for markdown parsing
   ============================================ */

declare const marked: any;

/* ============================================
   BRIGHTDATA BATCH SCRAPE MCP APP (SDK VERSION)
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


const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Extract data from MCP protocol messages
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
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
  // Handle Claude format: {message: {status_code: 200, response_content: {...}}}
  if (data.message && typeof data.message === 'object') {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      const content = msg.response_content || msg.body;
      if (content !== undefined) {
        return {
          status_code: msg.status_code,
          body: content,
          response_content: content
        };
      }
    }
  }
  
  // Handle direct BrightData response format
  if (data.status_code !== undefined) {
    const content = data.body || data.response_content;
    if (content !== undefined) {
      return {
        status_code: data.status_code,
        body: content,
        response_content: content
      };
    }
  }
  
  // Format 1: Standard table format
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  // Format 2: Nested in message.template_data
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  // Format 3: Nested in message.response_content
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  // Format 4: Common nested patterns
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;
  
  // Format 5: Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  // Format 6: If data itself is an array
  if (Array.isArray(data)) {
    return { rows: data };
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
        console.warn('Invalid base URL:', baseUrl);
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
    console.error('Markdown parsing error:', error);
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
  
  // Notify size change after tab switch
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
    
    // Notify host of size change after rendering completes
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering scrape results: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    // Handle direct data (not wrapped in JSON-RPC)
    if (msg && typeof msg === 'object') {
      if (msg.message && msg.message.status_code !== undefined) {
        renderData(msg);
        return;
      }
      if (msg.status_code !== undefined || msg.body !== undefined || msg.response_content !== undefined) {
        renderData(msg);
        return;
      }
    }
    return;
  }
  
  // Handle requests that require responses (like ui/resource-teardown)
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
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
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
      } else if (msg.message || msg.status_code || msg.body || msg.response_content) {
        renderData(msg);
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
