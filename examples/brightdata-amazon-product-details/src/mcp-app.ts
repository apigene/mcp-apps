/* ============================================
   AMAZON PRODUCT DETAILS MCP APP (STANDALONE MODE)
   ============================================

   Displays a single Amazon product with full details: title, description,
   images, pricing, variations, features, product details, delivery, etc.
   Expects API response format: { status_code: 200, body: [product] }

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

const APP_NAME = "Amazon Product Details";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

function unwrapData(data: any): any {
  if (!data) return null;

  if (data.message && typeof data.message === "object") {
    const msg = data.message;
    if (msg.status_code !== undefined) {
      const content = msg.response_content ?? msg.body;
      if (content !== undefined) {
        return { status_code: msg.status_code, body: content, response_content: content };
      }
    }
  }

  if (data.status_code !== undefined) {
    const content = data.body ?? data.response_content;
    if (content !== undefined) {
      return { status_code: data.status_code, body: content, response_content: content };
    }
  }

  if (data.body && Array.isArray(data.body)) return data;
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0)) return data;
  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;
  if (Array.isArray(data)) return { body: data };
  return data;
}


function escapeHtml(str: any): string {
  if (typeof str !== "string") return str ? String(str) : "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No product data available.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

/* ============================================
   TEMPLATE-SPECIFIC: Extract product
   ============================================ */

function extractProduct(data: any): any | null {
  const unwrapped = unwrapData(data);
  if (!unwrapped) return null;
  const content = unwrapped.body ?? unwrapped.response_content;
  if (Array.isArray(content) && content.length > 0) return content[0];
  if (content && typeof content === "object" && (content.title || content.asin)) return content;
  return null;
}

function formatPrice(price: number | null | undefined, currency: string | undefined): string {
  if (price === null || price === undefined) return "";
  const sym = currency === "USD" ? "$" : currency === "AUD" ? "A$" : currency ?? "$";
  return `${sym}${Number(price).toFixed(2)}`;
}

function renderStars(rating: number | null | undefined, count: number | null | undefined): string {
  if (!rating || rating === 0) return '<span class="no-rating">No ratings</span>';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  let html = "";
  for (let i = 0; i < full; i++) html += '<span class="star star-full">★</span>';
  if (half) html += '<span class="star star-half">★</span>';
  for (let i = 0; i < empty; i++) html += '<span class="star star-empty">★</span>';
  const countStr = count != null ? ` (${count.toLocaleString()})` : "";
  return `<div class="rating">${html} <span class="rating-text">${rating.toFixed(1)}${escapeHtml(countStr)}</span></div>`;
}

function renderProductDetail(p: any): string {
  const label = p.type ?? p.title ?? "";
  const value = p.value ?? p.description ?? "";
  if (!label && !value) return "";
  return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span>${value ? `<span class="detail-value">${escapeHtml(value)}</span>` : ""}</div>`;
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;
  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const product = extractProduct(data);
    if (!product) {
      showEmpty("No product found in response.");
      return;
    }

    const title = product.title ?? "Untitled Product";
    const url = product.url ?? "";
    const brand = product.brand ?? "";
    const sellerName = product.seller_name ?? "";
    const description = product.description ?? "";
    const imageUrl = product.image_url ?? product.image ?? "";
    const images: string[] = Array.isArray(product.images) ? product.images : imageUrl ? [imageUrl] : [];
    const initialPrice = product.initial_price;
    const finalPrice = product.final_price ?? product.buybox_prices?.final_price;
    const currency = product.currency ?? "USD";
    const discount = product.discount ?? product.buybox_prices?.discount ?? "";
    const availability = product.availability ?? "";
    const rating = product.rating;
    const reviewsCount = product.reviews_count ?? 0;
    const categories: string[] = Array.isArray(product.categories) ? product.categories : [];
    const features: string[] = Array.isArray(product.features) ? product.features : [];
    const productDetails: any[] = Array.isArray(product.product_details) ? product.product_details : [];
    const variations: any[] = Array.isArray(product.variations) ? product.variations : [];
    const variationsValues: any[] = Array.isArray(product.variations_values) ? product.variations_values : [];
    const delivery: string[] = Array.isArray(product.delivery) ? product.delivery : [];
    const returnPolicy = product.return_policy ?? "";
    const amazonPrime = product.amazon_prime === true;
    const climatePledge = product.climate_pledge_friendly === true;
    const sustainability: any[] = Array.isArray(product.sustainability_features) ? product.sustainability_features : [];
    const storeUrl = product.store_url ?? "";
    const dateFirst = product.date_first_available ?? "";
    const manufacturer = product.manufacturer ?? "";
    const modelNumber = product.model_number ?? "";
    const department = product.department ?? "";
    const bsRank = product.bs_rank;
    const bsCategory = product.bs_category ?? "";

    const hasDiscount = initialPrice != null && finalPrice != null && initialPrice > 0 && finalPrice < initialPrice;

    let html = `
    <div class="amazon-details-container">
      <div class="details-header">
        <div class="header-content">
          <div class="amazon-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M10.922 11.816c-.327-.327-.327-.857 0-1.184l5.816-5.816c.327-.327.857-.327 1.184 0s.327.857 0 1.184L12.106 12l5.816 5.816c.327.327.327.857 0 1.184s-.857.327-1.184 0L10.922 12.816c-.327-.327-.327-.857 0-1.184z"/><path fill="currentColor" d="M6.922 11.816c-.327-.327-.327-.857 0-1.184l5.816-5.816c.327-.327.857-.327 1.184 0s.327.857 0 1.184L8.106 12l5.816 5.816c.327.327.327.857 0 1.184s-.857.327-1.184 0L6.922 12.816c-.327-.327-.327-.857 0-1.184z"/></svg>
          </div>
          <h1 class="header-title">Product Details</h1>
        </div>
      </div>

      <div class="product-main">
        <div class="product-gallery">
          ${images.length > 0 ? `
            <div class="main-image-wrap">
              <img src="${escapeHtml(images[0])}" alt="${escapeHtml(title)}" class="main-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden');" />
              <div class="image-placeholder hidden"><span>📦</span></div>
            </div>
            ${images.length > 1 ? `<div class="thumb-strip">${images.slice(0, 6).map((src: string, i: number) => `<img src="${escapeHtml(src)}" alt="" class="thumb${i === 0 ? " active" : ""}" loading="lazy" />`).join("")}</div>` : ""}
          ` : `
            <div class="main-image-wrap">
              <div class="image-placeholder"><span>📦</span></div>
            </div>
          `}
        </div>

        <div class="product-info-block">
          ${brand ? `<div class="product-brand">${escapeHtml(brand)}</div>` : ""}
          <h2 class="product-title">
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>` : escapeHtml(title)}
          </h2>
          ${renderStars(rating, reviewsCount)}
          ${sellerName ? `<div class="seller">Sold by ${escapeHtml(sellerName)}</div>` : ""}

          <div class="price-block">
            ${finalPrice != null ? `<span class="price-final">${formatPrice(finalPrice, currency)}</span>` : ""}
            ${hasDiscount && initialPrice != null ? `<span class="price-was">${formatPrice(initialPrice, currency)}</span>` : ""}
            ${(discount || (hasDiscount && initialPrice && finalPrice)) ? `<span class="discount-tag">${escapeHtml(discount || `-${Math.round(((initialPrice - finalPrice) / initialPrice) * 100)}%`)}</span>` : ""}
          </div>
          ${availability ? `<div class="availability">${escapeHtml(availability)}</div>` : ""}
          ${amazonPrime ? '<div class="prime-badge">Prime</div>' : ""}
          ${delivery.length > 0 ? `<div class="delivery"><strong>Delivery:</strong> ${delivery.map((d: string) => escapeHtml(d)).join(" ")}</div>` : ""}
          ${returnPolicy ? `<div class="return-policy">${escapeHtml(returnPolicy)}</div>` : ""}

          ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="cta-link">View on Amazon →</a>` : ""}
        </div>
      </div>

      ${description ? `
      <div class="section">
        <h3 class="section-title">About this item</h3>
        <p class="description">${escapeHtml(description)}</p>
      </div>
      ` : ""}

      ${features.length > 0 ? `
      <div class="section">
        <h3 class="section-title">Features</h3>
        <ul class="features-list">${features.map((f: string) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
      </div>
      ` : ""}

      ${(variationsValues.length > 0 || variations.length > 0) ? `
      <div class="section">
        <h3 class="section-title">Variations</h3>
        <div class="variations-section">
          ${variationsValues.map((vv: any) => {
            const name = vv["variant name"] ?? vv.variantName ?? "Option";
            const vals: string[] = Array.isArray(vv.values) ? vv.values : [];
            return vals.length ? `<div class="variant-group"><span class="variant-name">${escapeHtml(name)}:</span> <span class="variant-values">${vals.map((v: string) => escapeHtml(v)).join(", ")}</span></div>` : "";
          }).join("")}
          ${variations.length > 0 ? `<div class="variation-chips">${variations.slice(0, 24).map((v: any) => `<span class="chip">${escapeHtml(v.name ?? v.size ?? v.color ?? JSON.stringify(v))}</span>`).join("")}${variations.length > 24 ? `<span class="chip more">+${variations.length - 24} more</span>` : ""}</div>` : ""}
        </div>
      </div>
      ` : ""}

      ${productDetails.length > 0 ? `
      <div class="section">
        <h3 class="section-title">Product details</h3>
        <div class="details-table">
          ${productDetails.filter((d: any) => d.type || d.value).map((d: any) => renderProductDetail(d)).join("")}
        </div>
      </div>
      ` : ""}

      ${(dateFirst || manufacturer || modelNumber || department || bsCategory) ? `
      <div class="section meta-section">
        <h3 class="section-title">Additional information</h3>
        <div class="details-table">
          ${dateFirst ? renderProductDetail({ type: "Date First Available", value: dateFirst }) : ""}
          ${manufacturer ? renderProductDetail({ type: "Manufacturer", value: manufacturer }) : ""}
          ${modelNumber ? renderProductDetail({ type: "Model number", value: modelNumber }) : ""}
          ${department ? renderProductDetail({ type: "Department", value: department }) : ""}
          ${bsCategory ? renderProductDetail({ type: "Category", value: bsCategory }) : ""}
          ${bsRank != null ? renderProductDetail({ type: "Best Sellers Rank", value: `#${bsRank.toLocaleString()}` }) : ""}
        </div>
      </div>
      ` : ""}

      ${categories.length > 0 ? `
      <div class="section">
        <h3 class="section-title">Categories</h3>
        <p class="categories">${categories.map((c: string) => escapeHtml(c)).join(" › ")}</p>
      </div>
      ` : ""}

      ${sustainability.length > 0 || climatePledge ? `
      <div class="section sustainability">
        <h3 class="section-title">Sustainability</h3>
        ${climatePledge ? '<div class="climate-badge">Climate Pledge Friendly</div>' : ""}
        ${sustainability.map((s: any) => `<div class="sustainability-item"><strong>${escapeHtml(s.title ?? "")}</strong> ${escapeHtml(s.description ?? "")}</div>`).join("")}
      </div>
      ` : ""}

      ${storeUrl ? `<div class="section"><a href="${escapeHtml(storeUrl)}" target="_blank" rel="noopener" class="store-link">Visit brand store →</a></div>` : ""}
    </div>
    `;

    app.innerHTML = html;
  } catch (err: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(err)}`, logger: APP_NAME });
    showError(`Error rendering product: ${err?.message ?? "Unknown error"}`);
  }
}

/* ============================================
   DISPLAY MODE HANDLER
   ============================================ */

let currentDisplayMode = "inline";

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  document.body.classList.toggle("fullscreen-mode", mode === "fullscreen");
  const container = document.querySelector(".amazon-details-container");
  if (container) {
    (container as HTMLElement).style.maxWidth = mode === "fullscreen" ? "100%" : "";
    (container as HTMLElement).style.padding = mode === "fullscreen" ? "20px" : "";
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
    handleDisplayModeChange("fullscreen");
  } else {
    document.body.classList.remove("fullscreen-mode");
    handleDisplayModeChange("inline");
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
