/* ============================================
   GITHUB COMMITS VIEWER MCP APP
   ============================================

   Displays GitHub commits in a GitHub-style interface
   with expandable diff views
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "GitHub Commits Viewer";

const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   GITHUB LIST COMMITS MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   with app.connect() for standalone initialization.
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

function showEmpty(message: string = 'No commits found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Format date relative to now (e.g., "2 hours ago", "3 days ago")
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
 * Format date for display (e.g., "Feb 5, 2026")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Extract short SHA (first 7 characters)
 */
function shortSha(sha: string): string {
  return sha ? sha.substring(0, 7) : '';
}

/**
 * Parse commit message to extract title and body
 */
function parseCommitMessage(message: string): { title: string; body: string } {
  if (!message) return { title: '', body: '' };

  const lines = message.split('\n');
  const title = lines[0] || '';
  const body = lines.slice(1).filter(l => l.trim()).join('\n');

  return { title, body };
}

/**
 * Render a single commit
 */
function renderCommit(commit: any, index: number): string {
  const sha = commit.sha || '';
  const shortShaStr = shortSha(sha);
  const commitData = commit.commit || {};
  const author = commitData.author || {};
  const committer = commitData.committer || {};
  const authorUser = commit.author || {};
  const committerUser = commit.committer || {};
  const message = commitData.message || '';
  const { title, body } = parseCommitMessage(message);
  const htmlUrl = commit.html_url || '';
  const parents = commit.parents || [];
  const verification = commitData.verification || {};
  const isVerified = verification.verified === true;

  const authorName = author.name || authorUser.login || 'Unknown';
  const authorAvatar = authorUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&size=40`;
  const authorDate = author.date || commitData.committer?.date || '';

  const committerName = committer.name || committerUser.login || 'Unknown';
  const committerAvatar = committerUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(committerName)}&size=40`;
  const committerDate = committer.date || '';

  const isSamePerson = authorName === committerName && authorDate === committerDate;

  return `
    <div class="commit-item" data-index="${index}">
      <div class="commit-header" onclick="toggleCommit(${index})">
        <div class="commit-main">
          <div class="commit-message">
            <a href="${htmlUrl}" target="_blank" class="commit-link" onclick="event.stopPropagation()">
              <span class="commit-title">${escapeHtml(title)}</span>
            </a>
            ${body ? `<span class="commit-body-preview">${escapeHtml(body.substring(0, 100))}${body.length > 100 ? '...' : ''}</span>` : ''}
          </div>
          <div class="commit-meta">
            <div class="commit-author">
              <img src="${authorAvatar}" alt="${escapeHtml(authorName)}" class="avatar" loading="lazy">
              <span class="author-name">${escapeHtml(authorName)}</span>
              ${isVerified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
            </div>
            <div class="commit-sha">
              <a href="${htmlUrl}" target="_blank" class="sha-link" onclick="event.stopPropagation()">
                <code>${shortShaStr}</code>
              </a>
            </div>
            <div class="commit-time">
              <time datetime="${authorDate}">${formatRelativeTime(authorDate)}</time>
            </div>
            ${!isSamePerson ? `
              <div class="commit-committer">
                <span class="committer-label">committed by</span>
                <img src="${committerAvatar}" alt="${escapeHtml(committerName)}" class="avatar-small" loading="lazy">
                <span class="committer-name">${escapeHtml(committerName)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="commit-actions">
          <button class="expand-btn" aria-label="Toggle commit details">
            <svg class="expand-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.78 5.22a.75.75 0 010 1.06L8.53 10.53a.75.75 0 01-1.06 0L3.22 6.28a.75.75 0 011.06-1.06L8 9.19l3.72-3.97a.75.75 0 011.06 0z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="commit-details" id="commit-details-${index}">
        <div class="commit-info">
          <div class="info-row">
            <span class="info-label">Commit:</span>
            <code class="info-value">${sha}</code>
            <button class="copy-btn" onclick="copyToClipboard('${sha}', this)" title="Copy full SHA">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 0110.25 15h-7.5A1.75 1.75 0 010 13.25v-7.5z"/>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
              </svg>
            </button>
          </div>
          <div class="info-row">
            <span class="info-label">Author:</span>
            <span class="info-value">${escapeHtml(authorName)} &lt;${escapeHtml(author.email || '')}&gt;</span>
          </div>
          ${!isSamePerson ? `
            <div class="info-row">
              <span class="info-label">Committer:</span>
              <span class="info-value">${escapeHtml(committerName)} &lt;${escapeHtml(committer.email || '')}&gt;</span>
            </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">${formatDate(authorDate)}</span>
          </div>
          ${parents.length > 0 ? `
            <div class="info-row">
              <span class="info-label">Parent${parents.length > 1 ? 's' : ''}:</span>
              <div class="parents">
                ${parents.map((parent: any) => `
                  <a href="${parent.html_url || '#'}" target="_blank" class="parent-link">
                    <code>${shortSha(parent.sha)}</code>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${verification.verified ? `
            <div class="info-row">
              <span class="info-label">Verification:</span>
              <span class="info-value verified">
                <span class="verified-icon">✓</span> Verified
              </span>
            </div>
          ` : ''}
        </div>
        ${body ? `
          <div class="commit-message-full">
            <div class="message-body">${escapeHtml(body).replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}
        <div class="commit-diff">
          <div class="diff-header">
            <span class="diff-label">Changes</span>
            <button class="load-diff-btn" onclick="loadDiff('${sha}', ${index})" data-sha="${sha}">
              Load diff
            </button>
          </div>
          <div class="diff-content" id="diff-${index}">
            <div class="diff-placeholder">Click "Load diff" to view changes</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Parse and render GitHub diff
 */
function renderDiff(diffData: any): string {
  if (!diffData) {
    return '<div class="diff-placeholder">No diff data available</div>';
  }

  // Handle different diff formats
  let files: any[] = [];

  // Format 1: GitHub API commit response with files array
  if (diffData.files && Array.isArray(diffData.files)) {
    files = diffData.files;
  }
  // Format 2: Direct files array
  else if (Array.isArray(diffData)) {
    files = diffData;
  }
  // Format 3: Single file object
  else if (diffData.filename || diffData.patch) {
    files = [diffData];
  }
  // Format 4: Raw patch string
  else if (typeof diffData === 'string') {
    return renderRawDiff(diffData);
  }

  if (files.length === 0) {
    return '<div class="diff-placeholder">No file changes found</div>';
  }

  return files.map((file: any) => renderFileDiff(file)).join('');
}

/**
 * Render a single file diff
 */
function renderFileDiff(file: any): string {
  const filename = file.filename || file.name || 'unknown';
  const status = file.status || 'modified';
  const additions = file.additions || 0;
  const deletions = file.deletions || 0;
  const changes = file.changes || (additions + deletions);
  const patch = file.patch || '';
  const previousFilename = file.previous_filename;

  const statusClass = status === 'added' ? 'added' : status === 'removed' ? 'removed' : 'modified';
  const statusLabel = status === 'added' ? 'A' : status === 'removed' ? 'D' : status === 'renamed' ? 'R' : 'M';

  return `
    <div class="diff-file">
      <div class="diff-file-header">
        <div class="diff-file-info">
          <span class="diff-file-status ${statusClass}">${statusLabel}</span>
          <span class="diff-file-name">${escapeHtml(filename)}</span>
          ${previousFilename && previousFilename !== filename ? `
            <span class="diff-file-rename">→ ${escapeHtml(previousFilename)}</span>
          ` : ''}
        </div>
        <div class="diff-file-stats">
          <span class="diff-stat-additions">+${additions}</span>
          <span class="diff-stat-deletions">-${deletions}</span>
        </div>
      </div>
      ${patch ? renderPatch(patch) : '<div class="diff-placeholder">No diff content available</div>'}
    </div>
  `;
}

/**
 * Render raw patch string
 */
function renderRawDiff(patch: string): string {
  return `
    <div class="diff-file">
      <div class="diff-file-header">
        <div class="diff-file-info">
          <span class="diff-file-status modified">M</span>
          <span class="diff-file-name">Changes</span>
        </div>
      </div>
      ${renderPatch(patch)}
    </div>
  `;
}

/**
 * Render patch content with syntax highlighting
 */
function renderPatch(patch: string): string {
  if (!patch) return '<div class="diff-placeholder">No patch content</div>';

  const lines = patch.split('\n');
  const hunks: Array<{ header: string; lines: string[] }> = [];
  let currentHunk: { header: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = { header: line, lines: [] };
    } else if (currentHunk) {
      currentHunk.lines.push(line);
    }
  }
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return `
    <div class="diff-content-wrapper">
      ${hunks.map(hunk => `
        <div class="diff-hunk">
          <div class="diff-hunk-header">
            <span class="diff-hunk-header-line">${escapeHtml(hunk.header)}</span>
          </div>
          <div class="diff-hunk-content">
            ${hunk.lines.map((line, idx) => {
              const lineClass = line.startsWith('+') ? 'diff-line-added' :
                               line.startsWith('-') ? 'diff-line-deleted' :
                               line.startsWith('\\') ? 'diff-line-escape' : 'diff-line-context';
              const lineNum = idx + 1;
              return `
                <div class="diff-line ${lineClass}">
                  <span class="diff-line-num"></span>
                  <span class="diff-line-content">${escapeHtml(line)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Extract owner and repo from GitHub URL
 */
function extractRepoInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Load diff for a commit using MCP protocol
 */
(window as any).loadDiff = async function(sha: string, index: number) {
  const diffContent = document.getElementById(`diff-${index}`);
  const loadBtn = document.querySelector(`[data-sha="${sha}"]`) as HTMLElement;

  if (!diffContent) return;

  // Check if already loaded
  if (diffContent.dataset.loaded === 'true') {
    return;
  }

  if (loadBtn) {
    loadBtn.textContent = 'Loading...';
    loadBtn.setAttribute('disabled', 'true');
  }

  // Try to extract repo info from commit URL
  const commitItem = document.querySelector(`[data-index="${index}"]`);
  const commitLink = commitItem?.querySelector('.commit-link') as HTMLAnchorElement;
  let repoInfo: { owner: string; repo: string } | null = null;

  if (commitLink && commitLink.href) {
    repoInfo = extractRepoInfo(commitLink.href);
  }

  try {
    // Request diff data from host via MCP protocol
    // The host should handle fetching from GitHub API: GET /repos/:owner/:repo/commits/:sha
    const requestParams: any = {
      type: 'github-commit-diff',
      sha: sha,
      params: {
        sha: sha
      }
    };

    // Add repo info if available
    if (repoInfo) {
      requestParams.params.owner = repoInfo.owner;
      requestParams.params.repo = repoInfo.repo;
    }

    // Note: In standalone mode, diff loading would need to be handled differently
    // This is a placeholder for now - the host would need to provide this capability
    throw new Error('Diff loading requires host support');

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Failed to load diff: ${JSON.stringify(error)}`, logger: APP_NAME });

    // Show error with helpful message
    if (commitLink && commitLink.href && repoInfo) {
      diffContent.innerHTML = `
        <div class="diff-placeholder">
          <p>Failed to load diff: ${escapeHtml(error.message || 'Unknown error')}</p>
          <p>You can view it on GitHub:</p>
          <a href="${commitLink.href}" target="_blank" class="diff-github-link">
            View diff on GitHub →
          </a>
          <p class="diff-note">
            To enable diff loading, configure your MCP server to handle
            <code>ui/request-data</code> requests for <code>github-commit-diff</code> type.
          </p>
          <p class="diff-note">
            The server should fetch: <code>GET /repos/${repoInfo.owner}/${repoInfo.repo}/commits/${sha}</code>
          </p>
        </div>
      `;
    } else {
      diffContent.innerHTML = `
        <div class="diff-placeholder">
          <p>Failed to load diff: ${escapeHtml(error.message || 'Unknown error')}</p>
          <p class="diff-note">
            To enable diff loading, configure your MCP server to handle
            <code>ui/request-data</code> requests for <code>github-commit-diff</code> type.
          </p>
          ${commitLink && commitLink.href ? `
            <p class="diff-note">
              <a href="${commitLink.href}" target="_blank" class="diff-github-link">
                View diff on GitHub →
              </a>
            </p>
          ` : ''}
        </div>
      `;
    }

    if (loadBtn) {
      loadBtn.textContent = 'Retry';
      loadBtn.removeAttribute('disabled');
    }
  }
};

/**
 * Toggle commit details
 */
(window as any).toggleCommit = function(index: number) {
  const commitItem = document.querySelector(`[data-index="${index}"]`);
  const details = document.getElementById(`commit-details-${index}`);
  const expandIcon = commitItem?.querySelector('.expand-icon');

  if (!commitItem || !details) return;

  const isExpanded = commitItem.classList.contains('expanded');

  if (isExpanded) {
    commitItem.classList.remove('expanded');
    details.style.display = 'none';
    if (expandIcon) {
      expandIcon.style.transform = 'rotate(0deg)';
    }
  } else {
    commitItem.classList.add('expanded');
    details.style.display = 'block';
    if (expandIcon) {
      expandIcon.style.transform = 'rotate(180deg)';
    }
  }
};

/**
 * Copy to clipboard
 */
(window as any).copyToClipboard = function(text: string, button: HTMLElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, 2000);
  });
};

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
    let commits: any[] = [];

    const unwrapped = unwrapData(data);

    if (Array.isArray(unwrapped)) {
      commits = unwrapped;
    } else if (unwrapped?.body && Array.isArray(unwrapped.body)) {
      commits = unwrapped.body;
    } else if (unwrapped?.rows && Array.isArray(unwrapped.rows)) {
      commits = unwrapped.rows;
    } else {
      commits = [];
    }

    if (commits.length === 0) {
      showEmpty('No commits found');
      return;
    }

    app.innerHTML = `
      <div class="github-container">
        <div class="commits-header">
          <h1 class="commits-title">
            <svg class="github-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Commits
          </h1>
          <span class="commits-count">${commits.length} ${commits.length === 1 ? 'commit' : 'commits'}</span>
        </div>
        <div class="commits-list">
          ${commits.map((commit, index) => renderCommit(commit, index)).join('')}
        </div>
      </div>
    `;

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering commits: ${error.message}`);
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
