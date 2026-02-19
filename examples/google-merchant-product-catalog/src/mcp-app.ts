/* ============================================
   GOOGLE MERCHANT PRODUCT CATALOG MCP APP
   ============================================
   Displays product catalog from Content API for Shopping
   (content/v2.1/products list → body.resources).
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Google Merchant Catalog";
const APP_VERSION = "1.0.0";

/* Global state */
let allProducts: any[] = [];
let filteredProducts: any[] = [];
let selectedProducts: Set<string> = new Set();
let currentView: "grid" | "list" = "grid";
let currentSort: string = "relevance";
let searchQuery: string = "";
let priceRange: [number, number] = [0, Infinity];
let selectedBrands: Set<string> = new Set();
let selectedColors: Set<string> = new Set();
let selectedSizes: Set<string> = new Set();
let selectedAvailability: Set<string> = new Set();

function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) return msg.params.structuredContent;
  if (msg?.params !== undefined) return msg.params;
  return msg;
}

function unwrapData(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data.body && typeof data.body === "object") {
    if (Array.isArray(data.body.resources)) return data.body.resources;
    if (data.body.kind === "content#productsListResponse" && Array.isArray(data.body.resources))
      return data.body.resources;
  }
  if (data.resources && Array.isArray(data.resources)) return data.resources;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.results) return data.results;
  if (data.items) return data.items;
  return data;
}

function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str ?? "");
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No products available.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

function getProductPriceValue(p: any): number {
  const pr = p.price;
  if (!pr) return 0;
  const v = pr.value;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function formatPrice(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(value);
}

function formatProductPrice(p: any): string {
  const v = getProductPriceValue(p);
  const c = (p.price && p.price.currency) || "USD";
  return formatPrice(v, c);
}

function filterProducts(): any[] {
  let filtered = [...allProducts];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.offerId || "").toLowerCase().includes(q)
    );
  }

  filtered = filtered.filter((p) => {
    const priceVal = getProductPriceValue(p);
    if (priceVal < priceRange[0] || priceVal > priceRange[1]) return false;
    if (selectedBrands.size > 0 && p.brand && !selectedBrands.has(p.brand)) return false;
    if (selectedColors.size > 0 && p.color && !selectedColors.has(p.color)) return false;
    if (selectedSizes.size > 0) {
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      if (!sizes.some((s: string) => selectedSizes.has(s))) return false;
    }
    if (selectedAvailability.size > 0 && p.availability && !selectedAvailability.has(p.availability)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    switch (currentSort) {
      case "price-low":
        return getProductPriceValue(a) - getProductPriceValue(b);
      case "price-high":
        return getProductPriceValue(b) - getProductPriceValue(a);
      case "name":
        return (a.title || "").localeCompare(b.title || "");
      default:
        return 0;
    }
  });

  return filtered;
}

function getPriceRange(): [number, number] {
  if (allProducts.length === 0) return [0, 10000];
  let min = Infinity;
  let max = 0;
  allProducts.forEach((p) => {
    const v = getProductPriceValue(p);
    if (v > 0) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  });
  return [min === Infinity ? 0 : min, max];
}

function getUniqueValues(key: string): string[] {
  const set = new Set<string>();
  allProducts.forEach((p) => {
    const val = p[key];
    if (val) set.add(val);
  });
  return Array.from(set).sort();
}

function getUniqueSizes(): string[] {
  const set = new Set<string>();
  allProducts.forEach((p) => {
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    sizes.forEach((s: string) => set.add(s));
  });
  return Array.from(set).sort();
}

function getUniqueAvailability(): string[] {
  const set = new Set<string>();
  allProducts.forEach((p) => {
    if (p.availability) set.add(p.availability);
  });
  return Array.from(set).sort();
}

function renderProductCard(product: any, index: number): string {
  const imageUrl = product.imageLink || "https://via.placeholder.com/320x240?text=No+Image";
  const productUrl = product.link || "#";
  const priceDisplay = formatProductPrice(product);
  const productId = product.id || product.offerId || `product-${index}`;
  const isSelected = selectedProducts.has(productId);
  const brand = product.brand ? escapeHtml(product.brand) : "";
  const color = product.color ? escapeHtml(product.color) : "";
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const availability = product.availability ? escapeHtml(product.availability) : "";
  const productTypes = Array.isArray(product.productTypes) ? product.productTypes : [];

  return `
    <div class="product-card" data-product-id="${escapeHtml(String(productId))}">
      <div class="product-card-header">
        <label class="compare-checkbox">
          <input type="checkbox" ${isSelected ? "checked" : ""}
                 onchange="window.__toggleCompare('${escapeHtml(String(productId))}', this.checked)">
          <span>Compare</span>
        </label>
        <button class="view-details-btn" onclick="window.__showProductDetails(${index})" title="View Details">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="currentColor"/>
            <path d="M10 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="product-image-wrapper" onclick="window.__showProductDetails(${index})">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title || "Product")}" class="product-image" />
      </div>
      <div class="product-content">
        <h2 class="product-title">
          <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
            ${escapeHtml(product.title || "Untitled Product")}
          </a>
        </h2>
        ${brand ? `<div class="product-brand">${brand}</div>` : ""}
        ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
        <div class="product-price">${escapeHtml(priceDisplay)}</div>
        ${color ? `<div class="product-meta-tags"><span class="meta-tag">${color}</span></div>` : ""}
        ${sizes.length > 0 ? `<div class="product-meta-tags">Sizes: ${sizes.map((s: string) => `<span class="meta-tag">${escapeHtml(s)}</span>`).join(" ")}</div>` : ""}
        ${availability ? `<div class="product-availability">${availability}</div>` : ""}
        ${productTypes.length > 0 ? `<div class="product-types">${escapeHtml(productTypes.slice(0, 2).join(" · "))}</div>` : ""}
      </div>
    </div>
  `;
}

function renderProductListItem(product: any, index: number): string {
  const imageUrl = product.imageLink || "https://via.placeholder.com/200x200?text=No+Image";
  const productUrl = product.link || "#";
  const priceDisplay = formatProductPrice(product);
  const productId = product.id || product.offerId || `product-${index}`;
  const isSelected = selectedProducts.has(productId);
  const brand = product.brand ? escapeHtml(product.brand) : "";
  const color = product.color ? escapeHtml(product.color) : "";
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const availability = product.availability ? escapeHtml(product.availability) : "";

  return `
    <div class="product-list-item" data-product-id="${escapeHtml(String(productId))}">
      <div class="list-item-checkbox">
        <label class="compare-checkbox">
          <input type="checkbox" ${isSelected ? "checked" : ""}
                 onchange="window.__toggleCompare('${escapeHtml(String(productId))}', this.checked)">
          <span>Compare</span>
        </label>
      </div>
      <div class="list-item-image" onclick="window.__showProductDetails(${index})">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.title || "Product")}" />
      </div>
      <div class="list-item-content">
        <h3 class="list-item-title">
          <a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(product.title || "Untitled Product")}
          </a>
        </h3>
        ${brand ? `<div class="list-item-brand">${brand}</div>` : ""}
        ${product.description ? `<p class="list-item-description">${escapeHtml(product.description)}</p>` : ""}
        <div class="list-item-meta">
          <div class="list-item-price">${escapeHtml(priceDisplay)}</div>
          ${color ? `<span class="meta-tag">${color}</span>` : ""}
          ${sizes.length > 0 ? `<span class="meta-tag">${sizes.map((s: string) => escapeHtml(s)).join(", ")}</span>` : ""}
          ${availability ? `<span class="availability-tag">${availability}</span>` : ""}
        </div>
      </div>
      <div class="list-item-actions">
        <button class="view-details-btn" onclick="window.__showProductDetails(${index})">View Details</button>
      </div>
    </div>
  `;
}

function renderCatalog() {
  const app = document.getElementById("app");
  if (!app) return;

  filteredProducts = filterProducts();
  const [minP, maxP] = getPriceRange();
  const brands = getUniqueValues("brand");
  const colors = getUniqueValues("color");
  const sizes = getUniqueSizes();
  const availabilityOptions = getUniqueAvailability();

  app.innerHTML = `
    <div class="container">
      <div class="header">
        <div class="header-top">
          <h1>Google Merchant Catalog</h1>
          <div class="header-actions">
            <button class="view-toggle ${currentView === "grid" ? "active" : ""}" onclick="window.__setView('grid')" title="Grid View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="view-toggle ${currentView === "list" ? "active" : ""}" onclick="window.__setView('list')" title="List View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="8.5" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="15" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            ${selectedProducts.size > 0 ? `<button class="compare-btn" onclick="window.__showCompareView()">Compare (${selectedProducts.size})</button>` : ""}
          </div>
        </div>
        <div class="header-stats">
          <div class="product-count">
            Showing ${filteredProducts.length} of ${allProducts.length} product${allProducts.length !== 1 ? "s" : ""}
          </div>
          <div class="sort-controls">
            <label>Sort by:</label>
            <select id="sort-select" onchange="window.__setSort(this.value)">
              <option value="relevance" ${currentSort === "relevance" ? "selected" : ""}>Relevance</option>
              <option value="price-low" ${currentSort === "price-low" ? "selected" : ""}>Price: Low to High</option>
              <option value="price-high" ${currentSort === "price-high" ? "selected" : ""}>Price: High to Low</option>
              <option value="name" ${currentSort === "name" ? "selected" : ""}>Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      <div class="catalog-layout">
        <div class="filters-sidebar">
          <div class="filters-header">
            <h3>Filters</h3>
            <button class="clear-filters" onclick="window.__clearFilters()">Clear All</button>
          </div>

          <div class="filter-section">
            <label class="filter-label">Search</label>
            <input type="text" id="search-input" placeholder="Search products..."
                   value="${escapeHtml(searchQuery)}"
                   oninput="window.__setSearchQuery(this.value)">
          </div>

          <div class="filter-section">
            <label class="filter-label">Price Range</label>
            <div class="price-range-inputs">
              <input type="number" id="price-min" placeholder="Min" step="0.01"
                     value="${priceRange[0] === 0 ? "" : priceRange[0]}"
                     onchange="window.__updatePriceRange('min', this.value)">
              <span>to</span>
              <input type="number" id="price-max" placeholder="Max" step="0.01"
                     value="${priceRange[1] === Infinity ? "" : priceRange[1]}"
                     onchange="window.__updatePriceRange('max', this.value)">
            </div>
            <div class="price-display">
              ${priceRange[0] === 0 ? "0" : formatPrice(priceRange[0])} – ${priceRange[1] === Infinity ? "∞" : formatPrice(priceRange[1])}
            </div>
          </div>

          ${brands.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Brand</label>
              <div class="checkbox-group">
                ${brands.slice(0, 30).map((b) => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedBrands.has(b) ? "checked" : ""}
                           onchange="window.__toggleBrand('${escapeHtml(b)}', this.checked)">
                    <span>${escapeHtml(b)}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${colors.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Color</label>
              <div class="checkbox-group">
                ${colors.map((c) => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedColors.has(c) ? "checked" : ""}
                           onchange="window.__toggleColor('${escapeHtml(c)}', this.checked)">
                    <span>${escapeHtml(c)}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${sizes.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Size</label>
              <div class="checkbox-group">
                ${sizes.map((s) => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedSizes.has(s) ? "checked" : ""}
                           onchange="window.__toggleSize('${escapeHtml(s)}', this.checked)">
                    <span>${escapeHtml(s)}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${availabilityOptions.length > 0 ? `
            <div class="filter-section">
              <label class="filter-label">Availability</label>
              <div class="checkbox-group">
                ${availabilityOptions.map((a) => `
                  <label class="checkbox-option">
                    <input type="checkbox" ${selectedAvailability.has(a) ? "checked" : ""}
                           onchange="window.__toggleAvailability('${escapeHtml(a)}', this.checked)">
                    <span>${escapeHtml(a)}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>

        <div class="catalog-content">
          ${filteredProducts.length === 0 ? `
            <div class="empty-results">
              <p>No products match your filters.</p>
              <button onclick="window.__clearFilters()">Clear Filters</button>
            </div>
          ` : currentView === "grid" ? `
            <div class="catalog-grid">
              ${filteredProducts.map((p, i) => renderProductCard(p, i)).join("")}
            </div>
          ` : `
            <div class="catalog-list">
              ${filteredProducts.map((p, i) => renderProductListItem(p, i)).join("")}
            </div>
          `}
        </div>
      </div>
    </div>

    <div id="product-modal" class="modal" onclick="window.__closeProductModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="window.__closeProductModal(event)">×</button>
        <div id="product-modal-body"></div>
      </div>
    </div>

    <div id="compare-modal" class="modal" onclick="window.__closeCompareModal(event)">
      <div class="modal-content compare-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="window.__closeCompareModal(event)">×</button>
        <div id="compare-modal-body"></div>
      </div>
    </div>
  `;
}

function renderData(data: any) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const raw = extractData(data);
    const resources = unwrapData(raw);

    let products: any[] = [];
    if (Array.isArray(resources)) {
      products = resources;
    } else {
      showEmpty("No products found in the catalog");
      return;
    }

    if (products.length === 0) {
      showEmpty("No products available");
      return;
    }

    allProducts = products;
    selectedProducts.clear();
    searchQuery = "";
    const [minP, maxP] = getPriceRange();
    priceRange = [minP, maxP];
    selectedBrands.clear();
    selectedColors.clear();
    selectedSizes.clear();
    selectedAvailability.clear();
    currentSort = "relevance";

    renderCatalog();
    app.sendLog({
      level: "debug",
      data: `Products rendered: ${allProducts.length}`,
      logger: APP_NAME,
    });
  } catch (error: any) {
    app.sendLog({
      level: "error",
      data: `Render error: ${JSON.stringify(error)}`,
      logger: APP_NAME,
    });
    showError(`Error rendering catalog: ${error?.message || String(error)}`);
  }
}

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
    document.body.classList.toggle("dark", ctx.theme === "dark");
  }
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  document.body.classList.toggle("fullscreen-mode", ctx.displayMode === "fullscreen");
}

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

app.onteardown = async () => {
  app.sendLog({ level: "info", data: "Resource teardown requested", logger: APP_NAME });
  return {};
};

app.ontoolinput = (params) => {
  app.sendLog({
    level: "info",
    data: `Tool input received: ${JSON.stringify(params.arguments)}`,
    logger: APP_NAME,
  });
};

app.ontoolresult = (params) => {
  app.sendLog({ level: "info", data: "Tool result received", logger: APP_NAME });

  if (params.isError) {
    app.sendLog({
      level: "error",
      data: `Tool execution failed: ${JSON.stringify(params.content)}`,
      logger: APP_NAME,
    });
    const errorText =
      params.content?.map((c: any) => c.text || "").join("\n") || "Tool execution failed";
    showError(errorText);
    return;
  }
  const data = params.structuredContent ?? params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    app.sendLog({
      level: "warning",
      data: `Tool result received but no data found: ${JSON.stringify(params)}`,
      logger: APP_NAME,
    });
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
  app.sendLog({
    level: "info",
    data: `Host context changed: ${JSON.stringify(ctx)}`,
    logger: APP_NAME,
  });
  handleHostContextChanged(ctx);
};

(window as any).__toggleCompare = function (productId: string, checked: boolean) {
  if (checked) selectedProducts.add(productId);
  else selectedProducts.delete(productId);
  renderCatalog();
};

(window as any).__showProductDetails = function (index: number) {
  const product = filteredProducts[index];
  if (!product) return;
  const modal = document.getElementById("product-modal");
  const modalBody = document.getElementById("product-modal-body");
  if (!modal || !modalBody) return;

  const images = [product.imageLink, ...(product.additionalImageLinks || [])].filter(Boolean);
  const productUrl = product.link || "#";

  modalBody.innerHTML = `
    <div class="product-detail">
      <div class="product-detail-images">
        ${images.length > 0 ? `
          <div class="main-image">
            <img src="${escapeHtml(images[0])}" alt="${escapeHtml(product.title || "")}" />
          </div>
          ${images.length > 1 ? `
            <div class="thumbnail-images">
              ${images.slice(1, 5).map((url: string) => `<img src="${escapeHtml(url)}" alt="" />`).join("")}
            </div>
          ` : ""}
        ` : ""}
      </div>
      <div class="product-detail-content">
        <h1>${escapeHtml(product.title || "Untitled Product")}</h1>
        ${product.brand ? `<div class="detail-brand">${escapeHtml(product.brand)}</div>` : ""}
        <div class="detail-price">${formatProductPrice(product)}</div>
        ${product.availability ? `<div class="detail-availability">${escapeHtml(product.availability)}</div>` : ""}
        ${product.description ? `<div class="detail-description">${escapeHtml(product.description)}</div>` : ""}
        ${product.color ? `<div class="detail-meta"><strong>Color:</strong> ${escapeHtml(product.color)}</div>` : ""}
        ${Array.isArray(product.sizes) && product.sizes.length > 0 ? `<div class="detail-meta"><strong>Sizes:</strong> ${product.sizes.map((s: string) => escapeHtml(s)).join(", ")}</div>` : ""}
        ${Array.isArray(product.productTypes) && product.productTypes.length > 0 ? `
          <div class="detail-meta"><strong>Categories:</strong> ${product.productTypes.map((t: string) => escapeHtml(t)).join(" · ")}</div>
        ` : ""}
        ${product.condition ? `<div class="detail-meta"><strong>Condition:</strong> ${escapeHtml(product.condition)}</div>` : ""}
        ${product.targetCountry ? `<div class="detail-meta"><strong>Target country:</strong> ${escapeHtml(product.targetCountry)}</div>` : ""}
        ${productUrl !== "#" ? `<a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" class="detail-link-btn">View product →</a>` : ""}
      </div>
    </div>
  `;
  modal?.classList.add("active");
};

(window as any).__closeProductModal = function () {
  document.getElementById("product-modal")?.classList.remove("active");
};

(window as any).__showCompareView = function () {
  if (selectedProducts.size === 0) return;
  const productsToCompare = allProducts.filter((p) => selectedProducts.has(p.id || p.offerId || ""));
  if (productsToCompare.length === 0) return;
  const modal = document.getElementById("compare-modal");
  const modalBody = document.getElementById("compare-modal-body");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <h2>Compare Products (${productsToCompare.length})</h2>
    <div class="compare-table-wrapper">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            ${productsToCompare.map((p) => `
              <th>
                <div class="compare-product-header">
                  ${p.imageLink ? `<img src="${escapeHtml(p.imageLink)}" alt="${escapeHtml(p.title || "")}" />` : ""}
                  <div>${escapeHtml(p.title || "Untitled")}</div>
                </div>
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Price</strong></td>${productsToCompare.map((p) => `<td>${formatProductPrice(p)}</td>`).join("")}</tr>
          <tr><td><strong>Brand</strong></td>${productsToCompare.map((p) => `<td>${p.brand ? escapeHtml(p.brand) : "—"}</td>`).join("")}</tr>
          <tr><td><strong>Color</strong></td>${productsToCompare.map((p) => `<td>${p.color ? escapeHtml(p.color) : "—"}</td>`).join("")}</tr>
          <tr><td><strong>Availability</strong></td>${productsToCompare.map((p) => `<td>${p.availability ? escapeHtml(p.availability) : "—"}</td>`).join("")}</tr>
          <tr><td><strong>Link</strong></td>${productsToCompare.map((p) => `<td>${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" class="compare-link">View →</a>` : "—"}</td>`).join("")}</tr>
        </tbody>
      </table>
    </div>
  `;
  modal.classList.add("active");
};

(window as any).__closeCompareModal = function () {
  document.getElementById("compare-modal")?.classList.remove("active");
};

(window as any).__setView = function (view: "grid" | "list") {
  currentView = view;
  renderCatalog();
};

(window as any).__setSort = function (sort: string) {
  currentSort = sort;
  renderCatalog();
};

(window as any).__setSearchQuery = function (query: string) {
  searchQuery = query;
  renderCatalog();
};

(window as any).__updatePriceRange = function (type: "min" | "max", value: string) {
  const num = value ? parseFloat(value) : (type === "min" ? 0 : Infinity);
  if (type === "min") priceRange = [num, priceRange[1]];
  else priceRange = [priceRange[0], num];
  renderCatalog();
};

(window as any).__toggleBrand = function (brand: string, checked: boolean) {
  if (checked) selectedBrands.add(brand);
  else selectedBrands.delete(brand);
  renderCatalog();
};

(window as any).__toggleColor = function (color: string, checked: boolean) {
  if (checked) selectedColors.add(color);
  else selectedColors.delete(color);
  renderCatalog();
};

(window as any).__toggleSize = function (size: string, checked: boolean) {
  if (checked) selectedSizes.add(size);
  else selectedSizes.delete(size);
  renderCatalog();
};

(window as any).__toggleAvailability = function (av: string, checked: boolean) {
  if (checked) selectedAvailability.add(av);
  else selectedAvailability.delete(av);
  renderCatalog();
};

(window as any).__clearFilters = function () {
  searchQuery = "";
  const [minP, maxP] = getPriceRange();
  priceRange = [minP, maxP];
  selectedBrands.clear();
  selectedColors.clear();
  selectedSizes.clear();
  selectedAvailability.clear();
  currentSort = "relevance";
  renderCatalog();
};

app
  .connect()
  .then(() => {
    app.sendLog({ level: "info", data: "MCP App connected to host", logger: APP_NAME });
    const ctx = app.getHostContext();
    if (ctx) handleHostContextChanged(ctx);
  })
  .catch((error) => {
    app.sendLog({
      level: "error",
      data: `Failed to connect to MCP host: ${JSON.stringify(error)}`,
      logger: APP_NAME,
    });
  });

export {};
