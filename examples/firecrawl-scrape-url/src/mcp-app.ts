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
   FIRECRAWL SCRAPE URL MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   with app.connect() for standalone initialization.
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

const APP_NAME = "Firecrawl Scrape Url";
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
 * Special handling for Firecrawl scrape structures
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
   TEMPLATE-SPECIFIC FUNCTIONS (Firecrawl Website Scrape)
   ============================================ */

let currentZoom = 1.0;

/**
 * Format metadata value for display
 */
function formatMetadataValue(value: any): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value || 'N/A';
}

/**
 * Convert markdown to HTML (simple converter, no scripts)
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
 * Prepare HTML for iframe display
 */
function prepareHtmlForIframe(html: string): string {
  if (!html) return '';

  let preparedHtml = html;

  // Aggressively remove ALL script tags (including malformed ones)
  // Use multiple passes to catch all variations
  preparedHtml = preparedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  preparedHtml = preparedHtml.replace(/<script[^>]*>/gi, '');
  preparedHtml = preparedHtml.replace(/<\/script>/gi, '');

  // Remove script tags with various attributes
  preparedHtml = preparedHtml.replace(/<script\s+[^>]*>/gi, '');

  // Remove inline event handlers
  preparedHtml = preparedHtml.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  preparedHtml = preparedHtml.replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '');

  // Remove javascript: URLs
  preparedHtml = preparedHtml.replace(/javascript\s*:/gi, '');

  // Remove any remaining references to anime or window.anime
  preparedHtml = preparedHtml.replace(/\bwindow\s*\.\s*anime\b/gi, 'null');
  preparedHtml = preparedHtml.replace(/\banime\s*=/gi, 'var _anime_removed =');
  preparedHtml = preparedHtml.replace(/\banimejs\b/gi, 'null');

  // Remove any eval or Function constructors
  preparedHtml = preparedHtml.replace(/\beval\s*\(/gi, '/* eval removed */ null(');
  preparedHtml = preparedHtml.replace(/\bFunction\s*\(/gi, '/* Function removed */ null(');

  // Check if HTML already has a viewport meta tag
  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(preparedHtml);

  if (!hasViewport) {
    // Inject viewport meta tag in the head
    if (/<head[^>]*>/i.test(preparedHtml)) {
      preparedHtml = preparedHtml.replace(
        /(<head[^>]*>)/i,
        '$1<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">'
      );
    } else if (/<html[^>]*>/i.test(preparedHtml)) {
      // If no head tag, add one after html tag
      preparedHtml = preparedHtml.replace(
        /(<html[^>]*>)/i,
        '$1<head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"></head>'
      );
    } else {
      // If no html tag, wrap in html structure
      preparedHtml = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"></head><body>' + preparedHtml + '</body></html>';
    }
  } else {
    // Update existing viewport meta tag to ensure proper scaling
    preparedHtml = preparedHtml.replace(
      /<meta[^>]*name=["']viewport["'][^>]*>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">'
    );
  }

  // Add CSS to ensure content fits within iframe
  if (/<head[^>]*>/i.test(preparedHtml)) {
    const fitCss = `
      <style>
        body {
          margin: 0;
          padding: 8px;
          overflow-x: auto;
          min-width: fit-content;
        }
        img, video, iframe {
          max-width: 100%;
          height: auto;
        }
        table {
          max-width: 100%;
          overflow-x: auto;
          display: block;
        }
      </style>
    `;
    preparedHtml = preparedHtml.replace(
      /(<head[^>]*>)/i,
      '$1' + fitCss
    );
  }

  return preparedHtml;
}

/**
 * Switch tab with animation
 */
(window as any).switchTab = function(tabName: string, buttonElement: HTMLElement) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  if (buttonElement) {
    buttonElement.classList.add('active');
  }

  // Animate tab switch
  const activeContent = document.querySelector('.tab-content.active');
  const targetTab = document.getElementById(`${tabName}-tab`);

  // Check if anime is available and we're in the main document (not iframe)
  const isAnimeAvailable = typeof window !== 'undefined' &&
                          typeof (window as any).anime !== 'undefined' &&
                          window.self === window.top; // Not in iframe

  if (activeContent && targetTab && isAnimeAvailable) {
    try {
      // Fade out current tab
      (window as any).anime({
        targets: activeContent,
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 200,
        easing: 'easeInOutQuad',
        complete: () => {
          activeContent.classList.remove('active');
          targetTab.classList.add('active');

          // Fade in new tab
          (window as any).anime({
            targets: targetTab,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 300,
            easing: 'easeOutQuad'
          });
        }
      });
    } catch (e) {
      // Fallback if animation fails
      app.sendLog({ level: "warning", data: `Animation failed, using fallback: ${e}`, logger: APP_NAME });
      activeContent.classList.remove('active');
      if (targetTab) {
        targetTab.classList.add('active');
      }
    }
  } else {
    // Fallback without animation
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    if (targetTab) {
      targetTab.classList.add('active');
    }
  }

  // Notify size change when switching tabs
};

/**
 * Adjust zoom
 */
(window as any).adjustZoom = function(delta: number) {
  const iframe = document.getElementById('html-preview-iframe') as HTMLIFrameElement;
  const zoomValue = document.getElementById('zoom-value');

  if (iframe && zoomValue) {
    currentZoom = Math.max(0.25, Math.min(2.0, currentZoom + delta));
    iframe.style.transform = `scale(${currentZoom})`;
    iframe.style.transformOrigin = 'top left';
    iframe.style.width = `${100 / currentZoom}%`;
    iframe.style.height = `${800 / currentZoom}px`;
    zoomValue.textContent = Math.round(currentZoom * 100) + '%';

    // Notify size change
  }
};

/**
 * Reset zoom
 */
(window as any).resetZoom = function() {
  const iframe = document.getElementById('html-preview-iframe') as HTMLIFrameElement;
  const zoomValue = document.getElementById('zoom-value');

  if (iframe && zoomValue) {
    currentZoom = 1.0;
    iframe.style.transform = '';
    iframe.style.width = '100%';
    iframe.style.height = '800px';
    zoomValue.textContent = '100%';

    // Notify size change
  }
};

/**
 * Main render function
 */
function renderData(data: any) {
  const appEl = document.getElementById('app');

  if (!appEl) {
    app.sendLog({ level: "error", data: "App element not found!", logger: APP_NAME });
    return;
  }

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Debug logging
    app.sendLog({ level: "debug", data: `Received data: ${JSON.stringify(data)}`, logger: APP_NAME });

    // Unwrap nested data structures
    const unwrapped = unwrapData(data);
    app.sendLog({ level: "debug", data: `Unwrapped data: ${JSON.stringify(unwrapped)}`, logger: APP_NAME });

    // Handle different data structures
    let scrapeData = null;

    // Check if unwrapped has a data property (e.g., {success: true, data: {...}})
    if (unwrapped && typeof unwrapped === 'object') {
      if (unwrapped.data && typeof unwrapped.data === 'object') {
        scrapeData = unwrapped.data;
      } else if (unwrapped.success && unwrapped.data) {
        scrapeData = unwrapped.data;
      } else {
        scrapeData = unwrapped;
      }
    } else {
      scrapeData = unwrapped;
    }

    app.sendLog({ level: "debug", data: `Scrape data: ${JSON.stringify(scrapeData)}`, logger: APP_NAME });

    if (!scrapeData || (typeof scrapeData === 'object' && Object.keys(scrapeData).length === 0)) {
      app.sendLog({ level: "warning", data: "No scrape data found after unwrapping", logger: APP_NAME });
      showEmpty('No scrape data found');
      return;
    }

    const metadata = scrapeData.metadata || {};
    const html = scrapeData.html || null;
    const markdown = scrapeData.markdown || null;
    const url = scrapeData.url || scrapeData.sourceURL || metadata.url || 'Unknown URL';
    const statusCode = scrapeData.statusCode || scrapeData.status_code || 200;
    const contentType = scrapeData.contentType || scrapeData.content_type || 'text/html';
    const cachedAt = scrapeData.cachedAt || scrapeData.cached_at;
    const creditsUsed = scrapeData.creditsUsed || scrapeData.credits_used;

    // Keep contentHtml for HTML content, markdown will be rendered separately
    let contentHtml = html;

    // Extract OG image URL
    const ogImage = metadata['og:image'] || metadata.ogImage || null;

    // Build metadata items
    const metadataItems: Array<{label: string, value: string, isLink?: boolean}> = [];
    if (metadata.title) metadataItems.push({ label: 'Title', value: metadata.title });
    if (metadata.description) metadataItems.push({ label: 'Description', value: metadata.description });
    if (metadata['og:title']) metadataItems.push({ label: 'OG Title', value: metadata['og:title'] });
    if (metadata['og:description']) metadataItems.push({ label: 'OG Description', value: metadata['og:description'] });
    if (ogImage) metadataItems.push({ label: 'OG Image', value: ogImage, isLink: true });
    if (metadata.language) metadataItems.push({ label: 'Language', value: metadata.language });
    if (metadata.keywords) metadataItems.push({ label: 'Keywords', value: formatMetadataValue(metadata.keywords) });
    if (metadata.generator) metadataItems.push({ label: 'Generator', value: metadata.generator });

    // Build HTML with enhanced structure
    let htmlContent = `
      <div class="container">
        <div class="header-card">
          <div class="header-content">
            <div class="header-icon">
              <span class="material-icons">language</span>
            </div>
            <div class="header-text">
              <h1 class="header-title">${escapeHtml(metadata.title || 'Scraped Website')}</h1>
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

        ${ogImage ? `
        <div class="og-image-preview animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">image</span>
            <h3>Open Graph Image</h3>
          </div>
          <div class="og-image-container">
            <img src="${escapeHtml(ogImage)}" alt="Open Graph Image" onerror="this.parentElement.innerHTML='<div class=\\'og-image-error\\'><span class=\\'material-icons\\'>broken_image</span><p>Failed to load image</p></div>'">
          </div>
        </div>
        ` : ''}

        <div class="metadata-card animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">info</span>
            <h2>Metadata</h2>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="material-icons info-icon">http</span>
              <div class="info-content">
                <span class="info-label">Status Code</span>
                <span class="status-badge-inline ${statusCode >= 400 ? 'error' : 'success'}">${statusCode}</span>
              </div>
            </div>
            ${contentType ? `
            <div class="info-item">
              <span class="material-icons info-icon">description</span>
              <div class="info-content">
                <span class="info-label">Content Type</span>
                <span class="info-value">${escapeHtml(contentType)}</span>
              </div>
            </div>
            ` : ''}
            ${cachedAt ? `
            <div class="info-item">
              <span class="material-icons info-icon">schedule</span>
              <div class="info-content">
                <span class="info-label">Cached</span>
                <span class="info-value">${escapeHtml(new Date(cachedAt).toLocaleString())}</span>
              </div>
            </div>
            ` : ''}
            ${creditsUsed ? `
            <div class="info-item">
              <span class="material-icons info-icon">star</span>
              <div class="info-content">
                <span class="info-label">Credits Used</span>
                <span class="info-value">${creditsUsed}</span>
              </div>
            </div>
            ` : ''}
          </div>
          ${metadataItems.length > 0 ? `
            <div class="metadata-grid">
              ${metadataItems.map((item, index) => `
                <div class="metadata-item animate-item" style="animation-delay: ${index * 0.05}s">
                  <div class="metadata-label">
                    <span class="material-icons metadata-icon">label</span>
                    ${escapeHtml(item.label)}
                  </div>
                  <div class="metadata-value">
                    ${item.isLink ? `<a href="${escapeHtml(item.value)}" target="_blank" rel="noopener noreferrer"><span class="material-icons link-icon">open_in_new</span>${escapeHtml(item.value)}</a>` : escapeHtml(item.value)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
    `;

    // Add content section - render markdown directly, skip iframe/scripts
    if (markdown || contentHtml) {
      // If we have markdown, render it directly without iframe
      if (markdown) {
        htmlContent += `
          <div class="content-section animate-item">
            <div class="section-header">
              <span class="material-icons section-icon">article</span>
              <h2>Content</h2>
            </div>
            <div class="markdown-render-container">
              ${convertMarkdownToHTML(markdown)}
            </div>
          </div>
        `;
      } else if (contentHtml) {
        // For HTML content, render directly without iframe
        const cleanHtml = prepareHtmlForIframe(contentHtml);
        htmlContent += `
          <div class="content-section animate-item">
            <div class="section-header">
              <span class="material-icons section-icon">code</span>
              <h2>Content Preview</h2>
            </div>
            <div class="html-render-container">
              ${cleanHtml}
            </div>
          </div>
        `;
      }
    } else {
      htmlContent += `
        <div class="content-section animate-item">
          <div class="section-header">
            <span class="material-icons section-icon">code</span>
            <h2>Content</h2>
          </div>
          <div class="html-placeholder">
            <span class="material-icons placeholder-icon">description</span>
            <p>No HTML content available for this scrape.</p>
            <p class="placeholder-subtitle">The website may have blocked scraping or returned only metadata.</p>
          </div>
        </div>
      `;
    }

    htmlContent += `</div>`;

    appEl.innerHTML = htmlContent;

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
        app.sendLog({ level: "warning", data: `Anime.js animation failed, using CSS fallback: ${e}`, logger: APP_NAME });
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

    // No iframe needed - content is rendered directly

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${error}`, logger: APP_NAME });
    app.sendLog({ level: "error", data: `Error stack: ${error.stack}`, logger: APP_NAME });
    showError(`Error rendering data: ${error.message || 'Unknown error'}`);
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
  app.sendLog({ level: "error", data: `App error: ${error}`, logger: APP_NAME });
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
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${error}`, logger: APP_NAME });
  });

export {};
