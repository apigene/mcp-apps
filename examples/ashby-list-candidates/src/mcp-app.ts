/* ============================================
   ASHBY LIST CANDIDATES MCP APP (STANDALONE MODE)
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

const APP_NAME = "Ashby List Candidates";
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
function showEmpty(message: string = 'No candidates available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon icon-inline">${iconUser()}</div>
        <h3 class="empty-state-title">No candidates found</h3>
        <p class="empty-state-message">${escapeHtml(message)}</p>
      </div>
    `;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Ashby Candidates)
   ============================================ */

/* ============================================
   INLINE SVG ICONS (Embedded to avoid CSP)
   ============================================ */

function iconSearch(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>`;
}

function iconDownload(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

function iconFilter(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`;
}

function iconX(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}

function iconUser(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`;
}

function iconMail(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>`;
}

function iconMapPin(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`;
}

function iconCalendar(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>`;
}

function iconCheck(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`;
}

function iconAshby(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
    <rect x="4" y="4" width="24" height="24" rx="4" fill="currentColor"/>
    <text x="16" y="22" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">A</text>
  </svg>`;
}

let allCandidates: any[] = [];
let filteredCandidates: any[] = [];
let sortColumn: string | null = null;
let sortDirection: 'asc' | 'desc' = 'asc';
let tableContainer: HTMLElement | null = null;
let selectedCandidates: Set<string> = new Set();

/**
 * Extract candidates from Ashby API response
 */
function extractCandidates(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Try to find results array
  if (Array.isArray(unwrapped.results)) {
    return unwrapped.results;
  }
  if (Array.isArray(unwrapped.body?.results)) {
    return unwrapped.body.results;
  }
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Get custom field value
 */
function getCustomField(candidate: any, fieldTitle: string): any {
  if (!candidate.customFields || !Array.isArray(candidate.customFields)) {
    return null;
  }
  const field = candidate.customFields.find((f: any) => f.title === fieldTitle);
  return field ? field.value : null;
}

/**
 * Get custom field label
 */
function getCustomFieldLabel(candidate: any, fieldTitle: string): string | null {
  if (!candidate.customFields || !Array.isArray(candidate.customFields)) {
    return null;
  }
  const field = candidate.customFields.find((f: any) => f.title === fieldTitle);
  return field ? (field.valueLabel || field.value) : null;
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
 * Search candidates
 */
function searchCandidates(candidates: any[], query: string): any[] {
  if (!query || query.trim() === '') {
    return candidates;
  }

  const searchTerm = query.toLowerCase().trim();
  return candidates.filter(candidate => {
    const name = (candidate.name || '').toLowerCase();
    const email = (candidate.primaryEmailAddress?.value || '').toLowerCase();
    const position = (candidate.position || '').toLowerCase();
    const company = (candidate.company || '').toLowerCase();
    const school = (candidate.school || '').toLowerCase();
    const location = (candidate.location?.locationSummary || '').toLowerCase();

    return name.includes(searchTerm) ||
           email.includes(searchTerm) ||
           position.includes(searchTerm) ||
           company.includes(searchTerm) ||
           school.includes(searchTerm) ||
           location.includes(searchTerm);
  });
}

/**
 * Filter candidates
 */
function filterCandidates(candidates: any[], filters: any): any[] {
  let filtered = candidates;

  if (filters.experience && filters.experience !== 'all') {
    filtered = filtered.filter(c => {
      const level = getCustomFieldLabel(c, 'Experience level');
      return level === filters.experience;
    });
  }

  if (filters.visa && filters.visa !== 'all') {
    filtered = filtered.filter(c => {
      const needsVisa = getCustomField(c, 'Needs visa');
      return filters.visa === 'yes' ? needsVisa === true : needsVisa === false;
    });
  }

  if (filters.relocate && filters.relocate !== 'all') {
    filtered = filtered.filter(c => {
      const willing = getCustomField(c, 'Willing to relocate');
      return filters.relocate === 'yes' ? willing === true : willing === false;
    });
  }

  if (filters.tag && filters.tag !== 'all') {
    filtered = filtered.filter(c => {
      return c.tags && c.tags.some((tag: any) => tag.id === filters.tag);
    });
  }

  return filtered;
}

/**
 * Sort candidates
 */
function sortCandidates(candidates: any[], column: string, direction: 'asc' | 'desc'): any[] {
  return [...candidates].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (column) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'position':
        aVal = (a.position || '').toLowerCase();
        bVal = (b.position || '').toLowerCase();
        break;
      case 'company':
        aVal = (a.company || '').toLowerCase();
        bVal = (b.company || '').toLowerCase();
        break;
      case 'location':
        aVal = (a.location?.locationSummary || '').toLowerCase();
        bVal = (b.location?.locationSummary || '').toLowerCase();
        break;
      case 'experience':
        aVal = getCustomFieldLabel(a, 'Experience level') || '';
        bVal = getCustomFieldLabel(b, 'Experience level') || '';
        break;
      case 'updated':
        aVal = new Date(a.updatedAt || 0).getTime();
        bVal = new Date(b.updatedAt || 0).getTime();
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Get unique values for filters
 */
function getFilterOptions(candidates: any[]): any {
  const experienceLevels = new Set<string>();
  const tags = new Map<string, string>();
  const locations = new Set<string>();

  candidates.forEach(c => {
    const level = getCustomFieldLabel(c, 'Experience level');
    if (level) experienceLevels.add(level);

    if (c.tags && Array.isArray(c.tags)) {
      c.tags.forEach((tag: any) => {
        if (!tags.has(tag.id)) {
          tags.set(tag.id, tag.title);
        }
      });
    }

    if (c.location?.locationSummary) {
      locations.add(c.location.locationSummary);
    }
  });

  return {
    experienceLevels: Array.from(experienceLevels).sort(),
    tags: Array.from(tags.entries()).map(([id, title]) => ({ id, title })),
    locations: Array.from(locations).sort()
  };
}

/**
 * Render table
 */
function renderTable(candidates: any[]): string {
  if (candidates.length === 0) {
    return `<tbody><tr><td colspan="9" class="empty-state">
      <div class="empty-state-icon icon-inline">${iconUser()}</div>
      <div class="empty-state-title">No candidates found</div>
      <div class="empty-state-message">Try adjusting your filters or search query</div>
    </td></tr></tbody>`;
  }

  let html = '<tbody>';
  candidates.forEach((candidate, index) => {
    const candidateId = candidate.id || `candidate-${index}`;
    const isSelected = selectedCandidates.has(candidateId);
    const experience = getCustomFieldLabel(candidate, 'Experience level') || '-';
    const needsVisa = getCustomField(candidate, 'Needs visa');
    const willingToRelocate = getCustomField(candidate, 'Willing to relocate');
    const expectedStart = getCustomField(candidate, 'Expected start date');
    const preferredTeams = getCustomField(candidate, 'Preferred teams');
    const tags = candidate.tags || [];
    const email = candidate.primaryEmailAddress?.value || '-';
    const location = candidate.location?.locationSummary || '-';

    html += `
      <tr data-candidate-id="${candidateId}" data-profile-url="${candidate.profileUrl || '#'}" class="${isSelected ? 'selected' : ''}" onclick="handleRowClick(event, '${candidateId}')">
        <td onclick="event.stopPropagation()">
          <input type="checkbox" class="row-checkbox candidate-checkbox" data-candidate-id="${candidateId}" ${isSelected ? 'checked' : ''} onchange="toggleCandidateSelection('${candidateId}', this.checked)">
        </td>
        <td>
          <div class="candidate-name" onclick="event.stopPropagation(); showCandidateModal('${candidateId}')">${escapeHtml(candidate.name || '-')}</div>
          ${tags.length > 0 ? `<div style="margin-top: 6px;">${tags.slice(0, 3).map((t: any) => `<span class="tag">${escapeHtml(t.title)}</span>`).join('')}${tags.length > 3 ? `<span class="tag">+${tags.length - 3}</span>` : ''}</div>` : ''}
        </td>
        <td>${escapeHtml(candidate.position || '-')}</td>
        <td>${escapeHtml(candidate.company || '-')}</td>
        <td>
          ${email !== '-' ? `<a href="mailto:${escapeHtml(email)}" class="email-link" onclick="event.stopPropagation()">${escapeHtml(email)}</a>` : '-'}
        </td>
        <td>
          ${location !== '-' ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><span class="icon-inline" style="width: 14px; height: 14px; opacity: 0.6;">${iconMapPin()}</span>${escapeHtml(location)}</span>` : '-'}
        </td>
        <td>
          <span class="badge badge-info">${escapeHtml(experience)}</span>
          ${needsVisa === true ? '<span class="badge badge-warning" title="Needs visa">Visa</span>' : ''}
          ${willingToRelocate === true ? '<span class="badge badge-success" title="Willing to relocate">Relocate</span>' : ''}
        </td>
        <td>
          ${preferredTeams && Array.isArray(preferredTeams) && preferredTeams.length > 0
            ? `<div class="teams-list">${preferredTeams.slice(0, 2).map((t: any) => `<span class="team-badge">${escapeHtml(String(t))}</span>`).join('')}${preferredTeams.length > 2 ? `<span class="team-badge">+${preferredTeams.length - 2}</span>` : ''}</div>`
            : '-'}
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span class="icon-inline" style="width: 14px; height: 14px; opacity: 0.6;">${iconCalendar()}</span>
            ${formatDate(candidate.updatedAt)}
          </span>
        </td>
      </tr>
    `;
  });
  html += '</tbody>';
  return html;
}

/**
 * Apply filters and render table
 */
function applyFiltersAndRender() {
  const searchQuery = (document.getElementById('search-input') as HTMLInputElement)?.value || '';
  const filters = {
    experience: (document.getElementById('filter-experience') as HTMLSelectElement)?.value || 'all',
    visa: (document.getElementById('filter-visa') as HTMLSelectElement)?.value || 'all',
    relocate: (document.getElementById('filter-relocate') as HTMLSelectElement)?.value || 'all',
    tag: (document.getElementById('filter-tag') as HTMLSelectElement)?.value || 'all'
  };

  let filtered = searchCandidates(allCandidates, searchQuery);
  filtered = filterCandidates(filtered, filters);

  if (sortColumn) {
    filtered = sortCandidates(filtered, sortColumn, sortDirection);
  }

  filteredCandidates = filtered;

  // Update results count
  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${allCandidates.length} candidates`;
  }

  // Render table
  const tbody = tableContainer?.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = renderTable(filtered);

    // Update checkboxes based on selection
    filtered.forEach((candidate, index) => {
      const candidateId = candidate.id || `candidate-${index}`;
      const checkbox = tbody.querySelector(`.candidate-checkbox[data-candidate-id="${candidateId}"]`) as HTMLInputElement;
      const row = tbody.querySelector(`tr[data-candidate-id="${candidateId}"]`);
      if (checkbox) {
        checkbox.checked = selectedCandidates.has(candidateId);
      }
      if (row) {
        if (selectedCandidates.has(candidateId)) {
          row.classList.add('selected');
        } else {
          row.classList.remove('selected');
        }
      }
    });
  }

  // Update select all checkbox
  const selectAllCheckbox = document.getElementById('select-all') as HTMLInputElement;
  const headerCheckbox = document.getElementById('header-checkbox') as HTMLInputElement;
  if (selectAllCheckbox && filtered.length > 0) {
    selectAllCheckbox.checked = filtered.every((candidate, index) => {
      const candidateId = candidate.id || `candidate-${index}`;
      return selectedCandidates.has(candidateId);
    });
  }
  if (headerCheckbox && filtered.length > 0) {
    headerCheckbox.checked = filtered.every((candidate, index) => {
      const candidateId = candidate.id || `candidate-${index}`;
      return selectedCandidates.has(candidateId);
    });
  }
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
    // Extract candidates
    const candidates = extractCandidates(data);

    if (!candidates || candidates.length === 0) {
      showEmpty('No candidates found');
      return;
    }

    allCandidates = candidates;
    const filterOptions = getFilterOptions(candidates);

    // Create container
    const container = document.createElement('div');
    container.className = 'candidates-container';

    // Ashby Header
    const ashbyHeader = document.createElement('div');
    ashbyHeader.className = 'ashby-header';
    ashbyHeader.innerHTML = `
      <div class="ashby-logo">
        <div class="ashby-logo-icon">
          <span class="icon-inline">${iconAshby()}</span>
        </div>
        <span class="ashby-logo-text">Ashby</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" onclick="exportCandidates('csv')">
          <span class="icon-inline">${iconDownload()}</span>
          Export CSV
        </button>
        <button class="action-btn" onclick="exportCandidates('json')">
          <span class="icon-inline">${iconDownload()}</span>
          Export JSON
        </button>
      </div>
    `;
    container.appendChild(ashbyHeader);

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>Candidates</h1>
      <div class="meta">${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} found</div>
    `;
    container.appendChild(header);

    // Bulk Actions Bar
    const bulkActions = document.createElement('div');
    bulkActions.className = 'bulk-actions';
    bulkActions.id = 'bulk-actions';
    bulkActions.innerHTML = `
      <span class="bulk-actions-text"><span id="selected-count">0</span> selected</span>
      <button class="bulk-action-btn" onclick="clearSelection()">Clear</button>
      <button class="bulk-action-btn" onclick="exportSelected()">Export Selected</button>
    `;
    container.appendChild(bulkActions);

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const toolbarLeft = document.createElement('div');
    toolbarLeft.className = 'toolbar-left';

    // Search box
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.innerHTML = `
      <span class="search-icon icon-inline">${iconSearch()}</span>
      <input type="text" class="search-input" id="search-input" placeholder="Search by name, email, position, company...">
    `;
    toolbarLeft.appendChild(searchBox);

    toolbar.appendChild(toolbarLeft);

    const toolbarRight = document.createElement('div');
    toolbarRight.className = 'toolbar-right';

    // Select All checkbox
    const selectAllContainer = document.createElement('div');
    selectAllContainer.style.display = 'flex';
    selectAllContainer.style.alignItems = 'center';
    selectAllContainer.style.gap = '8px';
    selectAllContainer.innerHTML = `
      <input type="checkbox" id="select-all" class="row-checkbox" onchange="toggleSelectAll(this.checked)">
      <label for="select-all" style="font-size: 14px; color: var(--ashby-text-secondary); cursor: pointer;">Select All</label>
    `;
    toolbarRight.appendChild(selectAllContainer);

    toolbar.appendChild(toolbarRight);
    container.appendChild(toolbar);


    // Results count
    const resultsCount = document.createElement('div');
    resultsCount.className = 'results-count';
    resultsCount.id = 'results-count';
    container.appendChild(resultsCount);

    // Table
    const tableContainerEl = document.createElement('div');
    tableContainerEl.className = 'table-container';
    tableContainerEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="header-checkbox" class="row-checkbox" onchange="toggleSelectAll(this.checked)">
            </th>
            <th data-sort="name">
              Name <span class="sort-icon">⇅</span>
            </th>
            <th data-sort="position">
              Position <span class="sort-icon">⇅</span>
            </th>
            <th data-sort="company">
              Company <span class="sort-icon">⇅</span>
            </th>
            <th>Email</th>
            <th data-sort="location">
              Location <span class="sort-icon">⇅</span>
            </th>
            <th data-sort="experience">
              Experience <span class="sort-icon">⇅</span>
            </th>
            <th>Preferred Teams</th>
            <th data-sort="updated">
              Updated <span class="sort-icon">⇅</span>
            </th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    container.appendChild(tableContainerEl);
    tableContainer = tableContainerEl;

    app.innerHTML = '';
    app.appendChild(container);

    // Sort handlers
    tableContainer.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const column = th.getAttribute('data-sort');
        if (!column) return;

        // Update sort state
        if (sortColumn === column) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = column;
          sortDirection = 'asc';
        }

        // Update UI
        tableContainer.querySelectorAll('th').forEach(h => {
          h.classList.remove('sorted');
          const icon = h.querySelector('.sort-icon');
          if (icon) icon.textContent = '⇅';
        });

        th.classList.add('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) {
          icon.textContent = sortDirection === 'asc' ? '▲' : '▼';
        }

        applyFiltersAndRender();
      });
    });

    // Setup event listeners
    setupEventListeners();

    // Initial render
    applyFiltersAndRender();

    // Filter handlers
    ['filter-experience', 'filter-visa', 'filter-relocate', 'filter-tag'].forEach(filterId => {
      const filterEl = document.getElementById(filterId) as HTMLSelectElement;
      if (filterEl) {
        filterEl.addEventListener('change', applyFiltersAndRender);
      }
    });

    // Initial render
    applyFiltersAndRender();

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering candidates: ${error.message}`);
  }
}

/* ============================================
   ADVANCED INTERACTIVE FEATURES
   ============================================ */

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search handler
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    let searchTimeout: number;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(applyFiltersAndRender, 300);
    });
  }

  // Filter handlers
  ['filter-experience', 'filter-visa', 'filter-relocate', 'filter-tag'].forEach(id => {
    const filter = document.getElementById(id) as HTMLSelectElement;
    if (filter) {
      filter.addEventListener('change', applyFiltersAndRender);
    }
  });
}

/**
 * Handle row click
 */
(window as any).handleRowClick = function(event: MouseEvent, candidateId: string) {
  // Don't open modal if clicking checkbox
  if ((event.target as HTMLElement).closest('.candidate-checkbox')) {
    return;
  }
  showCandidateModal(candidateId);
};

/**
 * Toggle candidate selection
 */
(window as any).toggleCandidateSelection = function(candidateId: string, checked: boolean) {
  if (checked) {
    selectedCandidates.add(candidateId);
  } else {
    selectedCandidates.delete(candidateId);
  }
  updateSelectionUI();
};

/**
 * Toggle select all
 */
(window as any).toggleSelectAll = function(checked: boolean) {
  filteredCandidates.forEach((candidate, index) => {
    const candidateId = candidate.id || `candidate-${index}`;
    if (checked) {
      selectedCandidates.add(candidateId);
    } else {
      selectedCandidates.delete(candidateId);
    }
  });

  // Update all checkboxes
  document.querySelectorAll('.candidate-checkbox').forEach((checkbox: any) => {
    checkbox.checked = checked;
  });

  // Update row styles
  document.querySelectorAll('tbody tr').forEach((row: any) => {
    const candidateId = row.getAttribute('data-candidate-id');
    if (candidateId) {
      if (checked) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    }
  });

  updateSelectionUI();
};

/**
 * Clear selection
 */
(window as any).clearSelection = function() {
  selectedCandidates.clear();
  document.querySelectorAll('.candidate-checkbox').forEach((checkbox: any) => {
    checkbox.checked = false;
  });
  document.querySelectorAll('tbody tr').forEach((row: any) => {
    row.classList.remove('selected');
  });
  const selectAllCheckbox = document.getElementById('select-all') as HTMLInputElement;
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  updateSelectionUI();
};

/**
 * Update selection UI
 */
function updateSelectionUI() {
  const bulkActions = document.getElementById('bulk-actions');
  const selectedCount = document.getElementById('selected-count');

  if (bulkActions && selectedCount) {
    if (selectedCandidates.size > 0) {
      bulkActions.classList.add('active');
      selectedCount.textContent = String(selectedCandidates.size);
    } else {
      bulkActions.classList.remove('active');
    }
  }

  }

/**
 * Show candidate modal
 */
(window as any).showCandidateModal = function(candidateId: string) {
  const candidate = [...allCandidates, ...filteredCandidates].find((c, i) => {
    const id = c.id || `candidate-${i}`;
    return id === candidateId;
  });

  if (!candidate) return;

  const modal = document.getElementById('candidate-modal');
  const modalContent = document.getElementById('modal-content');

  if (!modal || !modalContent) return;

  const experience = getCustomFieldLabel(candidate, 'Experience level') || '-';
  const needsVisa = getCustomField(candidate, 'Needs visa');
  const willingToRelocate = getCustomField(candidate, 'Willing to relocate');
  const expectedStart = getCustomField(candidate, 'Expected start date');
  const preferredTeams = getCustomField(candidate, 'Preferred teams');
  const tags = candidate.tags || [];
  const email = candidate.primaryEmailAddress?.value || '-';
  const location = candidate.location?.locationSummary || '-';
  const phone = candidate.primaryPhoneNumber?.value || '-';
  const linkedin = candidate.linkedInProfileUrl || '-';
  const github = candidate.githubProfileUrl || '-';
  const portfolio = candidate.portfolioUrl || '-';

  modalContent.innerHTML = `
    <div class="modal-header">
      <div>
        <div class="modal-title">${escapeHtml(candidate.name || 'Candidate')}</div>
        <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
          ${tags.map((t: any) => `<span class="tag">${escapeHtml(t.title)}</span>`).join('')}
        </div>
      </div>
      <button class="close-modal-btn" onclick="closeCandidateModal()">
        <span class="icon-inline">${iconX()}</span>
      </button>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Contact Information</div>
      <div class="modal-field">
        <div class="modal-field-label">Email</div>
        <div class="modal-field-value">
          ${email !== '-' ? `<a href="mailto:${escapeHtml(email)}" class="email-link">${escapeHtml(email)}</a>` : '-'}
        </div>
      </div>
      ${phone !== '-' ? `
      <div class="modal-field">
        <div class="modal-field-label">Phone</div>
        <div class="modal-field-value">${escapeHtml(phone)}</div>
      </div>
      ` : ''}
      ${location !== '-' ? `
      <div class="modal-field">
        <div class="modal-field-label">Location</div>
        <div class="modal-field-value">${escapeHtml(location)}</div>
      </div>
      ` : ''}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Professional Information</div>
      <div class="modal-field">
        <div class="modal-field-label">Position</div>
        <div class="modal-field-value">${escapeHtml(candidate.position || '-')}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Company</div>
        <div class="modal-field-value">${escapeHtml(candidate.company || '-')}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Experience Level</div>
        <div class="modal-field-value">
          <span class="badge badge-info">${escapeHtml(experience)}</span>
        </div>
      </div>
      ${preferredTeams && Array.isArray(preferredTeams) && preferredTeams.length > 0 ? `
      <div class="modal-field">
        <div class="modal-field-label">Preferred Teams</div>
        <div class="modal-field-value">
          <div class="teams-list">${preferredTeams.map((t: any) => `<span class="team-badge">${escapeHtml(String(t))}</span>`).join('')}</div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Additional Details</div>
      ${needsVisa === true ? `
      <div class="modal-field">
        <div class="modal-field-label">Visa Status</div>
        <div class="modal-field-value"><span class="badge badge-warning">Needs Visa</span></div>
      </div>
      ` : ''}
      ${willingToRelocate === true ? `
      <div class="modal-field">
        <div class="modal-field-label">Relocation</div>
        <div class="modal-field-value"><span class="badge badge-success">Willing to Relocate</span></div>
      </div>
      ` : ''}
      ${expectedStart ? `
      <div class="modal-field">
        <div class="modal-field-label">Expected Start Date</div>
        <div class="modal-field-value">${escapeHtml(String(expectedStart))}</div>
      </div>
      ` : ''}
    </div>

    ${(linkedin !== '-' || github !== '-' || portfolio !== '-') ? `
    <div class="modal-section">
      <div class="modal-section-title">Online Profiles</div>
      ${linkedin !== '-' ? `
      <div class="modal-field">
        <div class="modal-field-label">LinkedIn</div>
        <div class="modal-field-value"><a href="${escapeHtml(linkedin)}" target="_blank" class="email-link">${escapeHtml(linkedin)}</a></div>
      </div>
      ` : ''}
      ${github !== '-' ? `
      <div class="modal-field">
        <div class="modal-field-label">GitHub</div>
        <div class="modal-field-value"><a href="${escapeHtml(github)}" target="_blank" class="email-link">${escapeHtml(github)}</a></div>
      </div>
      ` : ''}
      ${portfolio !== '-' ? `
      <div class="modal-field">
        <div class="modal-field-label">Portfolio</div>
        <div class="modal-field-value"><a href="${escapeHtml(portfolio)}" target="_blank" class="email-link">${escapeHtml(portfolio)}</a></div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Last Updated</div>
      <div class="modal-field">
        <div class="modal-field-value">${formatDate(candidate.updatedAt)}</div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  };

/**
 * Close candidate modal
 */
(window as any).closeCandidateModal = function() {
  const modal = document.getElementById('candidate-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
  };

// Close modal on escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    (window as any).closeCandidateModal();
  }
});

// Close modal on backdrop click
const modalEl = document.getElementById('candidate-modal');
if (modalEl) {
  modalEl.addEventListener('click', function(e) {
    if (e.target === this) {
      (window as any).closeCandidateModal();
    }
  });
}

/**
 * Export candidates
 */
(window as any).exportCandidates = function(format: 'csv' | 'json') {
  const candidates = (window as any).currentCandidates || allCandidates;
  if (!candidates || candidates.length === 0) {
    alert('No candidates available to export');
    return;
  }

  if (format === 'csv') {
    exportToCSV(candidates);
  } else {
    exportToJSON(candidates);
  }
};

/**
 * Export selected candidates
 */
(window as any).exportSelected = function() {
  if (selectedCandidates.size === 0) {
    alert('No candidates selected');
    return;
  }

  const candidates = filteredCandidates.filter((candidate, index) => {
    const candidateId = candidate.id || `candidate-${index}`;
    return selectedCandidates.has(candidateId);
  });

  exportToCSV(candidates, 'ashby-candidates-selected.csv');
};

/**
 * Export to CSV
 */
function exportToCSV(candidates: any[], filename: string = 'ashby-candidates.csv') {
  if (!candidates || candidates.length === 0) return;

  const headers = ['Name', 'Position', 'Company', 'Email', 'Location', 'Experience', 'Tags', 'Updated'];
  const rows = candidates.map(candidate => {
    const tags = (candidate.tags || []).map((t: any) => t.title).join('; ');
    const experience = getCustomFieldLabel(candidate, 'Experience level') || '-';
    return [
      candidate.name || '',
      candidate.position || '',
      candidate.company || '',
      candidate.primaryEmailAddress?.value || '',
      candidate.location?.locationSummary || '',
      experience,
      tags,
      formatDate(candidate.updatedAt)
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell || '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Export to JSON
 */
function exportToJSON(candidates: any[], filename: string = 'ashby-candidates.json') {
  const json = JSON.stringify(candidates, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
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
