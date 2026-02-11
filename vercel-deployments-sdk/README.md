# Base Template (SDK Version) for MCP Apps

This is a base template for creating MCP (Model Context Protocol) apps using the **official `@modelcontextprotocol/ext-apps` SDK**. It includes all common infrastructure needed for MCP apps, with Vite bundling to create a single-file HTML output.

## Quick Start

### 1. **Copy and Setup**

```bash
# Copy the template directory
cp -r base-template-sdk my-app-mcp
cd my-app-mcp

# Install dependencies
npm install
```

### 2. **Configure App Metadata**

Edit `src/mcp-app.ts` and update:

```typescript
const APP_NAME = "My App Name"; // Your app name
const APP_VERSION = "1.0.0"; // Your app version
```

### 3. **Update HTML Title**

Edit `mcp-app.html`:

```html
<title>MCP App: My App Name</title>
```

### 4. **Implement Rendering Logic**

Edit `src/mcp-app.ts` and implement the `renderData()` function:

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  // Your rendering logic here
  app.innerHTML = `<div class="container">...</div>`;
}
```

### 5. **Add Custom Styles**

Edit `src/mcp-app.css` and add your template-specific styles.

### 6. **Build**

```bash
# One-time build
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

### 7. **Use in MCP Server**

The bundled file is at `dist/mcp-app.html`. Use it in your MCP server:

```typescript
import fs from "node:fs/promises";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

registerAppResource(
  server,
  "ui://my-app/mcp-app.html",
  "ui://my-app/mcp-app.html",
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile("path/to/dist/mcp-app.html", "utf-8");
    return {
      contents: [
        {
          uri: "ui://my-app/mcp-app.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
        },
      ],
    };
  },
);
```

## File Structure

```
base-template-sdk/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite bundling configuration
├── mcp-app.html          # Main HTML file (source)
├── src/
│   ├── mcp-app.ts        # TypeScript logic (SDK-based)
│   ├── mcp-app.css       # Template-specific styles
│   └── global.css        # Common base styles
├── dist/
│   └── mcp-app.html      # Bundled output (single file)
└── README.md             # This file
```

## What's Included

### Common Features (Handled by SDK)

✅ **MCP Protocol Communication**

- JSON-RPC 2.0 automatic handling
- Request/response tracking
- Connection lifecycle management

✅ **Callback System**

- `ontoolresult` - Receive tool data
- `ontoolinput` - Receive tool input (optional)
- `onhostcontextchanged` - Theme/display mode changes
- `ontoolcancelled` - Handle cancellations
- `onteardown` - Cleanup resources
- `onerror` - Error handling

✅ **Built-in Utilities**

- `applyDocumentTheme()` - Apply host theme
- `applyHostFonts()` - Apply host fonts
- `applyHostStyleVariables()` - Apply host CSS vars
- `setupSizeChangedNotifications()` - Auto-resize

✅ **Host Communication**

- `callServerTool()` - Call server tools
- `sendMessage()` - Send messages to host
- `sendLog()` - Send logs to host
- `openLink()` - Open links in host

✅ **Type Safety**

- Full TypeScript definitions
- Strongly typed callbacks
- Intellisense support

## Customization Guide

### 1. Implement `renderData()` Function

This is the main function you need to implement.

**Location:** `src/mcp-app.ts`

**Example:**

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    const unwrapped = unwrapData(data);

    app.innerHTML = `
      <div class="container">
        <h1>My Data</h1>
        <div class="content">
          ${unwrapped.items
            .map(
              (item) => `
            <div class="item">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  } catch (error: any) {
    console.error("Render error:", error);
    showError(`Error rendering data: ${error.message}`);
  }
}
```

### 2. Add Template-Specific Styles

**Location:** `src/mcp-app.css`

**Example:**

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.item {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

body.dark .item {
  background: #1a1d24;
}
```

### 3. Add Utility Functions

**Location:** `src/mcp-app.ts` - "TEMPLATE-SPECIFIC FUNCTIONS" section

**Example:**

```typescript
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function normalizeData(data: any): any {
  // Transform data to expected format
  return data;
}
```

### 4. Handle External Libraries

#### Via NPM (Recommended):

```bash
npm install chart.js
```

```typescript
import Chart from "chart.js/auto";

// Use Chart in renderData()
```

#### Via CDN (Requires CSP):

```html
<!-- In mcp-app.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```

```typescript
// In src/mcp-app.ts
declare const Chart: any;
```

**Note:** CDN approach requires CSP configuration in your MCP server!

## SDK Callback Examples

### Receive Tool Result

```typescript
app.ontoolresult = (result: CallToolResult) => {
  const data = result.structuredContent || result;
  renderData(data);
};
```

### Handle Theme Changes

```typescript
app.onhostcontextchanged = (ctx: McpUiHostContext) => {
  applyDocumentTheme(ctx);
  applyHostFonts(ctx);

  // Re-render if needed (e.g., charts with theme colors)
  if (currentData) {
    renderData(currentData);
  }
};
```

### Clean Up Resources

```typescript
app.onteardown = async () => {
  // Clean up timers
  if (myTimer) clearInterval(myTimer);

  // Destroy chart instances
  if (myChart) myChart.destroy();

  return {};
};
```

## Build Configuration

### Vite Configuration (`vite.config.ts`)

The template uses `vite-plugin-singlefile` to bundle everything into one HTML file:

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: "mcp-app.html",
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
```

### Build Scripts

```bash
# Production build (minified)
npm run build

# Development build (watch mode)
npm run dev
```

## Best Practices

1. **Always use `escapeHtml()`** for user-generated content to prevent XSS
2. **Use `unwrapData()`** to handle nested data structures
3. **Handle errors gracefully** with try/catch blocks
4. **Support dark mode** with `body.dark` CSS selectors
5. **Use TypeScript types** for better type safety
6. **Clean up resources** in `onteardown` callback
7. **Test with different data formats** to ensure robustness
8. **Prefer NPM packages** over CDN for dependencies (less CSP hassle)
9. **Use semantic HTML** and accessible markup
10. **Keep bundle size reasonable** (<100KB total)

## Examples

### Example 1: Simple List Display

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  const items = unwrapData(data);

  app.innerHTML = `
    <div class="container">
      <h1>Items (${items.length})</h1>
      <ul class="item-list">
        ${items
          .map(
            (item) => `
          <li class="item">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </li>
        `,
          )
          .join("")}
      </ul>
    </div>
  `;
}
```

### Example 2: Interactive Elements

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="container">
      <button id="refresh-btn">Refresh Data</button>
      <div id="content"></div>
    </div>
  `;

  // Add event listeners
  document
    .getElementById("refresh-btn")
    ?.addEventListener("click", async () => {
      try {
        const result = await app.callServerTool({
          name: "get-data",
          arguments: {},
        });
        renderData(result.structuredContent);
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    });
}
```

### Example 3: Chart.js Integration

```typescript
import Chart from "chart.js/auto";

let chartInstance: Chart | null = null;

function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  // Destroy previous chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  app.innerHTML = `
    <div class="container">
      <h1>Chart</h1>
      <canvas id="chart"></canvas>
    </div>
  `;

  const canvas = document.getElementById("chart") as HTMLCanvasElement;
  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Data",
          data: data.values,
          borderColor: "#1a73e8",
        },
      ],
    },
  });
}
```

## Troubleshooting

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `npm run build`
- Verify import paths are correct

### Bundle Size Too Large

- Use production build: `npm run build`
- Check for large dependencies
- Consider code splitting (advanced)

### CSP Issues

- If using CDN scripts, configure CSP in your MCP server
- Prefer NPM packages over CDN
- See CSP_GUIDE.md for details

### Theme Not Working

- Ensure `applyDocumentTheme()` is called in `onhostcontextchanged`
- Check CSS uses `body.dark` selectors
- Test with both light and dark modes

## Comparison with Manual Template

| Feature           | base-template (Manual) | base-template-sdk (SDK) |
| ----------------- | ---------------------- | ----------------------- |
| Protocol handling | Manual (~540 lines)    | SDK (~20 lines)         |
| Type safety       | Limited (`any` types)  | Full TypeScript types   |
| Maintenance       | You maintain protocol  | SDK team maintains      |
| Bundle size       | ~20KB                  | ~60-70KB                |
| Future updates    | Manual changes needed  | Update SDK version      |
| Learning curve    | Understand protocol    | Learn SDK API           |
| Best for          | Learning internals     | Production apps         |

## Support

For questions or issues:

- Official MCP Examples: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples
- SDK Documentation: https://modelcontextprotocol.github.io/ext-apps/
- MCP Specification: https://spec.modelcontextprotocol.io/

## License

This template is provided as-is for creating MCP applications.
