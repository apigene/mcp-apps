# Template Lab

Small root-level dev app for previewing MCP templates in this repository.

## What it does

- Scans repo root for template folders containing `mcp-app.html`
- Shows templates in a dropdown
- Loads selected built template from `dist/mcp-app.html`
- Automatically sends mock MCP proxy events after iframe load:
  - `ui/notifications/host-context-changed`
  - `ui/notifications/tool-result`
- Mock payload source resolution:
  - `<template>/response.json` (if present)
  - fallback: `tools/template-lab/mock-data/default.json`

## Run

```bash
cd tools/template-lab
npm run dev
```

Open: `http://localhost:4311`

## Important

- Lab previews only built templates (`dist/mcp-app.html`).
- Put a `response.json` in a template folder to control preview payload for that template.
- If `dist/mcp-app.html` is missing, build template first:

```bash
cd <template-folder>
npm run build
```
