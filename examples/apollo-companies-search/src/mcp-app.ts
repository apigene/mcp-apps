/* ============================================
   APOLLO COMPANIES SEARCH MCP APP (STANDALONE MODE)
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

const APP_NAME = "Apollo Companies Search";
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
function showEmpty(message: string = 'No companies available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Apollo Companies)
   ============================================ */

let allOrganizations: any[] = [];
let filteredOrganizations: any[] = [];
let selectedCompany: any = null;

/**
 * Extract organizations from Apollo API response
 */
function extractOrganizations(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle different response structures
  if (unwrapped.body?.organizations && Array.isArray(unwrapped.body.organizations)) {
    return unwrapped.body.organizations;
  }
  if (unwrapped.organizations && Array.isArray(unwrapped.organizations)) {
    return unwrapped.organizations;
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
 * Get breadcrumbs
 */
function getBreadcrumbs(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  return unwrapped.body?.breadcrumbs || unwrapped.breadcrumbs || [];
}

/**
 * Format number with commas
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

/**
 * Format website URL
 */
function formatWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(formatWebsite(url) || '');
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Get company favicon/logo URL
 */
function getCompanyLogo(domain: string | null): string | null {
  if (!domain) return null;
  // Use Google's favicon service as a reliable fallback
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Get initials for logo placeholder
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Search organizations
 */
function searchOrganizations(organizations: any[], query: string): any[] {
  if (!query || query.trim() === '') {
    return organizations;
  }

  const searchTerm = query.toLowerCase().trim();
  return organizations.filter(org => {
    const name = (org.name || '').toLowerCase();
    const website = (org.website_url || org.website || '').toLowerCase();
    const industry = (org.industry || '').toLowerCase();
    const location = (org.primary_location || org.location || '').toLowerCase();
    const description = (org.short_description || org.description || '').toLowerCase();

    return name.includes(searchTerm) ||
           website.includes(searchTerm) ||
           industry.includes(searchTerm) ||
           location.includes(searchTerm) ||
           description.includes(searchTerm);
  });
}

/**
 * Render company card
 */
function renderCompanyCard(org: any, index: number): string {
  const website = formatWebsite(org.website_url || org.website);
  const employees = org.estimated_num_employees || org.num_employees || org.employee_count;
  const industry = org.industry || org.industry_tag || '-';
  const location = org.primary_location || org.location || '-';
  const description = org.short_description || org.description || '';
  const linkedin = org.linkedin_url || org.linkedin || null;
  const founded = org.founded_year || null;
  const domain = extractDomain(website);
  const logoUrl = domain ? getCompanyLogo(domain) : null;
  const initials = getInitials(org.name);

  return `
    <div class="company-card" data-company-index="${index}" style="cursor: pointer;">
      <div class="company-card-logo">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(org.name)}" onerror="this.parentElement.innerHTML='<div class=\\'company-card-logo-placeholder\\'>${initials}</div>'">` : `<div class="company-card-logo-placeholder">${initials}</div>`}
      </div>
      <div class="company-name">${escapeHtml(org.name || 'Unknown Company')}</div>
      ${website ? `<div class="company-website"><a href="${escapeHtml(website)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(website.replace(/^https?:\/\//, ''))}</a></div>` : ''}
      ${description ? `<div class="detail-value" style="margin-bottom: 12px; font-size: 0.875rem; color: #5f6368;">${escapeHtml(description.substring(0, 150))}${description.length > 150 ? '...' : ''}</div>` : ''}
      <div class="company-details">
        ${industry !== '-' ? `<div class="detail-row">
          <span class="detail-label">Industry:</span>
          <span class="detail-value">${escapeHtml(industry)}</span>
        </div>` : ''}
        ${location !== '-' ? `<div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${escapeHtml(location)}</span>
        </div>` : ''}
        ${employees ? `<div class="detail-row">
          <span class="detail-label">Employees:</span>
          <span class="detail-value">${formatNumber(employees)}</span>
        </div>` : ''}
        ${founded ? `<div class="detail-row">
          <span class="detail-label">Founded:</span>
          <span class="detail-value">${founded}</span>
        </div>` : ''}
      </div>
      ${linkedin ? `<div style="margin-top: 12px;">
        <a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="badge badge-primary" onclick="event.stopPropagation()">LinkedIn</a>
      </div>` : ''}
    </div>
  `;
}

/**
 * Render detailed company view (modal)
 */
function renderCompanyDetail(org: any): string {
  if (!org) return '';

  const website = formatWebsite(org.website_url || org.website);
  const employees = org.estimated_num_employees || org.num_employees || org.employee_count;
  const industry = org.industry || org.industry_tag || null;
  const location = org.primary_location || org.location || null;
  const description = org.short_description || org.description || org.long_description || null;
  const linkedin = org.linkedin_url || org.linkedin || null;
  const founded = org.founded_year || null;
  const revenue = org.annual_revenue || org.revenue || null;
  const revenueRange = org.annual_revenue_range || org.revenue_range || null;
  const employeeRange = org.estimated_num_employees_range || org.employee_range || null;
  const technologies = org.technologies || org.tech_stack || [];
  const keywords = org.keywords || [];
  const tags = org.tags || [];
  const phone = org.phone_number || org.phone || null;
  const email = org.email || null;
  const twitter = org.twitter_url || org.twitter || null;
  const facebook = org.facebook_url || org.facebook || null;
  const modelId = org.model_id || org.id || null;
  const apolloUrl = org.apollo_url || org.url || null;
  const funding = org.total_funding || org.funding || null;
  const lastFundingDate = org.last_funding_date || null;
  const lastFundingAmount = org.last_funding_amount || null;
  const headquarters = org.headquarters || org.hq_location || location;
  const suborganizations = org.suborganizations || [];
  const parentOrganization = org.parent_organization || null;
  const keywordsString = org.keywords_string || null;
  const industryGroup = org.industry_group || null;
  const naicsCode = org.naics_code || null;
  const sicCode = org.sic_code || null;

  const domain = extractDomain(website);
  const logoUrl = domain ? getCompanyLogo(domain) : null;
  const initials = getInitials(org.name);

  return `
    <div class="modal-overlay" id="company-modal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="company-logo">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(org.name)}" onerror="this.parentElement.innerHTML='<div class=\\'company-logo-placeholder\\'>${initials}</div>'">` : `<div class="company-logo-placeholder">${initials}</div>`}
            </div>
            <div class="modal-title-section">
              <div class="modal-title">${escapeHtml(org.name || 'Unknown Company')}</div>
              ${website ? `<div style="margin-top: 4px;">
                <a href="${escapeHtml(website)}" target="_blank" rel="noopener" style="color: #5f6368; font-size: 0.875rem; text-decoration: none;">${escapeHtml(website.replace(/^https?:\/\//, ''))}</a>
              </div>` : ''}
              ${(linkedin || twitter || facebook || website || apolloUrl) ? `
                <div class="header-actions">
                  ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener" class="social-icon website" title="Website">🔗</a>` : ''}
                  ${linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="social-icon linkedin" title="LinkedIn">in</a>` : ''}
                  ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" class="social-icon twitter" title="Twitter">𝕏</a>` : ''}
                  ${facebook ? `<a href="${escapeHtml(facebook)}" target="_blank" rel="noopener" class="social-icon facebook" title="Facebook">f</a>` : ''}
                  ${apolloUrl ? `<a href="${escapeHtml(apolloUrl)}" target="_blank" rel="noopener" class="social-icon apollo" title="Apollo Profile">A</a>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          <button class="modal-close" onclick="closeCompanyDetail()">×</button>
        </div>
        <div class="modal-body">
          ${description ? `
            <div class="detail-section">
              <div class="detail-section-title">About</div>
              <div class="detail-item-value">${escapeHtml(description)}</div>
            </div>
          ` : ''}

          <div class="detail-section">
            <div class="detail-section-title">Company Information</div>
            <div class="detail-grid">
              ${industry ? `
                <div class="detail-item">
                  <div class="detail-item-label">Industry</div>
                  <div class="detail-item-value">${escapeHtml(industry)}</div>
                </div>
              ` : ''}
              ${industryGroup ? `
                <div class="detail-item">
                  <div class="detail-item-label">Industry Group</div>
                  <div class="detail-item-value">${escapeHtml(industryGroup)}</div>
                </div>
              ` : ''}
              ${headquarters ? `
                <div class="detail-item">
                  <div class="detail-item-label">Headquarters</div>
                  <div class="detail-item-value">${escapeHtml(headquarters)}</div>
                </div>
              ` : ''}
              ${employees ? `
                <div class="detail-item">
                  <div class="detail-item-label">Employees</div>
                  <div class="detail-item-value">${formatNumber(employees)}</div>
                </div>
              ` : ''}
              ${employeeRange ? `
                <div class="detail-item">
                  <div class="detail-item-label">Employee Range</div>
                  <div class="detail-item-value">${escapeHtml(employeeRange)}</div>
                </div>
              ` : ''}
              ${founded ? `
                <div class="detail-item">
                  <div class="detail-item-label">Founded</div>
                  <div class="detail-item-value">${founded}</div>
                </div>
              ` : ''}
              ${revenue ? `
                <div class="detail-item">
                  <div class="detail-item-label">Annual Revenue</div>
                  <div class="detail-item-value">$${formatNumber(revenue)}</div>
                </div>
              ` : ''}
              ${revenueRange ? `
                <div class="detail-item">
                  <div class="detail-item-label">Revenue Range</div>
                  <div class="detail-item-value">${escapeHtml(revenueRange)}</div>
                </div>
              ` : ''}
              ${funding ? `
                <div class="detail-item">
                  <div class="detail-item-label">Total Funding</div>
                  <div class="detail-item-value">$${formatNumber(funding)}</div>
                </div>
              ` : ''}
              ${lastFundingDate ? `
                <div class="detail-item">
                  <div class="detail-item-label">Last Funding Date</div>
                  <div class="detail-item-value">${escapeHtml(lastFundingDate)}</div>
                </div>
              ` : ''}
              ${lastFundingAmount ? `
                <div class="detail-item">
                  <div class="detail-item-label">Last Funding Amount</div>
                  <div class="detail-item-value">$${formatNumber(lastFundingAmount)}</div>
                </div>
              ` : ''}
              ${naicsCode ? `
                <div class="detail-item">
                  <div class="detail-item-label">NAICS Code</div>
                  <div class="detail-item-value">${escapeHtml(naicsCode)}</div>
                </div>
              ` : ''}
              ${sicCode ? `
                <div class="detail-item">
                  <div class="detail-item-label">SIC Code</div>
                  <div class="detail-item-value">${escapeHtml(sicCode)}</div>
                </div>
              ` : ''}
              ${modelId ? `
                <div class="detail-item">
                  <div class="detail-item-label">Apollo ID</div>
                  <div class="detail-item-value">${escapeHtml(modelId)}</div>
                </div>
              ` : ''}
            </div>
          </div>

          ${(phone || email) ? `
            <div class="detail-section">
              <div class="detail-section-title">Contact Information</div>
              <div class="detail-grid">
                ${phone ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Phone</div>
                    <div class="detail-item-value"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>
                  </div>
                ` : ''}
                ${email ? `
                  <div class="detail-item">
                    <div class="detail-item-label">Email</div>
                    <div class="detail-item-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${(linkedin || twitter || facebook || website || apolloUrl) ? `
            <div class="detail-section">
              <div class="detail-section-title">Social Links</div>
              <div class="social-icons">
                ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener" class="social-icon website" title="Visit Website">🔗</a>` : ''}
                ${linkedin ? `<a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener" class="social-icon linkedin" title="LinkedIn Profile">in</a>` : ''}
                ${twitter ? `<a href="${escapeHtml(twitter)}" target="_blank" rel="noopener" class="social-icon twitter" title="Twitter Profile">𝕏</a>` : ''}
                ${facebook ? `<a href="${escapeHtml(facebook)}" target="_blank" rel="noopener" class="social-icon facebook" title="Facebook Page">f</a>` : ''}
                ${apolloUrl ? `<a href="${escapeHtml(apolloUrl)}" target="_blank" rel="noopener" class="social-icon apollo" title="Apollo Profile">A</a>` : ''}
              </div>
            </div>
          ` : ''}

          ${(technologies.length > 0 || keywords.length > 0 || tags.length > 0 || keywordsString) ? `
            <div class="detail-section">
              <div class="detail-section-title">Technologies & Tags</div>
              <div class="tags-list">
                ${technologies.map((tech: any) => `<span class="tag">${escapeHtml(tech.name || tech)}</span>`).join('')}
                ${keywords.map((keyword: string) => `<span class="tag">${escapeHtml(keyword)}</span>`).join('')}
                ${tags.map((tag: any) => `<span class="tag">${escapeHtml(tag.name || tag)}</span>`).join('')}
                ${keywordsString ? keywordsString.split(',').map(k => k.trim()).filter(k => k).map(k => `<span class="tag">${escapeHtml(k)}</span>`).join('') : ''}
              </div>
            </div>
          ` : ''}

          ${parentOrganization ? `
            <div class="detail-section">
              <div class="detail-section-title">Parent Organization</div>
              <div class="detail-item-value">${escapeHtml(parentOrganization.name || parentOrganization)}</div>
            </div>
          ` : ''}

          ${suborganizations.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">Suborganizations (${suborganizations.length})</div>
              <div class="tags-list">
                ${suborganizations.map((sub: any) => `<span class="tag">${escapeHtml(sub.name || sub)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Show company detail modal
 */
function showCompanyDetail(org: any) {
  selectedCompany = org;
  const modal = renderCompanyDetail(org);
  document.body.insertAdjacentHTML('beforeend', modal);
  document.body.style.overflow = 'hidden';
}

/**
 * Close company detail modal
 */
(window as any).closeCompanyDetail = function() {
  const modal = document.getElementById('company-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
  selectedCompany = null;
};

/**
 * Render breadcrumbs
 */
function renderBreadcrumbs(breadcrumbs: any[]): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return '';

  return `
    <div class="breadcrumbs">
      ${breadcrumbs.map((crumb: any, index: number) => `
        ${index > 0 ? '<span class="breadcrumb-separator">›</span>' : ''}
        <span class="breadcrumb-item">${escapeHtml(crumb.label || crumb.name || String(crumb))}</span>
      `).join('')}
    </div>
  `;
}

/**
 * Render pagination
 */
function renderPagination(pagination: any): string {
  if (!pagination) return '';

  const current = pagination.page || pagination.current_page || 1;
  const total = pagination.total_pages || pagination.pages || 1;
  const perPage = pagination.per_page || pagination.page_size || 10;
  const totalItems = pagination.total || pagination.total_count || 0;

  return `
    <div class="pagination">
      <div class="pagination-info">
        Showing ${((current - 1) * perPage) + 1}-${Math.min(current * perPage, totalItems)} of ${formatNumber(totalItems)} companies
        ${total > 1 ? `(Page ${current} of ${total})` : ''}
      </div>
    </div>
  `;
}

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
    // Extract organizations
    const organizations = extractOrganizations(data);

    if (!organizations || organizations.length === 0) {
      showEmpty('No companies found');
      return;
    }

    allOrganizations = organizations;
    const pagination = getPagination(data);
    const breadcrumbs = getBreadcrumbs(data);

    // Create container
    const container = document.createElement('div');
    container.className = 'companies-container';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>Apollo Company Search</h1>
      <div class="meta">
        <div class="meta-item">
          <span>${organizations.length} compan${organizations.length !== 1 ? 'ies' : 'y'} found</span>
        </div>
        ${pagination?.total ? `<div class="meta-item">
          <span>Total: ${formatNumber(pagination.total)}</span>
        </div>` : ''}
      </div>
    `;
    container.appendChild(header);

    // Breadcrumbs
    if (breadcrumbs.length > 0) {
      const breadcrumbEl = document.createElement('div');
      breadcrumbEl.innerHTML = renderBreadcrumbs(breadcrumbs);
      container.appendChild(breadcrumbEl);
    }

    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';

    // Search box
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.innerHTML = `
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search-input" placeholder="Search by company name, industry, location...">
    `;
    controls.appendChild(searchBox);
    container.appendChild(controls);

    // Companies grid
    const grid = document.createElement('div');
    grid.className = 'companies-grid';
    grid.id = 'companies-grid';
    container.appendChild(grid);

    // Pagination
    if (pagination) {
      const paginationEl = document.createElement('div');
      paginationEl.innerHTML = renderPagination(pagination);
      container.appendChild(paginationEl);
    }

    app.innerHTML = '';
    app.appendChild(container);

    // Render function
    function renderCompanies(orgs: any[]) {
      const gridEl = document.getElementById('companies-grid');
      if (!gridEl) return;

      if (orgs.length === 0) {
        gridEl.innerHTML = '<div class="empty" style="grid-column: 1 / -1;">No companies match your search</div>';
        return;
      }

      gridEl.innerHTML = orgs.map((org, index) => renderCompanyCard(org, index)).join('');

      // Add click handlers to company cards
      gridEl.querySelectorAll('.company-card').forEach((card, index) => {
        card.addEventListener('click', () => {
          const orgIndex = parseInt(card.getAttribute('data-company-index') || '0');
          showCompanyDetail(filteredOrganizations[orgIndex]);
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
          filteredOrganizations = searchOrganizations(allOrganizations, query);
          renderCompanies(filteredOrganizations);
        }, 300);
      });
    }

    // Initial render
    filteredOrganizations = allOrganizations;
    renderCompanies(filteredOrganizations);

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering companies: ${error.message}`);
  }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('company-modal');
  if (modal && e.target === modal) {
    (window as any).closeCompanyDetail();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    (window as any).closeCompanyDetail();
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
