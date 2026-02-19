/* ============================================
   BRIGHTDATA TIKTOK POST MCP APP (STANDALONE MODE)
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

const APP_NAME = "Brightdata Tiktok Post";
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

   TikTok Post specific utility functions
   ============================================ */

/**
 * Format number with K/M abbreviations (TikTok style)
 */
function formatNumber(num: number | string | undefined): string {
  if (!num) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return n.toString();
}

/**
 * Format date relative to now (TikTok style)
 */
function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

/**
 * Format video duration (seconds to MM:SS)
 */
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get initials from username
 */
function getInitials(username: string | undefined): string {
  if (!username) return '?';
  const parts = username.trim().split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
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

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No TikTok post data received');
    return;
  }

  try {
    // Unwrap nested structures
    const unwrapped = unwrapData(data);

    // Handle array response (body is an array)
    let post: any;
    if (Array.isArray(unwrapped)) {
      post = unwrapped[0];
    } else if (unwrapped.body && Array.isArray(unwrapped.body)) {
      post = unwrapped.body[0];
    } else if (unwrapped.body && typeof unwrapped.body === 'object') {
      post = unwrapped.body;
    } else {
      post = unwrapped;
    }

    if (!post) {
      showEmpty('No post data found');
      return;
    }

    const url = post.url || '';
    const postId = post.post_id || '';
    const description = post.description || '';
    const createTime = post.create_time || '';
    const diggCount = post.digg_count || 0;
    const shareCount = post.share_count || 0;
    const collectCount = post.collect_count || 0;
    const commentCount = post.comment_count || 0;
    const playCount = post.play_count || 0;
    const videoDuration = post.video_duration || 0;
    const videoUrl = post.video_url || post.cdn_link || '';
    const previewImage = post.preview_image || '';
    const postType = post.post_type || 'video';

    // Profile info
    const profileUsername = post.profile_username || post.account_id || '';
    const profileUrl = post.profile_url || '';
    const profileAvatar = post.profile_avatar || '';
    const profileBiography = post.profile_biography || '';
    const profileFollowers = post.profile_followers || 0;
    const isVerified = post.is_verified || false;

    // Music info
    const music = post.music || {};
    const musicTitle = music.title || '';
    const musicAuthor = music.authorname || '';
    const musicCover = music.covermedium || '';

    app.innerHTML = `
      <div class="tiktok-container">
        <!-- Post Card -->
        <div class="post-card">
          <!-- Video/Image Preview -->
          <div class="post-media">
            ${previewImage
              ? `<img src="${escapeHtml(previewImage)}" alt="Post preview" class="post-preview" onerror="this.style.display='none';" />`
              : ''
            }
            ${videoDuration > 0
              ? `<div class="video-duration">${formatDuration(videoDuration)}</div>`
              : ''
            }
            ${videoUrl
              ? `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="play-button">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="24" fill="rgba(0, 0, 0, 0.5)"/>
                    <path d="M18 14L34 24L18 34V14Z" fill="white"/>
                  </svg>
                </a>`
              : ''
            }
          </div>

          <!-- Post Content -->
          <div class="post-content">
            <!-- Profile Header -->
            <div class="profile-header">
              <div class="profile-avatar-wrapper">
                ${profileAvatar
                  ? `<img src="${escapeHtml(profileAvatar)}" alt="${escapeHtml(profileUsername)}" class="profile-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
                  : ''
                }
                <div class="profile-avatar-fallback" style="${profileAvatar ? 'display: none;' : ''}">
                  ${getInitials(profileUsername)}
                </div>
              </div>
              <div class="profile-info">
                <div class="profile-name-row">
                  <a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer" class="profile-username">
                    @${escapeHtml(profileUsername)}
                  </a>
                  ${isVerified
                    ? `<span class="verified-badge" title="Verified">✓</span>`
                    : ''
                  }
                </div>
                ${profileBiography
                  ? `<div class="profile-bio">${escapeHtml(profileBiography)}</div>`
                  : ''
                }
                ${profileFollowers > 0
                  ? `<div class="profile-followers">${formatNumber(profileFollowers)} followers</div>`
                  : ''
                }
              </div>
            </div>

            <!-- Description -->
            ${description
              ? `<div class="post-description">${escapeHtml(description)}</div>`
              : ''
            }

            <!-- Music Info -->
            ${musicTitle || musicAuthor
              ? `<div class="music-info">
                  ${musicCover
                    ? `<img src="${escapeHtml(musicCover)}" alt="Music cover" class="music-cover" onerror="this.style.display='none';" />`
                    : ''
                  }
                  <div class="music-details">
                    <div class="music-icon">🎵</div>
                    <div class="music-text">
                      ${musicTitle
                        ? `<div class="music-title">${escapeHtml(musicTitle)}</div>`
                        : ''
                      }
                      ${musicAuthor
                        ? `<div class="music-author">${escapeHtml(musicAuthor)}</div>`
                        : ''
                      }
                    </div>
                  </div>
                </div>`
              : ''
            }

            <!-- Engagement Stats -->
            <div class="engagement-stats">
              <div class="stat-item">
                <span class="stat-icon">❤️</span>
                <span class="stat-value">${formatNumber(diggCount)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">💬</span>
                <span class="stat-value">${formatNumber(commentCount)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🔁</span>
                <span class="stat-value">${formatNumber(shareCount)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">⭐</span>
                <span class="stat-value">${formatNumber(collectCount)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">👁️</span>
                <span class="stat-value">${formatNumber(playCount)}</span>
              </div>
            </div>

            <!-- Post Meta -->
            <div class="post-meta">
              ${createTime
                ? `<span class="post-time">${formatRelativeTime(createTime)}</span>`
                : ''
              }
              ${postType
                ? `<span class="post-type">${escapeHtml(postType)}</span>`
                : ''
              }
              ${url
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="post-link">View on TikTok →</a>`
                : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering TikTok post: ${error.message}`);
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
    const container = document.querySelector('.tiktok-container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    const container = document.querySelector('.tiktok-container');
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
