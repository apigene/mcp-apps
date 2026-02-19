# Base Template for MCP Apps

This template uses the official `@modelcontextprotocol/ext-apps` SDK with full `app.connect()` pattern for direct MCP host integration.

## When to Use

This is the **universal template** for all MCP Apps:

- Connecting directly to Claude Desktop, ChatGPT, or other MCP hosts
- Deploying to MCP Apps Playground
- Building standalone MCP Apps
- Full SDK capabilities (`callServerTool`, `sendMessage`, `openLink`)

## Quick Start

1. **Copy the template directory**
   ```bash
   cp -r base-template my-app-mcp
   ```

2. **Install dependencies**
   ```bash
   cd my-app-mcp
   npm install
   ```

3. **Configure app metadata**
   - Edit `src/mcp-app.ts` and update the constants at the top:
     ```typescript
     const APP_NAME = "My App Name";      // Your app name
     const APP_VERSION = "1.0.0";         // Your app version
     ```

4. **Update the HTML title**
   - Edit `mcp-app.html` and change the title tag

5. **Implement your rendering logic**
   - Edit `src/mcp-app.ts` and implement the `renderData()` function
   - Add template-specific utility functions as needed

6. **Add your styles**
   - Edit `src/mcp-app.css` and add your template-specific styles

7. **Build**
   ```bash
   npm run build
   ```

Output: `dist/mcp-app.html`

## File Structure

```
base-template/
├── mcp-app.html          # Main HTML file
├── src/
│   ├── mcp-app.ts        # TypeScript logic (SDK + template-specific)
│   ├── mcp-app.css       # Template-specific styles
│   └── global.css        # Common base styles (DO NOT MODIFY)
├── package.json          # Dependencies including SDK
├── vite.config.ts        # Vite bundler config
└── README.md             # This file
```

## Scripts

```bash
npm run build    # Production single-file build
npm run dev      # Watch build (rebuilds dist on change)
```

## SDK Features

This template uses the official MCP Apps SDK which provides:

### Event Handlers

Register these BEFORE calling `app.connect()`:

```typescript
// Handle tool results (main data)
app.ontoolresult = (params) => {
  const data = params.structuredContent || params.content;
  renderData(data);
};

// Handle host context changes (theme, display mode)
app.onhostcontextchanged = (ctx) => {
  handleHostContextChanged(ctx);
};

// Handle resource teardown
app.onteardown = async () => {
  // Clean up resources
  return {};
};

// Handle tool input (optional - for loading states)
app.ontoolinput = (params) => {
  console.log("Tool arguments:", params.arguments);
};

// Handle tool cancellation
app.ontoolcancelled = (params) => {
  showError(`Cancelled: ${params.reason}`);
};
```

### Utilities

```typescript
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

// Apply theme
applyDocumentTheme("dark"); // or "light"

// Apply host fonts
applyHostFonts(ctx.styles.css.fonts);

// Apply host style variables
applyHostStyleVariables(ctx.styles.variables);
```

### Connection

```typescript
const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

// Register handlers BEFORE connect
app.ontoolresult = (params) => { ... };
app.onhostcontextchanged = (ctx) => { ... };

// Connect to host (performs ui/initialize automatically)
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
```

## Customization Guide

### 1. Implement `renderData()` Function

This is the main function you need to implement:

```typescript
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);

    app.innerHTML = `
      <div class="container">
        <h1>My App</h1>
        <div class="content">
          ${/* Your HTML here */}
        </div>
      </div>
    `;
  } catch (error: any) {
    showError(`Error: ${error.message}`);
  }
}
```

### 2. Add Template-Specific Styles

Edit `src/mcp-app.css`:

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 32px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
}

body.dark .header {
  background: #1a1d24;
}
```

### 3. Add External Dependencies

For npm packages:
```typescript
import Chart from "chart.js/auto";
```

For CDN scripts (in `mcp-app.html`):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```

Then declare in TypeScript:
```typescript
declare const Chart: any;
```

## Utility Functions

- `unwrapData(data)` - Unwrap nested API response structures
- `escapeHtml(str)` - Escape HTML to prevent XSS
- `showError(message)` - Display error message
- `showEmpty(message)` - Display empty state message

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Host                             │
│  (Claude Desktop, ChatGPT, Playground, etc.)            │
└─────────────────────┬───────────────────────────────────┘
                      │ postMessage (JSON-RPC 2.0)
                      ▼
┌─────────────────────────────────────────────────────────┐
│              base-template (Standalone)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SDK App Instance                                 │  │
│  │  • app.connect() ─────── ui/initialize ──────────────│
│  │  • app.ontoolresult ←── tool results ────────────────│
│  │  • app.onhostcontextchanged ←── theme changes ───────│
│  │  • applyDocumentTheme() / applyHostFonts()        │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  renderData() ─────► DOM                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Always validate data** before rendering
2. **Use `escapeHtml()`** for all user-generated content to prevent XSS
3. **Use `unwrapData()`** to handle nested data structures
4. **Handle errors gracefully** with try/catch blocks
5. **Support dark mode** with `body.dark` CSS selectors
6. **Make responsive** with media queries
7. **Clean up resources** in `app.onteardown`
8. **Test with different data formats** to ensure robustness

## Troubleshooting

### Connection fails
- Ensure you're running in a valid MCP host environment
- Check browser console for errors
- Verify the host supports the MCP Apps protocol

### Theme not applying
- Ensure `applyDocumentTheme()` is called in `onhostcontextchanged`
- Check that `body.dark` CSS selectors are defined
- Verify host context contains theme information

### Data not rendering
- Check browser console for errors
- Verify data format matches expectations
- Use `console.log()` to inspect data structure
- Ensure `unwrapData()` is being used

## See Also

- **CSP_GUIDE.md** - Content Security Policy configuration
