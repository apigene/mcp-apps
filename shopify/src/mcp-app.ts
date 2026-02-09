/* ============================================
   SHOPIFY CATALOG BASIC MCP APP
   ============================================
   
   Simple horizontal scrollable catalog layout
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Shopify Catalog";
const APP_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2026-01-26";

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

function initializeDarkMode() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e: MediaQueryListEvent) => {
    document.body.classList.toggle('dark', e.matches);
  });
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
  if (!rating || rating.rating === undefined || rating.rating === null) return '';
  
  // Ensure rating is a valid number between 0 and 5
  const ratingValue = Math.max(0, Math.min(5, parseFloat(rating.rating) || 0));
  if (ratingValue === 0) return '';
  
  const stars = Math.max(0, Math.min(5, Math.round(ratingValue * 2) / 2)); // Round to nearest 0.5, clamp to 0-5
  const fullStars = Math.max(0, Math.min(5, Math.floor(stars))); // Clamp to 0-5
  const hasHalfStar = stars % 1 !== 0 && stars < 5;
  const emptyStars = Math.max(0, Math.min(5, 5 - Math.ceil(stars))); // Clamp to 0-5
  
  // Safely build stars HTML with all values clamped
  let starsHtml = '★'.repeat(fullStars);
  if (hasHalfStar) {
    starsHtml += '☆';
    const remainingEmpty = Math.max(0, emptyStars - 1);
    starsHtml += '☆'.repeat(remainingEmpty);
  } else {
    starsHtml += '☆'.repeat(emptyStars);
  }
  
  // Handle count safely - ensure it's a non-negative number
  let count = 0;
  if (rating.count !== undefined && rating.count !== null) {
    const parsedCount = parseInt(String(rating.count), 10);
    if (!isNaN(parsedCount) && parsedCount >= 0) {
      count = parsedCount;
    }
  }
  
  let countText = '';
  if (count > 0) {
    countText = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
  } else {
    countText = '0';
  }
  
  return `
    <div class="product-rating">
      <span class="rating-stars">${starsHtml}</span>
      <span class="rating-count">(${countText})</span>
    </div>
  `;
}

function getShopLogo(shopName: string): { initials: string; color: string } {
  if (!shopName) return { initials: '?', color: 'blue' };
  
  const words = shopName.split(' ');
  const initials = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase()
    : shopName.substring(0, 2).toUpperCase();
  
  // Simple color assignment based on shop name
  const colors = ['yellow', 'green', 'red', 'blue'];
  const hash = shopName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  
  return { initials, color };
}

function renderProductCard(product: any, index: number): string {
  const imageUrl = product.media && product.media.length > 0 
    ? product.media[0].url 
    : 'https://via.placeholder.com/300x300?text=No+Image';
  
  const imageAlt = product.media && product.media.length > 0 
    ? product.media[0].altText || product.title 
    : product.title;
  
  const productUrl = product.lookupUrl || '#';
  const priceDisplay = formatPriceRange(product.priceRange);
  const ratingHtml = renderRating(product.rating);
  
  const shopName = product.variants && product.variants.length > 0 
    ? product.variants[0].shop?.name 
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
      setTimeout(() => {
        notifySizeChanged();
      }, 50);
      return;
    }
    
    if (products.length === 0) {
      showEmpty('No products available');
      setTimeout(() => {
        notifySizeChanged();
      }, 50);
      return;
    }
    
    allProducts = products;
    
    app.innerHTML = `
      <div class="container">
        <div class="header">
          <div class="header-left">
            <div class="logo">Z</div>
            <h1 class="header-title">Zen Shopping</h1>
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
    
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering catalog: ${error.message}`);
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
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
      if (msg.params?.theme === 'dark') {
        document.body.classList.add('dark');
      } else if (msg.params?.theme === 'light') {
        document.body.classList.remove('dark');
      }
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;
      
    case 'ui/notifications/tool-input':
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        console.log('Tool input received:', toolArguments);
      }
      break;
      
    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || 'Tool execution was cancelled';
      showError(`Operation cancelled: ${reason}`);
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
   MCP COMMUNICATION
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
   ============================================ */

let currentDisplayMode = 'inline';

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
  } else {
    document.body.classList.remove('fullscreen-mode');
  }
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

(window as any).requestDisplayMode = requestDisplayMode;

/* ============================================
   SIZE CHANGE NOTIFICATIONS
   ============================================ */

function notifySizeChanged() {
  const width = document.body.scrollWidth || document.documentElement.scrollWidth;
  const height = document.body.scrollHeight || document.documentElement.scrollHeight;
  
  sendNotification('ui/notifications/size-changed', {
    width: width,
    height: height
  });
}

let sizeChangeTimeout: NodeJS.Timeout | null = null;
function debouncedNotifySizeChanged() {
  if (sizeChangeTimeout) {
    clearTimeout(sizeChangeTimeout);
  }
  sizeChangeTimeout = setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

let resizeObserver: ResizeObserver | null = null;
function setupSizeObserver() {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      debouncedNotifySizeChanged();
    });
    resizeObserver.observe(document.body);
  } else {
    window.addEventListener('resize', debouncedNotifySizeChanged);
    const mutationObserver = new MutationObserver(debouncedNotifySizeChanged);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

/* ============================================
   INITIALIZATION
   ============================================ */

sendRequest('ui/initialize', {
  appCapabilities: {
    availableDisplayModes: ["inline", "fullscreen"]
  },
  appInfo: {
    name: APP_NAME,
    version: APP_VERSION
  },
  protocolVersion: PROTOCOL_VERSION
}).then((result: any) => {
  const ctx = result.hostContext || result;
  
  sendNotification('ui/notifications/initialized', {});
  
  if (ctx?.theme === 'dark') {
    document.body.classList.add('dark');
  } else if (ctx?.theme === 'light') {
    document.body.classList.remove('dark');
  }
  
  if (ctx?.displayMode) {
    handleDisplayModeChange(ctx.displayMode);
  }
  
  if (ctx?.containerDimensions) {
    const dims = ctx.containerDimensions;
    if (dims.width) {
      document.body.style.width = dims.width + 'px';
    }
    if (dims.height) {
      document.body.style.height = dims.height + 'px';
    }
    if (dims.maxWidth) {
      document.body.style.maxWidth = dims.maxWidth + 'px';
    }
    if (dims.maxHeight) {
      document.body.style.maxHeight = dims.maxHeight + 'px';
    }
  }
}).catch(err => {
  console.warn('Failed to initialize MCP App:', err);
});

initializeDarkMode();
setupSizeObserver();

export {};
