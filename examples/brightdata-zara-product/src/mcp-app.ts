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

/* ============================================
   BRIGHTDATA ZARA PRODUCT MCP APP (STANDALONE MODE)
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

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering product data: ${error.message}`);
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
