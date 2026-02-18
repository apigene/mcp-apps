/* ============================================
   BRIGHTDATA LINKEDIN PROFILE MCP APP (SDK VERSION)
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

const APP_NAME = "Brightdata Linkedin Profile";
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
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
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
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================
   
   Add your template-specific utility functions here.
   Examples:
   - Data normalization functions
   - Formatting functions (dates, numbers, etc.)
   - Data transformation functions
   - Chart rendering functions (if using Chart.js)
   ============================================ */

/**
 * Format number with commas
 */
function formatNumber(num: number | string | undefined): string {
  if (!num) return '0';
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  return n.toLocaleString();
}

/**
 * Get initials from name
 */
function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Format education period
 */
function formatEducationPeriod(startYear: string | number | undefined, endYear: string | number | undefined): string {
  if (!startYear && !endYear) return '';
  if (!startYear) return String(endYear);
  if (!endYear) return `${startYear} - Present`;
  return `${startYear} - ${endYear}`;
}

/**
 * Render profile card for "People Also Viewed"
 */
function renderPersonCard(person: any, index: number): string {
  const name = escapeHtml(person.name || 'Unknown');
  const location = escapeHtml(person.location || '');
  const profileLink = escapeHtml(person.profile_link || '#');
  
  return `
    <div class="person-card">
      <a href="${profileLink}" target="_blank" rel="noopener noreferrer" class="person-link">
        <div class="person-avatar-small">
          ${getInitials(name)}
        </div>
        <div class="person-info-small">
          <div class="person-name-small">${name}</div>
          ${location ? `<div class="person-location-small">${location}</div>` : ''}
        </div>
      </a>
    </div>
  `;
}

/**
 * Render recommendation card
 */
function renderRecommendationCard(recommendation: string, index: number): string {
  return `
    <div class="recommendation-card">
      <div class="recommendation-content">${escapeHtml(recommendation)}</div>
    </div>
  `;
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================
   
   This is the main function you need to implement.
   It receives the data and renders it in the app.
   
   Guidelines:
   1. Always validate data before rendering
   2. Use unwrapData() to handle nested structures
   3. Use escapeHtml() when inserting user content
   4. Call notifySizeChanged() after rendering completes
   5. Handle errors gracefully with try/catch
   ============================================ */

/**
 * Main render function - renders the LinkedIn profile
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No LinkedIn profile data received');
    return;
  }

  try {
    // Unwrap nested structures
    const unwrapped = unwrapData(data);
    
    // Handle array response (body is an array)
    let profile: any;
    if (Array.isArray(unwrapped)) {
      profile = unwrapped[0];
    } else if (unwrapped.body && Array.isArray(unwrapped.body)) {
      profile = unwrapped.body[0];
    } else if (unwrapped.body && typeof unwrapped.body === 'object') {
      profile = unwrapped.body;
    } else {
      profile = unwrapped;
    }
    
    if (!profile) {
      showEmpty('No profile data found');
      return;
    }
    
    const name = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
    const location = profile.location || profile.city || '';
    const about = profile.about || '';
    const avatar = profile.avatar || '';
    const url = profile.url || '';
    const currentCompany = profile.current_company || {};
    const education = profile.education || [];
    const peopleAlsoViewed = profile.people_also_viewed || [];
    const recommendations = profile.recommendations || [];
    const languages = profile.languages || [];
    const connections = profile.connections || 0;
    const followers = profile.followers || 0;
    const recommendationsCount = profile.recommendations_count || recommendations.length;
    
    app.innerHTML = `
      <div class="linkedin-container">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-banner" style="${profile.banner_image ? `background-image: url('${escapeHtml(profile.banner_image)}');` : ''}"></div>
          <div class="profile-content">
            <div class="profile-avatar-wrapper">
              ${avatar 
                ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="profile-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
                : ''
              }
              <div class="profile-avatar-fallback" style="${avatar ? 'display: none;' : ''}">
                ${getInitials(name)}
              </div>
            </div>
            <div class="profile-info">
              <h1 class="profile-name">${escapeHtml(name)}</h1>
              ${currentCompany.name 
                ? `<div class="profile-company">
                    <a href="${escapeHtml(currentCompany.link || '#')}" target="_blank" rel="noopener noreferrer" class="company-link">
                      ${escapeHtml(currentCompany.name)}
                    </a>
                  </div>`
                : ''
              }
              ${location 
                ? `<div class="profile-location">
                    <span class="location-icon">📍</span>
                    ${escapeHtml(location)}
                  </div>`
                : ''
              }
              ${url 
                ? `<div class="profile-link">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="linkedin-link">
                      ${escapeHtml(url)}
                    </a>
                  </div>`
                : ''
              }
            </div>
            <div class="profile-stats">
              ${connections > 0 
                ? `<div class="stat-item">
                    <div class="stat-value">${formatNumber(connections)}</div>
                    <div class="stat-label">Connections</div>
                  </div>`
                : ''
              }
              ${followers > 0 
                ? `<div class="stat-item">
                    <div class="stat-value">${formatNumber(followers)}</div>
                    <div class="stat-label">Followers</div>
                  </div>`
                : ''
              }
              ${recommendationsCount > 0 
                ? `<div class="stat-item">
                    <div class="stat-value">${formatNumber(recommendationsCount)}</div>
                    <div class="stat-label">Recommendations</div>
                  </div>`
                : ''
              }
            </div>
          </div>
        </div>

        <!-- About Section -->
        ${about 
          ? `<div class="section">
              <h2 class="section-title">About</h2>
              <div class="section-content">
                <p class="about-text">${escapeHtml(about)}</p>
              </div>
            </div>`
          : ''
        }

        <!-- Education Section -->
        ${education.length > 0 
          ? `<div class="section">
              <h2 class="section-title">Education</h2>
              <div class="section-content">
                ${education.map((edu: any) => `
                  <div class="education-item">
                    <div class="education-title">${escapeHtml(edu.title || edu.name || '')}</div>
                    ${edu.url 
                      ? `<a href="${escapeHtml(edu.url)}" target="_blank" rel="noopener noreferrer" class="education-link">${escapeHtml(edu.title || edu.name || '')}</a>`
                      : ''
                    }
                    ${edu.start_year || edu.end_year 
                      ? `<div class="education-period">${formatEducationPeriod(edu.start_year, edu.end_year)}</div>`
                      : ''
                    }
                  </div>
                `).join('')}
              </div>
            </div>`
          : ''
        }

        <!-- Languages Section -->
        ${languages.length > 0 
          ? `<div class="section">
              <h2 class="section-title">Languages</h2>
              <div class="section-content">
                <div class="languages-list">
                  ${languages.map((lang: any) => `
                    <div class="language-item">
                      <span class="language-name">${escapeHtml(lang.title || lang.name || '')}</span>
                      ${lang.subtitle && lang.subtitle !== '-' 
                        ? `<span class="language-level">${escapeHtml(lang.subtitle)}</span>`
                        : ''
                      }
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>`
          : ''
        }

        <!-- Recommendations Section -->
        ${recommendations.length > 0 
          ? `<div class="section">
              <h2 class="section-title">Recommendations (${recommendations.length})</h2>
              <div class="section-content">
                <div class="recommendations-list">
                  ${recommendations.map((rec: string, index: number) => renderRecommendationCard(rec, index)).join('')}
                </div>
              </div>
            </div>`
          : ''
        }

        <!-- People Also Viewed Section -->
        ${peopleAlsoViewed.length > 0 
          ? `<div class="section">
              <h2 class="section-title">People Also Viewed</h2>
              <div class="section-content">
                <div class="people-grid">
                  ${peopleAlsoViewed.map((person: any, index: number) => renderPersonCard(person, index)).join('')}
                </div>
              </div>
            </div>`
          : ''
        }
      </div>
    `;
    
    // Notify host of size change after rendering completes
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering LinkedIn profile: ${error.message}`);
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
    const container = document.querySelector('.linkedin-container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.linkedin-container');
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
  clientInfo: {
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
