/* ============================================
   BRIGHTDATA LINKEDIN POST MCP APP (STANDALONE MODE)
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

const APP_NAME = "Brightdata Linkedin Post";
const APP_VERSION = "1.0.0";

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
  console.info("Resource teardown requested");
  return {};
};

app.ontoolinput = (params) => {
  console.info("Tool input received:", params.arguments);
};

app.ontoolresult = (params) => {
  console.info("Tool result received");

  // Check for tool execution errors
  if (params.isError) {
    console.error("Tool execution failed:", params.content);
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
    console.warn("Tool result received but no data found:", params);
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  console.info("Tool cancelled:", reason);
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  console.error("App error:", error);
};

app.onhostcontextchanged = (ctx) => {
  console.info("Host context changed:", ctx);
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    console.info("MCP App connected to host");
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    console.error("Failed to connect to MCP host:", error);
  });

export {};
