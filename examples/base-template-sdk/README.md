# Base Template for MCP Apps (Proxy Mode)

This template uses the official `@modelcontextprotocol/ext-apps` SDK for utilities only (theme helpers, types, auto-resize), with manual message handling for proxy compatibility.

**Key difference from `base-template`:** This template does NOT call `app.connect()` because the proxy layer handles initialization.

## When to Use

- Running behind `run-action.html` or similar proxy
- Deploying to MCP Apps Playground
- Working with APIGINE

## When NOT to Use

- Connecting directly to Claude Desktop, ChatGPT, or other MCP hosts (use `base-template` instead)
- Need full SDK capabilities (`callServerTool`, `sendMessage`, `openLink`)

## Quick Start

```bash
# 1) Copy template (exclude build artifacts)
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  examples/base-template-sdk/ examples/my-app-mcp/

# 2) Install deps
cd examples/my-app-mcp
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
npm run build    # Production single-file build
npm run dev      # Watch build (rebuilds dist on change)
npm run preview  # Preview built dist
```

## File Structure

```
base-template-sdk/
├── mcp-app.html          # Main HTML file
├── src/
│   ├── mcp-app.ts        # TypeScript logic (SDK utilities + manual handlers)
│   ├── mcp-app.css       # Template-specific styles
│   └── global.css        # Common base styles (DO NOT MODIFY)
├── package.json          # Dependencies including SDK
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite bundler config
├── CSP_GUIDE.md          # Content Security Policy guide
├── COPY-TEMPLATE.md      # Template copying instructions
├── AGENTS.md             # Agent documentation
├── SKILL.md              # Skill implementation guide
└── README.md             # This file
```

## What It Includes

### SDK Utilities (no connection)
- `applyDocumentTheme()` - Apply theme (dark/light)
- `applyHostFonts()` - Apply host fonts
- `applyHostStyleVariables()` - Apply host CSS variables
- `setupSizeChangedNotifications()` - Auto-resize notifications

### Manual Message Handling
- `ui/notifications/tool-result` - Main data arrival
- `ui/notifications/tool-input` - Tool arguments (optional)
- `ui/notifications/host-context-changed` - Theme/display changes
- `ui/notifications/tool-cancelled` - Cancellation handling
- `ui/resource-teardown` - Resource cleanup (with required response)

### Starter Utilities
- `unwrapData()` - Handle nested API response structures
- `escapeHtml()` - XSS protection
- `showError()` - Display error messages
- `showEmpty()` - Display empty state

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Host                             │
│  (Claude Desktop, ChatGPT, etc.)                        │
└─────────────────────┬───────────────────────────────────┘
                      │ postMessage (JSON-RPC 2.0)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Proxy Layer                          │
│  (run-action.html, MCP Apps Playground, APIGINE)        │
│  • Handles ui/initialize                                │
│  • Forwards notifications to MCP App                    │
└─────────────────────┬───────────────────────────────────┘
                      │ postMessage (JSON-RPC 2.0)
                      ▼
┌─────────────────────────────────────────────────────────┐
│              base-template-sdk (Proxy Mode)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  SDK App Instance (NO connect)                    │  │
│  │  • Manual message handlers                        │  │
│  │  • applyDocumentTheme() / applyHostFonts()        │  │
│  │  • setupSizeChangedNotifications()                │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  renderData() ─────► DOM                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
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
  max-width: 960px;
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

## Optional Preview Payload

`response.json` is optional for runtime usage in real MCP hosts.

It is recommended for local preview workflows (MCP Apps Playground and demo servers):
- If `<template>/response.json` exists, preview tools use it
- Otherwise they fall back to a default mock payload

## Customization Boundaries

**Update these when creating a new template:**
- `src/mcp-app.ts`: app name/version and `renderData`
- `src/mcp-app.css`: app-specific styles
- `mcp-app.html`: title/metadata
- `package.json`: package metadata

**Keep as-is unless you intentionally change architecture:**
- Protocol message flow in `src/mcp-app.ts`
- `src/global.css`
- `vite.config.ts`

## Best Practices

1. **Always validate data** before rendering
2. **Use `escapeHtml()`** for all user-generated content to prevent XSS
3. **Use `unwrapData()`** to handle nested data structures
4. **Handle errors gracefully** with try/catch blocks
5. **Support dark mode** with `body.dark` CSS selectors
6. **Make responsive** with media queries
7. **Clean up resources** in `ui/resource-teardown` handler
8. **Test with different data formats** to ensure robustness

## Troubleshooting

### Data not rendering
- Check browser console for errors
- Verify data format matches expectations
- Ensure `unwrapData()` is being used
- Check that proxy is forwarding `ui/notifications/tool-result`

### Theme not applying
- Ensure `applyDocumentTheme()` is called in host-context-changed handler
- Check that `body.dark` CSS selectors are defined
- Verify proxy is forwarding `ui/notifications/host-context-changed`

### Size not updating
- Ensure `setupSizeChangedNotifications()` is called
- Check that `cleanupResize` is not being called prematurely

## See Also

- **base-template** - For standalone apps (Claude Desktop, ChatGPT direct connection)
- **CSP_GUIDE.md** - Content Security Policy configuration
- **COPY-TEMPLATE.md** - Detailed template copying instructions
- **AGENTS.md** - Agent documentation
- **SKILL.md** - Skill implementation guide
