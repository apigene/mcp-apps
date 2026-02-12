# base-template-sdk

Minimal skeleton for building MCP Apps with `@modelcontextprotocol/ext-apps` in **proxy-compatible mode**.

This template is the canonical source for cloning new app templates in this repository.
It is intentionally clean:
- no `app.connect()`
- no mock host/dev preview logic
- no app-specific parsing/helpers

If you need local mock preview, use `tools/template-lab`.

## What This Template Includes

- Manual `postMessage` handling for MCP proxy notifications:
  - `ui/notifications/tool-result`
  - `ui/notifications/host-context-changed`
  - `ui/notifications/tool-cancelled`
  - `ui/resource-teardown` (with required JSON-RPC response)
- SDK utilities only:
  - `applyDocumentTheme`
  - `applyHostFonts`
  - `applyHostStyleVariables`
  - `setupSizeChangedNotifications`
- Minimal starter render (`renderData`) and shared safety helpers (`escapeHtml`, `showError`, `showEmpty`, `unwrapData`)
- Single-file output via Vite + `vite-plugin-singlefile`

## Quick Start

```bash
# 1) Copy template (exclude build artifacts)
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  base-template-sdk/ my-app-mcp/

# 2) Install deps
cd my-app-mcp
npm install

# 3) Customize
# - mcp-app.html (title)
# - src/mcp-app.ts (APP_NAME, APP_VERSION, renderData)
# - src/mcp-app.css (your styles)

# 4) Build
npm run build
```

Output: `dist/mcp-app.html`

## Scripts

```bash
npm run build    # production single-file build
npm run dev      # watch build (rebuilds dist on change)
npm run preview  # preview built dist
```

### 7. **Test with the built-in MCP server (optional)**

This template includes a minimal MCP server that supports MCP Apps so you can test your UI without building your own server:

```bash
# Build the app and start the test server (HTTP on port 3001)
npm start

# Or: build once, then run the server
npm run build
npm run server

# Development: watch app + run server (rebuilds on change)
npm run dev:full
```

- **HTTP (default):** `http://localhost:3001/mcp` — use with [basic-host](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host), Cursor, or any MCP client that supports Streamable HTTP.
- **stdio:** `npx tsx main.ts --stdio` — for Claude Desktop or stdio-based clients.

The server registers one tool, **`show_demo`**, that returns sample data to the app. Point your host at this server and call `show_demo` to see the app render. To use your own data, edit `server.ts` and change the tool handler.

### 8. **Use in your own MCP Server**

```text
base-template-sdk/
├── src/
│   ├── mcp-app.ts
│   ├── mcp-app.css
│   └── global.css
├── mcp-app.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CSP_GUIDE.md
├── COPY-TEMPLATE.md
├── AGENTS.md
└── README.md
```

## MCP Server Integration

Use `dist/mcp-app.html` as your UI resource payload:

```ts
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
├── server.ts             # Optional: test MCP server with app tool
├── main.ts               # Optional: server entry (HTTP/stdio)
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
