# Template MCP Server

Root-level MCP dev server for full UI integration testing in MCP hosts (Claude, MCPJam, etc.).

## Behavior

**Tools:** `list_demo_apps`, `show_demo_app`, and one per-template tool per app (e.g. `show_demo_xyz-users`).

### `list_demo_apps`
- No arguments. Returns all MCP app templates available to demo.
- Structured content: `{ ok, count, apps: [ { name, tool } ] }`.
- Use this to discover which apps you can open before calling `show_demo_app` or a specific tool.

### `show_demo_app`
- Accepts either:
  - `template`: folder name (e.g. `xyz-users`)
  - `request`: natural phrase, e.g. `show demo app xyz-users`
- If template exists and is built, opens `templates/<template>/dist/mcp-app.html` (or source) and sends mock payload.
- If template exists but is not built, server auto-runs build before opening.
- If template does not exist, returns `Template not found: <name>` and lists available templates.
- If template exists, returns the concrete UI tool name to call (e.g. `show_demo_xyz-users`).

### Per-template UI tools
- One tool is registered for each template folder in `templates/`:
  - `show_demo_xyz-users`
  - `show_demo_vercel-deployments-sdk`
  - etc.
- These tools open template-specific resource URIs, so UI does not get stuck on the previous template.
- Missing `dist/mcp-app.html` is auto-generated on first call (`npm run build`, fallback `npm install` + build).
- Payload source:
  1. `templates/<template>/response.json`
  2. fallback: `tools/template-lab/mock-data/default.json`

Example tool calls:

```json
{ "name": "list_demo_apps" }
```

```json
{ "name": "show_demo_app", "arguments": { "template": "xyz-users" } }
```

```json
{ "name": "show_demo_app", "arguments": { "request": "show demo app xyz-users" } }
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
