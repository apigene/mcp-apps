# MCP Apps Playground

Small root-level dev app for previewing MCP templates in this repository.

## What it does

- Scans `templates/` for template folders containing `mcp-app.html`
- Shows templates in a dropdown
- Loads selected built template from `templates/<template>/dist/mcp-app.html`
- Automatically sends mock MCP proxy events after iframe load:
  - `ui/notifications/host-context-changed`
  - `ui/notifications/tool-result`
- Mock payload source resolution:
  - `templates/<template>/response.json` (if present)
  - fallback: `tools/template-lab/mock-data/default.json`

## Run

```bash
cd tools/template-lab
npm run dev
```

Open: `http://localhost:4311`

## Important

- On template selection, the playground auto-builds when `dist/mcp-app.html` is missing.
- If build fails, the playground will try `npm install` once and then rebuild.
- Put a `response.json` in `templates/<template>/` to control preview payload.
- Optional: add `template-metadata.json` with `uiElements` and `mcpFeatures` arrays so users can filter templates in the lab. See [TEMPLATE_METADATA.md](./TEMPLATE_METADATA.md).
