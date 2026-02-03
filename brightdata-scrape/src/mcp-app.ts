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
   EXTERNAL DEPENDENCIES
   ============================================ */
// Anime.js is loaded globally, check availability before use
declare const anime: any;

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
 * Special handling for BrightData scrape structures
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
  console.log('[BrightData] Unwrapping data:', data);
  
  // Handle Claude format: {message: {status_code: 200, response_content: "..."}}
  if (data.message && typeof data.message === 'object') {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      // Support both response_content and body fields
      const content = msg.response_content || msg.body;
      if (content !== undefined) {
        console.log('[BrightData] Detected message.status_code format (Claude)');
        return {
          status_code: msg.status_code,
          body: content,
          response_content: content  // Keep both for compatibility
        };
      }
    }
  }
  
  // Handle direct BrightData response format: {status_code: 200, body: "..."} or {status_code: 200, response_content: "..."}
  if (data.status_code !== undefined) {
    const content = data.body || data.response_content;
    if (content !== undefined) {
      console.log('[BrightData] Detected status_code format with content');
      // Return with both fields for maximum compatibility
      return {
        status_code: data.status_code,
        body: content,
        response_content: content
      };
    }
  }
  
  // Handle nested content structure
  if (data.content && Array.isArray(data.content)) {
    // Extract from content array
    const contentItem = data.content[0];
    if (contentItem?.text?.message?.response_content) {
      return contentItem.text.message.response_content;
    }
    if (contentItem?.text?.message) {
      return contentItem.text.message;
    }
  }
  
  // Handle structuredContent structure
  if (data.structuredContent?.message?.response_content) {
    return data.structuredContent.message.response_content;
  }
  
  // Direct data structure
  if (data.data && typeof data.data === 'object') {
    return data.data;
  }
  
  // Standard table format { columns: [], rows: [] }
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  // Format 2: Nested in message.template_data (3rd party MCP clients)
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  // Format 3: Nested in message.response_content (3rd party MCP clients)
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
 * Initialize dark mode based on system preference
 */
function initializeDarkMode() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
    document.body.classList.toggle('dark', e.matches);
  });
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
   TEMPLATE-SPECIFIC FUNCTIONS (BrightData Website Scrape)
   ============================================ */

/**
 * Convert markdown-like text to HTML (simple converter, no scripts)
 */
function convertMarkdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Headers (process in order from most specific to least)
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Lists
  const lines = html.split('\n');
  let inList = false;
  let result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isListItem = /^[-*+]\s+(.+)$/.test(line);
    
    if (isListItem) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      const content = line.replace(/^[-*+]\s+/, '');
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line) {
        // Check if it's already a header
        if (!line.match(/^<h[1-6]>/)) {
          result.push(`<p>${line}</p>`);
        } else {
          result.push(line);
        }
      } else {
        result.push('');
      }
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }
  
  html = result.join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, '');
  html = html.replace(/<p>\s*<\/p>/gim, '');
  
  return html;
}

/**
 * Prepare HTML for safe display
 */
function prepareHtmlForDisplay(html: string): string {
  if (!html) return '';
  
  let preparedHtml = html;
  
  // Remove script tags
  preparedHtml = preparedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  preparedHtml = preparedHtml.replace(/<script[^>]*>/gi, '');
  preparedHtml = preparedHtml.replace(/<\/script>/gi, '');
  
  // Remove inline event handlers
  preparedHtml = preparedHtml.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  preparedHtml = preparedHtml.replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '');
  
  // Remove javascript: URLs
  preparedHtml = preparedHtml.replace(/javascript\s*:/gi, '');
  
  return preparedHtml;
}

/**
 * Extract URL from body content if present
 */
function extractUrlFromContent(body: string): string | null {
  if (!body) return null;
  
  // Try to find URL patterns in the content
  const urlPattern = /(https?:\/\/[^\s\)]+)/gi;
  const matches = body.match(urlPattern);
  if (matches && matches.length > 0) {
    return matches[0];
  }
  
  return null;
}

/**
 * Main render function
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  
  if (!app) {
    console.error('App element not found!');
    return;
  }
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Debug logging
    console.log('[BrightData] Received data:', data);
    
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);
    console.log('[BrightData] Unwrapped data:', unwrapped);
    
    // Handle different data structures
    let scrapeData = null;
    
    // Check if unwrapped has status_code and body (BrightData format)
    if (unwrapped && typeof unwrapped === 'object') {
      if (unwrapped.status_code !== undefined && unwrapped.body !== undefined) {
        scrapeData = unwrapped;
      } else if (unwrapped.data && typeof unwrapped.data === 'object') {
        scrapeData = unwrapped.data;
      } else {
        scrapeData = unwrapped;
      }
    } else {
      scrapeData = unwrapped;
    }
    
    console.log('[BrightData] Scrape data:', scrapeData);
    
    if (!scrapeData || (typeof scrapeData === 'object' && Object.keys(scrapeData).length === 0)) {
      console.warn('[BrightData] No scrape data found after unwrapping');
      showEmpty('No scrape data found');
      return;
    }

    const statusCode = scrapeData.status_code || scrapeData.statusCode || 200;
    // Support both 'body' and 'response_content' fields (Claude uses response_content, others use body)
    const body = scrapeData.body || scrapeData.response_content || scrapeData.content || '';
    const url = scrapeData.url || scrapeData.sourceURL || extractUrlFromContent(body) || 'Unknown URL';
    
    // Build HTML with enhanced structure
    let htmlContent = `
      <div class="container">
        <div class="header-card">
          <div class="header-content">
            <div class="header-icon">
              <span class="material-icons">web</span>
            </div>
            <div class="header-text">
              <h1 class="header-title">BrightData Scrape Result</h1>
              <div class="url-bar">
                <span class="material-icons url-icon">link</span>
                <span class="url-text">${escapeHtml(url)}</span>
              </div>
            </div>
            <div class="status-indicator">
              <div class="status-badge ${statusCode >= 400 ? 'error' : 'success'}">
                <span class="material-icons status-icon">${statusCode >= 400 ? 'error' : 'check_circle'}</span>
                <span>${statusCode}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">info</span>
            <h2>Scrape Information</h2>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="material-icons info-icon">http</span>
              <div class="info-content">
                <span class="info-label">Status Code</span>
                <span class="status-badge-inline ${statusCode >= 400 ? 'error' : 'success'}">${statusCode}</span>
              </div>
            </div>
            <div class="info-item">
              <span class="material-icons info-icon">description</span>
              <div class="info-content">
                <span class="info-label">Content Length</span>
                <span class="info-value">${body ? body.length.toLocaleString() : '0'} characters</span>
              </div>
            </div>
          </div>
        </div>
    `;

    // Add content section
    if (body) {
      const cleanHtml = prepareHtmlForDisplay(body);
      const markdownHtml = convertMarkdownToHTML(cleanHtml);
      
      htmlContent += `
        <div class="content-section animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">article</span>
            <h2>Scraped Content</h2>
          </div>
          <div class="markdown-render-container">
            ${markdownHtml || escapeHtml(body)}
          </div>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="content-section animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">code</span>
            <h2>Content</h2>
          </div>
          <div class="html-placeholder">
            <span class="material-icons placeholder-icon">description</span>
            <p>No content available for this scrape.</p>
            <p class="placeholder-subtitle">The website may have blocked scraping or returned an empty response.</p>
          </div>
        </div>
      `;
    }

    htmlContent += `</div>`;

    app.innerHTML = htmlContent;

    // Animate elements on load (only in main document, not iframe)
    const isAnimeAvailable = typeof window !== 'undefined' && 
                            typeof (window as any).anime !== 'undefined' &&
                            window.self === window.top; // Not in iframe
    
    if (isAnimeAvailable) {
      try {
        (window as any).anime({
          targets: '.animate-item',
          opacity: [0, 1],
          translateY: [20, 0],
          delay: (window as any).anime.stagger(100),
          duration: 600,
          easing: 'easeOutQuad'
        });
      } catch (e) {
        // Fallback: use CSS animations if anime fails
        console.warn('Anime.js animation failed, using CSS fallback:', e);
        document.querySelectorAll('.animate-item').forEach((el, index) => {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.transform = 'translateY(0)';
        });
      }
    } else {
      // Fallback: show elements immediately without animation
      document.querySelectorAll('.animate-item').forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'translateY(0)';
      });
    }

  } catch (error: any) {
    console.error('[BrightData] Render error:', error);
    console.error('[BrightData] Error stack:', error.stack);
    showError(`Error rendering data: ${error.message || 'Unknown error'}`);
    // Notify size even on error
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
  }
  
  // Notify host of size change after rendering completes
  // Use setTimeout to ensure DOM is fully updated
  setTimeout(() => {
    notifySizeChanged();
  }, 50);
}

/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  console.log('[BrightData] Received message event:', event);
  console.log('[BrightData] Message data:', msg);
  
  // Handle direct data (not wrapped in JSON-RPC)
  // Check for Claude format: {message: {status_code, response_content}}
  if (msg && typeof msg === 'object') {
    if (msg.message && msg.message.status_code !== undefined) {
      console.log('[BrightData] Detected Claude message format, rendering directly');
      renderData(msg);
      return;
    }
    if (msg.status_code !== undefined || msg.body !== undefined || msg.response_content !== undefined) {
      console.log('[BrightData] Detected direct data format, rendering directly');
      renderData(msg);
      return;
    }
  }
  
  if (!msg || msg.jsonrpc !== '2.0') {
    console.log('[BrightData] Message is not JSON-RPC format, skipping');
    return;
  }
  
  if (msg.id !== undefined && !msg.method) {
    console.log('[BrightData] Message has ID but no method, skipping');
    return;
  }
  
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params || msg;
      console.log('[BrightData] Received tool-result message:', msg);
      console.log('[BrightData] Extracted data:', data);
      if (data !== undefined && data !== null) {
        renderData(data);
      } else {
        console.warn('[BrightData] ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;
      
    case 'ui/notifications/host-context-changed':
      if (msg.params?.theme === 'dark') {
        document.body.classList.add('dark');
      } else if (msg.params?.theme === 'light') {
        document.body.classList.remove('dark');
      }
      // Handle display mode changes
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;
      
    case 'ui/notifications/tool-input':
      // Tool input notification (optional - handle if needed)
      break;
      
    case 'ui/notifications/initialized':
      // Initialization notification (optional - handle if needed)
      break;
      
    default:
      // Unknown method - try to extract data as fallback
      console.log('[BrightData] Unknown method:', msg.method, '- attempting to extract data');
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('[BrightData] Unknown method:', msg.method, '- attempting to render data');
          renderData(fallbackData);
        }
      } else if (msg.message || msg.status_code || msg.body || msg.response_content) {
        // Try direct data access (including Claude format)
        console.log('[BrightData] Attempting direct data access');
        renderData(msg);
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
  // Notify host of size change after mode change
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
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
   SIZE CHANGE NOTIFICATIONS
   ============================================ */

function notifySizeChanged() {
  const width = document.body.scrollWidth || document.documentElement.scrollWidth;
  const height = document.body.scrollHeight || document.documentElement.scrollHeight;
  
  sendNotification('ui/notifications/size-changed', {
    width: width,
    height: height
  });
}

// Debounce function to avoid too many notifications
let sizeChangeTimeout: NodeJS.Timeout | null = null;
function debouncedNotifySizeChanged() {
  if (sizeChangeTimeout) {
    clearTimeout(sizeChangeTimeout);
  }
  sizeChangeTimeout = setTimeout(() => {
    notifySizeChanged();
  }, 100); // Wait 100ms after last change
}

// Use ResizeObserver to detect size changes
let resizeObserver: ResizeObserver | null = null;
function setupSizeObserver() {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      debouncedNotifySizeChanged();
    });
    resizeObserver.observe(document.body);
  } else {
    // Fallback: use window resize and mutation observer
    window.addEventListener('resize', debouncedNotifySizeChanged);
    const mutationObserver = new MutationObserver(debouncedNotifySizeChanged);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // Send initial size after a short delay to ensure content is rendered
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

/* ============================================
   INITIALIZATION
   ============================================ */

// Initialize MCP App - REQUIRED for MCP Apps protocol
sendRequest('ui/initialize', {
  appCapabilities: {
    availableDisplayModes: ["inline", "fullscreen"]
  }
}).then((ctx: any) => {
  // Apply theme from host context
  if (ctx?.theme === 'dark') {
    document.body.classList.add('dark');
  } else if (ctx?.theme === 'light') {
    document.body.classList.remove('dark');
  }
  // Handle display mode from host context
  if (ctx?.displayMode) {
    handleDisplayModeChange(ctx.displayMode);
  }
  // Handle container dimensions if provided
  if (ctx?.containerDimensions) {
    const dims = ctx.containerDimensions;
    if (dims.width) {
      document.body.style.width = dims.width + 'px';
    }
    if (dims.height) {
      document.body.style.height = dims.height + 'px';
    }
    if (dims.maxWidth) {
      document.body.style.maxWidth = dims.maxWidth + 'px';
    }
    if (dims.maxHeight) {
      document.body.style.maxHeight = dims.maxHeight + 'px';
    }
  }
}).catch(err => {
  console.warn('Failed to initialize MCP App:', err);
  // Fallback to system preference if initialization fails
});

initializeDarkMode();

// Setup size observer to notify host of content size changes
// This is critical for the host to properly size the iframe
setupSizeObserver();
