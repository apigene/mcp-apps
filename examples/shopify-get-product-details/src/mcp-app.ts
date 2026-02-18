/* ============================================
   SHOPIFY PRODUCT DETAILS MCP APP
   ============================================
   
   Displays detailed product information including variants, 
   features, specs, and attributes
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Shopify Product Details";

const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   SHOPIFY GET PRODUCT DETAILS MCP APP (SDK VERSION)
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
  
  // Handle body.product structure
  if (data.body?.product) {
    return data.body;
  }
  if (data.product) {
    return data;
  }
  
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;
  
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data;
  }
  
  return data;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
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
                <path d="M15.337 4.5h-6.5l-.5 2h5.5zm-6.5 0h-2.5l-1 2.5h2.5zm-2.5 0h-2l-.5 2h2zm-2 0h-2l-1 2.5h2zm-1 2.5h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2zm2.5 0h2l.5 2h-2z"/>
              </svg>
            </div>
            <h1 class="header-title">Shopify</h1>
          </div>
        </div>
        
        ${renderProductDetails(product)}
      </div>
    `;
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering product details: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    return;
  }
  
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
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
