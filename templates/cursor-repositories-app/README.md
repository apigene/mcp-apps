# base-template-sdk

Minimal skeleton for building MCP Apps with `@modelcontextprotocol/ext-apps` in proxy-compatible mode.

This is the canonical source template for creating new app templates in this repo.
It is intentionally generic:
- no `app.connect()`
- no local mock host logic
- no embedded MCP server
- no app-specific parsing/rendering helpers beyond minimal examples

## What It Includes

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
- Starter utilities: `unwrapData`, `escapeHtml`, `showError`, `showEmpty`
- Single-file build via Vite + `vite-plugin-singlefile`

## Quick Start

```bash
# 1) Copy template (exclude build artifacts)
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  templates/base-template-sdk/ templates/my-app-mcp/

# 2) Install deps
cd templates/my-app-mcp
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

## Optional Preview Payload Contract

`response.json` is optional for runtime usage in real MCP hosts.

It is recommended for local preview workflows (Template Lab and demo servers):
- if `<template>/response.json` exists, preview tools use it
- otherwise they fall back to a default mock payload

## File Layout

```text
templates/base-template-sdk/
├── src/
│   ├── mcp-app.ts
│   ├── mcp-app.css
│   └── global.css
├── mcp-app.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── CSP_GUIDE.md
├── COPY-TEMPLATE.md
├── AGENTS.md
└── README.md
```

## Customization Boundaries

Update these when creating a new template:
- `src/mcp-app.ts`: app name/version and `renderData`
- `src/mcp-app.css`: app-specific styles
- `mcp-app.html`: title/metadata
- `package.json`: package metadata

Keep as-is unless you intentionally change architecture:
- protocol message flow in `src/mcp-app.ts`
- `src/global.css`
- `vite.config.ts`
