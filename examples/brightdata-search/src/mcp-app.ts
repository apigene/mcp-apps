/* ============================================
   BRIGHTDATA SEARCH MCP APP (STANDALONE MODE)
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

const APP_NAME = "Brightdata Search";
const APP_VERSION = "1.0.0";

/* ============================================
   MCP PROTOCOL MESSAGE FORMAT
   ============================================ */

/* ============================================
   COMMON UTILITY FUNCTIONS (From base template)
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

  // If data itself is an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }

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
  if (data.results) return data.results;
  if (data.items) return data.items;

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


function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
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

function showEmpty(message: string = 'No search results available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (BrightData Search)
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
          <h1>BrightData Search Results</h1>
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

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering search results: ${error.message}`);
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
