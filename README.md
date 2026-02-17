# Apigene MCP Apps Examples

Open-source repository of MCP App templates and local tooling.

**Source:** [github.com/apigene/mcp-apps](https://github.com/apigene/mcp-apps)

## Repository Structure

- `examples/` — all MCP app examples
- `playground/playground-app` — local web preview for examples
- `playground/playground-mcp-server` — local MCP server for full host integration tests

## Base Templates

- `examples/base-template` — manual protocol template
- `examples/base-template-sdk` — proxy-compatible SDK utilities template (recommended)

## Quick Start

### 1) Run MCP App Playground + MCP Server (default)

```bash
npx mcp-app-playground
```

With no arguments, starts the MCP Apps Playground and MCP server and opens the playground in your browser. You can also run:

```bash
npx mcp-app-playground start
```

Both start:
- **MCP Apps Playground:** `http://localhost:4311` — preview any template with mock tool results; includes docs on connecting to MCP and customizing mock data
- **MCP HTTP endpoint:** `http://127.0.0.1:3001/mcp`

### 2) Create a new template

```bash
cp -r examples/base-template-sdk examples/my-app
cd examples/my-app
npm install
npm run build
```

### 3) Preview in MCP Apps Playground only

```bash
npx mcp-app-playground lab
```

Open: `http://localhost:4311`

### 4) Run MCP demo server only

```bash
npx mcp-app-playground mcp http
```

Endpoint: `http://127.0.0.1:3001/mcp`

For stdio hosts:

```bash
npx mcp-app-playground mcp stdio
```

## CLI Commands

```bash
npx mcp-app-playground start
npx mcp-app-playground list
npx mcp-app-playground build    # build all examples that have a build script
npx mcp-app-playground lab
npx mcp-app-playground mcp http
npx mcp-app-playground mcp stdio
```

From the repo root you can also run `npm run build:examples` to build all examples.

## Template Contract (Recommended)

Inside each example folder (`examples/<name>/`):

- `mcp-app.html`
- `src/mcp-app.ts`
- `src/mcp-app.css`
- `dist/mcp-app.html` (after build)
- `response.json` (recommended for local preview/testing)
- `template-metadata.json` (optional; for Template Lab filtering by UI elements and MCP features — see `playground/playground-app/TEMPLATE_METADATA.md`)

## Notes

- `response.json` is optional for production runtime, but strongly recommended for local preview tools.
- `playground/playground-app` and `playground/playground-mcp-server` both prefer `examples/<name>/response.json` and fall back to default mock payload when missing.
- CLI entrypoint: `mcp-app-playground` (from package `mcp-app-playground`).
