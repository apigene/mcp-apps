---
name: base-template-sdk-mcp-app
description: Use when building or customizing MCP App views from base-template-sdk — proxy-compatible HTML/TS/CSS templates that use @modelcontextprotocol/ext-apps for theme/fonts/styles and size notifications only. Covers view message handling, renderData(), host styling, teardown, and copy workflow. Does not cover MCP server setup or app.connect().
---

# MCP App View (base-template-sdk)

Build and customize **MCP App views** from `base-template-sdk`: single-page UIs that run inside iframes, receive tool results and host context via `postMessage`, and use the official SDK **only for utilities** (theme, fonts, style variables, auto-resize). No `app.connect()`; message handling is manual for proxy compatibility.

## View-Only Architecture

- **No MCP server in this template** — the host/proxy provides the MCP layer; this template is the **view** (HTML/TS/CSS).
- **SDK usage**: `App` (for `setupSizeChangedNotifications`), `applyDocumentTheme`, `applyHostStyleVariables`, `applyHostFonts`. Do not call `app.connect()`.
- **Protocol**: handle JSON-RPC 2.0 notifications and the teardown request manually with `window.addEventListener("message", ...)`.

```
Host/Proxy → postMessage(tool-result, host-context-changed, …) → View renders
View → postMessage(ui/resource-teardown response, size changes) → Host
```

## Messages the View Must Handle

| Method | Action |
|--------|--------|
| `ui/notifications/tool-result` | Read `params.structuredContent` or `params`, call `renderData(data)` |
| `ui/notifications/host-context-changed` | Apply theme, fonts, style variables; optional safe area and display mode |
| `ui/notifications/tool-cancelled` | Show cancellation message (e.g. `showError`) |
| `ui/resource-teardown` | Clean up (timers, listeners, etc.), then `postMessage({ jsonrpc: "2.0", id: msg.id, result: {} }, "*")` |

## Customization Points (Required)

In `src/mcp-app.ts`:

- **APP_NAME**, **APP_VERSION** — set for your app.
- **renderData(data)** — main rendering: validate data, use `unwrapData()` for nested payloads, use `escapeHtml()` for any user content, then update `#app` DOM.

In `src/mcp-app.css` and `mcp-app.html`:

- Add app-specific styles; support `body.dark` and display modes (e.g. `.fullscreen-mode`) if needed.
- Update `<title>` and optional metadata.

Optional:

- Add helpers (e.g. formatDate, normalizeData) in `src/mcp-app.ts` or `src/mcp-app-impl.ts`.
- Add `response.json` in the template root for MCP Apps Playground / preview tooling.

## SDK Utilities (What This Template Uses)

From `@modelcontextprotocol/ext-apps`:

```typescript
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

const app = new App({ name: APP_NAME, version: APP_VERSION });

// On ui/notifications/host-context-changed:
if (params.theme) applyDocumentTheme(params.theme);
if (params.styles?.css?.fonts) applyHostFonts(params.styles.css.fonts);
if (params.styles?.variables) applyHostStyleVariables(params.styles.variables);

// Once at init (no connect):
const cleanupResize = app.setupSizeChangedNotifications();
```

Do **not** register `ontoolinput` / `ontoolresult` / `onhostcontextchanged` / `onteardown` or call `app.connect()`; the template uses manual message handling.

## Host Styling Integration

After applying theme and style variables, use host CSS variables in your CSS:

```css
.container {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  border-radius: var(--border-radius-md);
}
.code {
  font-family: var(--font-mono);
  font-size: var(--font-text-sm-size);
  line-height: var(--font-text-sm-line-height);
  color: var(--color-text-secondary);
}
```

Use system fonts only; avoid external font imports. Key variable groups: `--color-background-*`, `--color-text-*`, `--color-border-*`, `--font-sans`, `--font-mono`, `--font-text-*-size`, `--font-heading-*-size`, `--border-radius-*`.

## Safe Area and Display Mode

**Safe area** — in the `host-context-changed` handler:

```typescript
if (msg.params.safeAreaInsets) {
  const { top, right, bottom, left } = msg.params.safeAreaInsets;
  document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
}
```

**Display mode** — apply a body class for fullscreen vs inline (e.g. `body.fullscreen-mode`) so layout/CSS can adapt; the host sends `displayMode` in host context.

## Data and Security

- **unwrapData(data)** — use for nested wrappers (`data.message.template_data`, `data.data.results`, `data.rows`, etc.) before rendering.
- **escapeHtml(str)** — use for any user- or API-sourced text inserted into the DOM to prevent XSS.
- Use **showError** / **showEmpty** for error and empty states.

## Build and Copy Workflow

**Copy template** (exclude build artifacts):

```bash
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  templates/base-template-sdk/ new-template-name/

cd new-template-name
npm install
npm run build
```

Output: `dist/mcp-app.html` (single-file bundle via Vite + `vite-plugin-singlefile`).

**Scripts:** `npm run build` (production), `npm run dev` (watch), `npm run preview` (preview dist).

## What Not to Change (By Default)

- Protocol message flow in `src/mcp-app.ts` (which methods trigger which logic).
- `src/global.css`.
- `vite.config.ts`.

## Quality Checklist

- Build succeeds: `npm run build`.
- No `app.connect()` or SDK connection logic.
- Tool result path drives `renderData()` and expected UI.
- `ui/resource-teardown` receives a JSON-RPC `result: {}` response.
- User/content is escaped with `escapeHtml` where needed.
- Optional: `response.json` for MCP Apps Playground preview.

## Optional: Streaming and Fullscreen

- **Streaming partial input** — this template does not implement `ui/notifications/tool-input-partial` by default. For progressive rendering, add a handler that updates a preview from partial params; switch to full render on final `tool-result`.
- **Fullscreen request** — if the host sends `availableDisplayModes` including `"fullscreen"`, you can call `app.requestDisplayMode({ mode: "fullscreen" })`; ensure CSS adapts (e.g. `.main.fullscreen { border-radius: 0; }`).

## Reference

- Template layout and copy rules: `COPY-TEMPLATE.md`, `README.md`.
- Agent rules for this template: `AGENTS.md` (if present).
- For full SDK patterns (server registration, `app.connect()`, React hooks): see `@modelcontextprotocol/ext-apps` and its examples (e.g. basic-server-vanillajs, basic-host).
