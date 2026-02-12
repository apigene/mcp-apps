# Apigene MCP Apps Templates

A collection of reusable templates for building MCP (Model Context Protocol) apps. These templates provide a foundation for creating interactive UI components that integrate with MCP servers.

## Overview

This repository contains multiple template implementations for different use cases, all built on top of the base template. Each template demonstrates how to render specific types of data and interactions.

## Templates

### Base Templates

We provide **two base templates** with different approaches:

#### 1. base-template (Manual Protocol)

Manual MCP protocol implementation - perfect for learning internals and maximum control.

- ✅ No dependencies (self-contained)
- ✅ Smaller bundle (~20KB)
- ✅ Full protocol control
- ⚠️ More code to maintain (~540 lines)
- See [base-template/README.md](./base-template/README.md)

#### 2. base-template-sdk (Official SDK)

Uses official `@modelcontextprotocol/ext-apps` SDK - recommended for production.

- ✅ Less boilerplate (~50 lines)
- ✅ Full TypeScript types
- ✅ Auto-updates with SDK
- ✅ Built-in utilities
- ⚠️ Larger bundle (~60-70KB)
- See [base-template-sdk/README.md](./base-template-sdk/README.md)

**Not sure which to use?** See [TEMPLATE_COMPARISON.md](./TEMPLATE_COMPARISON.md) for detailed comparison.

**Recommendation:** Use **base-template-sdk** for new projects unless bundle size is critical.

### Available Application Templates

- **apollo-companies** - Template for displaying Apollo company data
- **apollo-people** - Template for displaying Apollo people/contact data
- **ashby-candidates** - Template for displaying Ashby candidate information
- **datadog-listlogs** - Template for displaying Datadog log entries
- **firecrawl-scrape** - Template for displaying scraped web content
- **google-search-console** - Template for Google Search Console analytics
- **rebrickable** - Template for displaying LEGO set information with 3D visualization
- **tavily** - Template for displaying Tavily search results

## Quick Start

### Template Lab (Root Preview App)

Use the root-level preview tool to inspect built templates in one place:

```bash
cd tools/template-lab
npm run dev
```

Then open `http://localhost:4311`.

### Template MCP Server (Root Integration Server)

Run a local MCP server for full host integration testing (Claude/MCPJam):

```bash
cd tools/template-mcp-server
npm install
npm run server:http
```

Endpoint: `http://127.0.0.1:3001/mcp`

### Using base-template-sdk (Recommended)

```bash
# 1. Copy template
cp -r base-template-sdk my-app-mcp
cd my-app-mcp

# 2. Install dependencies
npm install

# 3. Customize (edit src/mcp-app.ts and mcp-app.html)

# 4. Build
npm run build

# 5. Use dist/mcp-app.html in your MCP server
```

### Using base-template (Manual)

```bash
# 1. Copy template
cp -r base-template my-app-mcp

# 2. Customize (edit src/mcp-app.ts and mcp-app.html)

# 3. Use mcp-app.html directly in your MCP server (or add your own build step)
```

**New to MCP Apps?** Start with `base-template-sdk` for the best experience!

## Structure

### base-template-sdk (with build)

```
template-name/
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Build configuration
├── tsconfig.json         # TypeScript config
├── mcp-app.html          # Source HTML
├── src/
│   ├── mcp-app.ts        # TypeScript logic (uses SDK)
│   ├── mcp-app.css       # Template-specific styles
│   └── global.css        # Common base styles
├── dist/
│   └── mcp-app.html      # Bundled output (single file)
└── README.md             # Documentation
```

### **MCP Protocol Handling** (JSON-RPC 2.0)

- ✅ **Dark Mode Support** (automatic theme switching)
- ✅ **Display Modes** (inline/fullscreen)
- ✅ **Size Notifications** (automatic iframe sizing)
- ✅ **Error Handling** (graceful error states)
- ✅ **Data Utilities** (unwrapping, escaping, etc.)
- ✅ **CSP Support** (Content Security Policy configuration)
- ✅ **Type Safety** (TypeScript definitions - SDK templates only)
- ✅ **Professional Styling** (loading states, animations, responsive) # TypeScript logic (manual protocol)
  │ ├── mcp-app.css # Template-specific styles
  │ └── global.css # Common base styles
  └── README.md # Documentation

```

## Features

All templates include:

- ✅ MCP Protocol Handling (JSON-RPC 2.0)
- ✅ Dark Mode Support
- ✅ Display Modes (inline/fullscreen)
- ✅ Size Notifications
- ✅ Error Handling
- ✅ Data Utilities

## Development
#### Using SDK Template (Recommended)

1. Copy `base-template-sdk` to a new directory
2. Run `npm install`
3. Update `mcp-app.html` title and metadata
4. Implement `renderData()` function in `src/mcp-app.ts`
5. Add template-specific styles in `src/mcp-app.css`
6. Build with `npm run build`
7. Test with sample data

#### Using Manual Template


### Creating a New Template

1. Copy `base-template` to a new directory
2. Update `mcp-app.html` title and metadata
3. Implement `renderData()` function in `src/mcp-app.ts`
4. Add template-specific styles in `src/mcp-app.css`
5. Test with sample data

### Best Practices

- Always use `escapeHtml()` for user-generated content
- Use `unwrapData()` to handle nested data structures
- Call `notifySizeChanged()` after rendering
- Support dark mode with `body.dark` CSS selectors
- Handle errors gracefully with try/catch blocks

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
```
