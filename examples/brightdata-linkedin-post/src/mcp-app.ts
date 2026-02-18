/* ============================================
   BRIGHTDATA LINKEDIN POST MCP APP (SDK VERSION)
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

const APP_NAME = "Brightdata Linkedin Post";
const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-01-01";

function debugLog(...args: any[]) {
  console.log("[LinkedIn Post]", ...args);
}

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
 * Format date relative to now (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  } catch (e) {
    return dateString;
  }
}

/**
 * Format date to readable format
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Render comment card
 */
function renderCommentCard(comment: any, index: number): string {
  const userName = escapeHtml(comment.user_name || 'Unknown');
  const userUrl = escapeHtml(comment.use_url || '#');
  const commentText = escapeHtml(comment.comment || '');
  const commentDate = formatRelativeDate(comment.comment_date);
  const numReactions = comment.num_reactions || 0;
  const taggedUsers = comment.tagged_users || [];
  
  return `
    <div class="comment-card">
      <a href="${userUrl}" target="_blank" rel="noopener noreferrer" class="comment-author-link">
        <div class="comment-avatar">
          ${getInitials(userName)}
        </div>
        <div class="comment-content-wrapper">
          <div class="comment-header">
            <span class="comment-author-name">${userName}</span>
            ${commentDate ? `<span class="comment-date">${commentDate}</span>` : ''}
          </div>
          <div class="comment-text">${commentText}</div>
          ${taggedUsers.length > 0 ? `
            <div class="comment-tagged">
              Tagged: ${taggedUsers.map((url: string) => {
                const match = url.match(/in\/([^?]+)/);
                return match ? escapeHtml(match[1]) : '';
              }).filter(Boolean).join(', ')}
            </div>
          ` : ''}
          ${numReactions > 0 ? `
            <div class="comment-reactions">
              <span class="reaction-icon">👍</span>
              <span class="reaction-count">${formatNumber(numReactions)}</span>
            </div>
          ` : ''}
        </div>
      </a>
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
 * Main render function - renders the LinkedIn post
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    debugLog("renderData: no data");
    showEmpty('No LinkedIn post data received');
    return;
  }

  debugLog("renderData: received", typeof data === "object" ? Object.keys(data) : typeof data);

  try {
    // Unwrap nested structures
    const unwrapped = unwrapData(data);
    debugLog("renderData: unwrapped keys", typeof unwrapped === "object" && unwrapped !== null ? Object.keys(unwrapped) : typeof unwrapped);

    // Bright Data format: body.content[0].text is a JSON string of post array
    const content = unwrapped?.body?.content;
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0];
      debugLog("renderData: body.content[0]", { type: first?.type, hasText: typeof first?.text === "string", textLength: typeof first?.text === "string" ? first.text.length : 0 });
      if (first?.type === 'text' && typeof first.text === 'string') {
        try {
          const parsed = JSON.parse(first.text) as any[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            debugLog("renderData: Bright Data format OK, posts count =", parsed.length);
            const post = parsed[0];
            return renderPost(post);
          }
          debugLog("renderData: Bright Data parse OK but empty or not array", { isArray: Array.isArray(parsed), length: parsed?.length });
        } catch (parseErr) {
          debugLog("renderData: Bright Data JSON.parse failed", parseErr);
        }
      } else {
        debugLog("renderData: body.content[0] not text block, skipping Bright Data path");
      }
    } else {
      debugLog("renderData: no body.content array", { hasBody: !!unwrapped?.body, contentIsArray: Array.isArray(content), contentLength: content?.length });
    }

    // Handle array response (body is an array)
    let post: any;
    let source = "";
    if (Array.isArray(unwrapped)) {
      post = unwrapped[0];
      source = "unwrapped[0]";
    } else if (unwrapped.body && Array.isArray(unwrapped.body)) {
      post = unwrapped.body[0];
      source = "unwrapped.body[0]";
    } else if (unwrapped.body && typeof unwrapped.body === 'object' && !unwrapped.body.content) {
      post = unwrapped.body;
      source = "unwrapped.body";
    } else {
      post = unwrapped;
      source = "unwrapped";
    }
    debugLog("renderData: post source =", source, "post =", post ? (post.id ?? post.url ?? "(no id/url)") : null);

    if (!post) {
      debugLog("renderData: no post found, unwrapped =", unwrapped);
      showEmpty('No post data found');
      return;
    }

    renderPost(post);
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering LinkedIn post: ${error.message}`);
  }
}

/**
 * Render a single post object into the app container
 */
function renderPost(post: any) {
  const app = document.getElementById('app');
  if (!app) {
    debugLog("renderPost: #app not found");
    return;
  }
  debugLog("renderPost: rendering", { id: post.id, url: post.url, hasPostText: !!(post.post_text || post.post_text_html) });

    const url = post.url || '';
    const postId = post.id || '';
    const userId = post.user_id || '';
    const userUrl = post.use_url || '';
    const title = post.title || '';
    const headline = post.headline || '';
    const postText = post.post_text || post.original_post_text || '';
    const postTextHtml = post.post_text_html || '';
    const datePosted = post.date_posted || '';
    const images = post.images || [];
    const numLikes = post.num_likes || 0;
    const numComments = post.num_comments || 0;
    const topVisibleComments = post.top_visible_comments || [];
    const userFollowers = post.user_followers || 0;
    const userPosts = post.user_posts || 0;
    const userArticles = post.user_articles || 0;
    const postType = post.post_type || 'post';
    const accountType = post.account_type || 'Person';
    const authorProfilePic = post.author_profile_pic || '';
    
    // Extract user name from userUrl or use userId
    const userNameMatch = userUrl.match(/in\/([^?]+)/);
    const userName = userNameMatch ? userNameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : userId;
    
    app.innerHTML = `
      <div class="linkedin-post-container">
        <!-- Post Card -->
        <div class="post-card">
          <!-- Author Header -->
          <div class="post-header">
            <a href="${escapeHtml(userUrl)}" target="_blank" rel="noopener noreferrer" class="author-link">
              <div class="author-avatar">
                ${authorProfilePic 
                  ? `<img src="${escapeHtml(authorProfilePic)}" alt="${escapeHtml(userName)}" class="avatar-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
                  : ''
                }
                <div class="avatar-fallback" style="${authorProfilePic ? 'display: none;' : ''}">
                  ${getInitials(userName)}
                </div>
              </div>
              <div class="author-info">
                <div class="author-name">${escapeHtml(userName)}</div>
                ${headline ? `<div class="author-headline">${escapeHtml(headline)}</div>` : ''}
                ${datePosted ? `<div class="post-date">${formatRelativeDate(datePosted)}</div>` : ''}
              </div>
            </a>
          </div>

          <!-- Post Content -->
          <div class="post-content">
            ${postTextHtml 
              ? `<div class="post-text-html">${postTextHtml}</div>`
              : postText 
                ? `<div class="post-text">${escapeHtml(postText).replace(/\n/g, '<br/>')}</div>`
                : ''
            }
            
            ${images.length > 0 ? `
              <div class="post-images">
                ${images.map((img: string, idx: number) => `
                  <div class="post-image-wrapper">
                    <img src="${escapeHtml(img)}" alt="Post image ${idx + 1}" class="post-image" loading="lazy" />
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Engagement Metrics -->
          <div class="post-engagement">
            ${numLikes > 0 || numComments > 0 ? `
              <div class="engagement-stats">
                ${numLikes > 0 ? `
                  <div class="engagement-item">
                    <span class="engagement-icon">👍</span>
                    <span class="engagement-count">${formatNumber(numLikes)}</span>
                  </div>
                ` : ''}
                ${numComments > 0 ? `
                  <div class="engagement-item">
                    <span class="engagement-icon">💬</span>
                    <span class="engagement-count">${formatNumber(numComments)}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            ${url ? `
              <div class="post-link-wrapper">
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="post-link">
                  View on LinkedIn
                </a>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Comments Section -->
        ${topVisibleComments.length > 0 ? `
          <div class="comments-section">
            <h2 class="comments-title">Top Comments (${topVisibleComments.length})</h2>
            <div class="comments-list">
              ${topVisibleComments.map((comment: any, index: number) => renderCommentCard(comment, index)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Post Metadata -->
        <div class="post-metadata">
          <div class="metadata-item">
            <span class="metadata-label">Post Type:</span>
            <span class="metadata-value">${escapeHtml(postType)}</span>
          </div>
          ${accountType ? `
            <div class="metadata-item">
              <span class="metadata-label">Account Type:</span>
              <span class="metadata-value">${escapeHtml(accountType)}</span>
            </div>
          ` : ''}
          ${userFollowers > 0 ? `
            <div class="metadata-item">
              <span class="metadata-label">Author Followers:</span>
              <span class="metadata-value">${formatNumber(userFollowers)}</span>
            </div>
          ` : ''}
          ${userPosts > 0 ? `
            <div class="metadata-item">
              <span class="metadata-label">Author Posts:</span>
              <span class="metadata-value">${formatNumber(userPosts)}</span>
            </div>
          ` : ''}
          ${userArticles > 0 ? `
            <div class="metadata-item">
              <span class="metadata-label">Author Articles:</span>
              <span class="metadata-value">${formatNumber(userArticles)}</span>
            </div>
          ` : ''}
          ${datePosted ? `
            <div class="metadata-item">
              <span class="metadata-label">Posted:</span>
              <span class="metadata-value">${formatDate(datePosted)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
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
    case 'ui/notifications/tool-result': {
      const data = msg.params?.structuredContent || msg.params;
      debugLog("tool-result: data source =", msg.params?.structuredContent !== undefined ? "structuredContent" : "params", "keys =", data && typeof data === "object" ? Object.keys(data) : typeof data);
      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;
    }
      
    case 'ui/notifications/host-context-changed':
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
      
    case 'ui/notifications/tool-input':
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        // Template-specific: You can use this for initial rendering or context
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
    const container = document.querySelector('.linkedin-post-container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.linkedin-post-container');
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

// Make function globally accessible for testing/debugging
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
