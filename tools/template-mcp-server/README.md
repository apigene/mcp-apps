# Template MCP Server

Root-level MCP dev server for full UI integration testing in MCP hosts (Claude, MCPJam, etc.).

## Behavior

Tool: `show_demo_for`

- Accepts either:
  - `template`: folder name (recommended)
  - `request`: natural phrase, e.g. `show demo for xyz-users`
- If template exists and is built, opens its `dist/mcp-app.html` and sends mock payload.
- If template does not exist, returns `Template not found: <name>`.
- If template exists, returns the concrete UI tool name to call:
  - `show_demo_<template>`

Per-template UI tools:
- One tool is registered for each template folder:
  - `show_demo_xyz-users`
  - `show_demo_vercel-deployments-sdk`
  - etc.
- These tools open template-specific resource URIs, so UI does not get stuck on the previous template.
- Payload source:
  1. `<template>/response.json`
  2. fallback: `tools/template-lab/mock-data/default.json`

Example tool calls:

```json
{ "template": "xyz-users" }
```

```json
{ "request": "show demo for xyz-users" }
```

## Run

```bash
cd tools/template-mcp-server
npm install
npm run server:http    # http://127.0.0.1:3001/mcp
```

For stdio clients:

```bash
npm run server:stdio
```
