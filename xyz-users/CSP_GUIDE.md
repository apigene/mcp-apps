# CSP Configuration Guide for MCP Apps (SDK Version)

## Overview

According to the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx), Content Security Policy (CSP) must be declared in the resource's `_meta.ui.csp` field when returning the resource via `resources/read`.

**Note:** When using Vite bundling with `vite-plugin-singlefile`, most dependencies are **inlined** into the HTML file, which **reduces CSP requirements**! You only need CSP configuration for:

- External images loaded at runtime
- API calls to external services
- External iframes
- CDN resources (if not bundling via npm)

## CSP Configuration Structure

```typescript
interface McpUiResourceCsp {
  /**
   * Origins for network requests (fetch/XHR/WebSocket)
   * Maps to CSP `connect-src` directive
   */
  connectDomains?: string[];

  /**
   * Origins for static resources (images, scripts, stylesheets, fonts, media)
   * Maps to CSP `img-src`, `script-src`, `style-src`, `font-src`, `media-src` directives
   * Wildcard subdomains supported: `https://*.example.com`
   */
  resourceDomains?: string[];

  /**
   * Origins for nested iframes
   * Maps to CSP `frame-src` directive
   */
  frameDomains?: string[];

  /**
   * Allowed base URIs for the document
   * Maps to CSP `base-uri` directive
   */
  baseUriDomains?: string[];
}
```

## Server Implementation Example

When your MCP server returns a UI resource via `resources/read`, include CSP metadata:

```typescript
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";

// Register the bundled HTML resource
registerAppResource(
  server,
  "ui://my-app/mcp-app.html",
  "ui://my-app/mcp-app.html",
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    // Read the bundled HTML file
    const html = await fs.readFile("dist/mcp-app.html", "utf-8");

    return {
      contents: [
        {
          uri: "ui://my-app/mcp-app.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                // Example: Allow images from specific CDNs
                resourceDomains: [
                  "https://cdn.example.com",
                  "https://*.cloudflare.com",
                ],

                // Example: Allow API calls to your backend
                connectDomains: ["https://api.example.com"],

                // Example: Allow embedding YouTube videos
                frameDomains: ["https://www.youtube.com"],
              },
            },
          },
        },
      ],
    };
  },
);
```

## SDK-Specific Considerations

### What's Automatically Handled

When using the SDK with Vite bundling:

✅ **No CSP needed for:**

- SDK library code (bundled into HTML)
- CSS files (inlined into HTML)
- npm packages (bundled into JavaScript)
- Local images converted to data URLs

⚠️ **CSP needed for:**

- External images loaded dynamically
- API calls to external services
- Third-party iframes
- CDN scripts (if not using npm)

### Example: Chart.js

#### ✅ Via NPM (No CSP needed):

```typescript
// package.json
{
  "dependencies": {
    "chart.js": "^4.4.0"
  }
}

// src/mcp-app.ts
import Chart from "chart.js/auto";
// Vite bundles Chart.js → No CSP needed!
```

#### ⚠️ Via CDN (CSP required):

```html
<!-- mcp-app.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```

```typescript
// Server CSP configuration required:
_meta: {
  ui: {
    csp: {
      resourceDomains: ["https://cdn.jsdelivr.net"];
    }
  }
}
```

## Common Scenarios

### 1. Self-Contained App (No CSP)

If your app only uses bundled dependencies:

```typescript
// src/mcp-app.ts
import { App } from "@modelcontextprotocol/ext-apps";
import "./global.css";
import "./mcp-app.css";

// Everything is bundled → No CSP needed!
```

```typescript
// Server: No CSP needed
_meta: {
  ui: {
    // csp field can be omitted
  }
}
```

### 2. Dynamic Images from API

If you load images from external sources:

```typescript
// src/mcp-app.ts
function renderData(data: any) {
  app.innerHTML = `
    <img src="${data.imageUrl}" alt="Product">
  `;
}
```

```typescript
// Server: Configure CSP
_meta: {
  ui: {
    csp: {
      resourceDomains: ["https://images.example.com", "https://*.cdn.com"];
    }
  }
}
```

### 3. API Calls to External Service

If you make fetch requests:

```typescript
// src/mcp-app.ts
async function fetchExternalData() {
  const response = await fetch("https://api.external.com/data");
  return response.json();
}
```

```typescript
// Server: Configure CSP
_meta: {
  ui: {
    csp: {
      connectDomains: ["https://api.external.com"];
    }
  }
}
```

### 4. Embedded Video Player

If you embed external iframes:

```typescript
// src/mcp-app.ts
function renderData(data: any) {
  app.innerHTML = `
    <iframe src="https://www.youtube.com/embed/${data.videoId}"></iframe>
  `;
}
```

```typescript
// Server: Configure CSP
_meta: {
  ui: {
    csp: {
      frameDomains: ["https://www.youtube.com"];
    }
  }
}
```

## Default CSP (If Omitted)

If `_meta.ui.csp` is omitted, hosts MUST enforce restrictive defaults:

```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
media-src 'self' data:;
connect-src 'none';
frame-src 'none';
base-uri 'self';
```

With Vite bundling, this default is usually sufficient since everything is inlined!

## Best Practices

### 1. Prefer NPM Over CDN

```bash
# Good: Bundle via npm
npm install chart.js
import Chart from "chart.js/auto";

# Avoid: CDN (requires CSP)
<script src="https://cdn.jsdelivr.net/..."></script>
```

### 2. Use Data URLs for Static Images

```typescript
// Good: Import and bundle
import logoImage from "./logo.png";
app.innerHTML = `<img src="${logoImage}">`;

// Avoid: External URL (requires CSP)
app.innerHTML = `<img src="https://example.com/logo.png">`;
```

### 3. Minimize External Dependencies

```typescript
// Good: Use bundled SDK methods
import { applyDocumentTheme } from "@modelcontextprotocol/ext-apps";

// Avoid: External libraries if not needed
```

### 4. Be Specific with Domains

```typescript
// Good: Specific domains
resourceDomains: ["https://images.example.com"];

// Avoid: Overly permissive
resourceDomains: ["https://*"];
```

## Debugging CSP Issues

### Check Browser Console

CSP violations appear in browser console:

```
Refused to load the image 'https://example.com/image.jpg' because it violates the following Content Security Policy directive: "img-src 'self' data:"
```

### Common Solutions

**Issue:** "Refused to load script"

- **Cause:** External script not in resourceDomains
- **Fix:** Add domain to resourceDomains OR install via npm

**Issue:** "Refused to connect"

- **Cause:** fetch/XHR to external API
- **Fix:** Add domain to connectDomains

**Issue:** "Refused to frame"

- **Cause:** iframe to external site
- **Fix:** Add domain to frameDomains

## CSP Helper Utilities

For dynamic content with unknown domains, use helper utilities:

```typescript
// csp-helper.ts (server-side)
export function extractImageDomains(data: any): string[] {
  const domains = new Set<string>();

  // Extract from URLs in data
  const imageRegex = /(https?:\/\/[^/]+)\//g;
  const matches = JSON.stringify(data).matchAll(imageRegex);

  for (const match of matches) {
    domains.add(match[1]);
  }

  return Array.from(domains);
}

// Use in server
const imageDomains = extractImageDomains(scrapedData);
_meta: {
  ui: {
    csp: {
      resourceDomains: imageDomains;
    }
  }
}
```

## Summary

### SDK + Vite Bundling = Minimal CSP Requirements! 🎉

| Scenario                      | CSP Needed?              |
| ----------------------------- | ------------------------ |
| SDK library                   | ❌ No (bundled)          |
| npm packages                  | ❌ No (bundled)          |
| Local CSS/JS                  | ❌ No (inlined)          |
| Static images (imported)      | ❌ No (data URLs)        |
| Dynamic external images       | ✅ Yes (resourceDomains) |
| API calls to external service | ✅ Yes (connectDomains)  |
| External iframes              | ✅ Yes (frameDomains)    |
| CDN scripts                   | ✅ Yes (resourceDomains) |

**Recommendation:** Use npm packages and bundle everything for zero CSP configuration!

## Resources

- [MCP Apps Specification](https://spec.modelcontextprotocol.io/)
- [SDK Documentation](https://modelcontextprotocol.github.io/ext-apps/)
- [MDN CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
