/* ============================================
   SLACK SEARCH MESSAGES MCP APP (SDK VERSION)
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

const APP_NAME = "Slack Search Messages";
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
   
   Slack message formatting and utility functions
   ============================================ */

/**
 * Format Slack timestamp to readable date/time
 */
function formatSlackTimestamp(ts: string): string {
  const timestamp = parseFloat(ts);
  if (isNaN(timestamp)) return ts;
  
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Format full date/time for tooltips
 */
function formatFullTimestamp(ts: string): string {
  const timestamp = parseFloat(ts);
  if (isNaN(timestamp)) return ts;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Get channel display name
 */
function getChannelName(channel: any): string {
  if (!channel) return 'Unknown';
  return channel.name || channel.id || 'Unknown';
}

/**
 * Get user display name
 */
function getUserDisplayName(message: any): string {
  if (message.username) return message.username;
  if (message.user) return `User ${message.user}`;
  return 'Unknown User';
}

/**
 * Process text to handle URLs, HTML entities, and word wrapping
 */
function processText(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities
  const div = document.createElement('div');
  div.innerHTML = text;
  let processed = div.textContent || div.innerText || text;
  
  // Replace HTML entities that might still be encoded
  processed = processed
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Extract and wrap URLs properly
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  processed = processed.replace(urlRegex, (url) => {
    // Truncate very long URLs for display but keep full URL in href
    const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
    return `<a href="${escapeHtml(url)}" target="_blank" class="slack-link" rel="noopener noreferrer">${escapeHtml(displayUrl)}</a>`;
  });
  
  // Handle mentions (@username)
  processed = processed.replace(/@(\w+)/g, '<span class="slack-mention">@$1</span>');
  
  // Handle channel references (#channel)
  processed = processed.replace(/#(\w+)/g, '<span class="slack-channel-ref">#$1</span>');
  
  return processed;
}

/**
 * Render Slack attachment
 */
function renderAttachment(attachment: any): string {
  if (!attachment) return '';
  
  const color = attachment.color || '';
  const title = attachment.title || '';
  const titleLink = attachment.title_link || '';
  const text = attachment.text || '';
  const fallback = attachment.fallback || '';
  const fields = attachment.fields || [];
  const footer = attachment.footer || '';
  const authorName = attachment.author_name || '';
  const authorLink = attachment.author_link || '';
  const authorIcon = attachment.author_icon || '';
  const mrkdwnIn = attachment.mrkdwn_in || [];
  
  let html = `<div class="slack-attachment"${color ? ` style="border-left-color: #${color}"` : ''}>`;
  
  if (authorName) {
    html += `<div class="attachment-author">`;
    if (authorIcon) {
      html += `<img src="${escapeHtml(authorIcon)}" alt="${escapeHtml(authorName)}" class="author-icon" />`;
    }
    if (authorLink) {
      html += `<a href="${escapeHtml(authorLink)}" target="_blank" class="author-link">${escapeHtml(authorName)}</a>`;
    } else {
      html += `<span class="author-name">${escapeHtml(authorName)}</span>`;
    }
    html += `</div>`;
  }
  
  if (title) {
    if (titleLink) {
      html += `<div class="attachment-title"><a href="${escapeHtml(titleLink)}" target="_blank" class="slack-link">${escapeHtml(title)}</a></div>`;
    } else {
      html += `<div class="attachment-title">${escapeHtml(title)}</div>`;
    }
  }
  
  if (text) {
    const processedText = mrkdwnIn.includes('text') ? processText(text) : escapeHtml(text);
    html += `<div class="attachment-text">${processedText}</div>`;
  }
  
  if (fields.length > 0) {
    html += `<div class="attachment-fields">`;
    fields.forEach((field: any) => {
      html += `<div class="attachment-field">`;
      if (field.title) {
        html += `<div class="field-title">${escapeHtml(field.title)}</div>`;
      }
      if (field.value) {
        const processedValue = mrkdwnIn.includes('fields') ? processText(field.value) : escapeHtml(field.value);
        html += `<div class="field-value">${processedValue}</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }
  
  if (footer) {
    html += `<div class="attachment-footer">${processText(footer)}</div>`;
  }
  
  html += `</div>`;
  return html;
}

/**
 * Render Slack blocks (rich text)
 */
function renderBlocks(blocks: any[]): string {
  if (!blocks || blocks.length === 0) return '';
  
  let html = '<div class="slack-blocks">';
  blocks.forEach((block: any) => {
    if (block.type === 'rich_text') {
      html += renderRichTextBlock(block);
    }
  });
  html += '</div>';
  return html;
}

/**
 * Render rich text block
 */
function renderRichTextBlock(block: any): string {
  if (!block.elements) return '';
  
  let html = '<div class="rich-text-block">';
  block.elements.forEach((element: any) => {
    if (element.type === 'rich_text_section') {
      element.elements?.forEach((el: any) => {
        if (el.type === 'link') {
          const displayUrl = el.url.length > 60 ? el.url.substring(0, 57) + '...' : el.url;
          html += `<a href="${escapeHtml(el.url)}" target="_blank" class="slack-link" rel="noopener noreferrer">${escapeHtml(displayUrl)}</a>`;
        } else if (el.type === 'text') {
          let text = escapeHtml(el.text || '');
          // Handle mentions and channels in text
          text = text.replace(/@(\w+)/g, '<span class="slack-mention">@$1</span>');
          text = text.replace(/#(\w+)/g, '<span class="slack-channel-ref">#$1</span>');
          html += text;
        } else if (el.text) {
          html += escapeHtml(el.text);
        }
      });
    }
  });
  html += '</div>';
  return html;
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
   4. Call notifySizeChanged() after rendering completes
   5. Handle errors gracefully with try/catch
   ============================================ */

// Store messages for filtering/searching
let allMessages: any[] = [];
let filteredMessages: any[] = [];

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Unwrap nested structures
    const unwrapped = unwrapData(data);
    
    // Extract messages from Slack API response format
    let messages: any[] = [];
    let query = '';
    let pagination: any = null;
    
    // Handle different data structures
    if (unwrapped.body?.messages?.matches) {
      messages = unwrapped.body.messages.matches;
      query = unwrapped.body.query || '';
      pagination = unwrapped.body.messages.pagination || unwrapped.body.messages.paging;
    } else if (unwrapped.messages?.matches) {
      messages = unwrapped.messages.matches;
      query = unwrapped.query || '';
      pagination = unwrapped.messages.pagination || unwrapped.messages.paging;
    } else if (Array.isArray(unwrapped)) {
      messages = unwrapped;
    } else if (unwrapped.matches) {
      messages = unwrapped.matches;
    }
    
    if (!messages || messages.length === 0) {
      showEmpty('No messages found');
      return;
    }
    
    // Store all messages for filtering
    allMessages = messages;
    filteredMessages = [...messages];
    
    // Build HTML
    let html = '<div class="slack-container">';
    
    // Header with search bar and filters
    html += '<div class="slack-header">';
    html += '<div class="header-top">';
    html += '<div class="search-bar-container">';
    html += '<input type="text" id="slack-search-input" class="slack-search-input" placeholder="Search messages..." />';
    html += '<button id="slack-search-clear" class="search-clear-btn" style="display: none;">✕</button>';
    html += '</div>';
    
    // Filters
    html += '<div class="slack-filters">';
    
    // Channel filter
    const channels = [...new Set(messages.map(m => getChannelName(m.channel || {})))].sort();
    html += '<select id="channel-filter" class="slack-filter">';
    html += '<option value="">All channels</option>';
    channels.forEach(ch => {
      html += `<option value="${escapeHtml(ch)}">#${escapeHtml(ch)}</option>`;
    });
    html += '</select>';
    
    // User filter
    const users = [...new Set(messages.map(m => getUserDisplayName(m)))].sort();
    html += '<select id="user-filter" class="slack-filter">';
    html += '<option value="">All users</option>';
    users.forEach(user => {
      html += `<option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`;
    });
    html += '</select>';
    
    // Sort options
    html += '<select id="sort-filter" class="slack-filter">';
    html += '<option value="newest">Newest first</option>';
    html += '<option value="oldest">Oldest first</option>';
    html += '</select>';
    
    html += '</div>'; // slack-filters
    html += '</div>'; // header-top
    
    // Search query and stats
    if (query || pagination) {
      html += '<div class="header-bottom">';
      if (query) {
        html += `<div class="search-query">Search: <strong>${escapeHtml(query)}</strong></div>`;
      }
      if (pagination) {
        const total = pagination.total_count || pagination.total || messages.length;
        const page = pagination.page || 1;
        const pages = pagination.page_count || pagination.pages || 1;
        html += `<div class="search-stats">Showing <span id="result-count">${filteredMessages.length}</span> of ${total} results${pages > 1 ? ` (page ${page} of ${pages})` : ''}</div>`;
      }
      html += '</div>';
    }
    
    html += '</div>'; // slack-header
    
    // Messages list
    html += '<div class="slack-messages" id="slack-messages-list">';
    filteredMessages.forEach((message: any) => {
      html += renderMessage(message);
    });
    html += '</div>'; // slack-messages
    
    html += '</div>'; // slack-container
    
    app.innerHTML = html;
    
    // Setup event listeners for search and filters
    setupSearchAndFilters();
    
    // Notify host of size change after rendering completes
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
  }
}

/**
 * Render a single message
 */
function renderMessage(message: any): string {
  const channel = message.channel || {};
  const channelName = getChannelName(channel);
  const username = getUserDisplayName(message);
  const timestamp = formatSlackTimestamp(message.ts || '');
  const fullTimestamp = formatFullTimestamp(message.ts || '');
  const text = message.text || '';
  const attachments = message.attachments || [];
  const blocks = message.blocks || [];
  const permalink = message.permalink || '';
  
  let html = '<div class="slack-message">';
  
  // Message header (channel, user, timestamp)
  html += '<div class="message-header">';
  html += `<span class="channel-badge">#${escapeHtml(channelName)}</span>`;
  html += `<span class="message-user">${escapeHtml(username)}</span>`;
  html += `<span class="message-timestamp" title="${escapeHtml(fullTimestamp)}">${escapeHtml(timestamp)}</span>`;
  if (permalink) {
    html += `<a href="${escapeHtml(permalink)}" target="_blank" class="message-link" title="Open in Slack" rel="noopener noreferrer">🔗</a>`;
  }
  html += '</div>';
  
  // Message content
  html += '<div class="message-content">';
  
  // Text content
  if (text) {
    html += `<div class="message-text">${processText(text)}</div>`;
  }
  
  // Blocks (rich text)
  if (blocks.length > 0) {
    html += renderBlocks(blocks);
  }
  
  // Attachments
  if (attachments.length > 0) {
    attachments.forEach((attachment: any) => {
      html += renderAttachment(attachment);
    });
  }
  
  html += '</div>'; // message-content
  html += '</div>'; // slack-message
  
  return html;
}

/**
 * Setup search and filter functionality
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById('slack-search-input') as HTMLInputElement;
  const searchClear = document.getElementById('slack-search-clear') as HTMLButtonElement;
  const channelFilter = document.getElementById('channel-filter') as HTMLSelectElement;
  const userFilter = document.getElementById('user-filter') as HTMLSelectElement;
  const sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
  const messagesList = document.getElementById('slack-messages-list');
  const resultCount = document.getElementById('result-count');
  
  function applyFilters() {
    const searchQuery = (searchInput?.value || '').toLowerCase();
    const channelValue = channelFilter?.value || '';
    const userValue = userFilter?.value || '';
    const sortValue = sortFilter?.value || 'newest';
    
    // Show/hide clear button
    if (searchClear) {
      searchClear.style.display = searchQuery ? 'block' : 'none';
    }
    
    // Filter messages
    filteredMessages = allMessages.filter((message: any) => {
      const channel = getChannelName(message.channel || {});
      const user = getUserDisplayName(message);
      const text = (message.text || '').toLowerCase();
      const attachmentText = (message.attachments || [])
        .map((a: any) => (a.text || a.fallback || '').toLowerCase())
        .join(' ');
      const allText = (text + ' ' + attachmentText).toLowerCase();
      
      // Channel filter
      if (channelValue && channel !== channelValue) return false;
      
      // User filter
      if (userValue && user !== userValue) return false;
      
      // Search filter
      if (searchQuery) {
        if (!allText.includes(searchQuery) && 
            !channel.toLowerCase().includes(searchQuery) &&
            !user.toLowerCase().includes(searchQuery)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort messages
    if (sortValue === 'newest') {
      filteredMessages.sort((a, b) => {
        const tsA = parseFloat(a.ts || '0');
        const tsB = parseFloat(b.ts || '0');
        return tsB - tsA;
      });
    } else {
      filteredMessages.sort((a, b) => {
        const tsA = parseFloat(a.ts || '0');
        const tsB = parseFloat(b.ts || '0');
        return tsA - tsB;
      });
    }
    
    // Update result count
    if (resultCount) {
      resultCount.textContent = String(filteredMessages.length);
    }
    
    // Re-render messages
    if (messagesList) {
      messagesList.innerHTML = filteredMessages.map(m => renderMessage(m)).join('');
    }
    
    // Notify size change
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
  }
  
  // Event listeners
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        applyFilters();
      }
    });
  }
  
  if (channelFilter) {
    channelFilter.addEventListener('change', applyFilters);
  }
  
  if (userFilter) {
    userFilter.addEventListener('change', applyFilters);
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', applyFilters);
  }
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
    // - Clear any timers
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    
    // - Disconnect observers
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
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
        console.log('Tool input received:', toolArguments);
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
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '';
      (container as HTMLElement).style.padding = '';
    }
  }
  // Notify host of size change after mode change
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
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
   SIZE CHANGE NOTIFICATIONS
   ============================================
   
   Notifies the host when the content size changes.
   This is critical for proper iframe sizing.
   You typically don't need to modify this section.
   ============================================ */

function notifySizeChanged() {
  const width = document.body.scrollWidth || document.documentElement.scrollWidth;
  const height = document.body.scrollHeight || document.documentElement.scrollHeight;
  
  sendNotification('ui/notifications/size-changed', {
    width: width,
    height: height
  });
}

// Debounce function to avoid too many notifications
let sizeChangeTimeout: NodeJS.Timeout | null = null;
function debouncedNotifySizeChanged() {
  if (sizeChangeTimeout) {
    clearTimeout(sizeChangeTimeout);
  }
  sizeChangeTimeout = setTimeout(() => {
    notifySizeChanged();
  }, 100); // Wait 100ms after last change
}

// Use ResizeObserver to detect size changes
let resizeObserver: ResizeObserver | null = null;
function setupSizeObserver() {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      debouncedNotifySizeChanged();
    });
    resizeObserver.observe(document.body);
  } else {
    // Fallback: use window resize and mutation observer
    window.addEventListener('resize', debouncedNotifySizeChanged);
    const mutationObserver = new MutationObserver(debouncedNotifySizeChanged);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // Send initial size after a short delay to ensure content is rendered
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

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
