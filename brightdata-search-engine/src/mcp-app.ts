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

const APP_NAME = "BrightData Search Engine";  // App name
const APP_VERSION = "1.0.0";         // App version
const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

/* ============================================
   EXTERNAL DEPENDENCIES
   ============================================
   If you use external libraries (like Chart.js), declare them here.
   Example:
   declare const Chart: any;
   ============================================ */

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
  
  // Handle Claude format: {message: {status_code: 200, response_content: {...}}}
  if (data.message && typeof data.message === 'object') {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      // Support both response_content and body fields
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
  
  // Handle direct BrightData response format: {status_code: 200, body: {...}} or {status_code: 200, response_content: {...}}
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
  
  // Format 1: Standard table format { columns: [], rows: [] }
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
function showEmpty(message: string = 'No search results available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (BrightData Search Engine)
   ============================================ */

/**
 * Extract search results from BrightData API response
 */
function extractResults(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle BrightData format: {status_code: 200, body: {organic: [...], current_page: 1}}
  // Support both body and response_content
  const content = unwrapped.body || unwrapped.response_content;
  
  if (content && typeof content === 'object') {
    if (content.organic && Array.isArray(content.organic)) {
      return content.organic;
    }
    if (Array.isArray(content)) {
      return content;
    }
  }
  
  if (unwrapped.organic && Array.isArray(unwrapped.organic)) {
    return unwrapped.organic;
  }
  
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Get current page from response
 */
function getCurrentPage(data: any): number | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  const content = unwrapped.body || unwrapped.response_content;
  if (content && typeof content === 'object') {
    return content.current_page || null;
  }
  
  return unwrapped.current_page || null;
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
 * Get favicon URL for domain
 */
function getFavicon(domain: string | null): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Get domain initials
 */
function getDomainInitials(domain: string | null): string {
  if (!domain) return '?';
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].substring(0, 2).toUpperCase();
  }
  return domain.substring(0, 2).toUpperCase();
}

/**
 * Clean description text (remove extra whitespace, etc.)
 */
function cleanDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Render search result card - compact list with expandable details
 */
function renderResultCard(result: any, index: number): string {
  const url = result.link || result.url || '';
  const title = result.title || 'Untitled';
  const description = cleanDescription(result.description || '');
  
  const domain = extractDomain(url);
  const favicon = domain ? getFavicon(domain) : null;
  const domainInitials = getDomainInitials(domain);

  const cardId = `result-card-${index}`;

  return `
    <div class="result-card" id="${cardId}">
      <!-- Compact List View - Title and Source Only -->
      <div class="result-list-item" onclick="toggleCard('${cardId}')">
        <div class="source-icon">
          ${favicon ? `<img src="${escapeHtml(favicon)}" alt="${escapeHtml(domain || '')}" onerror="this.parentElement.innerHTML='<div class=\\'source-icon-placeholder\\'>${domainInitials}</div>'">` : `<div class="source-icon-placeholder">${domainInitials}</div>`}
        </div>
        <div class="result-list-content">
          <div class="result-title">${escapeHtml(title)}</div>
          <div class="result-source">
            <span>🔗</span>
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="result-source-link" onclick="event.stopPropagation()">
              ${escapeHtml(domain || url)}
            </a>
          </div>
        </div>
        <div class="expand-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 11L3 6h10z"/>
          </svg>
        </div>
      </div>

      <!-- Expanded Details View -->
      <div class="result-details">
        <div class="details-content">
          <!-- Description Section -->
          ${description ? `
            <div class="details-section">
              <div class="details-section-title">📄 Description</div>
              <div class="details-section-content">${escapeHtml(description)}</div>
            </div>
          ` : ''}

          <!-- Link Section -->
          <div class="link-section">
            <div class="link-label">🔗 Source</div>
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="link-value read-more-link" onclick="event.stopPropagation()">
              <span>Read more</span>
              <span>↗</span>
            </a>
            ${domain ? `
              <div class="result-source" style="margin-top: 6px;">
                <span>From:</span>
                <span style="font-weight: 500;">${escapeHtml(domain)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Metadata Section -->
          <div class="details-section">
            <div class="details-section-title">ℹ️ Additional Information</div>
            <div class="details-grid">
              ${domain ? `
                <div class="detail-item">
                  <div class="detail-label">🌐 Domain</div>
                  <div class="detail-value">${escapeHtml(domain)}</div>
                </div>
              ` : ''}
              ${url ? `
                <div class="detail-item">
                  <div class="detail-label">🔗 URL</div>
                  <div class="detail-value">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Toggle card expansion
 */
(window as any).toggleCard = function(cardId: string) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('expanded');
    const listItem = card.querySelector('.result-list-item');
    if (listItem) {
      listItem.classList.toggle('expanded');
    }
  }
};

// Global state for filtering
let allResults: any[] = [];
let currentFilter = {
  searchText: '',
  category: 'all'
};

/**
 * Filter results based on search text and category
 */
function filterResults(): any[] {
  let filtered = [...allResults];

  // Filter by search text
  if (currentFilter.searchText) {
    const searchLower = currentFilter.searchText.toLowerCase();
    filtered = filtered.filter(result => {
      const title = (result.title || '').toLowerCase();
      const description = (result.description || '').toLowerCase();
      const url = (result.link || result.url || '').toLowerCase();
      const domain = extractDomain(result.link || result.url || '')?.toLowerCase() || '';
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             url.includes(searchLower) ||
             domain.includes(searchLower);
    });
  }

  // Filter by category
  if (currentFilter.category !== 'all') {
    switch (currentFilter.category) {
      case 'domains':
        // Group by domain and show unique domains
        const domainMap = new Map();
        filtered.forEach(r => {
          const domain = extractDomain(r.link || r.url || '');
          if (domain && !domainMap.has(domain)) {
            domainMap.set(domain, r);
          }
        });
        filtered = Array.from(domainMap.values());
        break;
    }
  }

  return filtered;
}

/**
 * Render filtered results
 */
function renderFilteredResults() {
  const filtered = filterResults();
  const resultsEl = document.getElementById('results-list');
  const statsEl = document.getElementById('filter-stats');
  
  if (!resultsEl) return;

  if (filtered.length === 0) {
    resultsEl.innerHTML = '<div class="empty">No results match your filters. Try adjusting your search or category.</div>';
  } else {
    resultsEl.innerHTML = filtered.map((result, index) => {
      const originalIndex = allResults.indexOf(result);
      return renderResultCard(result, originalIndex >= 0 ? originalIndex : index);
    }).join('');
  }

  // Update stats
  if (statsEl) {
    const isFiltered = currentFilter.searchText || currentFilter.category !== 'all';
    if (isFiltered) {
      statsEl.textContent = `Showing ${filtered.length} of ${allResults.length} results`;
    } else {
      statsEl.textContent = '';
    }
  }
}

/**
 * Handle search input
 */
function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  currentFilter.searchText = target.value;
  renderFilteredResults();
}

/**
 * Handle category filter click
 */
function handleCategoryFilter(category: string) {
  currentFilter.category = category;
  
  // Update active state
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  const activeChip = document.querySelector(`[data-category="${category}"]`);
  if (activeChip) {
    activeChip.classList.add('active');
  }
  
  renderFilteredResults();
}

/**
 * Reset all filters
 */
function resetFilters() {
  currentFilter.searchText = '';
  currentFilter.category = 'all';
  
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
  }
  
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  const allChip = document.querySelector('[data-category="all"]');
  if (allChip) {
    allChip.classList.add('active');
  }
  
  renderFilteredResults();
}

// Make filter functions globally accessible
(window as any).handleCategoryFilter = handleCategoryFilter;
(window as any).resetFilters = resetFilters;

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
    // Extract data
    const results = extractResults(data);
    const currentPage = getCurrentPage(data);
    
    if (!results || results.length === 0) {
      showEmpty('No search results found');
      return;
    }

    // Store all results for filtering
    allResults = results;
    currentFilter = {
      searchText: '',
      category: 'all'
    };

    // Create container
    const container = document.createElement('div');
    container.className = 'search-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-content">
        <div class="header-title-row">
          <div class="brightdata-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </div>
          <h1>BrightData Search Engine Results</h1>
        </div>
        <div class="meta-info">
          <span id="total-results">${results.length} result${results.length !== 1 ? 's' : ''} found</span>
          ${currentPage ? `<span>•</span><span>Page ${currentPage}</span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(header);

    // Search and Filter Section
    const searchFilterSection = document.createElement('div');
    searchFilterSection.className = 'search-filter-section';
    searchFilterSection.innerHTML = `
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          id="search-input" 
          class="search-input" 
          placeholder="Search within results by title, description, URL, or domain..."
          autocomplete="off"
        />
      </div>
      <div class="category-filters">
        <span class="category-label">Filter by:</span>
        <div class="category-chip active" data-category="all" onclick="handleCategoryFilter('all')">All</div>
        <div class="category-chip" data-category="domains" onclick="handleCategoryFilter('domains')">Unique Domains</div>
        <button class="filter-reset" onclick="resetFilters()">Clear filters</button>
      </div>
      <div class="filter-stats" id="filter-stats"></div>
    `;
    container.appendChild(searchFilterSection);

    // Results list
    const resultsList = document.createElement('div');
    resultsList.className = 'results-list';
    resultsList.id = 'results-list';
    container.appendChild(resultsList);

    app.innerHTML = '';
    app.appendChild(container);

    // Attach event listeners
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearchInput);
    }

    // Render initial results
    renderFilteredResults();
    
    // Notify host of size change after rendering completes
    // Use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering search results: ${error.message}`);
    // Notify size even on error
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
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
    // Handle direct data (not wrapped in JSON-RPC)
    // Check for Claude format: {message: {status_code, response_content}}
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
    
    // Clean up resources
    // - Clear any timers
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    
    // - Disconnect observers
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    // - Cancel any pending requests (if you track them)
    // - Destroy chart instances, etc. (template-specific cleanup)
    
    // Send response to host
    window.parent.postMessage({
      jsonrpc: "2.0",
      id: msg.id,
      result: {}
    }, '*');
    
    return; // Don't process further
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
      if (msg.params?.theme === 'dark') {
        document.body.classList.add('dark');
      } else if (msg.params?.theme === 'light') {
        document.body.classList.remove('dark');
      }
      // Handle display mode changes
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      // Re-render if needed (e.g., for charts that need theme updates)
      // You may want to add logic here to re-render your content with new theme
      break;
      
    case 'ui/notifications/tool-input':
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        // Template-specific: You can use this for initial rendering or context
        console.log('Tool input received:', toolArguments);
        // Example: Show loading state with input parameters
        // Example: Store for later use in renderData()
      }
      break;
      
    case 'ui/notifications/tool-cancelled':
      // Tool cancellation notification - Host MUST send this if tool is cancelled
      const reason = msg.params?.reason || 'Tool execution was cancelled';
      showError(`Operation cancelled: ${reason}`);
      // Clean up any ongoing operations
      // - Stop timers
      // - Cancel pending requests
      // - Reset UI state
      break;
      
    case 'ui/notifications/initialized':
      // Initialization notification (optional - handle if needed)
      break;
      
    default:
      // Unknown method - try to extract data as fallback
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('Unknown method:', msg.method, '- attempting to render data');
          renderData(fallbackData);
        }
      } else if (msg.message || msg.status_code || msg.body || msg.response_content) {
        // Try direct data access (including Claude format)
        renderData(msg);
      }
  }
});

/* ============================================
   MCP COMMUNICATION
   ============================================
   
   Functions for communicating with the MCP host.
   You typically don't need to modify this section.
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
   ============================================
   
   Handles switching between inline and fullscreen display modes.
   You may want to customize handleDisplayModeChange() to adjust
   your layout for fullscreen mode.
   ============================================ */

let currentDisplayMode = 'inline';

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
    // Adjust layout for fullscreen if needed
    const container = document.querySelector('.search-container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.search-container');
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
   ============================================
   
   Notifies the host when the content size changes.
   This is critical for proper iframe sizing.
   You typically don't need to modify this section.
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
   ============================================
   
   Initializes the MCP app and sets up all required features.
   You typically don't need to modify this section.
   ============================================ */

// Initialize MCP App - REQUIRED for MCP Apps protocol
sendRequest('ui/initialize', {
  appCapabilities: {
    availableDisplayModes: ["inline", "fullscreen"]
  },
  appInfo: {
    name: APP_NAME,
    version: APP_VERSION
  },
  protocolVersion: PROTOCOL_VERSION
}).then((result: any) => {
  // Extract host context from initialization result
  const ctx = result.hostContext || result;
  
  // Extract host capabilities for future use
  const hostCapabilities = result.hostCapabilities;
  
  // Send initialized notification after successful initialization
  sendNotification('ui/notifications/initialized', {});
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

// Export empty object to ensure this file is treated as an ES module
// This prevents TypeScript from treating top-level declarations as global
export {};
