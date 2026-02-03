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
 * Special handling for Firecrawl scrape structures
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
  console.log('[Firecrawl] Unwrapping data:', data);
  
  // Handle direct Firecrawl response format: {success: true, data: {...}}
  if (data.success && data.data) {
    console.log('[Firecrawl] Detected success/data format');
    return data;
  }
  
  // Handle nested content structure from Firecrawl
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
  
  // Direct data structure (but keep the wrapper if it has success flag)
  if (data.data && !data.success) {
    return { data: data.data };
  }
  
  if (data.data) {
    return data;
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
      console.warn('Animation failed, using fallback:', e);
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
  setTimeout(() => {
    notifySizeChanged();
  }, 50);
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
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
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
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
  }
};

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
    console.log('[Firecrawl] Received data:', data);
    
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);
    console.log('[Firecrawl] Unwrapped data:', unwrapped);
    
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
    
    console.log('[Firecrawl] Scrape data:', scrapeData);
    
    if (!scrapeData || (typeof scrapeData === 'object' && Object.keys(scrapeData).length === 0)) {
      console.warn('[Firecrawl] No scrape data found after unwrapping');
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

    // No iframe needed - content is rendered directly

  } catch (error: any) {
    console.error('[Firecrawl] Render error:', error);
    console.error('[Firecrawl] Error stack:', error.stack);
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
  
  console.log('[Firecrawl] Received message event:', event);
  console.log('[Firecrawl] Message data:', msg);
  
  // Handle direct data (not wrapped in JSON-RPC)
  if (msg && typeof msg === 'object' && (msg.success || msg.data || msg.metadata)) {
    console.log('[Firecrawl] Detected direct data format, rendering directly');
    renderData(msg);
    return;
  }
  
  if (!msg || msg.jsonrpc !== '2.0') {
    console.log('[Firecrawl] Message is not JSON-RPC format, skipping');
    return;
  }
  
  if (msg.id !== undefined && !msg.method) {
    console.log('[Firecrawl] Message has ID but no method, skipping');
    return;
  }
  
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params || msg;
      console.log('[Firecrawl] Received tool-result message:', msg);
      console.log('[Firecrawl] Extracted data:', data);
      if (data !== undefined && data !== null) {
        renderData(data);
      } else {
        console.warn('[Firecrawl] ui/notifications/tool-result received but no data found:', msg);
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
      console.log('[Firecrawl] Unknown method:', msg.method, '- attempting to extract data');
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('[Firecrawl] Unknown method:', msg.method, '- attempting to render data');
          renderData(fallbackData);
        }
      } else if (msg.data || msg.success) {
        // Try direct data access
        console.log('[Firecrawl] Attempting direct data access');
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
