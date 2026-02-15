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

## File Layout

```text
templates/base-template-sdk/
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

## Customization Boundaries

Update only these for a new template:
- `src/mcp-app.ts`: `APP_NAME`, `APP_VERSION`, `renderData`, optional app-specific helpers
- `src/mcp-app.css`: app-specific styles
- `mcp-app.html`: title/metadata
- `package.json`: name/description/version

Keep as-is unless you know why:
- Protocol message handling in `src/mcp-app.ts`
- `src/global.css`
- `vite.config.ts`

## Notes

- This base template intentionally has no fallback demo timeout.
- `response.json` is optional for MCP runtime, but recommended for local preview in MCP Apps Playground.
- MCP Apps Playground mock payload resolution:
  - `<template>/response.json` if present
  - fallback to `tools/template-lab/mock-data/default.json`
