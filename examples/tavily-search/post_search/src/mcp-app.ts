/* ============================================
   TAVILY SEARCH MCP APP (SDK VERSION)
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

const APP_NAME = "Tavily Search";
const APP_VERSION = "1.0.0";

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
  
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.results) return data.results;
  if (data.items) return data.items;
  
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return { rows: data };
  }
  
  return data;
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

function showEmpty(message: string = 'No search results available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Tavily Search)
   ============================================ */

/**
 * Extract search results from Tavily API response
 */
function extractResults(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle different response structures
  if (unwrapped.body?.results && Array.isArray(unwrapped.body.results)) {
    return unwrapped.body.results;
  }
  if (unwrapped.results && Array.isArray(unwrapped.results)) {
    return unwrapped.results;
  }
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Get query from response
 */
function getQuery(data: any): string | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  return unwrapped.body?.query || unwrapped.query || null;
}

/**
 * Get answer from response
 */
function getAnswer(data: any): string | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  return unwrapped.body?.answer || unwrapped.answer || null;
}

/**
 * Get follow-up questions
 */
function getFollowUpQuestions(data: any): string[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  const questions = unwrapped.body?.follow_up_questions || unwrapped.follow_up_questions;
  if (Array.isArray(questions) && questions.length > 0) {
    return questions;
  }
  return [];
}

/**
 * Get response time
 */
function getResponseTime(data: any): number | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  return unwrapped.body?.response_time || unwrapped.response_time || null;
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
 * Format date
 */
function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      } as Intl.DateTimeFormatOptions);
    }
  } catch {
    return dateStr;
  }
}

/**
 * Format relevance score as percentage
 */
function formatScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  return Math.round(score * 100);
}

/**
 * Clean content text (remove extra whitespace, etc.)
 */
function cleanContent(content: string | null | undefined): string {
  if (!content) return '';
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Render search result card - compact list with expandable details
 */
function renderResultCard(result: any, index: number): string {
  const url = result.url || '';
  const title = result.title || 'Untitled';
  const content = cleanContent(result.content || '');
  const rawContent = cleanContent(result.raw_content || '');
  const score = result.score || null;
  const publishedDate = result.published_date || null;
  
  const domain = extractDomain(url);
  const favicon = domain ? getFavicon(domain) : null;
  const domainInitials = getDomainInitials(domain);
  const scorePercent = formatScore(score);
  const formattedDate = formatDate(publishedDate);
  const fullDate = publishedDate ? new Date(publishedDate).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

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
          <!-- Content Section - Above Link -->
          ${content ? `
            <div class="details-section">
              <div class="details-section-title">📄 Content</div>
              <div class="details-section-content">${escapeHtml(content)}</div>
            </div>
          ` : ''}
          
          ${rawContent && rawContent !== content ? `
            <div class="details-section">
              <div class="details-section-title">📋 Raw Content</div>
              <div class="details-section-content">${escapeHtml(rawContent)}</div>
            </div>
          ` : ''}

          <!-- Link and Scoring Section -->
          <div class="link-scoring-section">
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
            ${scorePercent !== null ? `
              <div class="scoring-section">
                <div class="score-display">
                  <div class="score-value">${scorePercent}%</div>
                  <div class="score-label">Relevance Score</div>
                  <div class="score-bar-large">
                    <div class="score-fill-large" style="width: ${scorePercent}%"></div>
                  </div>
                  <div style="font-size: 0.75rem; color: #5f6368; margin-top: 4px;">
                    ${(score || 0).toFixed(4)}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Metadata Section -->
          <div class="details-section">
            <div class="details-section-title">ℹ️ Additional Information</div>
            <div class="details-grid">
              ${fullDate ? `
                <div class="detail-item">
                  <div class="detail-label">📅 Published Date</div>
                  <div class="detail-value">${escapeHtml(fullDate)}</div>
                  ${formattedDate && formattedDate !== fullDate ? `
                    <div style="font-size: 0.8125rem; color: #5f6368; margin-top: 4px;">${escapeHtml(formattedDate)}</div>
                  ` : ''}
                </div>
              ` : ''}
              ${domain ? `
                <div class="detail-item">
                  <div class="detail-label">🌐 Domain</div>
                  <div class="detail-value">${escapeHtml(domain)}</div>
                </div>
              ` : ''}
              ${scorePercent !== null ? `
                <div class="detail-item">
                  <div class="detail-label">📊 Score Details</div>
                  <div class="detail-value">
                    <div style="font-weight: 600; margin-bottom: 4px;">${scorePercent}%</div>
                    <div style="font-size: 0.8125rem; color: #5f6368;">Raw: ${(score || 0).toFixed(4)}</div>
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
      const content = (result.content || '').toLowerCase();
      const url = (result.url || '').toLowerCase();
      const domain = extractDomain(result.url || '')?.toLowerCase() || '';
      return title.includes(searchLower) || 
             content.includes(searchLower) || 
             url.includes(searchLower) ||
             domain.includes(searchLower);
    });
  }

  // Filter by category
  if (currentFilter.category !== 'all') {
    switch (currentFilter.category) {
      case 'high-relevance':
        filtered = filtered.filter(r => {
          const score = r.score || 0;
          return score >= 0.7;
        });
        break;
      case 'recent':
        filtered = filtered.filter(r => {
          if (!r.published_date) return false;
          const date = new Date(r.published_date);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
        break;
      case 'domains':
        // Group by domain and show unique domains
        const domainMap = new Map();
        filtered.forEach(r => {
          const domain = extractDomain(r.url || '');
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
 * Get unique domains from results
 */
function getUniqueDomains(results: any[]): string[] {
  const domains = new Set<string>();
  results.forEach(r => {
    const domain = extractDomain(r.url || '');
    if (domain) domains.add(domain);
  });
  return Array.from(domains).sort();
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
    const query = getQuery(data);
    const answer = getAnswer(data);
    const followUpQuestions = getFollowUpQuestions(data);
    const responseTime = getResponseTime(data);
    
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
          <div class="tavily-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
            </svg>
          </div>
          <h1>Tavily Search Results</h1>
        </div>
        ${query ? `
          <div class="query-display">
            <span>🔍</span>
            <span>Search for:</span>
            <span class="query-text">"${escapeHtml(query)}"</span>
          </div>
        ` : ''}
        <div class="meta-info">
          <span id="total-results">${results.length} result${results.length !== 1 ? 's' : ''} found</span>
          ${responseTime ? `<span>•</span><span>Response time: ${responseTime.toFixed(2)}s</span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(header);

    // Answer section (if available)
    if (answer) {
      const answerSection = document.createElement('div');
      answerSection.className = 'answer-section';
      answerSection.innerHTML = `
        <div class="answer-title">💡 Answer</div>
        <div class="answer-text">${escapeHtml(answer)}</div>
      `;
      container.appendChild(answerSection);
    }

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
          placeholder="Search within results by title, content, URL, or domain..."
          autocomplete="off"
        />
      </div>
      <div class="category-filters">
        <span class="category-label">Filter by:</span>
        <div class="category-chip active" data-category="all" onclick="handleCategoryFilter('all')">All</div>
        <div class="category-chip" data-category="high-relevance" onclick="handleCategoryFilter('high-relevance')">High Relevance (≥70%)</div>
        <div class="category-chip" data-category="recent" onclick="handleCategoryFilter('recent')">Recent (Last 7 days)</div>
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

    // Follow-up questions (if available)
    if (followUpQuestions.length > 0) {
      const followUpSection = document.createElement('div');
      followUpSection.className = 'follow-up-section';
      followUpSection.innerHTML = `
        <div class="follow-up-title">💭 Related Questions</div>
        <div class="follow-up-list">
          ${followUpQuestions.map(q => `
            <div class="follow-up-item">${escapeHtml(q)}</div>
          `).join('')}
        </div>
      `;
      container.appendChild(followUpSection);
    }

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
    console.error('Render error:', error);
    showError(`Error rendering search results: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;

  if (!msg || msg.jsonrpc !== '2.0') {
    return;
  }

  // Handle requests that require responses (like ui/resource-teardown)
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    console.info("Resource teardown requested");

    // Send response to host (required for teardown)
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
    // Handle tool result notifications (main data)
    case 'ui/notifications/tool-result':
      console.info("Tool result received");
      const data = msg.params?.structuredContent || msg.params;
      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn('Tool result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;

    // Handle tool input notifications (optional - for loading states)
    case 'ui/notifications/tool-input':
      console.info("Tool input received:", msg.params?.arguments);
      break;

    // Handle host context changes (theme, display mode, fonts)
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
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;

    // Handle tool cancellation
    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      break;

    // Handle initialization notification (optional)
    case 'ui/notifications/initialized':
      break;

    default:
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('Unknown method:', msg.method, '- attempting to render data');
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
    
    // Timeout after 5 seconds
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
