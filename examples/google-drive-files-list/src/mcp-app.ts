/* ============================================
   GOOGLE DRIVE FILES LIST MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().

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

const APP_NAME = "Google Drive Files List";
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

function showEmpty(message: string = 'No files found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Get Google Drive file icon SVG based on MIME type
 */
function getFileIconSVG(mimeType: string): string {
  if (mimeType.includes('folder')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 10C8 8.89543 8.89543 8 10 8H18L20 12H30C31.1046 12 32 12.8954 32 14V30C32 31.1046 31.1046 32 30 32H10C8.89543 32 8 31.1046 8 30V10Z" fill="#FFA726"/>
      <path d="M8 10C8 8.89543 8.89543 8 10 8H18L20 12H30C31.1046 12 32 12.8954 32 14V16H8V10Z" fill="#FB8C00"/>
    </svg>`;
  }
  if (mimeType.includes('spreadsheet')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#0F9D58"/>
      <path d="M12 12H28V28H12V12Z" fill="white" fill-opacity="0.1"/>
      <path d="M12 16H28V18H12V16Z" fill="white" fill-opacity="0.3"/>
      <path d="M12 20H28V22H12V20Z" fill="white" fill-opacity="0.3"/>
      <path d="M12 24H28V26H12V24Z" fill="white" fill-opacity="0.3"/>
      <path d="M16 12V28M20 12V28M24 12V28" stroke="white" stroke-opacity="0.2" stroke-width="1"/>
    </svg>`;
  }
  if (mimeType.includes('presentation')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#F4B400"/>
      <rect x="8" y="10" width="24" height="20" rx="1" fill="white" fill-opacity="0.2"/>
      <rect x="10" y="14" width="20" height="2" fill="white" fill-opacity="0.4"/>
      <rect x="10" y="18" width="16" height="2" fill="white" fill-opacity="0.4"/>
      <rect x="10" y="22" width="18" height="2" fill="white" fill-opacity="0.4"/>
      <circle cx="30" cy="12" r="3" fill="white" fill-opacity="0.3"/>
    </svg>`;
  }
  if (mimeType.includes('document')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#4285F4"/>
      <path d="M12 12H28V14H12V12Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 16H28V18H12V16Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 20H24V22H12V20Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 24H26V26H12V24Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 28H22V30H12V28Z" fill="white" fill-opacity="0.6"/>
    </svg>`;
  }
  if (mimeType.includes('pdf')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#EA4335"/>
      <path d="M12 12H28V14H12V12Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 16H28V18H12V16Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 20H24V22H12V20Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 24H26V26H12V24Z" fill="white" fill-opacity="0.6"/>
      <path d="M12 28H22V30H12V28Z" fill="white" fill-opacity="0.6"/>
    </svg>`;
  }
  if (mimeType.includes('image')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#9AA0A6"/>
      <rect x="10" y="12" width="20" height="16" rx="1" fill="white" fill-opacity="0.3"/>
      <circle cx="16" cy="18" r="2" fill="white" fill-opacity="0.5"/>
      <path d="M10 24L14 20L18 24L22 20L30 28H10V24Z" fill="white" fill-opacity="0.4"/>
    </svg>`;
  }
  if (mimeType.includes('video')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#9AA0A6"/>
      <rect x="10" y="12" width="20" height="16" rx="1" fill="white" fill-opacity="0.2"/>
      <path d="M18 20L24 16V24L18 20Z" fill="white" fill-opacity="0.6"/>
    </svg>`;
  }
  if (mimeType.includes('audio')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#9AA0A6"/>
      <path d="M16 12V28M20 10V30M24 14V26" stroke="white" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
  if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="2" fill="#9AA0A6"/>
      <path d="M12 12H28V16H12V12Z" fill="white" fill-opacity="0.3"/>
      <path d="M12 16H28V28H12V16Z" fill="white" fill-opacity="0.2"/>
      <path d="M16 20H24M16 24H24" stroke="white" stroke-opacity="0.4" stroke-width="1.5"/>
    </svg>`;
  }
  // Default file icon
  return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="2" fill="#5F6368"/>
    <path d="M12 12H28V14H12V12Z" fill="white" fill-opacity="0.4"/>
    <path d="M12 16H28V18H12V16Z" fill="white" fill-opacity="0.4"/>
    <path d="M12 20H24V22H12V20Z" fill="white" fill-opacity="0.4"/>
    <path d="M12 24H26V26H12V24Z" fill="white" fill-opacity="0.4"/>
  </svg>`;
}

/**
 * Get file type label from MIME type
 */
function getFileType(mimeType: string): string {
  if (mimeType.includes('folder')) {
    return 'Folder';
  }
  if (mimeType.includes('spreadsheet')) {
    return 'Google Sheets';
  }
  if (mimeType.includes('presentation')) {
    return 'Google Slides';
  }
  if (mimeType.includes('document')) {
    return 'Google Docs';
  }
  if (mimeType.includes('pdf')) {
    return 'PDF';
  }
  if (mimeType.includes('image')) {
    return 'Image';
  }
  if (mimeType.includes('video')) {
    return 'Video';
  }
  if (mimeType.includes('audio')) {
    return 'Audio';
  }
  if (mimeType.includes('wordprocessingml')) {
    return 'Word Document';
  }
  if (mimeType.includes('presentationml')) {
    return 'PowerPoint';
  }
  if (mimeType.includes('markdown')) {
    return 'Markdown';
  }
  return 'File';
}

/**
 * Get file color based on MIME type (Google Drive colors)
 */
function getFileColor(mimeType: string): string {
  if (mimeType.includes('folder')) {
    return '#ffa726'; // Orange
  }
  if (mimeType.includes('spreadsheet')) {
    return '#0f9d58'; // Green
  }
  if (mimeType.includes('presentation')) {
    return '#f4b400'; // Yellow
  }
  if (mimeType.includes('document')) {
    return '#4285f4'; // Blue
  }
  if (mimeType.includes('pdf')) {
    return '#ea4335'; // Red
  }
  return '#5f6368'; // Gray
}

/**
 * Extract files from response data
 */
function extractFiles(data: any): any[] {
  // Handle direct body.files format
  if (data?.body?.files && Array.isArray(data.body.files)) {
    return data.body.files;
  }

  // Handle direct files array
  if (data?.files && Array.isArray(data.files)) {
    return data.files;
  }

  // Handle nested in response
  if (data?.response?.body?.files && Array.isArray(data.response.body.files)) {
    return data.response.body.files;
  }

  // Handle array of file objects
  if (Array.isArray(data) && data.length > 0 && data[0].id && data[0].name) {
    return data;
  }

  return [];
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================ */

// Global state for files, search, and filter
let allFiles: any[] = [];
let currentSearchQuery: string = '';
let currentFilterType: string = 'all'; // 'all', 'folders', 'documents', 'spreadsheets', 'presentations', 'pdfs', 'other'

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    allFiles = extractFiles(unwrapped);

    if (allFiles.length === 0) {
      showEmpty('No files found in Google Drive.');
      return;
    }

    renderFiles();

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering data: ${error.message}`);
  }
}

/**
 * Filter files based on search query and filter type
 */
function filterFiles(): any[] {
  let filtered = [...allFiles];

  // Apply search filter
  if (currentSearchQuery.trim()) {
    const query = currentSearchQuery.toLowerCase().trim();
    filtered = filtered.filter((file: any) => {
      const fileName = (file.name || '').toLowerCase();
      return fileName.includes(query);
    });
  }

  // Apply type filter
  if (currentFilterType !== 'all') {
    filtered = filtered.filter((file: any) => {
      const mimeType = file.mimeType || '';
      switch (currentFilterType) {
        case 'folders':
          return mimeType.includes('folder');
        case 'documents':
          return mimeType.includes('document') && !mimeType.includes('spreadsheet') && !mimeType.includes('presentation');
        case 'spreadsheets':
          return mimeType.includes('spreadsheet');
        case 'presentations':
          return mimeType.includes('presentation');
        case 'pdfs':
          return mimeType.includes('pdf');
        case 'other':
          return !mimeType.includes('folder') &&
                 !mimeType.includes('document') &&
                 !mimeType.includes('spreadsheet') &&
                 !mimeType.includes('presentation') &&
                 !mimeType.includes('pdf');
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Get file counts by type
 */
function getFileCounts() {
  const folders = allFiles.filter((f: any) => f.mimeType?.includes('folder'));
  const documents = allFiles.filter((f: any) =>
    !f.mimeType?.includes('folder') && f.mimeType?.includes('document') &&
    !f.mimeType?.includes('spreadsheet') && !f.mimeType?.includes('presentation')
  );
  const spreadsheets = allFiles.filter((f: any) => f.mimeType?.includes('spreadsheet'));
  const presentations = allFiles.filter((f: any) => f.mimeType?.includes('presentation'));
  const pdfs = allFiles.filter((f: any) => f.mimeType?.includes('pdf'));
  const other = allFiles.filter((f: any) =>
    !f.mimeType?.includes('folder') &&
    !f.mimeType?.includes('document') &&
    !f.mimeType?.includes('spreadsheet') &&
    !f.mimeType?.includes('presentation') &&
    !f.mimeType?.includes('pdf')
  );

  return { folders, documents, spreadsheets, presentations, pdfs, other };
}

/**
 * Render the files UI with search and filters
 */
function renderFiles() {
  const app = document.getElementById('app');
  if (!app) return;

  const filteredFiles = filterFiles();
  const counts = getFileCounts();

  // Group filtered files by type
  const folders = filteredFiles.filter((f: any) => f.mimeType?.includes('folder'));
  const documents = filteredFiles.filter((f: any) =>
    !f.mimeType?.includes('folder') && f.mimeType?.includes('document') &&
    !f.mimeType?.includes('spreadsheet') && !f.mimeType?.includes('presentation')
  );
  const spreadsheets = filteredFiles.filter((f: any) => f.mimeType?.includes('spreadsheet'));
  const presentations = filteredFiles.filter((f: any) => f.mimeType?.includes('presentation'));
  const pdfs = filteredFiles.filter((f: any) => f.mimeType?.includes('pdf'));
  const otherFiles = filteredFiles.filter((f: any) =>
    !f.mimeType?.includes('folder') &&
    !f.mimeType?.includes('document') &&
    !f.mimeType?.includes('spreadsheet') &&
    !f.mimeType?.includes('presentation') &&
    !f.mimeType?.includes('pdf')
  );

  app.innerHTML = `
    <div class="drive-container">
      <div class="drive-header">
        <div class="drive-header-gradient"></div>
        <div class="drive-header-content">
          <div class="drive-logo-wrapper">
            <svg class="drive-logo-svg" width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 12H12C10.8954 12 10 12.8954 10 14V36C10 37.1046 10.8954 38 12 38H36C37.1046 38 38 37.1046 38 36V20L30 12Z" fill="#4285F4"/>
              <path d="M30 12V20H38L30 12Z" fill="#3367D6"/>
              <path d="M14 24H34M14 28H30M14 32H26" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="drive-header-text">
            <h1 class="drive-title">Google Drive</h1>
            <p class="drive-subtitle">${allFiles.length} ${allFiles.length === 1 ? 'file' : 'files'} total • ${filteredFiles.length} ${filteredFiles.length === 1 ? 'file' : 'files'} ${currentSearchQuery || currentFilterType !== 'all' ? 'filtered' : 'shown'}</p>
          </div>
        </div>
      </div>

      <div class="drive-controls">
        <div class="search-container">
          <span class="material-icons search-icon">search</span>
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Search files..."
            value="${escapeHtml(currentSearchQuery)}"
          />
          ${currentSearchQuery ? `
            <button class="search-clear" id="search-clear" aria-label="Clear search">
              <span class="material-icons">close</span>
            </button>
          ` : ''}
        </div>

        <div class="filter-tabs">
          <button class="filter-tab ${currentFilterType === 'all' ? 'active' : ''}" data-filter="all">
            <span class="material-icons">apps</span>
            <span>All (${allFiles.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'folders' ? 'active' : ''}" data-filter="folders">
            <span class="material-icons">folder</span>
            <span>Folders (${counts.folders.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'documents' ? 'active' : ''}" data-filter="documents">
            <span class="material-icons">description</span>
            <span>Docs (${counts.documents.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'spreadsheets' ? 'active' : ''}" data-filter="spreadsheets">
            <span class="material-icons">grid_on</span>
            <span>Sheets (${counts.spreadsheets.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'presentations' ? 'active' : ''}" data-filter="presentations">
            <span class="material-icons">slideshow</span>
            <span>Slides (${counts.presentations.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'pdfs' ? 'active' : ''}" data-filter="pdfs">
            <span class="material-icons">picture_as_pdf</span>
            <span>PDFs (${counts.pdfs.length})</span>
          </button>
          <button class="filter-tab ${currentFilterType === 'other' ? 'active' : ''}" data-filter="other">
            <span class="material-icons">insert_drive_file</span>
            <span>Other (${counts.other.length})</span>
          </button>
        </div>
      </div>

      <div class="drive-content">
        ${filteredFiles.length === 0 ? `
          <div class="empty-state">
            <span class="material-icons empty-icon">search_off</span>
            <p class="empty-message">No files match your search or filter criteria.</p>
          </div>
        ` : ''}

        ${folders.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">folder</span>
              Folders (${folders.length})
            </h2>
            <div class="file-grid">
              ${folders.map((file: any, index: number) => renderFileCard(file, index)).join('')}
            </div>
          </div>
        ` : ''}

        ${documents.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">description</span>
              Documents (${documents.length})
            </h2>
            <div class="file-grid">
              ${documents.map((file: any, index: number) => renderFileCard(file, index + folders.length)).join('')}
            </div>
          </div>
        ` : ''}

        ${spreadsheets.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">grid_on</span>
              Spreadsheets (${spreadsheets.length})
            </h2>
            <div class="file-grid">
              ${spreadsheets.map((file: any, index: number) => renderFileCard(file, index + folders.length + documents.length)).join('')}
            </div>
          </div>
        ` : ''}

        ${presentations.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">slideshow</span>
              Presentations (${presentations.length})
            </h2>
            <div class="file-grid">
              ${presentations.map((file: any, index: number) => renderFileCard(file, index + folders.length + documents.length + spreadsheets.length)).join('')}
            </div>
          </div>
        ` : ''}

        ${pdfs.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">picture_as_pdf</span>
              PDFs (${pdfs.length})
            </h2>
            <div class="file-grid">
              ${pdfs.map((file: any, index: number) => renderFileCard(file, index + folders.length + documents.length + spreadsheets.length + presentations.length)).join('')}
            </div>
          </div>
        ` : ''}

        ${otherFiles.length > 0 ? `
          <div class="file-section">
            <h2 class="section-title">
              <span class="material-icons section-icon">insert_drive_file</span>
              Other Files (${otherFiles.length})
            </h2>
            <div class="file-grid">
              ${otherFiles.map((file: any, index: number) => renderFileCard(file, index + folders.length + documents.length + spreadsheets.length + presentations.length + pdfs.length)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Attach event listeners
  setupEventListeners();
}

/**
 * Setup event listeners for search and filters
 */
function setupEventListeners() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const searchClear = document.getElementById('search-clear');
  const filterTabs = document.querySelectorAll('.filter-tab');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = (e.target as HTMLInputElement).value;
      renderFiles();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        currentSearchQuery = '';
        renderFiles();
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      currentSearchQuery = '';
      renderFiles();
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter');
      if (filter) {
        currentFilterType = filter;
        renderFiles();
      }
    });
  });
}

/**
 * Render a single file card
 */
function renderFileCard(file: any, index: number = 0): string {
  const iconSVG = getFileIconSVG(file.mimeType || '');
  const fileType = getFileType(file.mimeType || '');
  const fileColor = getFileColor(file.mimeType || '');
  const fileName = escapeHtml(file.name || 'Untitled');
  const fileId = escapeHtml(file.id || '');

  return `
    <div class="file-card" data-file-id="${fileId}" style="--file-color: ${fileColor}; animation-delay: ${index * 0.03}s;">
      <div class="file-card-icon-wrapper">
        <div class="file-card-icon">
          ${iconSVG}
        </div>
        <div class="file-icon-glow" style="background: radial-gradient(circle, ${fileColor}22 0%, transparent 70%);"></div>
      </div>
      <div class="file-card-content">
        <h3 class="file-card-name" title="${fileName}">${fileName}</h3>
        <div class="file-card-type-badge">
          <span class="file-type-icon material-icons">${getFileTypeIcon(file.mimeType || '')}</span>
          <span class="file-card-type">${fileType}</span>
        </div>
      </div>
      <div class="file-card-actions">
        <button class="file-action-btn" title="Open file" aria-label="Open file">
          <span class="material-icons">open_in_new</span>
        </button>
      </div>
      <div class="file-card-hover-effect"></div>
    </div>
  `;
}

/**
 * Get Material Icon for file type badge
 */
function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes('folder')) return 'folder';
  if (mimeType.includes('spreadsheet')) return 'grid_on';
  if (mimeType.includes('presentation')) return 'slideshow';
  if (mimeType.includes('document')) return 'description';
  if (mimeType.includes('pdf')) return 'picture_as_pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'videocam';
  if (mimeType.includes('audio')) return 'audiotrack';
  return 'insert_drive_file';
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
  // Add any cleanup logic specific to this app
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

// Export empty object to ensure this file is treated as an ES module
export {};
