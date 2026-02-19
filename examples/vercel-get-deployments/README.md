# Vercel Get Deployments MCP App

This app displays Vercel deployment information in a clean interface.

## Template

This app is built from `base-template` using the `@modelcontextprotocol/ext-apps` SDK with `app.connect()` for direct MCP host integration.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build
```

Output: `dist/mcp-app.html`

## Scripts

```bash
npm run build    # Production single-file build
npm run dev      # Watch build (rebuilds dist on change)
```

## Creating a New App

To create a new MCP app based on this structure:

```bash
cp -r examples/base-template my-new-app
cd my-new-app
npm install
```

Then customize:
- `src/mcp-app.ts` - Update APP_NAME, APP_VERSION, and `renderData()`
- `src/mcp-app.css` - Your styles
- `mcp-app.html` - Title/metadata

See `examples/base-template/README.md` for full documentation.
