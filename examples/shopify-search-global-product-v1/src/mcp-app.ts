/* ============================================
   SHOPIFY CATALOG BASIC MCP APP
   ============================================
   
   Simple horizontal scrollable catalog layout
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Shopify Catalog Basic";

const PROTOCOL_VERSION = "2026-01-26";

/* ============================================
   SHOPIFY SEARCH GLOBAL PRODUCT V1 MCP APP (SDK VERSION)
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
  
  if (data.body?.offers) {
    return data.body.offers;
  }
  if (data.offers) {
    return data.offers;
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

function showEmpty(message: string = 'No products available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="empty-state">
        <h2>No Products</h2>
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

function formatPriceRange(priceRange: any): string {
  if (!priceRange) return '';
  
  const min = priceRange.min?.amount || 0;
  const max = priceRange.max?.amount || 0;
  const currency = priceRange.min?.currency || priceRange.max?.currency || 'USD';
  
  if (min === max) {
    return formatPrice(min, currency);
  }
  
  return `${formatPrice(min, currency)} - ${formatPrice(max, currency)}`;
}

function renderRating(rating: any): string {
  if (!rating || !rating.rating) return '';
  
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

function getShopLogo(shopName: string): { initials: string; color: string } {
  if (!shopName || typeof shopName !== 'string') return { initials: '?', color: 'blue' };
  
  const words = shopName.trim().split(' ').filter(w => w.length > 0);
  let initials: string;
  
  if (words.length >= 2) {
    const first = words[0][0] || '';
    const second = words[1][0] || '';
    initials = (first + second).toUpperCase() || '??';
  } else if (shopName.length >= 2) {
    initials = shopName.substring(0, 2).toUpperCase();
  } else {
    initials = (shopName[0] || '?').toUpperCase() + '?';
  }
  
  // Simple color assignment based on shop name
  const colors = ['yellow', 'green', 'red', 'blue'];
  const hash = shopName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length] || 'blue';
  
  return { initials, color };
}

function renderProductCard(product: any, index: number): string {
  const imageUrl = product.media && product.media.length > 0 
    ? product.media[0].url 
    : 'https://via.placeholder.com/300x300?text=No+Image';
  
  const imageAlt = product.media && product.media.length > 0 
    ? (product.media[0].altText || product.title || 'Product image')
    : (product.title || 'Product image');
  
  const productUrl = product.lookupUrl || '#';
  const priceDisplay = formatPriceRange(product.priceRange) || '';
  const ratingHtml = renderRating(product.rating) || '';
  
  const shopName = product.variants && product.variants.length > 0 
    ? (product.variants[0].shop?.name || '')
    : '';
  
  const shopLogo = getShopLogo(shopName);
  
  return `
    <div class="product-card" data-product-index="${index}">
      <div class="product-image-container">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" class="product-image" />
      </div>
      <div class="product-info">
        <h3 class="product-title">${escapeHtml(product.title || 'Untitled Product')}</h3>
        <div class="product-price">${priceDisplay}</div>
        ${ratingHtml}
        ${shopName ? `
          <div class="product-shop">
            <div class="shop-logo ${shopLogo.color}">${escapeHtml(shopLogo.initials)}</div>
            <span class="shop-name">${escapeHtml(shopName)}</span>
          </div>
        ` : ''}
        <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" 
           class="place-order-btn" onclick="event.stopPropagation()">
          Place Order
        </a>
      </div>
    </div>
  `;
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================ */

let allProducts: any[] = [];
let carouselWrapper: HTMLElement | null = null;

function scrollCarousel(direction: 'left' | 'right') {
  if (!carouselWrapper) return;
  
  const scrollAmount = 320; // Card width + gap
  const currentScroll = carouselWrapper.scrollLeft;
  const newScroll = direction === 'left' 
    ? currentScroll - scrollAmount 
    : currentScroll + scrollAmount;
  
  carouselWrapper.scrollTo({
    left: newScroll,
    behavior: 'smooth'
  });
}

function updateNavButtons() {
  if (!carouselWrapper) return;
  
  const leftBtn = document.querySelector('.nav-button.left') as HTMLButtonElement;
  const rightBtn = document.querySelector('.nav-button.right') as HTMLButtonElement;
  
  if (leftBtn) {
    leftBtn.disabled = carouselWrapper.scrollLeft <= 0;
  }
  
  if (rightBtn) {
    const maxScroll = carouselWrapper.scrollWidth - carouselWrapper.clientWidth;
    rightBtn.disabled = carouselWrapper.scrollLeft >= maxScroll - 10;
  }
}

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    
    let products: any[] = [];
    if (Array.isArray(unwrapped)) {
      products = unwrapped;
    } else if (unwrapped && Array.isArray(unwrapped.offers)) {
      products = unwrapped.offers;
    } else if (unwrapped && unwrapped.body && Array.isArray(unwrapped.body.offers)) {
      products = unwrapped.body.offers;
    } else {
      showEmpty('No products found in the catalog');
      return;
    }
    
    if (products.length === 0) {
      showEmpty('No products available');
      return;
    }
    
    allProducts = products;
    
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
          <div class="header-actions">
            <button class="action-btn" title="Like">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
            </button>
            <button class="action-btn" title="Dislike">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="carousel-container">
          <button class="nav-button left" onclick="scrollCarousel('left')" aria-label="Scroll left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="carousel-wrapper" id="carousel-wrapper">
            ${products.map((product, index) => renderProductCard(product, index)).join('')}
          </div>
          <button class="nav-button right" onclick="scrollCarousel('right')" aria-label="Scroll right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    carouselWrapper = document.getElementById('carousel-wrapper');
    
    if (carouselWrapper) {
      carouselWrapper.addEventListener('scroll', updateNavButtons);
      updateNavButtons();
    }
    
    (window as any).scrollCarousel = scrollCarousel;
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering catalog: ${error.message}`);
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
    
    if (carouselWrapper) {
      carouselWrapper.removeEventListener('scroll', updateNavButtons);
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
