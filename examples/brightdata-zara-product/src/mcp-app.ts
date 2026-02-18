/* ============================================
   ZARA PRODUCT MCP APP
   ============================================
   
   Displays Zara product information in a beautiful card layout.
   Handles product details, images, pricing, and availability.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Zara Product";
const APP_VERSION = "2.0.0";
const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

/* ============================================
   BRIGHTDATA ZARA PRODUCT MCP APP (SDK VERSION)
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
 */
function showEmpty(message: string = 'No product data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: string): string {
  if (!price && price !== 0) return 'Price not available';
  
  // Currency symbol mapping
  const currencySymbols: Record<string, string> = {
    'ILS': '₪',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Extract product data from API response
 */
function extractProductData(data: any): any {
  const unwrapped = unwrapData(data);
  
  // Handle Zara API response format: { status_code: 200, body: [...] }
  if (unwrapped?.body && Array.isArray(unwrapped.body) && unwrapped.body.length > 0) {
    return unwrapped.body[0]; // Get first product
  }
  
  // Handle direct product object
  if (unwrapped?.product_name || unwrapped?.product_id) {
    return unwrapped;
  }
  
  // Handle array of products
  if (Array.isArray(unwrapped) && unwrapped.length > 0) {
    return unwrapped[0];
  }
  
  return unwrapped;
}

/**
 * Render product images gallery
 */
function renderImageGallery(images: string[]): string {
  if (!images || images.length === 0) {
    return '<div class="no-images">No images available</div>';
  }
  
  const mainImage = images[0];
  const thumbnails = images.slice(0, 6); // Show up to 6 thumbnails
  
  return `
    <div class="image-gallery">
      <div class="main-image">
        <img src="${escapeHtml(mainImage)}" alt="Product image" loading="lazy" />
      </div>
      ${thumbnails.length > 1 ? `
        <div class="thumbnail-grid">
          ${thumbnails.map((img, idx) => `
            <div class="thumbnail ${idx === 0 ? 'active' : ''}" data-image="${escapeHtml(img)}">
              <img src="${escapeHtml(img)}" alt="Thumbnail ${idx + 1}" loading="lazy" />
            </div>
          `).join('')}
        </div>
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
    showEmpty('No product data received');
    return;
  }

  try {
    const product = extractProductData(data);
    
    if (!product || !product.product_name) {
      showEmpty('Invalid product data format');
      return;
    }
    
    const {
      product_name,
      price,
      currency,
      colour,
      description,
      dimension,
      image = [],
      availability,
      low_on_stock,
      url,
      section,
      product_family,
      product_subfamily,
      you_may_also_like = [],
      sku,
      category_id,
      product_id
    } = product;
    
    app.innerHTML = `
      <div class="container">
        <div class="product-card">
          <div class="product-header">
            <div class="product-title-section">
              <h1 class="product-name">${escapeHtml(product_name)}</h1>
              ${section ? `<span class="product-section">${escapeHtml(section)}</span>` : ''}
            </div>
            <div class="product-price">
              ${formatPrice(price, currency || 'USD')}
            </div>
          </div>
          
          <div class="product-content">
            <div class="product-images">
              ${renderImageGallery(image)}
            </div>
            
            <div class="product-details">
              <div class="product-info">
                ${colour ? `
                  <div class="info-item">
                    <span class="info-label">Color:</span>
                    <span class="info-value color-badge" style="background-color: ${escapeHtml(colour.toLowerCase())}">
                      ${escapeHtml(colour)}
                    </span>
                  </div>
                ` : ''}
                
                <div class="info-item">
                  <span class="info-label">Availability:</span>
                  <span class="info-value availability-badge ${availability ? 'available' : 'unavailable'}">
                    ${availability ? (low_on_stock ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
                  </span>
                </div>
                
                ${sku ? `
                  <div class="info-item">
                    <span class="info-label">SKU:</span>
                    <span class="info-value">${escapeHtml(sku)}</span>
                  </div>
                ` : ''}
                
                ${product_family ? `
                  <div class="info-item">
                    <span class="info-label">Category:</span>
                    <span class="info-value">${escapeHtml(product_family)}${product_subfamily ? ` / ${escapeHtml(product_subfamily)}` : ''}</span>
                  </div>
                ` : ''}
              </div>
              
              ${description ? `
                <div class="product-description">
                  <h3>Description</h3>
                  <p>${escapeHtml(description)}</p>
                </div>
              ` : ''}
              
              ${dimension && dimension !== description ? `
                <div class="product-dimensions">
                  <h3>Details</h3>
                  <p>${escapeHtml(dimension)}</p>
                </div>
              ` : ''}
              
              ${url ? `
                <div class="product-actions">
                  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="view-product-btn">
                    View on Zara →
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${you_may_also_like && you_may_also_like.length > 0 ? `
            <div class="related-products">
              <h3>You May Also Like</h3>
              <div class="related-prices">
                ${you_may_also_like.slice(0, 12).map((item: any) => {
                  const price = item.final_price || item.initial_price || '';
                  const currency = item.currency || '';
                  return `<span class="related-price">${escapeHtml(price)} ${escapeHtml(currency)}</span>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Setup image gallery interaction
    const thumbnails = app.querySelectorAll('.thumbnail');
    const mainImage = app.querySelector('.main-image img') as HTMLImageElement;
    
    thumbnails.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const imageUrl = thumb.getAttribute('data-image');
        if (imageUrl && mainImage) {
          mainImage.src = imageUrl;
          thumbnails.forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        }
      });
    });
    
    // Notify host of size change after rendering completes
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering product data: ${error.message}`);
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
    
    // - Clean up any image gallery event listeners
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
      // Event listeners will be cleaned up when DOM is removed
    });
    
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
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        console.log('Tool input received:', toolArguments);
        // Example: Could show loading state with input parameters
      }
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
