/* ============================================
   INSTAGRAM PROFILE MCP APP (STANDALONE MODE)
   ============================================

   Displays Instagram profile data in an Instagram-style layout.
   Shows profile info, highlights, and posts grid.

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

const APP_NAME = "Instagram Profile";
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

  // Handle Claude format: {message: {status_code: 200, response_content: {...}}}
  if (data.message && typeof data.message === 'object') {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      const content = msg.response_content || msg.body;
      if (content !== undefined) {
        return {
          status_code: msg.status_code,
          body: content,
          response_content: content
        };
      }
    }
  }

  // Handle direct BrightData response format
  if (data.status_code !== undefined) {
    const content = data.body || data.response_content;
    if (content !== undefined) {
      return {
        status_code: data.status_code,
        body: content,
        response_content: content
      };
    }
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
  if (typeof str !== "string") return String(str || '');
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
function showEmpty(message: string = 'No profile data found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/**
 * Format number with K/M suffixes
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
 * Format date relative to now
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateString;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Instagram Profile)
   ============================================ */

/**
 * Extract profile data from BrightData API response
 */
function extractProfile(data: any): any {
  // Handle direct array format: [{...}]
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }

  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;

  // Handle BrightData format: {status_code: 200, body: [{...}]}
  const content = unwrapped.body || unwrapped.response_content;

  if (content && Array.isArray(content) && content.length > 0) {
    return content[0];
  }

  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content;
  }

  if (typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    // Check if it's already a profile object
    if (unwrapped.account || unwrapped.profile_name) {
      return unwrapped;
    }
  }

  return null;
}

/**
 * Render profile header
 */
function renderProfileHeader(profile: any): string {
  const account = profile.account || '';
  const fullName = profile.profile_name || profile.full_name || account;
  const profileImage = profile.profile_image_link || '';
  const biography = profile.biography || '';
  const followers = profile.followers || 0;
  const following = profile.following || 0;
  const postsCount = profile.posts_count || 0;
  const isVerified = profile.is_verified || false;
  const profileUrl = profile.profile_url || profile.url || '';

  return `
    <div class="profile-header">
      <div class="profile-image-container">
        <img
          src="${escapeHtml(profileImage)}"
          alt="${escapeHtml(fullName)}"
          class="profile-image"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        />
        <div class="profile-image-placeholder" style="display: none;">
          <span>📷</span>
        </div>
      </div>

      <div class="profile-info">
        <div class="profile-name-row">
          <h1 class="profile-username">${escapeHtml(account)}</h1>
          ${isVerified ? '<span class="verified-badge">✓</span>' : ''}
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">${formatNumber(postsCount)}</span>
            <span class="stat-label">posts</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${formatNumber(followers)}</span>
            <span class="stat-label">followers</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${formatNumber(following)}</span>
            <span class="stat-label">following</span>
          </div>
        </div>

        <div class="profile-fullname">${escapeHtml(fullName)}</div>

        ${biography ? `<div class="profile-bio">${escapeHtml(biography).replace(/\n/g, '<br>')}</div>` : ''}

        ${profileUrl ? `
          <a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener" class="profile-link">
            View on Instagram →
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render highlights
 */
function renderHighlights(highlights: any[]): string {
  if (!highlights || highlights.length === 0) return '';

  return `
    <div class="highlights-section">
      ${highlights.map((highlight: any) => `
        <a
          href="${escapeHtml(highlight.highlight_url || '#')}"
          target="_blank"
          rel="noopener"
          class="highlight-item"
        >
          <div class="highlight-image-container">
            <img
              src="${escapeHtml(highlight.image || '')}"
              alt="${escapeHtml(highlight.title || '')}"
              class="highlight-image"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="highlight-image-placeholder" style="display: none;">
              <span>📸</span>
            </div>
          </div>
          <div class="highlight-title">${escapeHtml(highlight.title || '')}</div>
        </a>
      `).join('')}
    </div>
  `;
}

/**
 * Render post grid item
 */
function renderPost(post: any): string {
  const imageUrl = post.image_url || '';
  const videoUrl = post.video_url || '';
  const contentType = post.content_type || 'Photo';
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const url = post.url || '';
  const caption = post.caption || '';
  const isVideo = contentType === 'Video' || !!videoUrl;
  const isCarousel = contentType === 'Carousel';

  return `
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="post-item">
      <div class="post-image-container">
        ${isVideo ? `
          <video
            src="${escapeHtml(videoUrl)}"
            class="post-media"
            muted
            playsinline
            onmouseenter="this.play()"
            onmouseleave="this.pause()"
            onerror="this.style.display='none'; this.parentElement.querySelector('.post-image-fallback').style.display='block';"
          >
          </video>
          <img
            src="${escapeHtml(imageUrl)}"
            class="post-image-fallback"
            style="display: none;"
            onerror="this.parentElement.querySelector('.post-placeholder').style.display='flex';"
          />
        ` : `
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${escapeHtml(caption.substring(0, 50))}"
            class="post-media"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
        `}
        <div class="post-placeholder" style="display: none;">
          <span>📷</span>
        </div>

        <div class="post-overlay">
          <div class="post-stats">
            <span class="post-stat">❤️ ${formatNumber(likes)}</span>
            <span class="post-stat">💬 ${formatNumber(comments)}</span>
          </div>
          ${isVideo ? '<span class="post-type-badge">▶️</span>' : ''}
          ${isCarousel ? '<span class="post-type-badge">📷</span>' : ''}
        </div>
      </div>
    </a>
  `;
}

/**
 * Main render function
 */
function renderData(data: any) {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  app.sendLog({ level: "debug", data: `[Instagram Profile] Rendering data: ${JSON.stringify(data)}`, logger: APP_NAME });

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Extract profile
    const profile = extractProfile(data);

    app.sendLog({ level: "debug", data: `[Instagram Profile] Extracted profile: ${JSON.stringify(profile)}`, logger: APP_NAME });

    if (!profile) {
      app.sendLog({ level: "warning", data: `[Instagram Profile] No profile found in data: ${JSON.stringify(data)}`, logger: APP_NAME });
      showEmpty('No profile data found');
      return;
    }

    const posts = profile.posts || [];
    const highlights = profile.highlights || [];

    // Create container
    const container = document.createElement('div');
    container.className = 'instagram-container';

    // Profile header
    container.innerHTML = renderProfileHeader(profile);

    // Highlights
    if (highlights.length > 0) {
      const highlightsEl = document.createElement('div');
      highlightsEl.innerHTML = renderHighlights(highlights);
      container.appendChild(highlightsEl);
    }

    // Posts section
    const postsSection = document.createElement('div');
    postsSection.className = 'posts-section';

    if (posts.length === 0) {
      postsSection.innerHTML = '<div class="no-posts">No posts available</div>';
    } else {
      const postsGrid = document.createElement('div');
      postsGrid.className = 'posts-grid';
      postsGrid.id = 'posts-grid';

      posts.forEach((post: any) => {
        postsGrid.innerHTML += renderPost(post);
      });

      postsSection.appendChild(postsGrid);
    }

    container.appendChild(postsSection);

    appElement.innerHTML = '';
    appElement.appendChild(container);

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    app.sendLog({ level: "error", data: `Render error: ${errorMsg}`, logger: APP_NAME });
    showError(`Error rendering profile: ${error.message}`);
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
  const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
  app.sendLog({ level: "error", data: `App error: ${errorMsg}`, logger: APP_NAME });
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
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${errorMsg}`, logger: APP_NAME });
  });

export {};
