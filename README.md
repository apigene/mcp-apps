# Apigene MCP Apps Templates

Open-source repository of MCP App templates and local tooling.

**Source:** [github.com/apigene/mcp-apps](https://github.com/apigene/mcp-apps)

## Repository Structure

- `templates/` — all MCP app templates
- `tools/template-lab` — local web preview tool for templates
- `tools/template-mcp-server` — local MCP server for full host integration tests

## Base Templates

- `templates/base-template` — manual protocol template
- `templates/base-template-sdk` — proxy-compatible SDK utilities template (recommended)

## Quick Start

### 1) Run Lab + MCP HTTP together

```bash
npx mcp-app-playground start
```

Starts:
- Template Lab: `http://localhost:4311`
- MCP HTTP endpoint: `http://127.0.0.1:3001/mcp`

### 2) Create a new template

```bash
cp -r templates/base-template-sdk templates/my-app
cd templates/my-app
npm install
npm run build
```

### 3) Preview in Template Lab only

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
npx mcp-app-playground build    # build all templates that have a build script
npx mcp-app-playground lab
npx mcp-app-playground mcp http
npx mcp-app-playground mcp stdio
```

From the repo root you can also run `npm run build:templates` to build all templates.

## Template Contract (Recommended)

Inside each template folder (`templates/<name>/`):

- `mcp-app.html`
- `src/mcp-app.ts`
- `src/mcp-app.css`
- `dist/mcp-app.html` (after build)
- `response.json` (recommended for local preview/testing)

## Notes

- `response.json` is optional for production runtime, but strongly recommended for local preview tools.
- `tools/template-lab` and `tools/template-mcp-server` both prefer `templates/<name>/response.json` and fall back to default mock payload when missing.
- CLI entrypoint: `mcp-app-playground` (from package `mcp-app-playground`).
