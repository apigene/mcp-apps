/* ============================================
   SHOPIFY PRODUCT DETAILS MCP APP
   ============================================

   Displays detailed product information including variants,
   features, specs, and attributes
   ============================================ */

/* ============================================
   SHOPIFY GET PRODUCT DETAILS MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect() for initialization.
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

const APP_NAME = "Shopify Product Details";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

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


function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

function showEmpty(message: string = 'No product data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="empty-state">
        <h2>No Product</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

function formatPrice(amount: number, currency: string = 'USD'): string {
  const dollars = (amount / 100).toFixed(2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(parseFloat(dollars));
}

function renderRating(rating: any): string {
  if (!rating || rating.rating === undefined) return '';

  const stars = Math.round(rating.rating * 2) / 2; // Round to nearest 0.5
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  const emptyStars = Math.max(0, 5 - Math.ceil(stars));

  let starsHtml = '★'.repeat(fullStars);
  if (hasHalfStar) {
    starsHtml += '☆';
    starsHtml += '☆'.repeat(Math.max(0, emptyStars - 1));
  } else {
    starsHtml += '☆'.repeat(emptyStars);
  }

  const count = rating.count || 0;
  const countText = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();

  return `
    <div class="product-rating">
      <span class="rating-stars">${starsHtml}</span>
      <span class="rating-count">(${countText})</span>
    </div>
  `;
}

function renderOptions(options: any[]): string {
  if (!options || options.length === 0) return '';

  return options.map(option => {
    const values = option.values?.map((v: any) => v.value).join(', ') || '';
    return `
      <div class="option-item">
        <span class="option-name">${escapeHtml(option.name)}:</span>
        <span class="option-values">${escapeHtml(values)}</span>
      </div>
    `;
  }).join('');
}

function renderVariant(variant: any): string {
  const imageUrl = variant.media && variant.media.length > 0
    ? variant.media[0].url
    : '';
  const imageAlt = variant.media && variant.media.length > 0
    ? (variant.media[0].altText || variant.displayName || 'Variant image')
    : (variant.displayName || 'Variant image');

  const price = variant.price ? formatPrice(variant.price.amount, variant.price.currency) : '';
  const ratingHtml = variant.rating ? renderRating(variant.rating) : '';
  const available = variant.availableForSale !== false;

  const shop = variant.shop;
  const shopName = shop?.name || '';
  const shopUrl = shop?.onlineStoreUrl || '';

  return `
    <div class="variant-card ${!available ? 'unavailable' : ''}">
      ${imageUrl ? `
        <div class="variant-image-container">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" class="variant-image" />
        </div>
      ` : ''}
      <div class="variant-info">
        <h3 class="variant-title">${escapeHtml(variant.displayName || 'Variant')}</h3>
        ${variant.productDescription ? `
          <p class="variant-description">${escapeHtml(variant.productDescription)}</p>
        ` : ''}
        ${price ? `
          <div class="variant-price">${price}</div>
        ` : ''}
        ${ratingHtml}
        ${shopName ? `
          <div class="variant-shop">
            ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" target="_blank" rel="noopener noreferrer" class="shop-link">` : ''}
              <span class="shop-name">${escapeHtml(shopName)}</span>
            ${shopUrl ? `</a>` : ''}
          </div>
        ` : ''}
        <div class="variant-actions">
          ${variant.variantUrl ? `
            <a href="${escapeHtml(variant.variantUrl)}" target="_blank" rel="noopener noreferrer"
               class="btn btn-secondary">View Product</a>
          ` : ''}
          ${variant.checkoutUrl && available ? `
            <a href="${escapeHtml(variant.checkoutUrl)}" target="_blank" rel="noopener noreferrer"
               class="btn btn-primary">Add to Cart</a>
          ` : ''}
          ${!available ? `
            <span class="unavailable-badge">Out of Stock</span>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderProductDetails(product: any): string {
  const featuredMedia = product.featuredVariantMedia && product.featuredVariantMedia.length > 0
    ? product.featuredVariantMedia[0]
    : (product.variants && product.variants.length > 0 && product.variants[0].media && product.variants[0].media.length > 0
      ? product.variants[0].media[0]
      : null);

  const imageUrl = featuredMedia?.url || '';
  const imageAlt = featuredMedia?.altText || 'Product image';

  // Get product title from first variant or use a default
  const productTitle = product.variants && product.variants.length > 0
    ? product.variants[0].displayName
    : 'Product';

  // Get product URL from first variant
  const productUrl = product.variants && product.variants.length > 0 && product.variants[0].variantUrl
    ? product.variants[0].variantUrl
    : '';

  const description = product.description || '';
  const ratingHtml = product.rating ? renderRating(product.rating) : '';
  const optionsHtml = renderOptions(product.options || []);

  // Get shop info from first variant
  const shop = product.variants && product.variants.length > 0 ? product.variants[0].shop : null;
  const shopName = shop?.name || '';
  const shopUrl = shop?.onlineStoreUrl || '';

  return `
    <div class="product-details">
      <div class="product-header">
        ${imageUrl ? `
          <div class="product-image-container">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" class="product-image" />
          </div>
        ` : ''}
        <div class="product-header-info">
          ${productUrl ? `
            <h1 class="product-title">
              <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(productTitle)}</a>
            </h1>
          ` : `
            <h1 class="product-title">${escapeHtml(productTitle)}</h1>
          `}
          ${ratingHtml}
          ${description ? `
            <div class="product-description">${escapeHtml(description)}</div>
          ` : ''}
          ${shopName ? `
            <div class="product-shop">
              ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" target="_blank" rel="noopener noreferrer" class="shop-link">` : ''}
                <span class="shop-name">${escapeHtml(shopName)}</span>
              ${shopUrl ? `</a>` : ''}
            </div>
          ` : ''}
          ${optionsHtml ? `
            <div class="product-options">
              ${optionsHtml}
            </div>
          ` : ''}
        </div>
      </div>

      ${product.uniqueSellingPoint ? `
        <div class="product-section">
          <h2 class="section-title">Unique Selling Point</h2>
          <p class="usp-text">${escapeHtml(product.uniqueSellingPoint)}</p>
        </div>
      ` : ''}

      ${product.topFeatures && product.topFeatures.length > 0 ? `
        <div class="product-section">
          <h2 class="section-title">Top Features</h2>
          <ul class="features-list">
            ${product.topFeatures.map((feature: string) => `
              <li>${escapeHtml(feature)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${product.techSpecs && product.techSpecs.length > 0 ? `
        <div class="product-section">
          <h2 class="section-title">Technical Specifications</h2>
          <ul class="specs-list">
            ${product.techSpecs.map((spec: string) => `
              <li>${escapeHtml(spec)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${product.attributes && product.attributes.length > 0 ? `
        <div class="product-section">
          <h2 class="section-title">Attributes</h2>
          <div class="attributes-grid">
            ${product.attributes.map((attr: any) => `
              <div class="attribute-item">
                <span class="attribute-name">${escapeHtml(attr.name)}:</span>
                <span class="attribute-values">${attr.values.map((v: string) => escapeHtml(v)).join(', ')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${product.variants && product.variants.length > 0 ? `
        <div class="product-section">
          <h2 class="section-title">Available Variants</h2>
          <div class="variants-grid">
            ${product.variants.map((variant: any) => renderVariant(variant)).join('')}
          </div>
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
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);

    let product: any = null;

    // Extract product from various possible structures
    if (unwrapped?.body?.product) {
      product = unwrapped.body.product;
    } else if (unwrapped?.product) {
      product = unwrapped.product;
    } else if (unwrapped && typeof unwrapped === 'object' && unwrapped.id) {
      product = unwrapped;
    } else {
      showEmpty('No product data found');
      return;
    }

    if (!product) {
      showEmpty('No product data available');
      return;
    }

    app.innerHTML = `
      <div class="container">
        <div class="header">
          <div class="header-left">
            <div class="logo" aria-label="Shopify">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M15.337 4.5h-6.5l-.5 2h5.5zm-6.5 0h-2.5l-1 2.5h2.5zm-2.5 0h-2l-.5 2h2zm-2 0h-2l-1 2.5h2zm-1 2.5h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2z"/>
              </svg>
            </div>
            <h1 class="header-title">Shopify</h1>
          </div>
        </div>

        ${renderProductDetails(product)}
      </div>
    `;

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering product details: ${error.message}`);
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
