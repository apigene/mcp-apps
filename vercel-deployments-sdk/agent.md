# Agent Guide: Creating MCP Apps from base-template-sdk

**Purpose**: This guide helps AI agents understand how to create new MCP apps using the SDK utilities template (proxy-compatible approach).

## Overview

This base template uses **`@modelcontextprotocol/ext-apps` SDK for utilities only** (theme helpers, auto-resize) while handling messages manually for proxy compatibility. This is the **recommended approach** for production apps using the `run-action.html` proxy layer.

**Key Benefits:**

- ✅ **Proxy Compatible**: Works seamlessly with run-action.html proxy
- ✅ **SDK Utilities**: Theme, fonts, auto-resize from SDK (~40KB)
- ✅ **Manual Control**: Handle messages directly (~100 lines vs ~540)
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Single File Output**: Vite bundles to one HTML (~60-70KB)

**CRITICAL**: This template does NOT use `app.connect()` or SDK callbacks. It listens for messages manually to avoid conflicts with the proxy layer.

## File Structure

```
base-template-sdk/
├── src/
│   ├── mcp-app.ts          # Main logic (message handling + renderData)
│   ├── mcp-app-impl.ts     # (Optional) Data parsing/formatting
│   ├── mcp-app.css         # Template-specific styles
│   └── global.css          # Global styles (don't modify)
├── mcp-app.html            # HTML shell
├── package.json            # Dependencies
├── vite.config.ts          # Build configuration
├── README.md               # User documentation
├── agent.md                # This file (agent guide)
└── dist/
    └── mcp-app.html        # Built single-file output (~60-70KB)
```

## Architecture

```
┌──────────────┐
│     Host     │ (MCP Client)
└──────┬───────┘
       │ ui/initialize
       ▼
┌──────────────┐
│     Proxy    │ (run-action.html)
│  - Saves     │
│    context   │
│  - Loads     │
│    template  │
└──────┬───────┘
       │ postMessage
       ▼
┌──────────────┐
│   Template   │ (your app)
│  - Listens   │
│  - Renders   │
│  - Uses SDK  │
│    helpers   │
└──────────────┘
```

## Creating a New App: Step-by-Step

### 1. **Understand the Data Structure**

First, examine the API response format you'll be displaying. Example:

```json
{
  "actions_result": [
    {
      "response_content": {
        "id": 1,
        "title": "Product Name",
        "price": 109.95
      }
    }
  ]
}
```

### 2. **Plan Your Implementation**

Files to modify:

- ✅ **Always modify**: `mcp-app.ts` (renderData function)
- ✅ **Always modify**: `mcp-app.css` (styling)
- ✅ **Always update**: `package.json` (name, description)
- ✅ **Always update**: `mcp-app.html` (title)
- ⚠️ **Optional**: `mcp-app-impl.ts` (complex parsing/formatting)

Files to NEVER modify:

- ❌ `global.css` - Base styles
- ❌ `vite.config.ts` - Build config
- ❌ Message handling infrastructure in `mcp-app.ts`

### 3. **Update Package Metadata**

**File**: `package.json`

```json
{
  "name": "your-app-name-mcp",
  "version": "1.0.0",
  "description": "Your App Description - MCP App using SDK utilities"
}
```

### 4. **Update HTML Title**

**File**: `mcp-app.html`

```html
<title>Your App Title</title>
```

### 5. **Update App Configuration**

**File**: `src/mcp-app.ts` (lines ~50)

```typescript
const APP_NAME = "Your App Name";
const APP_VERSION = "1.0.0";
```

### 6. **Create Data Parsing Logic (Optional)**

**When to create `mcp-app-impl.ts`:**

- Complex data transformations needed
- Multiple formatting functions required
- Want to keep main file clean and focused

**File**: `src/mcp-app-impl.ts`

```typescript
// Define your data type
export interface Product {
  id: number;
  title: string;
  price: number;
}

// Parse the API response
export function parseProductData(data: any): Product {
  // Handle errors
  if (data.error) {
    throw new Error(`Server error: ${data.error.message}`);
  }

  // Extract data from nested structure
  if (data.actions_result?.[0]?.response_content) {
    return data.actions_result[0].response_content;
  }

  // Validate required fields
  if (!data.id || !data.title) {
    throw new Error("Missing required fields");
  }

  return data;
}

// Format data for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
```

**Import in `mcp-app.ts`:**

```typescript
import { parseProductData, formatPrice, type Product } from "./mcp-app-impl";
```

### 7. **Implement the Render Function**

**File**: `src/mcp-app.ts` (the `renderData` function)

This is the core of your app. Follow this pattern:

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    // 1. Unwrap nested data structures
    const unwrapped = unwrapData(data);

    // 2. Parse/validate the data
    const product: Product = parseProductData(unwrapped);

    // 3. Render HTML
    app.innerHTML = `
      <div class="container">
        <div class="product-card">
          <h1 class="product-title">${escapeHtml(product.title)}</h1>
          <div class="product-price">${formatPrice(product.price)}</div>
        </div>
      </div>
    `;

    // 4. Log for debugging
    console.log("Product data:", product);
  } catch (error: any) {
    console.error("Render error:", error);
    console.error("Received data:", data);

    // Show user-friendly error
    let errorMsg = error.message || "Unknown error";
    if (errorMsg.includes("403")) {
      errorMsg = "Access denied - Check API credentials";
    }
    showError(`Error: ${errorMsg}`);
  }
}
```

**Important Guidelines:**

- ✅ Always use `escapeHtml()` for user-generated content (XSS prevention)
- ✅ Always wrap in try/catch for error handling
- ✅ Always validate data before rendering
- ✅ Use semantic HTML classes for styling
- ✅ Log parsed data for debugging
- ❌ NEVER modify the message handling infrastructure below renderData

### 8. **Create Styles**

**File**: `src/mcp-app.css`

```css
/* Main container */
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

/* Product card */
.product-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 32px;
}

body.dark .product-card {
  background: #1a1d24;
  border-color: #3c4043;
}

/* Product title */
.product-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

body.dark .product-title {
  color: #e8eaed;
}

/* Product price */
.product-price {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a73e8;
}

body.dark .product-price {
  color: #8ab4f8;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .product-card {
    padding: 24px 20px;
  }

  .product-title {
    font-size: 1.5rem;
  }
}
```

**CSS Guidelines:**

- ✅ Always include dark mode styles (`body.dark`)
- ✅ Use consistent color palette (see existing templates)
- ✅ Include responsive breakpoints (768px, 480px)
- ✅ Use semantic class names
- ✅ Keep styles scoped to your component

### 9. **Update Demo Data (Optional)**

**File**: `src/mcp-app.ts` (timeout section around line 480)

Update the demo data to match your structure for testing:

```typescript
setTimeout(() => {
  const appElement = document.getElementById("app");
  if (appElement?.querySelector(".loading")) {
    console.info("⚠ No data received, showing demo data");
    renderData({
      actions_result: [
        {
          response_content: {
            id: 1,
            title: "Demo Product",
            price: 99.99,
          },
        },
      ],
    });
  }
}, 3000);
```

### 10. **Build and Test**

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

**Output**: `dist/mcp-app.html` (~60-70KB single file)

## Common Patterns

### Pattern 1: Simple Table Display

```typescript
function renderData(data: any) {
  const unwrapped = unwrapData(data);
  const rows = unwrapped.rows || [];

  app.innerHTML = `
    <div class="container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.value)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}
```

### Pattern 2: Card Grid

```typescript
function renderData(data: any) {
  const unwrapped = unwrapData(data);
  const items = unwrapped.items || [];

  app.innerHTML = `
    <div class="container">
      <div class="card-grid">
        ${items
          .map(
            (item) => `
          <div class="card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}
```

### Pattern 3: Metrics Dashboard

```typescript
function renderData(data: any) {
  const unwrapped = unwrapData(data);
  const metrics = calculateMetrics(unwrapped);

  app.innerHTML = `
    <div class="container">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total</div>
          <div class="metric-value">${formatNumber(metrics.total)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average</div>
          <div class="metric-value">${formatNumber(metrics.avg)}</div>
        </div>
      </div>
    </div>
  `;
}
```

### Pattern 4: Product/Detail View

```typescript
function renderData(data: any) {
  const unwrapped = unwrapData(data);
  const product = parseProductData(unwrapped);

  app.innerHTML = `
    <div class="container">
      <div class="product-card">
        <img src="${escapeHtml(product.image)}" class="product-image" />
        <h1>${escapeHtml(product.title)}</h1>
        <div class="price">${formatPrice(product.price)}</div>
        <p>${escapeHtml(product.description)}</p>
      </div>
    </div>
  `;
}
```

## Testing Checklist

Before finalizing your app, verify:

- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Demo data displays correctly (wait 3 seconds after loading)
- [ ] Dark mode works (check `body.dark` styles)
- [ ] Responsive on mobile (check 768px, 480px breakpoints)
- [ ] Error handling works (test with invalid data)
- [ ] Console logs help with debugging
- [ ] All user content uses `escapeHtml()`
- [ ] Package.json name/description updated
- [ ] HTML title updated
- [ ] No `app.connect()` added (would break proxy compatibility)
- [ ] Message handling infrastructure not modified

## Message Handling (DO NOT MODIFY)

The template includes message handling infrastructure that you should **NEVER modify**:

```typescript
// ❌ DO NOT MODIFY THIS SECTION
window.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;

  if (msg.jsonrpc === "2.0") {
    // Handle tool result notifications
    if (msg.method === "ui/notifications/tool-result") {
      const data = msg.params.structuredContent || msg.params;
      renderData(data); // ✅ Only modify renderData()
    }

    // Handle theme changes
    if (msg.method === "ui/notifications/host-context-changed") {
      if (msg.params.theme) {
        applyDocumentTheme(msg.params.theme); // SDK helper
      }
      // ... more theme handling
    }

    // Handle teardown
    if (msg.method === "ui/resource-teardown") {
      // Clean up resources
      window.parent.postMessage(
        {
          jsonrpc: "2.0",
          id: msg.id,
          result: {},
        },
        "*",
      );
    }
  }
});

// ❌ DO NOT ADD app.connect() - causes proxy conflicts!
```

## SDK Utilities Reference

The template uses SDK utilities (without connection):

### 1. **Theme Support**

```typescript
// In message handler (already configured)
if (msg.params.theme) {
  applyDocumentTheme(msg.params.theme); // SDK helper - sets body.dark
}
```

### 2. **Font Support**

```typescript
// In message handler (already configured)
if (msg.params.styles?.css?.fonts) {
  applyHostFonts(msg.params.styles.css.fonts); // SDK helper
}
```

### 3. **Auto Resize**

```typescript
// Already configured (DO NOT MODIFY)
const cleanupResize = app.setupSizeChangedNotifications();
```

## Common Data Structures

### Format 1: Simple Object/Array

```json
{
  "id": 1,
  "title": "Item",
  "value": 123
}
```

**Parsing**: Direct access

```typescript
const item = unwrapData(data);
```

### Format 2: Wrapped in actions_result

```json
{
  "actions_result": [
    {
      "response_content": {
        "id": 1,
        "title": "Item"
      }
    }
  ]
}
```

**Parsing**: Extract from array

```typescript
if (data.actions_result?.[0]?.response_content) {
  return data.actions_result[0].response_content;
}
```

### Format 3: Table Format

```json
{
  "rows": {
    "columns": ["id", "name", "value"],
    "rows": [
      [1, "Item 1", 100],
      [2, "Item 2", 200]
    ]
  }
}
```

**Parsing**: Map columns to objects

```typescript
const { columns, rows } = data.rows;
const items = rows.map((row) => ({
  id: row[0],
  name: row[1],
  value: row[2],
}));
```

## Debugging Tips

1. **Check Console Logs**: Look for `"Received tool result from proxy"` message
2. **Use Demo Data**: Wait 3 seconds to see demo data if no real data arrives
3. **Validate Data Structure**: Add `console.log("Unwrapped:", unwrapped);` in renderData
4. **Test Error Handling**: Modify demo data to trigger errors
5. **Check Message Flow**: Ensure proxy is forwarding messages to template

## Example: Real-World Implementation

See `base-template-sdk-example/` for a complete FakeStore API product display:

- **mcp-app-impl.ts**: Product parsing, price/rating formatting
- **mcp-app.ts**: Product card rendering with image, rating, price
- **mcp-app.css**: Product styles with full dark mode support
- **Result**: Clean product display at ~60KB total

## Quick Reference

**Always modify:**

1. `package.json` - name, description
2. `mcp-app.html` - title
3. `src/mcp-app.ts` - APP_NAME, APP_VERSION, renderData()
4. `src/mcp-app.css` - your styles

**Optional:**

- `src/mcp-app-impl.ts` - complex parsing/formatting

**Never modify:**

- `src/global.css` - base styles
- `vite.config.ts` - build config
- Message handling infrastructure in mcp-app.ts
- Add `app.connect()` (breaks proxy compatibility!)

**Build output:**

- `dist/mcp-app.html` - Single file (~60-70KB)
- Ready to use via run-action.html proxy

## FAQ

**Q: Why no app.connect()?**
A: The proxy layer calls `ui/initialize`. If the template also calls it, there's a conflict. We use manual message handling instead.

**Q: Can I use SDK utilities?**
A: Yes! The SDK is available for utilities: `applyDocumentTheme()`, `applyHostFonts()`, `setupSizeChangedNotifications()`.

**Q: When should I create mcp-app-impl.ts?**
A: When you have complex parsing logic or multiple formatting functions. Keeps code organized.

**Q: How do I test without an MCP server?**
A: The template shows demo data after 3 seconds. Update the demo data in the setTimeout block.

**Q: Do I need to handle dark mode?**
A: The SDK handles theme application via `applyDocumentTheme()`. Just add `body.dark` selectors in your CSS.

**Q: Can I use external libraries like Chart.js?**
A: Yes! Install via npm (`npm install chart.js`) and import. Avoid CDN scripts (CSP issues).

**Q: How big should the bundle be?**
A: Target 60-100KB total. Your code (~10-20KB) + SDK utilities (~40KB) + dependencies.

---

**Ready to create your app?** Follow the 10 steps above and reference the patterns/examples as needed!
