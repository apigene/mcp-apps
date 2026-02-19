/* ============================================
   BRIGHTDATA LINKEDIN PROFILE MCP APP (STANDALONE MODE)
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
   4. Handle errors gracefully with try/catch
   ============================================ */

/**
 * Main render function - renders the LinkedIn profile
 */
function renderData(data: any) {
  const appElement = document.getElementById('app');
  if (!appElement) return;

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

    appElement.innerHTML = `
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

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    app.sendLog({ level: "error", data: `Render error: ${errorMsg}`, logger: APP_NAME });
    showError(`Error rendering LinkedIn profile: ${error.message}`);
  }
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
  const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
  app.sendLog({ level: "error", data: `App error: ${errorMsg}`, logger: APP_NAME });
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
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${errorMsg}`, logger: APP_NAME });
  });

export {};
