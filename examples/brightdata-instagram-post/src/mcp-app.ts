/* ============================================
   BRIGHTDATA INSTAGRAM POST MCP APP (STANDALONE MODE)
   ============================================

   Displays a single Instagram post with media, engagement stats,
   comments, and tagged users.

   Uses app.connect() for standalone MCP Apps protocol communication.
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

const APP_NAME = "Brightdata Instagram Post";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Unwrap nested API response structures
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
 */
function showEmpty(message: string = 'No post data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Format number with K/M abbreviations (Instagram style)
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format date relative to now (Instagram style)
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Extract post data from API response
 */
function extractPostData(data: any): any {
  const unwrapped = unwrapData(data);

  // Handle API response format: { status_code: 200, body: [...] }
  if (unwrapped?.body && Array.isArray(unwrapped.body) && unwrapped.body.length > 0) {
    return unwrapped.body[0];
  }

  // Handle direct post object
  if (unwrapped?.user_posted || unwrapped?.post_id) {
    return unwrapped;
  }

  // Handle array of posts
  if (Array.isArray(unwrapped) && unwrapped.length > 0) {
    return unwrapped[0];
  }

  return unwrapped;
}

/**
 * Render media (photos or videos)
 */
function renderMedia(post: any): string {
  const photos = post.photos || [];
  const videos = post.videos || [];
  const allMedia = [...photos, ...videos];

  if (allMedia.length === 0) {
    return '<div class="no-media">No media available</div>';
  }

  if (allMedia.length === 1) {
    const isVideo = videos.length > 0 && allMedia[0] === videos[0];
    return `
      <div class="media-container single">
        ${isVideo ? `
          <video class="post-media" controls>
            <source src="${escapeHtml(allMedia[0])}" type="video/mp4">
          </video>
          <div class="video-badge">VIDEO</div>
        ` : `
          <img class="post-media" src="${escapeHtml(allMedia[0])}" alt="Post image" loading="lazy" />
        `}
      </div>
    `;
  }

  // Multiple media - show carousel
  return `
    <div class="media-container carousel">
      <div class="media-carousel" id="mediaCarousel">
        ${allMedia.map((media: string, idx: number) => {
          const isVideo = videos.includes(media);
          return `
            <div class="carousel-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
              ${isVideo ? `
                <video class="post-media" controls>
                  <source src="${escapeHtml(media)}" type="video/mp4">
                </video>
                <div class="video-badge">VIDEO</div>
              ` : `
                <img class="post-media" src="${escapeHtml(media)}" alt="Post image ${idx + 1}" loading="lazy" />
              `}
            </div>
          `;
        }).join('')}
      </div>
      <div class="carousel-dots">
        ${allMedia.map((_: any, idx: number) => `
          <span class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
        `).join('')}
      </div>
      ${allMedia.length > 1 ? `
        <button class="carousel-nav prev" id="carouselPrev">‹</button>
        <button class="carousel-nav next" id="carouselNext">›</button>
      ` : ''}
    </div>
  `;
}

/**
 * Render comments section
 */
function renderComments(comments: any[]): string {
  if (!comments || comments.length === 0) {
    return '';
  }

  return `
    <div class="comments-section">
      ${comments.slice(0, 5).map((comment: any) => `
        <div class="comment">
          <img class="comment-avatar" src="${escapeHtml(comment.profile_picture || '')}" alt="${escapeHtml(comment.user_commenting)}" loading="lazy" />
          <div class="comment-content">
            <div class="comment-text">
              <strong>${escapeHtml(comment.user_commenting)}</strong>
              <span>${escapeHtml(comment.comments)}</span>
            </div>
            ${comment.likes > 0 ? `
              <div class="comment-likes">${formatNumber(comment.likes)} likes</div>
            ` : ''}
          </div>
        </div>
      `).join('')}
      ${comments.length > 5 ? `
        <div class="view-more-comments">View all ${comments.length} comments</div>
      ` : ''}
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
    showEmpty('No post data received');
    return;
  }

  try {
    const post = extractPostData(data);

    if (!post || !post.user_posted) {
      showEmpty('Invalid post data format');
      return;
    }

    const {
      user_posted,
      description,
      likes,
      num_comments,
      date_posted,
      photos = [],
      videos = [],
      latest_comments = [],
      profile_image_link,
      is_verified,
      followers,
      posts_count,
      tagged_users = [],
      coauthor_producers = [],
      content_type,
      url
    } = post;

    app.innerHTML = `
      <div class="container">
        <div class="instagram-post">
          <!-- Profile Header -->
          <div class="post-header">
            <div class="profile-info">
              <img class="profile-avatar" src="${escapeHtml(profile_image_link || '')}" alt="${escapeHtml(user_posted)}" loading="lazy" />
              <div class="profile-details">
                <div class="username-row">
                  <span class="username">${escapeHtml(user_posted)}</span>
                  ${is_verified ? '<span class="verified-badge">✓</span>' : ''}
                  ${coauthor_producers && coauthor_producers.length > 0 ? `
                    <span class="coauthors">
                      ${coauthor_producers.map((coauthor: string) => `@${escapeHtml(coauthor)}`).join(', ')}
                    </span>
                  ` : ''}
                </div>
                ${followers ? `<div class="profile-stats">${formatNumber(followers)} followers</div>` : ''}
              </div>
            </div>
            ${url ? `
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="external-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            ` : ''}
          </div>

          <!-- Media -->
          ${renderMedia(post)}

          <!-- Engagement Bar -->
          <div class="engagement-bar">
            <div class="engagement-icons">
              <span class="icon like-icon">♡</span>
              <span class="icon comment-icon">💬</span>
              <span class="icon share-icon">📤</span>
            </div>
            <div class="engagement-stats">
              ${likes ? `<span class="likes-count">${formatNumber(likes)} likes</span>` : ''}
            </div>
          </div>

          <!-- Caption -->
          ${description ? `
            <div class="post-caption">
              <strong>${escapeHtml(user_posted)}</strong>
              <span>${escapeHtml(description)}</span>
            </div>
          ` : ''}

          <!-- View Comments Link -->
          ${num_comments > 0 ? `
            <div class="view-comments">
              View all ${formatNumber(num_comments)} comments
            </div>
          ` : ''}

          <!-- Comments -->
          ${renderComments(latest_comments)}

          <!-- Tagged Users -->
          ${tagged_users && tagged_users.length > 0 ? `
            <div class="tagged-users">
              <span class="tagged-label">Tagged:</span>
              ${tagged_users.map((user: any) => `
                <a href="https://www.instagram.com/${escapeHtml(user.username)}" target="_blank" rel="noopener noreferrer" class="tagged-user">
                  ${user.is_verified ? '<span class="verified-badge small">✓</span>' : ''}
                  ${escapeHtml(user.username)}
                </a>
              `).join(', ')}
            </div>
          ` : ''}

          <!-- Post Meta -->
          <div class="post-meta">
            ${date_posted ? `
              <span class="post-time">${formatRelativeTime(date_posted)}</span>
            ` : ''}
            ${content_type ? `
              <span class="content-type">${escapeHtml(content_type)}</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Setup carousel navigation
    const carouselItems = app.querySelectorAll('.carousel-item');
    const carouselDots = app.querySelectorAll('.carousel-dots .dot');
    const prevBtn = app.querySelector('#carouselPrev');
    const nextBtn = app.querySelector('#carouselNext');

    if (carouselItems.length > 1) {
      let currentIndex = 0;

      const showSlide = (index: number) => {
        carouselItems.forEach((item, idx) => {
          item.classList.toggle('active', idx === index);
        });
        carouselDots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === index);
        });
        currentIndex = index;
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          showSlide((currentIndex - 1 + carouselItems.length) % carouselItems.length);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          showSlide((currentIndex + 1) % carouselItems.length);
        });
      }

      carouselDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
          showSlide(idx);
        });
      });
    }

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering post data: ${error.message}`);
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
