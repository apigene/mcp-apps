/* ============================================
   FIRECRAWL WEBSITE SCRAPE MCP APP
   ============================================
   
   Professional markdown renderer for Firecrawl scraped content
   ============================================ */

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

function unwrapData(data: any): any {
  if (!data) return null;
  
  // Handle Firecrawl response format: {status_code, headers, body: {success, data: {...}}}
  if (data.body?.success && data.body?.data) {
    return data.body.data;
  }
  
  // Handle direct body format
  if (data.body && typeof data.body === 'object') {
    return data.body;
  }
  
  // Handle nested in structuredContent
  if (data.structuredContent?.body?.data) {
    return data.structuredContent.body.data;
  }
  
  // Handle direct data format
  if (data.data) {
    return data.data;
  }
  
  // Standard table format
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0)) {
    return data;
  }
  
  // Nested patterns
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  
  return data;
}

function initializeDarkMode() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
    document.body.classList.toggle('dark', e.matches);
  });
}

function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

function showEmpty(message: string = 'No data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Headers (process from most specific to least)
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
  
  // Images in markdown (CSP-aware: external images require resourceDomains)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, src) => {
    const escapedAlt = escapeHtml(alt || '');
    const escapedSrc = escapeHtml(src);
    return `<img src="${escapedSrc}" alt="${escapedAlt}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';" />`;
  });
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  html = html.replace(/^\*\*\*$/gim, '<hr>');
  
  // Process lists and paragraphs line by line
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      result.push('');
      continue;
    }
    
    // Check for unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }
    
    // Check for ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${olMatch[1]}</li>`);
      continue;
    }
    
    // Close list if open
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
    
    // Check if it's already a header, hr, or code block
    if (trimmed.match(/^<[h1-6]|^<hr|^<pre|^<\/pre/)) {
      result.push(trimmed);
    } else {
      // Regular paragraph
      result.push(`<p>${trimmed}</p>`);
    }
  }
  
  // Close any open list
  if (inList) {
    result.push(`</${listType}>`);
  }
  
  html = result.join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, '');
  html = html.replace(/<p>\s*<\/p>/gim, '');
  
  return html;
}

/**
 * Format metadata value
 */
function formatMetadataValue(value: any): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value || 'N/A');
}

/**
 * Extract image domains from content for CSP configuration
 * This helps identify which domains need to be allowed in CSP resourceDomains
 * 
 * Note: CSP must be configured server-side in resources/read response.
 * This function is for informational/debugging purposes.
 */
function extractImageDomainsForCSP(scrapeData: any, metadata: any, ogImage: string | null): string[] {
  const domains = new Set<string>();
  
  // Extract from OG image
  if (ogImage) {
    try {
      const url = new URL(ogImage);
      domains.add(`${url.protocol}//${url.hostname}`);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Extract from markdown images
  const markdown = scrapeData?.markdown || '';
  if (typeof markdown === 'string') {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
      try {
        const url = new URL(match[1]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  // Extract from HTML content if available
  const html = scrapeData?.html || '';
  if (typeof html === 'string') {
    const imgSrcRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      try {
        const url = new URL(match[1]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  return Array.from(domains);
}

/**
 * Get embedded SVG icon
 */
function getIcon(name: string, size: number = 24): string {
  const icons: Record<string, string> = {
    'language': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/></svg>`,
    'link': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor"/></svg>`,
    'content_copy': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>`,
    'check': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>`,
    'check_circle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`,
    'error': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>`,
    'image': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>`,
    'broken_image': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-3.99z" fill="currentColor"/></svg>`,
    'info': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>`,
    'http': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 11h-2V9H1v6h1.5v-2.5h2V15H6V9H4.5v2zm2.5-.5h1.5V15H10v-4.5h1.5V9H7v1.5zm5.5 0H14V15h1.5v-4.5H17V9h-4.5v1.5zm9-1.5H18v6h1.5v-2h2c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5zm0 2.5h-2v-1h2v1z" fill="currentColor"/></svg>`,
    'description': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>`,
    'schedule': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/></svg>`,
    'star': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" fill="currentColor"/></svg>`,
    'label': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" fill="currentColor"/></svg>`,
    'open_in_new': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/></svg>`,
    'article': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/></svg>`,
    'expand_more': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z" fill="currentColor"/></svg>`,
    'expand_less': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z" fill="currentColor"/></svg>`,
    'vertical_align_top': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 11h3v10h2v-10h3l-4-4-4 4zM4 3v2h16V3H4z" fill="currentColor"/></svg>`
  };
  
  return icons[name] || `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`;
}

/**
 * Copy text to clipboard
 */
(window as any).copyToClipboard = function(text: string, button: HTMLElement) {
  navigator.clipboard.writeText(text).then(() => {
    const iconSvg = button.querySelector('svg');
    if (iconSvg) {
      const originalSvg = iconSvg.outerHTML;
      iconSvg.outerHTML = getIcon('check', 18);
      button.classList.add('copied');
      setTimeout(() => {
        const checkIcon = button.querySelector('svg');
        if (checkIcon) {
          checkIcon.outerHTML = originalSvg;
        }
        button.classList.remove('copied');
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};

/**
 * Toggle section expand/collapse
 */
(window as any).toggleSection = function(sectionId: string) {
  const content = document.getElementById(`${sectionId}-content`);
  const iconContainer = document.querySelector(`#${sectionId}-content`)?.closest('.section-header')?.querySelector('.expand-icon');
  
  if (content && iconContainer) {
    const isExpanded = !content.classList.contains('collapsed');
    content.classList.toggle('collapsed', isExpanded);
    iconContainer.innerHTML = getIcon(isExpanded ? 'expand_more' : 'expand_less', 20);
    iconContainer.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    
    setTimeout(() => {
      notifySizeChanged();
    }, 300);
  }
};

/**
 * Scroll to top
 */
(window as any).scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Unwrap nested data structures
    const unwrapped = unwrapData(data);
    
    // Extract Firecrawl data
    const scrapeData = unwrapped?.data || unwrapped;
    const markdown = scrapeData?.markdown || '';
    const metadata = scrapeData?.metadata || {};
    const statusCode = data?.status_code || scrapeData?.statusCode || scrapeData?.status_code || 200;
    const url = metadata?.url || scrapeData?.url || scrapeData?.sourceURL || 'Unknown URL';
    const contentType = scrapeData?.contentType || metadata?.contentType || 'text/html';
    const cachedAt = scrapeData?.cachedAt || scrapeData?.cached_at;
    const creditsUsed = scrapeData?.creditsUsed || scrapeData?.credits_used;
    
    if (!markdown) {
      showEmpty('No markdown content found');
      return;
    }
    
    // Convert markdown to HTML
    const markdownHtml = markdownToHtml(markdown);
    
    // Extract OG image
    const ogImage = metadata['og:image'] || metadata.ogImage || null;
    
    // Extract image domains for CSP configuration (can be sent to server via notification)
    // Note: CSP must be configured server-side in resources/read, but we can help extract domains
    const imageDomains = extractImageDomainsForCSP(scrapeData, metadata, ogImage);
    if (imageDomains.length > 0) {
      // Log domains for debugging (server should use these in CSP config)
      console.debug('CSP: Image domains detected:', imageDomains);
      // Optionally notify host/server about required domains
      // This is informational - actual CSP config must be set server-side
    }
    
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
    
    // Build HTML
    app.innerHTML = `
      <div class="container">
        <div class="header-card">
          <div class="header-gradient"></div>
          <div class="header-content">
            <div class="header-icon">
              ${getIcon('language', 28)}
            </div>
            <div class="header-text">
              <h1 class="header-title">${escapeHtml(metadata.title || 'Scraped Website')}</h1>
              <div class="url-bar">
                <span class="url-icon">${getIcon('link', 18)}</span>
                <span class="url-text">${escapeHtml(url)}</span>
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(url)}', this)" title="Copy URL">
                  ${getIcon('content_copy', 18)}
                </button>
              </div>
            </div>
            <div class="status-badge ${statusCode >= 400 ? 'error' : 'success'}" title="HTTP Status Code">
              ${getIcon(statusCode >= 400 ? 'error' : 'check_circle', 18)}
              <span>${statusCode}</span>
            </div>
          </div>
        </div>

        ${ogImage ? `
        <div class="og-image-card">
          <div class="section-header">
            <span class="section-icon">${getIcon('image', 24)}</span>
            <h3>Open Graph Image</h3>
            <button class="section-action-btn" onclick="toggleSection('og-image')" title="Toggle section">
              <span class="expand-icon">${getIcon('expand_more', 20)}</span>
            </button>
          </div>
          <div class="section-content" id="og-image-content">
            <div class="og-image-wrapper">
              <!-- 
                CSP Note: External images require resourceDomains in _meta.ui.csp
                If image fails to load, check server CSP configuration.
                See CSP_CONFIG.md for details.
              -->
              <img 
                src="${escapeHtml(ogImage)}" 
                alt="Open Graph Image" 
                loading="lazy"
                referrerpolicy="no-referrer"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                onload="this.nextElementSibling.style.display='none';">
              <div class="og-image-error" style="display: none;">
                ${getIcon('broken_image', 48)}
                <span>Failed to load image</span>
                <small style="display: block; margin-top: 8px; opacity: 0.7;">
                  This may be due to CSP restrictions. Check server CSP configuration.
                </small>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="metadata-card">
          <div class="section-header">
            <span class="section-icon">${getIcon('info', 24)}</span>
            <h2>Metadata</h2>
            <button class="section-action-btn" onclick="toggleSection('metadata')" title="Toggle section">
              <span class="expand-icon">${getIcon('expand_more', 20)}</span>
            </button>
          </div>
          <div class="section-content" id="metadata-content">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-icon">${getIcon('http', 24)}</span>
              <div class="info-content">
                <span class="info-label">Status Code</span>
                <span class="info-value-badge ${statusCode >= 400 ? 'error' : 'success'}">${statusCode}</span>
              </div>
            </div>
            ${contentType ? `
            <div class="info-item">
              <span class="info-icon">${getIcon('description', 24)}</span>
              <div class="info-content">
                <span class="info-label">Content Type</span>
                <span class="info-value">${escapeHtml(contentType)}</span>
              </div>
            </div>
            ` : ''}
            ${cachedAt ? `
            <div class="info-item">
              <span class="info-icon">${getIcon('schedule', 24)}</span>
              <div class="info-content">
                <span class="info-label">Cached</span>
                <span class="info-value">${escapeHtml(new Date(cachedAt).toLocaleString())}</span>
              </div>
            </div>
            ` : ''}
            ${creditsUsed ? `
            <div class="info-item">
              <span class="info-icon">${getIcon('star', 24)}</span>
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
                <div class="metadata-item" style="animation-delay: ${index * 0.03}s">
                  <div class="metadata-label">
                    <span class="metadata-icon">${getIcon('label', 16)}</span>
                    ${escapeHtml(item.label)}
                  </div>
                  <div class="metadata-value">
                    ${item.isLink ? `<a href="${escapeHtml(item.value)}" target="_blank" rel="noopener noreferrer"><span class="link-icon">${getIcon('open_in_new', 16)}</span>${escapeHtml(item.value)}</a>` : escapeHtml(item.value)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          </div>
        </div>

        <div class="content-card">
          <div class="section-header">
            <span class="section-icon">${getIcon('article', 24)}</span>
            <h2>Content</h2>
            <div class="section-actions">
              <button class="section-action-btn" onclick="scrollToTop()" title="Scroll to top">
                ${getIcon('vertical_align_top', 20)}
              </button>
              <button class="section-action-btn" onclick="toggleSection('content')" title="Toggle section">
                <span class="expand-icon">${getIcon('expand_more', 20)}</span>
              </button>
            </div>
          </div>
          <div class="section-content" id="content-content">
            <div class="markdown-content">
              ${markdownHtml}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Notify host of size change after rendering completes
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
  }
}

/* ============================================
   MESSAGE HANDLER
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  // Handle direct data (not wrapped in JSON-RPC)
  if (msg && typeof msg === 'object' && (msg.body || msg.status_code || msg.success)) {
    renderData(msg);
    return;
  }
  
  if (!msg || msg.jsonrpc !== '2.0') {
    return;
  }
  
  if (msg.id !== undefined && !msg.method) {
    return;
  }
  
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params || msg;
      if (data !== undefined) {
        renderData(data);
      } else {
        showEmpty('No data received');
      }
      break;
      
    case 'ui/notifications/host-context-changed':
      if (msg.params?.theme === 'dark') {
        document.body.classList.add('dark');
      } else if (msg.params?.theme === 'light') {
        document.body.classList.remove('dark');
      }
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;
      
    default:
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          renderData(fallbackData);
        }
      } else if (msg.body || msg.status_code) {
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
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '';
      (container as HTMLElement).style.padding = '';
    }
  }
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

let sizeChangeTimeout: NodeJS.Timeout | null = null;
function debouncedNotifySizeChanged() {
  if (sizeChangeTimeout) {
    clearTimeout(sizeChangeTimeout);
  }
  sizeChangeTimeout = setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

let resizeObserver: ResizeObserver | null = null;
function setupSizeObserver() {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      debouncedNotifySizeChanged();
    });
    resizeObserver.observe(document.body);
  } else {
    window.addEventListener('resize', debouncedNotifySizeChanged);
    const mutationObserver = new MutationObserver(debouncedNotifySizeChanged);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

/* ============================================
   INITIALIZATION
   ============================================ */

sendRequest('ui/initialize', {
  appCapabilities: {
    availableDisplayModes: ["inline", "fullscreen"]
  }
}).then((ctx: any) => {
  if (ctx?.theme === 'dark') {
    document.body.classList.add('dark');
  } else if (ctx?.theme === 'light') {
    document.body.classList.remove('dark');
  }
  if (ctx?.displayMode) {
    handleDisplayModeChange(ctx.displayMode);
  }
  if (ctx?.containerDimensions) {
    const dims = ctx.containerDimensions;
    if (dims.width) document.body.style.width = dims.width + 'px';
    if (dims.height) document.body.style.height = dims.height + 'px';
    if (dims.maxWidth) document.body.style.maxWidth = dims.maxWidth + 'px';
    if (dims.maxHeight) document.body.style.maxHeight = dims.maxHeight + 'px';
  }
}).catch(err => {
  console.warn('Failed to initialize MCP App:', err);
});

initializeDarkMode();
setupSizeObserver();
