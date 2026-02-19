/* ============================================
   AMAZON SHOPPING MCP APP (STANDALONE MODE)
   ============================================

   Displays Amazon product search results in an Amazon-style shopping layout.
   Handles product images, prices, ratings, Prime badges, and variations.
   Based on BrightData scraping API response format.

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

const APP_NAME = "Amazon Shopping";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

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

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering products: ${error.message}`);
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
