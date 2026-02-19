/* ============================================
   SHOPIFY CATALOG MCP APP - ADVANCED
   ============================================

   Advanced Shopify catalog with filtering, drill-down, and comparison
   ============================================ */

/* ============================================
   SHOPIFY SEARCH GLOBAL PRODUCT V2 MCP APP (STANDALONE MODE)
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

const APP_NAME = "Shopify Catalog";
const APP_VERSION = "2.0.0";

/* ============================================
   GLOBAL STATE
   ============================================ */

let allProducts: any[] = [];
let filteredProducts: any[] = [];
let selectedProducts: Set<string> = new Set();
let currentView: 'grid' | 'list' = 'grid';
let currentSort: string = 'relevance';
let searchQuery: string = '';
let priceRange: [number, number] = [0, Infinity];
let minRating: number = 0;
let selectedShops: Set<string> = new Set();
let selectedAttributes: Set<string> = new Set();

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Extract data from MCP protocol messages
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
function showEmpty(message: string = 'No products available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Format price from cents to dollars
 */
function formatPrice(amount: number, currency: string = 'USD'): string {
  const dollars = (amount / 100).toFixed(2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(parseFloat(dollars));
}

/**
 * Format price range
 */
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

/**
 * Render star rating
 */
function renderRating(rating: any): string {
  if (!rating || !rating.rating) return '';

  const stars = Math.round(rating.rating);
  const count = rating.count || 0;

  return `
    <div class="product-rating">
      <span class="rating-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>
      <span class="rating-count">${stars.toFixed(1)} (${count} reviews)</span>
    </div>
  `;
}

/**
 * Render product features
 */
function renderFeatures(features: string[]): string {
  if (!features || features.length === 0) return '';

  const topFeatures = features.slice(0, 3); // Show first 3 features

  return `
    <div class="product-features">
      <div class="product-features-title">Key Features</div>
      <ul class="features-list">
        ${topFeatures.map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Render product card with compare checkbox
 */
function renderProductCard(product: any, index: number): string {
  const imageUrl = product.media && product.media.length > 0
    ? product.media[0].url
    : 'https://via.placeholder.com/320x240?text=No+Image';

  const imageAlt = product.media && product.media.length > 0
    ? product.media[0].altText || product.title
    : product.title;

  const productUrl = product.lookupUrl || '#';
  const priceDisplay = formatPriceRange(product.priceRange);
  const ratingHtml = renderRating(product.rating);
  const featuresHtml = renderFeatures(product.topFeatures);

  const variantsCount = product.variants ? product.variants.length : 0;
  const shopName = product.variants && product.variants.length > 0
    ? product.variants[0].shop?.name
    : '';

  const productId = product.id || `product-${index}`;
  const isSelected = selectedProducts.has(productId);

  return `
    <div class="product-card" data-product-id="${escapeHtml(productId)}">
      <div class="product-card-header">
        <label class="compare-checkbox">
          <input type="checkbox" ${isSelected ? 'checked' : ''}
                 onchange="toggleCompare('${escapeHtml(productId)}', this.checked)">
          <span>Compare</span>
        </label>
        <button class="view-details-btn" onclick="showProductDetails(${index})" title="View Details">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="currentColor"/>
            <path d="M10 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="product-image-wrapper" onclick="showProductDetails(${index})">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" class="product-image" />
      </div>
      <div class="product-content">
        <h2 class="product-title">
          <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
            ${escapeHtml(product.title || 'Untitled Product')}
          </a>
        </h2>
        ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ''}
        <div class="product-price">${priceDisplay}</div>
        ${ratingHtml}
        ${featuresHtml}
        ${variantsCount > 0 ? `
          <div class="product-variants">
            <span class="variants-count">${variantsCount}</span> variant${variantsCount !== 1 ? 's' : ''} available
          </div>
        ` : ''}
        ${shopName ? `<div class="product-shop">From ${escapeHtml(shopName)}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render product in list view
 */
function renderProductListItem(product: any, index: number): string {
  const imageUrl = product.media && product.media.length > 0
    ? product.media[0].url
    : 'https://via.placeholder.com/200x200?text=No+Image';

  const productUrl = product.lookupUrl || '#';
  const priceDisplay = formatPriceRange(product.priceRange);
  const ratingHtml = renderRating(product.rating);
  const shopName = product.variants && product.variants.length > 0
    ? product.variants[0].shop?.name
    : '';

  const productId = product.id || `product-${index}`;
  const isSelected = selectedProducts.has(productId);

  return `
    <div class="product-list-item" data-product-id="${escapeHtml(productId)}">
      <div class="list-item-checkbox">
        <label class="compare-checkbox">
          <input type="checkbox" ${isSelected ? 'checked' : ''}
                 onchange="toggleCompare('${escapeHtml(productId)}', this.checked)">
          <span>Compare</span>
        </label>
      </div>
      <div class="list-item-image" onclick="showProductDetails(${index})">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title || 'Product')}" />
      </div>
      <div class="list-item-content">
        <h3 class="list-item-title">
          <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(product.title || 'Untitled Product')}
          </a>
        </h3>
        ${product.description ? `<p class="list-item-description">${escapeHtml(product.description)}</p>` : ''}
        <div class="list-item-meta">
          <div class="list-item-price">${priceDisplay}</div>
          ${ratingHtml}
          ${shopName ? `<div class="list-item-shop">From ${escapeHtml(shopName)}</div>` : ''}
        </div>
        ${product.topFeatures && product.topFeatures.length > 0 ? `
          <div class="list-item-features">
            ${product.topFeatures.slice(0, 3).map((f: string) => `<span class="feature-tag">${escapeHtml(f)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="list-item-actions">
        <button class="view-details-btn" onclick="showProductDetails(${index})">View Details</button>
      </div>
    </div>
  `;
}

/* ============================================
   FILTERING & SORTING FUNCTIONS
   ============================================ */

function filterProducts(): any[] {
  let filtered = [...allProducts];

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.uniqueSellingPoint || '').toLowerCase().includes(query) ||
      (p.topFeatures || []).some((f: string) => f.toLowerCase().includes(query))
    );
  }

  // Price range filter
  filtered = filtered.filter(p => {
    const min = p.priceRange?.min?.amount || 0;
    const max = p.priceRange?.max?.amount || 0;
    const productMin = Math.min(min, max || min);
    const productMax = Math.max(min, max || min);
    return productMin >= priceRange[0] && productMax <= priceRange[1];
  });

  // Rating filter
  if (minRating > 0) {
    filtered = filtered.filter(p => {
      const rating = p.rating?.rating || 0;
      return rating >= minRating;
    });
  }

  // Shop filter
  if (selectedShops.size > 0) {
    filtered = filtered.filter(p => {
      const shopName = p.variants?.[0]?.shop?.name || '';
      return selectedShops.has(shopName);
    });
  }

  // Attribute filter
  if (selectedAttributes.size > 0) {
    filtered = filtered.filter(p => {
      const attrs = p.attributes || [];
      return attrs.some((attr: any) =>
        (attr.values || []).some((val: string) => selectedAttributes.has(val))
      );
    });
  }

  // Sort
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'price-low':
        return (a.priceRange?.min?.amount || 0) - (b.priceRange?.min?.amount || 0);
      case 'price-high':
        return (b.priceRange?.max?.amount || 0) - (a.priceRange?.max?.amount || 0);
      case 'rating':
        return (b.rating?.rating || 0) - (a.rating?.rating || 0);
      case 'name':
        return (a.title || '').localeCompare(b.title || '');
      case 'reviews':
        return (b.rating?.count || 0) - (a.rating?.count || 0);
      default:
        return 0;
    }
  });

  return filtered;
}

function getAvailableShops(): string[] {
  const shops = new Set<string>();
  allProducts.forEach(p => {
    const shopName = p.variants?.[0]?.shop?.name;
    if (shopName) shops.add(shopName);
  });
  return Array.from(shops).sort();
}

function getAvailableAttributes(): string[] {
  const attrs = new Set<string>();
  allProducts.forEach(p => {
    (p.attributes || []).forEach((attr: any) => {
      (attr.values || []).forEach((val: string) => attrs.add(val));
    });
  });
  return Array.from(attrs).sort();
}

function getPriceRange(): [number, number] {
  if (allProducts.length === 0) return [0, 100000];

  let min = Infinity;
  let max = 0;

  allProducts.forEach(p => {
    const pMin = p.priceRange?.min?.amount || 0;
    const pMax = p.priceRange?.max?.amount || pMin;
    min = Math.min(min, pMin);
    max = Math.max(max, pMax);
  });

  return [min, max];
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================ */

function renderCatalog() {
  const app = document.getElementById('app');
  if (!app) return;

  filteredProducts = filterProducts();

  const maxPrice = getPriceRange()[1];
  const shops = getAvailableShops();
  const attributes = getAvailableAttributes();

  app.innerHTML = `
    <div class="container">
      <div class="header">
        <div class="header-top">
          <h1>Shopify Catalog</h1>
          <div class="header-actions">
            <button class="view-toggle ${currentView === 'grid' ? 'active' : ''}" onclick="setView('grid')" title="Grid View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="view-toggle ${currentView === 'list' ? 'active' : ''}" onclick="setView('list')" title="List View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="8.5" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="15" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            ${selectedProducts.size > 0 ? `
              <button class="compare-btn" onclick="showCompareView()">
                Compare (${selectedProducts.size})
              </button>
            ` : ''}
          </div>
        </div>
        <div class="header-stats">
          <div class="product-count">
            Showing ${filteredProducts.length} of ${allProducts.length} product${allProducts.length !== 1 ? 's' : ''}
          </div>
          <div class="sort-controls">
            <label>Sort by:</label>
            <select id="sort-select" onchange="setSort(this.value)">
              <option value="relevance" ${currentSort === 'relevance' ? 'selected' : ''}>Relevance</option>
              <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Highest Rated</option>
              <option value="reviews" ${currentSort === 'reviews' ? 'selected' : ''}>Most Reviews</option>
              <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      <div class="catalog-layout">
        <div class="filters-sidebar">
          <div class="filters-header">
            <h3>Filters</h3>
            <button class="clear-filters" onclick="clearFilters()">Clear All</button>
          </div>

          <div class="filter-section">
            <label class="filter-label">Search</label>
            <input type="text" id="search-input" placeholder="Search products..."
                   value="${escapeHtml(searchQuery)}"
                   oninput="setSearchQuery(this.value)">
          </div>

          <div class="filter-section">
            <label class="filter-label">Price Range</label>
            <div class="price-range-inputs">
              <input type="number" id="price-min" placeholder="Min"
                     value="${priceRange[0] === 0 ? '' : priceRange[0] / 100}"
                     onchange="updatePriceRange('min', this.value)">
              <span>to</span>
              <input type="number" id="price-max" placeholder="Max"
                     value="${priceRange[1] === Infinity ? '' : priceRange[1] / 100}"
                     onchange="updatePriceRange('max', this.value)">
            </div>
            <div class="price-display">
              ${formatPrice(priceRange[0])} - ${priceRange[1] === Infinity ? '∞' : formatPrice(priceRange[1])}
            </div>
          </div>

          <div class="filter-section">
            <label class="filter-label">Minimum Rating</label>
            <div class="rating-filter">
              ${[5, 4, 3, 2, 1].map(r => `
                <label class="rating-option">
                  <input type="radio" name="rating" value="${r}" ${minRating === r ? 'checked' : ''}
                         onchange="setMinRating(${r})">
                  <span class="rating-stars">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>
                  <span class="rating-text">${r}+ stars</span>
                </label>
              `).join('')}
              <label class="rating-option">
                <input type="radio" name="rating" value="0" ${minRating === 0 ? 'checked' : ''}
                       onchange="setMinRating(0)">
                <span class="rating-text">All ratings</span>
              </label>
            </div>
          </div>

          ${shops.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Shops</label>
              <div class="checkbox-group">
                ${shops.map(shop => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedShops.has(shop) ? 'checked' : ''}
                           onchange="toggleShop('${escapeHtml(shop)}', this.checked)">
                    <span>${escapeHtml(shop)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${attributes.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Attributes</label>
              <div class="checkbox-group">
                ${attributes.slice(0, 20).map(attr => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedAttributes.has(attr) ? 'checked' : ''}
                           onchange="toggleAttribute('${escapeHtml(attr)}', this.checked)">
                    <span>${escapeHtml(attr)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="catalog-content">
          ${filteredProducts.length === 0 ? `
            <div class="empty-results">
              <p>No products match your filters.</p>
              <button onclick="clearFilters()">Clear Filters</button>
            </div>
          ` : currentView === 'grid' ? `
            <div class="catalog-grid">
              ${filteredProducts.map((product, index) => renderProductCard(product, index)).join('')}
            </div>
          ` : `
            <div class="catalog-list">
              ${filteredProducts.map((product, index) => renderProductListItem(product, index)).join('')}
            </div>
          `}
        </div>
      </div>
    </div>

    <div id="product-modal" class="modal" onclick="closeProductModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeProductModal(event)">×</button>
        <div id="product-modal-body"></div>
      </div>
    </div>

    <div id="compare-modal" class="modal" onclick="closeCompareModal(event)">
      <div class="modal-content compare-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeCompareModal(event)">×</button>
        <div id="compare-modal-body"></div>
      </div>
    </div>
  `;
}

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

    // Handle array of products
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

    // Store all products and reset filters
    allProducts = products;
    selectedProducts.clear();
    searchQuery = '';
    const priceRangeData = getPriceRange();
    priceRange = [priceRangeData[0], priceRangeData[1]];
    minRating = 0;
    selectedShops.clear();
    selectedAttributes.clear();
    currentSort = 'relevance';

    renderCatalog();

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering catalog: ${error.message}`);
  }
}

/* ============================================
   GLOBAL FUNCTIONS (for onclick handlers)
   ============================================ */

(window as any).toggleCompare = function(productId: string, checked: boolean) {
  if (checked) {
    selectedProducts.add(productId);
  } else {
    selectedProducts.delete(productId);
  }
  renderCatalog();
};

(window as any).showProductDetails = function(index: number) {
  const product = filteredProducts[index];
  if (!product) return;

  const modal = document.getElementById('product-modal');
  const modalBody = document.getElementById('product-modal-body');
  if (!modal || !modalBody) return;

  const images = product.media || [];
  const variants = product.variants || [];
  const shopName = variants[0]?.shop?.name || '';

  modalBody.innerHTML = `
    <div class="product-detail">
      <div class="product-detail-images">
        ${images.length > 0 ? `
          <div class="main-image">
            <img src="${escapeHtml(images[0].url)}" alt="${escapeHtml(images[0].altText || product.title)}" />
          </div>
          ${images.length > 1 ? `
            <div class="thumbnail-images">
              ${images.slice(1, 5).map((img: any) => `
                <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || '')}" />
              `).join('')}
            </div>
          ` : ''}
        ` : ''}
      </div>
      <div class="product-detail-content">
        <h1>${escapeHtml(product.title || 'Untitled Product')}</h1>
        <div class="detail-price">${formatPriceRange(product.priceRange)}</div>
        ${renderRating(product.rating)}
        ${product.description ? `<div class="detail-description">${escapeHtml(product.description)}</div>` : ''}
        ${product.uniqueSellingPoint ? `
          <div class="detail-usp">
            <h3>Unique Selling Point</h3>
            <p>${escapeHtml(product.uniqueSellingPoint)}</p>
          </div>
        ` : ''}
        ${product.topFeatures && product.topFeatures.length > 0 ? `
          <div class="detail-features">
            <h3>Top Features</h3>
            <ul>
              ${product.topFeatures.map((f: string) => `<li>${escapeHtml(f)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${product.techSpecs && product.techSpecs.length > 0 ? `
          <div class="detail-specs">
            <h3>Technical Specifications</h3>
            <ul>
              ${product.techSpecs.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${product.attributes && product.attributes.length > 0 ? `
          <div class="detail-attributes">
            <h3>Attributes</h3>
            <div class="attributes-grid">
              ${product.attributes.map((attr: any) => `
                <div class="attribute-item">
                  <strong>${escapeHtml(attr.name)}:</strong>
                  <span>${(attr.values || []).map((v: string) => escapeHtml(v)).join(', ')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${variants.length > 0 ? `
          <div class="detail-variants">
            <h3>Available Variants (${variants.length})</h3>
            <div class="variants-list">
              ${variants.slice(0, 10).map((v: any) => `
                <div class="variant-item">
                  <div class="variant-info">
                    <strong>${escapeHtml(v.displayName || product.title)}</strong>
                    <div class="variant-price">${formatPrice(v.price?.amount || 0, v.price?.currency || 'USD')}</div>
                    ${v.options && v.options.length > 0 ? `
                      <div class="variant-options">
                        ${v.options.map((opt: any) => `
                          <span class="option-tag">${escapeHtml(opt.name)}: ${escapeHtml(opt.value)}</span>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                  ${v.variantUrl ? `
                    <a href="${escapeHtml(v.variantUrl)}" target="_blank" class="variant-link">View →</a>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${shopName ? `<div class="detail-shop">Sold by: ${escapeHtml(shopName)}</div>` : ''}
        ${product.lookupUrl ? `
          <a href="${escapeHtml(product.lookupUrl)}" target="_blank" class="detail-link-btn">
            View on Shopify →
          </a>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.add('active');
};

(window as any).closeProductModal = function(event: Event) {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

(window as any).showCompareView = function() {
  if (selectedProducts.size === 0) return;

  const productsToCompare = allProducts.filter(p => selectedProducts.has(p.id || ''));
  if (productsToCompare.length === 0) return;

  const modal = document.getElementById('compare-modal');
  const modalBody = document.getElementById('compare-modal-body');
  if (!modal || !modalBody) return;

  // Get all unique attributes/fields for comparison
  const allFields = new Set<string>();
  productsToCompare.forEach(p => {
    if (p.title) allFields.add('title');
    if (p.priceRange) allFields.add('price');
    if (p.rating) allFields.add('rating');
    if (p.description) allFields.add('description');
    if (p.topFeatures) allFields.add('features');
    if (p.techSpecs) allFields.add('specs');
    if (p.variants) allFields.add('variants');
  });

  modalBody.innerHTML = `
    <h2>Compare Products (${productsToCompare.length})</h2>
    <div class="compare-table-wrapper">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            ${productsToCompare.map(p => `
              <th>
                <div class="compare-product-header">
                  ${p.media && p.media[0] ? `<img src="${escapeHtml(p.media[0].url)}" alt="${escapeHtml(p.title || '')}" />` : ''}
                  <div>${escapeHtml(p.title || 'Untitled')}</div>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Price</strong></td>
            ${productsToCompare.map(p => `<td>${formatPriceRange(p.priceRange)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Rating</strong></td>
            ${productsToCompare.map(p => `
              <td>${p.rating ? `${p.rating.rating.toFixed(1)} ⭐ (${p.rating.count} reviews)` : 'N/A'}</td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Description</strong></td>
            ${productsToCompare.map(p => `
              <td>${p.description ? escapeHtml(p.description.substring(0, 150)) + '...' : 'N/A'}</td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Top Features</strong></td>
            ${productsToCompare.map(p => `
              <td>
                ${p.topFeatures && p.topFeatures.length > 0 ? `
                  <ul>
                    ${p.topFeatures.slice(0, 5).map((f: string) => `<li>${escapeHtml(f)}</li>`).join('')}
                  </ul>
                ` : 'N/A'}
              </td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Variants</strong></td>
            ${productsToCompare.map(p => `
              <td>${p.variants ? p.variants.length : 0} variant${p.variants?.length !== 1 ? 's' : ''}</td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Shop</strong></td>
            ${productsToCompare.map(p => `
              <td>${p.variants?.[0]?.shop?.name || 'N/A'}</td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Actions</strong></td>
            ${productsToCompare.map(p => `
              <td>
                ${p.lookupUrl ? `<a href="${escapeHtml(p.lookupUrl)}" target="_blank" class="compare-link">View Product →</a>` : 'N/A'}
              </td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  modal.classList.add('active');
};

(window as any).closeCompareModal = function(event: Event) {
  const modal = document.getElementById('compare-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

(window as any).setView = function(view: 'grid' | 'list') {
  currentView = view;
  renderCatalog();
};

(window as any).setSort = function(sort: string) {
  currentSort = sort;
  renderCatalog();
};

(window as any).setSearchQuery = function(query: string) {
  searchQuery = query;
  renderCatalog();
};

(window as any).updatePriceRange = function(type: 'min' | 'max', value: string) {
  const numValue = value ? parseFloat(value) * 100 : (type === 'min' ? 0 : Infinity);
  if (type === 'min') {
    priceRange = [numValue, priceRange[1]];
  } else {
    priceRange = [priceRange[0], numValue];
  }
  renderCatalog();
};

(window as any).setPriceRange = function(range: [number, number]) {
  priceRange = range;
  renderCatalog();
};

(window as any).setMinRating = function(rating: number) {
  minRating = rating;
  renderCatalog();
};

(window as any).toggleShop = function(shop: string, checked: boolean) {
  if (checked) {
    selectedShops.add(shop);
  } else {
    selectedShops.delete(shop);
  }
  renderCatalog();
};

(window as any).toggleAttribute = function(attr: string, checked: boolean) {
  if (checked) {
    selectedAttributes.add(attr);
  } else {
    selectedAttributes.delete(attr);
  }
  renderCatalog();
};

(window as any).clearFilters = function() {
  searchQuery = '';
  const priceRangeData = getPriceRange();
  priceRange = [priceRangeData[0], priceRangeData[1]];
  minRating = 0;
  selectedShops.clear();
  selectedAttributes.clear();
  currentSort = 'relevance';
  renderCatalog();
};

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
