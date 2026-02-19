/* ============================================
   APOLLO PEOPLE SEARCH MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect() for direct host communication.
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

const APP_NAME = "Apollo People Search";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

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
function showEmpty(message: string = 'No people available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Apollo People)
   ============================================ */

let allPeople: any[] = [];
let filteredPeople: any[] = [];
let selectedPerson: any = null;

/**
 * Extract people from Apollo API response
 */
function extractPeople(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle different response structures
  if (unwrapped.body?.people && Array.isArray(unwrapped.body.people)) {
    return unwrapped.body.people;
  }
  if (unwrapped.people && Array.isArray(unwrapped.people)) {
    return unwrapped.people;
  }
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Get pagination info
 */
function getPagination(data: any): any {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  return unwrapped.body?.pagination || unwrapped.pagination || null;
}

/**
 * Get total entries
 */
function getTotalEntries(data: any): number | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  return unwrapped.body?.total_entries || unwrapped.total_entries || null;
}

/**
 * Format number with commas
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

/**
 * Get initials for avatar
 */
function getInitials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const first = firstName ? firstName[0].toUpperCase() : '';
  const last = lastName ? lastName[0].toUpperCase() : '';
  return first + last || first || '?';
}

/**
 * Format date
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Search people
 */
function searchPeople(people: any[], query: string): any[] {
  if (!query || query.trim() === '') {
    return people;
  }

  const searchTerm = query.toLowerCase().trim();
  return people.filter(person => {
    const firstName = (person.first_name || '').toLowerCase();
    const lastName = (person.last_name_obfuscated || '').toLowerCase();
    const title = (person.title || '').toLowerCase();
    const company = (person.organization?.name || '').toLowerCase();

    return firstName.includes(searchTerm) ||
           lastName.includes(searchTerm) ||
           title.includes(searchTerm) ||
           company.includes(searchTerm);
  });
}

/**
 * Render person card
 */
function renderPersonCard(person: any, index: number): string {
  const firstName = person.first_name || '';
  const lastName = person.last_name_obfuscated || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const title = person.title || '';
  const company = person.organization?.name || '';
  const initials = getInitials(firstName, lastName);

  const hasEmail = person.has_email === true;
  const hasPhone = person.has_direct_phone === 'Yes';
  const hasLocation = person.has_city || person.has_state || person.has_country;

  return `
    <div class="person-card" data-person-index="${index}" style="cursor: pointer;">
      <div class="person-avatar">
        ${initials}
      </div>
      <div class="person-info">
        <div class="person-name">${escapeHtml(fullName)}</div>
        ${title ? `<div class="person-title">${escapeHtml(title)}</div>` : ''}
        ${company ? `<div class="person-company">${escapeHtml(company)}</div>` : ''}
        <div class="person-badges">
          ${hasEmail ? '<span class="badge badge-email">✉ Email</span>' : ''}
          ${hasPhone ? '<span class="badge badge-phone">📞 Phone</span>' : ''}
          ${hasLocation ? '<span class="badge badge-location">📍 Location</span>' : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render detailed person view (modal)
 */
function renderPersonDetail(person: any): string {
  if (!person) return '';

  const firstName = person.first_name || '';
  const lastName = person.last_name_obfuscated || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const title = person.title || null;
  const company = person.organization?.name || null;
  const initials = getInitials(firstName, lastName);

  const email = person.email || null;
  const phone = person.phone_numbers?.[0]?.raw_number || person.phone || null;
  const linkedin = person.linkedin_url || person.linkedin || null;
  const twitter = person.twitter_url || person.twitter || null;
  const github = person.github_url || person.github || null;
  const apolloUrl = person.apollo_url || person.url || null;

  const city = person.city || null;
  const state = person.state || null;
  const country = person.country || null;
  const location = [city, state, country].filter(Boolean).join(', ') || null;

  const lastRefreshed = person.last_refreshed_at || null;
  const personId = person.id || null;

  const hasEmail = person.has_email === true;
  const hasPhone = person.has_direct_phone === 'Yes';
  const hasCity = person.has_city === true;
  const hasState = person.has_state === true;
  const hasCountry = person.has_country === true;

  // Organization details
  const org = person.organization || {};
  const orgIndustry = org.industry || null;
  const orgWebsite = org.website_url || org.website || null;
  const orgLocation = org.primary_location || org.location || null;
  const orgEmployees = org.estimated_num_employees || org.num_employees || null;

  return `
    <div class="modal-overlay" id="person-modal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="person-avatar-large">
              ${initials}
            </div>
            <div class="modal-title-section">
              <div class="modal-title">${escapeHtml(fullName)}</div>
              ${title ? `<div class="modal-subtitle">${escapeHtml(title)}</div>` : ''}
              ${company ? `<div class="modal-subtitle" style="color: #1a73e8; font-weight: 500;">${escapeHtml(company)}</div>` : ''}
              ${(email || linkedin || twitter || github || apolloUrl) ? `
                <div class="header-actions">
                  ${email ? `<a href="mailto:${escapeHtml(email)}" class="social-icon email" title="Email">✉</a>` : ''}
                  ${linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="social-icon linkedin" title="LinkedIn">in</a>` : ''}
                  ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" class="social-icon twitter" title="Twitter">𝕏</a>` : ''}
                  ${github ? `<a href="${escapeHtml(github)}" target="_blank" rel="noopener" class="social-icon" title="GitHub">💻</a>` : ''}
                  ${apolloUrl ? `<a href="${escapeHtml(apolloUrl)}" target="_blank" rel="noopener" class="social-icon" title="Apollo Profile">A</a>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          <button class="modal-close" onclick="closePersonDetail()">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <div class="detail-section-title">Contact Information</div>
            <div class="detail-grid">
              ${email ? `
                <div class="detail-item">
                  <div class="detail-item-label">Email</div>
                  <div class="detail-item-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
                </div>
              ` : hasEmail ? `
                <div class="detail-item">
                  <div class="detail-item-label">Email</div>
                  <div class="detail-item-value">Available (contact Apollo for access)</div>
                </div>
              ` : ''}
              ${phone ? `
                <div class="detail-item">
                  <div class="detail-item-label">Phone</div>
                  <div class="detail-item-value"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>
                </div>
              ` : hasPhone ? `
                <div class="detail-item">
                  <div class="detail-item-label">Phone</div>
                  <div class="detail-item-value">Available (contact Apollo for access)</div>
                </div>
              ` : ''}
              ${location ? `
                <div class="detail-item">
                  <div class="detail-item-label">Location</div>
                  <div class="detail-item-value">${escapeHtml(location)}</div>
                </div>
              ` : (hasCity || hasState || hasCountry) ? `
                <div class="detail-item">
                  <div class="detail-item-label">Location</div>
                  <div class="detail-item-value">Available (contact Apollo for access)</div>
                </div>
              ` : ''}
              ${city && hasCity ? `
                <div class="detail-item">
                  <div class="detail-item-label">City</div>
                  <div class="detail-item-value">${escapeHtml(city)}</div>
                </div>
              ` : ''}
              ${state && hasState ? `
                <div class="detail-item">
                  <div class="detail-item-label">State</div>
                  <div class="detail-item-value">${escapeHtml(state)}</div>
                </div>
              ` : ''}
              ${country && hasCountry ? `
                <div class="detail-item">
                  <div class="detail-item-label">Country</div>
                  <div class="detail-item-value">${escapeHtml(country)}</div>
                </div>
              ` : ''}
            </div>
          </div>

          ${company ? `
            <div class="detail-section">
              <div class="detail-section-title">Organization</div>
              <div class="detail-grid">
                <div class="detail-item">
                  <div class="detail-item-label">Company Name</div>
                  <div class="detail-item-value">${escapeHtml(company)}</div>
                </div>
                ${orgIndustry ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Industry</div>
                    <div class="detail-item-value">${escapeHtml(orgIndustry)}</div>
                  </div>
                ` : ''}
                ${orgLocation ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Location</div>
                    <div class="detail-item-value">${escapeHtml(orgLocation)}</div>
                  </div>
                ` : ''}
                ${orgEmployees ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Employees</div>
                    <div class="detail-item-value">${formatNumber(orgEmployees)}</div>
                  </div>
                ` : ''}
                ${orgWebsite ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Website</div>
                    <div class="detail-item-value"><a href="${escapeHtml(orgWebsite.startsWith('http') ? orgWebsite : 'https://' + orgWebsite)}" target="_blank" rel="noopener">${escapeHtml(orgWebsite.replace(/^https?:\/\//, ''))}</a></div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${(linkedin || twitter || github || apolloUrl) ? `
            <div class="detail-section">
              <div class="detail-section-title">Social Links</div>
              <div class="social-icons">
                ${linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="social-icon linkedin" title="LinkedIn Profile">in</a>` : ''}
                ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" class="social-icon twitter" title="Twitter Profile">𝕏</a>` : ''}
                ${github ? `<a href="${escapeHtml(github)}" target="_blank" rel="noopener" class="social-icon" title="GitHub Profile">💻</a>` : ''}
                ${apolloUrl ? `<a href="${escapeHtml(apolloUrl)}" target="_blank" rel="noopener" class="social-icon" title="Apollo Profile">A</a>` : ''}
              </div>
            </div>
          ` : ''}

          <div class="detail-section">
            <div class="detail-section-title">Additional Information</div>
            <div class="detail-grid">
              ${lastRefreshed ? `
                <div class="detail-item">
                  <div class="detail-item-label">Last Refreshed</div>
                  <div class="detail-item-value">${formatDate(lastRefreshed)}</div>
                </div>
              ` : ''}
              ${personId ? `
                <div class="detail-item">
                  <div class="detail-item-label">Apollo ID</div>
                  <div class="detail-item-value">${escapeHtml(personId)}</div>
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
 * Show person detail modal
 */
function showPersonDetail(person: any) {
  selectedPerson = person;
  const modal = renderPersonDetail(person);
  document.body.insertAdjacentHTML('beforeend', modal);
  document.body.style.overflow = 'hidden';
}

/**
 * Close person detail modal
 */
(window as any).closePersonDetail = function() {
  const modal = document.getElementById('person-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
  selectedPerson = null;
};

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
    // Extract people
    const people = extractPeople(data);

    if (!people || people.length === 0) {
      showEmpty('No people found');
      return;
    }

    allPeople = people;
    const pagination = getPagination(data);
    const totalEntries = getTotalEntries(data);

    // Create container
    const container = document.createElement('div');
    container.className = 'people-container';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>Apollo People Search</h1>
      <div class="meta">
        <div class="meta-item">
          <span>${people.length} person${people.length !== 1 ? 's' : ''} found</span>
        </div>
        ${totalEntries ? `<div class="meta-item">
          <span>Total: ${formatNumber(totalEntries)}</span>
        </div>` : ''}
      </div>
    `;
    container.appendChild(header);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';

    // Search box
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.innerHTML = `
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search-input" placeholder="Search by name, title, company...">
    `;
    controls.appendChild(searchBox);
    container.appendChild(controls);

    // People grid
    const grid = document.createElement('div');
    grid.className = 'people-grid';
    grid.id = 'people-grid';
    container.appendChild(grid);

    // Pagination
    if (pagination || totalEntries) {
      const paginationEl = document.createElement('div');
      const current = pagination?.page || pagination?.current_page || 1;
      const perPage = pagination?.per_page || pagination?.page_size || people.length;
      const total = totalEntries || people.length;
      paginationEl.innerHTML = `
        <div class="pagination">
          <div class="pagination-info">
            Showing ${((current - 1) * perPage) + 1}-${Math.min(current * perPage, total)} of ${formatNumber(total)} people
          </div>
        </div>
      `;
      container.appendChild(paginationEl);
    }

    app.innerHTML = '';
    app.appendChild(container);

    // Render function
    function renderPeople(peopleList: any[]) {
      const gridEl = document.getElementById('people-grid');
      if (!gridEl) return;

      if (peopleList.length === 0) {
        gridEl.innerHTML = '<div class="empty" style="grid-column: 1 / -1;">No people match your search</div>';
        return;
      }

      gridEl.innerHTML = peopleList.map((person, index) => renderPersonCard(person, index)).join('');

      // Add click handlers to person cards
      gridEl.querySelectorAll('.person-card').forEach((card) => {
        card.addEventListener('click', () => {
          const personIndex = parseInt(card.getAttribute('data-person-index') || '0');
          showPersonDetail(filteredPeople[personIndex]);
        });
      });
    }

    // Search handler
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      let searchTimeout: number;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          const query = searchInput.value;
          filteredPeople = searchPeople(allPeople, query);
          renderPeople(filteredPeople);
        }, 300);
      });
    }

    // Initial render
    filteredPeople = allPeople;
    renderPeople(filteredPeople);

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering people: ${error.message}`);
  }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('person-modal');
  if (modal && e.target === modal) {
    (window as any).closePersonDetail();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    (window as any).closePersonDetail();
  }
});

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
