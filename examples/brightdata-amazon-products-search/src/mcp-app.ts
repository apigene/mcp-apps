/* ============================================
   AMAZON SHOPPING MCP APP
   ============================================
   
   Displays Amazon product search results in an Amazon-style shopping layout.
   Handles product images, prices, ratings, Prime badges, and variations.
   Based on BrightData scraping API response format.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Amazon Shopping";

const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

/* ============================================
   BRIGHTDATA AMAZON PRODUCTS SEARCH MCP APP (SDK VERSION)
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
  
  // Handle Claude format: {message: {status_code: 200, response_content: {...}}}
  if (data.message && typeof data.message === 'object') {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      // Support both response_content and body fields
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
  
  // Handle direct BrightData response format: {status_code: 200, body: {...}} or {status_code: 200, response_content: {...}}
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
function showEmpty(message: string = 'No products found.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS (Amazon Shopping)
   ============================================ */

/**
 * Extract products from BrightData API response
 */
function extractProducts(data: any): any[] {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return [];

  // Handle BrightData format: {status_code: 200, body: [...]}
  const content = unwrapped.body || unwrapped.response_content;
  
  if (content && Array.isArray(content)) {
    return content;
  }
  
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

/**
 * Format price with currency
 */
function formatPrice(price: number | null | undefined, currency: string | null | undefined): string {
  if (price === null || price === undefined || price === 0) return 'Price not available';
  const currencySymbol = currency === 'AUD' ? 'A$' : currency === 'USD' ? '$' : currency || '$';
  return `${currencySymbol}${price.toFixed(2)}`;
}

/**
 * Render star rating
 */
function renderStars(rating: number | null | undefined, numRatings: number | null | undefined): string {
  if (!rating || rating === 0) return '<span class="no-rating">No ratings</span>';
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<span class="star star-full">★</span>';
  }
  if (hasHalfStar) {
    starsHtml += '<span class="star star-half">★</span>';
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<span class="star star-empty">★</span>';
  }
  
  const ratingsText = numRatings ? `(${numRatings.toLocaleString()})` : '';
  return `<div class="rating">${starsHtml} <span class="rating-text">${rating.toFixed(1)} ${ratingsText}</span></div>`;
}

/**
 * Render product card
 */
function renderProductCard(product: any, index: number): string {
  const asin = product.asin || '';
  const url = product.url || '';
  const name = product.name || 'Untitled Product';
  const image = product.image || '';
  const finalPrice = product.final_price;
  const initialPrice = product.initial_price;
  const currency = product.currency || 'AUD';
  const rating = product.rating;
  const numRatings = product.num_ratings;
  const brand = product.brand || '';
  const isPrime = product.is_prime || false;
  const badge = product.badge || '';
  const variations = product.variations || [];
  const sponsored = product.sponsored === 'true' || product.sponsored === true;
  
  const hasDiscount = initialPrice && initialPrice > 0 && finalPrice && finalPrice < initialPrice;
  const discountPercent = hasDiscount ? Math.round(((initialPrice - finalPrice) / initialPrice) * 100) : 0;
  
  return `
    <div class="product-card" data-asin="${escapeHtml(asin)}">
      <div class="product-image-container">
        ${image ? `
          <img 
            src="${escapeHtml(image)}" 
            alt="${escapeHtml(name)}" 
            class="product-image"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="product-image-placeholder" style="display: none;">
            <span>📦</span>
          </div>
        ` : `
          <div class="product-image-placeholder">
            <span>📦</span>
          </div>
        `}
        ${sponsored ? '<div class="sponsored-badge">Sponsored</div>' : ''}
        ${badge ? `<div class="product-badge">${escapeHtml(badge)}</div>` : ''}
        ${hasDiscount ? `<div class="discount-badge">-${discountPercent}%</div>` : ''}
      </div>
      
      <div class="product-info">
        ${brand ? `<div class="product-brand">${escapeHtml(brand)}</div>` : ''}
        
        <h3 class="product-title">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            ${escapeHtml(name)}
          </a>
        </h3>
        
        ${renderStars(rating, numRatings)}
        
        <div class="product-price-section">
          ${hasDiscount ? `
            <div class="price-row">
              <span class="price-final">${formatPrice(finalPrice, currency)}</span>
              <span class="price-initial">${formatPrice(initialPrice, currency)}</span>
            </div>
          ` : `
            <div class="price-row">
              <span class="price-final">${formatPrice(finalPrice, currency)}</span>
            </div>
          `}
        </div>
        
        ${isPrime ? '<div class="prime-badge">Prime</div>' : ''}
        
        ${variations.length > 0 ? `
          <div class="product-variations">
            <div class="variations-label">Available in:</div>
            <div class="variations-list">
              ${variations.slice(0, 5).map((v: any) => 
                `<span class="variation-chip">${escapeHtml(v.name || v)}</span>`
              ).join('')}
              ${variations.length > 5 ? `<span class="variation-chip-more">+${variations.length - 5} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="product-link" onclick="event.stopPropagation()">
          View on Amazon →
        </a>
      </div>
    </div>
  `;
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
    // Extract products
    const products = extractProducts(data);
    
    if (!products || products.length === 0) {
      showEmpty('No products found');
      return;
    }

    // Filter out banner/sponsored products from main grid (optional)
    const regularProducts = products.filter((p: any) => !p.is_banner_product || p.is_banner_product === false);
    const bannerProducts = products.filter((p: any) => p.is_banner_product === true);

    // Create container
    const container = document.createElement('div');
    container.className = 'amazon-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-content">
        <div class="header-title-row">
          <div class="amazon-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.922 11.816c-.327-.327-.327-.857 0-1.184l5.816-5.816c.327-.327.857-.327 1.184 0s.327.857 0 1.184L12.106 12l5.816 5.816c.327.327.327.857 0 1.184s-.857.327-1.184 0L10.922 12.816c-.327-.327-.327-.857 0-1.184z"/>
              <path d="M6.922 11.816c-.327-.327-.327-.857 0-1.184l5.816-5.816c.327-.327.857-.327 1.184 0s.327.857 0 1.184L8.106 12l5.816 5.816c.327.327.327.857 0 1.184s-.857.327-1.184 0L6.922 12.816c-.327-.327-.327-.857 0-1.184z"/>
            </svg>
          </div>
          <h1>Amazon Products</h1>
        </div>
        <div class="meta-info">
          <span id="total-products">${products.length} product${products.length !== 1 ? 's' : ''} found</span>
        </div>
      </div>
    `;
    container.appendChild(header);

    // Products grid
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    productsGrid.id = 'products-grid';
    
    regularProducts.forEach((product: any, index: number) => {
      productsGrid.innerHTML += renderProductCard(product, index);
    });
    
    container.appendChild(productsGrid);

    app.innerHTML = '';
    app.appendChild(container);
    
    // Notify host of size change after rendering completes
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering products: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    // Handle direct data (not wrapped in JSON-RPC)
    if (msg && typeof msg === 'object') {
      if (msg.message && msg.message.status_code !== undefined) {
        renderData(msg);
        return;
      }
      if (msg.status_code !== undefined || msg.body !== undefined || msg.response_content !== undefined) {
        renderData(msg);
        return;
      }
    }
    return;
  }
  
  // Handle requests that require responses (like ui/resource-teardown)
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
      } else if (msg.message || msg.status_code || msg.body || msg.response_content) {
        renderData(msg);
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
