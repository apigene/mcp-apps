/* ============================================
   GITHUB COMMIT DIFF VIEWER MCP APP
   ============================================
   
   Displays GitHub commit diff in a GitHub-style interface
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "GitHub Commit Diff Viewer";

const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   GITHUB COMMIT DIFF MCP APP (SDK VERSION)
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
  
  // Handle GitHub API response format - check for body object
  if (data.body && typeof data.body === 'object') {
    return data.body;
  }
  
  // Standard table format
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  // Nested formats
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  // Common nested patterns
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
  
  // If data itself is an object
  if (typeof data === 'object') {
    return data;
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

function showEmpty(message: string = 'No diff data found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Extract short SHA (first 7 characters)
 */
function shortSha(sha: string): string {
  return sha ? sha.substring(0, 7) : '';
}

/**
 * Format date relative to now
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'month'} ago`;
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Parse unified diff patch and render it
 */
function renderPatch(patch: string): string {
  if (!patch) return '<div class="diff-placeholder">No diff content</div>';

  const lines = patch.split('\n');
  const hunks: Array<{ header: string; lines: Array<{ type: string; oldLine?: number; newLine?: number; content: string }> }> = [];
  let currentHunk: { header: string; lines: Array<{ type: string; oldLine?: number; newLine?: number; content: string }> } | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        oldLineNum = parseInt(match[1], 10) - 1;
        newLineNum = parseInt(match[3], 10) - 1;
        currentHunk = { header: line, lines: [] };
      } else {
        if (currentHunk) {
          currentHunk.header = line;
        }
      }
    } else if (currentHunk) {
      let type = 'context';
      let oldLine: number | undefined;
      let newLine: number | undefined;
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        type = 'added';
        newLineNum++;
        newLine = newLineNum;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        type = 'deleted';
        oldLineNum++;
        oldLine = oldLineNum;
      } else if (line.startsWith('\\')) {
        type = 'escape';
      } else {
        // Context line
        oldLineNum++;
        newLineNum++;
        oldLine = oldLineNum;
        newLine = newLineNum;
      }
      
      currentHunk.lines.push({
        type,
        oldLine,
        newLine,
        content: line
      });
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  if (hunks.length === 0) {
    return '<div class="diff-placeholder">No diff hunks found</div>';
  }

  return `
    <div class="diff-content-wrapper">
      ${hunks.map((hunk, hunkIdx) => `
        <div class="diff-hunk" data-hunk="${hunkIdx}">
          <div class="diff-hunk-header">
            <span class="diff-hunk-header-line">${escapeHtml(hunk.header)}</span>
          </div>
          <div class="diff-hunk-content">
            <table class="diff-table">
              <tbody>
                ${hunk.lines.map((line, idx) => {
                  const lineClass = line.type === 'added' ? 'diff-line-added' : 
                                   line.type === 'deleted' ? 'diff-line-deleted' : 
                                   line.type === 'escape' ? 'diff-line-escape' : 'diff-line-context';
                  
                  return `
                    <tr class="diff-line ${lineClass}">
                      <td class="diff-line-num diff-line-num-old">${line.oldLine !== undefined ? line.oldLine : ''}</td>
                      <td class="diff-line-num diff-line-num-new">${line.newLine !== undefined ? line.newLine : ''}</td>
                      <td class="diff-line-content">
                        <span class="diff-line-marker">${line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' '}</span>
                        <span class="diff-line-text">${escapeHtml(line.content)}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render a single file diff
 */
function renderFileDiff(file: any, index: number): string {
  const filename = file.filename || file.name || 'unknown';
  const status = file.status || 'modified';
  const additions = file.additions || 0;
  const deletions = file.deletions || 0;
  const changes = file.changes || (additions + deletions);
  const patch = file.patch || '';
  const previousFilename = file.previous_filename;
  const blobUrl = file.blob_url || '';
  const rawUrl = file.raw_url || '';

  const statusClass = status === 'added' ? 'added' : status === 'removed' ? 'removed' : status === 'renamed' ? 'renamed' : 'modified';
  const statusLabel = status === 'added' ? 'A' : status === 'removed' ? 'D' : status === 'renamed' ? 'R' : 'M';

  return `
    <div class="diff-file" data-index="${index}">
      <div class="diff-file-header">
        <div class="diff-file-info">
          <span class="diff-file-status ${statusClass}">${statusLabel}</span>
          <div class="diff-file-names">
            ${previousFilename && previousFilename !== filename ? `
              <a href="${blobUrl}" target="_blank" class="diff-file-name-old">
                ${escapeHtml(previousFilename)}
              </a>
              <span class="diff-file-rename-arrow">→</span>
            ` : ''}
            <a href="${blobUrl}" target="_blank" class="diff-file-name">
              ${escapeHtml(filename)}
            </a>
          </div>
        </div>
        <div class="diff-file-stats">
          <span class="diff-stat-additions">+${additions}</span>
          <span class="diff-stat-deletions">-${deletions}</span>
        </div>
      </div>
      ${patch ? renderPatch(patch) : `
        <div class="diff-placeholder">
          <p>No diff content available</p>
          ${blobUrl ? `<a href="${blobUrl}" target="_blank" class="diff-github-link">View file on GitHub →</a>` : ''}
        </div>
      `}
    </div>
  `;
}

/**
 * Render commit comparison header
 */
function renderComparisonHeader(compareData: any): string {
  const baseCommit = compareData.base_commit || {};
  const commits = compareData.commits || [];
  const totalCommits = compareData.total_commits || commits.length || 0;
  const aheadBy = compareData.ahead_by || 0;
  const behindBy = compareData.behind_by || 0;
  const status = compareData.status || '';
  const htmlUrl = compareData.html_url || '';
  const diffUrl = compareData.diff_url || '';
  const patchUrl = compareData.patch_url || '';

  const baseSha = baseCommit.sha || '';
  const baseCommitData = baseCommit.commit || {};
  const baseAuthor = baseCommitData.author || {};
  const baseAuthorUser = baseCommit.author || {};
  const baseMessage = baseCommitData.message || '';
  const baseMessageTitle = baseMessage.split('\n')[0] || '';
  const baseDate = baseAuthor.date || '';

  const headCommit = commits.length > 0 ? commits[commits.length - 1] : null;
  const headSha = headCommit?.sha || '';
  const headCommitData = headCommit?.commit || {};
  const headAuthor = headCommitData.author || {};
  const headAuthorUser = headCommit.author || {};
  const headMessage = headCommitData.message || '';
  const headMessageTitle = headMessage.split('\n')[0] || '';
  const headDate = headAuthor.date || '';

  const baseAuthorName = baseAuthor.name || baseAuthorUser.login || 'Unknown';
  const baseAuthorAvatar = baseAuthorUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(baseAuthorName)}&size=40`;
  
  const headAuthorName = headAuthor.name || headAuthorUser.login || 'Unknown';
  const headAuthorAvatar = headAuthorUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(headAuthorName)}&size=40`;

  return `
    <div class="diff-header">
      <div class="diff-header-top">
        <h1 class="diff-title">
          <svg class="github-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Comparing changes
        </h1>
        <div class="diff-header-actions">
          ${diffUrl ? `<a href="${diffUrl}" target="_blank" class="diff-action-link">View diff</a>` : ''}
          ${patchUrl ? `<a href="${patchUrl}" target="_blank" class="diff-action-link">View patch</a>` : ''}
        </div>
      </div>
      <div class="diff-comparison">
        <div class="diff-base">
          <div class="diff-commit-info">
            <div class="diff-commit-header">
              <span class="diff-commit-label">Base</span>
              <a href="${baseCommit.html_url || '#'}" target="_blank" class="diff-commit-sha">
                <code>${shortSha(baseSha)}</code>
              </a>
            </div>
            <div class="diff-commit-message">${escapeHtml(baseMessageTitle)}</div>
            <div class="diff-commit-meta">
              <img src="${baseAuthorAvatar}" alt="${escapeHtml(baseAuthorName)}" class="avatar-small" loading="lazy">
              <span class="diff-commit-author">${escapeHtml(baseAuthorName)}</span>
              <span class="diff-commit-time">${formatRelativeTime(baseDate)}</span>
            </div>
          </div>
        </div>
        <div class="diff-separator">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
        </div>
        <div class="diff-head">
          <div class="diff-commit-info">
            <div class="diff-commit-header">
              <span class="diff-commit-label">Head</span>
              <a href="${headCommit?.html_url || '#'}" target="_blank" class="diff-commit-sha">
                <code>${shortSha(headSha)}</code>
              </a>
            </div>
            <div class="diff-commit-message">${escapeHtml(headMessageTitle)}</div>
            <div class="diff-commit-meta">
              <img src="${headAuthorAvatar}" alt="${escapeHtml(headAuthorName)}" class="avatar-small" loading="lazy">
              <span class="diff-commit-author">${escapeHtml(headAuthorName)}</span>
              <span class="diff-commit-time">${formatRelativeTime(headDate)}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="diff-stats">
        <span class="diff-stat-item">
          <span class="diff-stat-value">${totalCommits}</span>
          <span class="diff-stat-label">${totalCommits === 1 ? 'commit' : 'commits'}</span>
        </span>
        ${aheadBy > 0 ? `
          <span class="diff-stat-item">
            <span class="diff-stat-value">${aheadBy}</span>
            <span class="diff-stat-label">ahead</span>
          </span>
        ` : ''}
        ${behindBy > 0 ? `
          <span class="diff-stat-item">
            <span class="diff-stat-value">${behindBy}</span>
            <span class="diff-stat-label">behind</span>
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

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
    // Unwrap data - handle GitHub API response format
    const unwrapped = unwrapData(data);
    
    const compareData = unwrapped || data;
    const files = compareData.files || [];
    
    if (!files || files.length === 0) {
      showEmpty('No file changes found');
      return;
    }
    
    // Calculate totals
    const totalAdditions = files.reduce((sum: number, f: any) => sum + (f.additions || 0), 0);
    const totalDeletions = files.reduce((sum: number, f: any) => sum + (f.deletions || 0), 0);
    const totalChanges = totalAdditions + totalDeletions;
    
    app.innerHTML = `
      <div class="github-container">
        ${renderComparisonHeader(compareData)}
        <div class="diff-summary">
          <div class="diff-summary-stats">
            <span class="diff-summary-stat">
              <span class="diff-summary-value">${files.length}</span>
              <span class="diff-summary-label">${files.length === 1 ? 'file' : 'files'} changed</span>
            </span>
            <span class="diff-summary-stat">
              <span class="diff-summary-value diff-stat-additions">+${totalAdditions}</span>
              <span class="diff-summary-label">additions</span>
            </span>
            <span class="diff-summary-stat">
              <span class="diff-summary-value diff-stat-deletions">-${totalDeletions}</span>
              <span class="diff-summary-label">deletions</span>
            </span>
          </div>
        </div>
        <div class="diff-files">
          ${files.map((file: any, index: number) => renderFileDiff(file, index)).join('')}
        </div>
      </div>
    `;
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering diff: ${error.message}`);
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
  
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    const reason = msg.params?.reason || 'Resource teardown requested';
    
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
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

      if (msg.params?.displayMode === 'fullscreen') {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
      break;

    // Handle tool cancellation
    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      break;

    // Handle resource teardown (requires response)
    case 'ui/resource-teardown':
      console.info("Resource teardown requested");

      if (msg.id !== undefined) {
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: msg.id,
            result: {},
          },
          "*"
        );
      }
      break;
      
    case 'ui/notifications/tool-input':
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        console.log('Tool input received:', toolArguments);
      }
      break;

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
