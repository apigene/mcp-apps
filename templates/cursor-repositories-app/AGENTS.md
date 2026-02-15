# AGENTS.md: base-template-sdk

Purpose: guide coding agents when cloning and customizing `base-template-sdk`.

## Template Role

`base-template-sdk` is the **clean source template** for new MCP app templates.
Do not add playground/mock-host logic here.

For local preview tooling and mock event simulation, use `tools/template-lab`.

## Architecture Contract

This template is proxy-compatible by design:
- manual message handling via `window.addEventListener("message", ...)`
- no `app.connect()`
- SDK is used only for utilities (theme/fonts/style variables/auto-resize)

Handled JSON-RPC messages:
- `ui/notifications/tool-result`
- `ui/notifications/host-context-changed`
- `ui/notifications/tool-cancelled`
- `ui/resource-teardown` (must respond with `{ jsonrpc: "2.0", id, result: {} }`)

## What Agents Should Modify

Required updates for a new template:
- `src/mcp-app.ts`
  - set `APP_NAME`, `APP_VERSION`
  - implement `renderData(data)`
  - optionally add app-specific parsing/formatting helpers
- `src/mcp-app.css`
  - replace minimal styles with app-specific styles
- `mcp-app.html`
  - update `<title>` and optional metadata
- `package.json`
  - update `name`, `description`, and version if needed

Optional:
- add `src/mcp-app-impl.ts` for complex parsing/formatting
- add `response.json` in the template root for Template Lab preview payload

## What Agents Should Not Modify (by default)

- protocol message-handling flow in `src/mcp-app.ts`
- `src/global.css`
- `vite.config.ts`

## Copy Rules

When cloning this template, exclude:
- `node_modules/`
- `dist/`
- `.DS_Store`

Then run:
```bash
npm install
npm run build
```

## Quality Checklist

Before finishing:
- build succeeds (`npm run build`)
- no `app.connect()` introduced
- tool result path renders expected UI
- teardown response for `ui/resource-teardown` still present
- user content is escaped (`escapeHtml`) where needed
- template has `response.json` (recommended for Template Lab; not required for runtime)
