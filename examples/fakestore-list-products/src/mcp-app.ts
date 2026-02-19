/* ============================================
   FAKE STORE MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

import "./global.css";
import "./mcp-app.css";

const APP_NAME = "Fake Store SDK";
const APP_VERSION = "1.0.0";

type Product = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate?: number;
    count?: number;
  };
};

function unwrapData(data: any): any {
  if (!data) return null;

  if (data.message?.template_data) return data.message.template_data;
  if (data.message?.response_content) return data.message.response_content;

  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;

  if (
    data.rows &&
    typeof data.rows === "object" &&
    !Array.isArray(data.rows) &&
    data.rows.columns &&
    data.rows.rows
  ) {
    return data.rows;
  }

  if (data.columns || Array.isArray(data.rows)) return data;
  if (Array.isArray(data)) return { rows: data };

  return data;
}

function toProducts(data: any): Product[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.actions_result?.[0]?.response_content)) {
    return data.actions_result[0].response_content;
  }
  return [];
}

function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message: string) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function showEmpty(message: string = "No products found.") {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRating(rate?: number, count?: number): string {
  if (typeof rate !== "number") return "-";
  if (typeof count === "number") return `${rate.toFixed(1)} (${count})`;
  return rate.toFixed(1);
}

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    const products = toProducts(unwrapped);

    if (!products.length) {
      showEmpty("No products found in response.");
      return;
    }

    app.innerHTML = `
      <div class="container">
        <div class="header">
          <h1>Products</h1>
          <div class="meta">${products.length} items</div>
        </div>

        <div class="table-wrap">
          <table class="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map(
                  (product) => `
                <tr>
                  <td>
                    <div class="product-cell">
                      <img class="thumb" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />
                      <div class="product-text">
                        <div class="title">${escapeHtml(product.title)}</div>
                        <div class="desc">${escapeHtml(product.description || "")}</div>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(product.category || "-")}</td>
                  <td>${formatPrice(product.price)}</td>
                  <td>${formatRating(product.rating?.rate, product.rating?.count)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error: any) {
    console.error("Render error:", error);
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
  console.info("Resource teardown requested");
  return {};
};

app.ontoolinput = (params) => {
  console.info("Tool input received:", params.arguments);
};

app.ontoolresult = (params) => {
  console.info("Tool result received");

  // Check for tool execution errors
  if (params.isError) {
    console.error("Tool execution failed:", params.content);
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
    console.warn("Tool result received but no data found:", params);
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  console.info("Tool cancelled:", reason);
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  console.error("App error:", error);
};

app.onhostcontextchanged = (ctx) => {
  console.info("Host context changed:", ctx);
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    console.info("MCP App connected to host");
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    console.error("Failed to connect to MCP host:", error);
  });

export {};
