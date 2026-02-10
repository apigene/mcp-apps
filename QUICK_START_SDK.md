# Quick Start: Building Your First MCP App with SDK

This guide will walk you through creating your first MCP App using the SDK-based template.

## Prerequisites

- Node.js 18+ installed
- Basic TypeScript/JavaScript knowledge
- An MCP server project (or create one following [MCP docs](https://modelcontextprotocol.io))

## Step 1: Copy the Template

```bash
cd /path/to/apigene-mcp-apps-templates
cp -r base-template-sdk my-first-app
cd my-first-app
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs:

- `@modelcontextprotocol/ext-apps` - Official MCP SDK
- `vite` - Build tool
- `vite-plugin-singlefile` - Bundles to single HTML
- `typescript` - TypeScript compiler

## Step 3: Configure Your App

### Update HTML Title

Edit `mcp-app.html`:

```html
<title>MCP App: My First App</title>
```

### Update App Metadata

Edit `src/mcp-app.ts`:

```typescript
const APP_NAME = "My First App";
const APP_VERSION = "1.0.0";
```

## Step 4: Implement Your Render Logic

Edit `src/mcp-app.ts` - find the `renderData()` function:

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  if (!data) {
    showEmpty("No data received");
    return;
  }

  try {
    // Your rendering logic here!
    const items = Array.isArray(data) ? data : data.items || [];

    app.innerHTML = `
      <div class="container">
        <h1>My First App</h1>
        <p>Found ${items.length} items</p>
        <div class="items">
          ${items
            .map(
              (item, index) => `
            <div class="item">
              <h3>Item ${index + 1}</h3>
              <pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>
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

## Step 5: Add Custom Styles

Edit `src/mcp-app.css`:

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.item {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

body.dark .item {
  background: #1a1d24;
  border-color: #3c4043;
}

.item h3 {
  margin-bottom: 12px;
  color: #1a73e8;
}

body.dark .item h3 {
  color: #8ab4f8;
}

.item pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
}

body.dark .item pre {
  background: #0d1117;
}
```

## Step 6: Build Your App

```bash
# One-time build
npm run build

# Or watch mode (rebuilds on changes)
npm run dev
```

This creates `dist/mcp-app.html` - a single file with everything bundled!

## Step 7: Integrate with Your MCP Server

### Install Server SDK

In your MCP server project:

```bash
npm install @modelcontextprotocol/ext-apps
```

### Register the Tool and Resource

Create or edit your `server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "My MCP Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://my-first-app/mcp-app.html";

  // Register the tool that triggers your UI
  registerAppTool(
    server,
    "show-data",
    {
      title: "Show Data",
      description: "Display data in my first app",
      inputSchema: {
        type: "object",
        properties: {
          // Your tool input schema
        },
      },
      _meta: {
        ui: { resourceUri }, // Link to your UI
      },
    },
    async (args): Promise<CallToolResult> => {
      // Your tool logic here
      const data = { items: [{ name: "Item 1" }, { name: "Item 2" }] };

      return {
        content: [{ type: "text", text: "Data displayed" }],
        structuredContent: data, // This goes to your UI!
      };
    },
  );

  // Register the UI resource
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      // Read your bundled HTML
      const html = await fs.readFile(
        path.join(__dirname, "../my-first-app/dist/mcp-app.html"),
        "utf-8",
      );

      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );

  return server;
}
```

## Step 8: Test Your App

1. Start your MCP server
2. Connect from an MCP client (Claude Desktop, etc.)
3. Call your `show-data` tool
4. See your app render the data!

## Common Patterns

### Loading Dynamic Data

```typescript
function renderData(data: any) {
  const app = document.getElementById("app");
  if (!app) return;

  // Show loading initially
  app.innerHTML = `<div class="loading">Loading...</div>`;

  // Then render data
  setTimeout(() => {
    app.innerHTML = `<div class="container">...</div>`;
  }, 100);
}
```

### Calling Server Tools from UI

```typescript
// Add a button to refresh data
app.innerHTML = `
  <div class="container">
    <button id="refresh-btn">Refresh</button>
    <div id="content"></div>
  </div>
`;

document.getElementById("refresh-btn")?.addEventListener("click", async () => {
  try {
    const result = await app.callServerTool({
      name: "get-fresh-data",
      arguments: {},
    });

    renderData(result.structuredContent);
  } catch (error) {
    console.error("Failed to refresh:", error);
  }
});
```

### Handling Different Data Formats

```typescript
function renderData(data: any) {
  // Unwrap nested data
  const unwrapped = unwrapData(data);

  // Handle different formats
  if (Array.isArray(unwrapped)) {
    renderList(unwrapped);
  } else if (unwrapped.rows && unwrapped.columns) {
    renderTable(unwrapped);
  } else {
    renderObject(unwrapped);
  }
}
```

## Next Steps

### Add Interactivity

- Add filters/search
- Add sorting
- Add pagination
- Add expandable sections

### Add Visualizations

```bash
npm install chart.js
```

```typescript
import Chart from "chart.js/auto";

function renderChart(data: any) {
  const canvas = document.getElementById("chart") as HTMLCanvasElement;
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "My Data",
          data: data.values,
        },
      ],
    },
  });
}
```

### Add More Tooling

- ESLint for code quality
- Prettier for formatting
- Jest for testing

## Troubleshooting

### "Cannot find module '@modelcontextprotocol/ext-apps'"

```bash
npm install @modelcontextprotocol/ext-apps
```

### Build fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### App not rendering

- Check browser console for errors
- Verify data format matches expectations
- Check that server is sending `structuredContent`

### Dark mode not working

- Ensure `applyDocumentTheme(ctx)` is called in `onhostcontextchanged`
- Check CSS has `body.dark` selectors
- Test with `document.body.classList.add('dark')`

## Resources

- [MCP Apps Documentation](https://modelcontextprotocol.github.io/ext-apps/)
- [Official Examples](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Base Template SDK README](./base-template-sdk/README.md)
- [Template Comparison](./TEMPLATE_COMPARISON.md)

## Need Help?

- Check the [base-template-sdk/README.md](./base-template-sdk/README.md) for detailed documentation
- Review existing templates in this repository for examples
- See [TEMPLATE_COMPARISON.md](./TEMPLATE_COMPARISON.md) if you're unsure about SDK vs manual

Happy building! 🚀
