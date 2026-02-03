# Generic CSP Configuration Guide for MCP Apps

## Overview

According to the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx), Content Security Policy (CSP) must be declared in the resource's `_meta.ui.csp` field when returning the resource via `resources/read`.

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
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";

// In your resources/read handler
async function handleResourcesRead(request: ReadResourceRequest) {
  if (request.uri === "ui://my-app/template") {
    const htmlContent = await fs.readFile("path/to/mcp-app.html", "utf-8");
    
    return {
      contents: [{
        uri: request.uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: htmlContent,
        _meta: {
          ui: {
            csp: {
              // Example: Allow images from specific CDNs
              resourceDomains: [
                "https://cdn.example.com",
                "https://*.cloudflare.com",
                "https://images.unsplash.com"
              ],
              
              // Example: Allow API calls to your backend
              connectDomains: [
                "https://api.example.com",
                "wss://realtime.example.com"
              ],
              
              // Example: Allow embedding YouTube videos
              frameDomains: [
                "https://www.youtube.com",
                "https://player.vimeo.com"
              ],
              
              // Usually not needed unless using external base tags
              baseUriDomains: []
            }
          }
        }
      }]
    };
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

**This means:**
- ✅ Inline scripts/styles work (`'unsafe-inline'` allowed)
- ✅ Local images work (`'self'` and `data:` allowed)
- ❌ External images blocked (unless in `resourceDomains`)
- ❌ External fonts blocked (unless in `resourceDomains`)
- ❌ External scripts/styles blocked (unless in `resourceDomains`)
- ❌ Network requests blocked (unless in `connectDomains`)

## Common Scenarios

### 1. App with No External Dependencies (Most Secure)

```typescript
csp: {
  // Empty = no external resources allowed
  resourceDomains: [],
  connectDomains: [],
  frameDomains: [],
  baseUriDomains: []
}
```

**Best for:**
- Apps using only embedded SVG icons
- Apps using system fonts
- Apps with no external API calls
- Apps displaying only local/embedded content

### 2. App with External Images (Dynamic Content)

```typescript
csp: {
  // Allow images from any HTTPS domain (for scraped/user content)
  resourceDomains: ["https://*"],
  connectDomains: [],
  frameDomains: [],
  baseUriDomains: []
}
```

**Best for:**
- Apps displaying user-generated content
- Apps scraping external websites
- Apps showing OG images from various domains

**Security Note:** `https://*` is permissive. Consider restricting to known domains when possible.

### 3. App with External API Calls

```typescript
csp: {
  resourceDomains: [
    "https://cdn.example.com",  // For static assets
    "https://fonts.googleapis.com"  // For fonts
  ],
  connectDomains: [
    "https://api.example.com",  // For API calls
    "wss://realtime.example.com"  // For WebSocket connections
  ],
  frameDomains: [],
  baseUriDomains: []
}
```

**Best for:**
- Apps making API calls to external services
- Apps using external CDNs for assets
- Apps with real-time features (WebSockets)

### 4. App with Embedded Media (YouTube, Vimeo, etc.)

```typescript
csp: {
  resourceDomains: [
    "https://i.ytimg.com",  // YouTube thumbnails
    "https://vumbnail.com"  // Vimeo thumbnails
  ],
  connectDomains: [],
  frameDomains: [
    "https://www.youtube.com",
    "https://player.vimeo.com"
  ],
  baseUriDomains: []
}
```

**Best for:**
- Apps embedding videos
- Apps with iframe-based widgets
- Apps with third-party integrations

## Best Practices

### 1. Minimize External Dependencies

**Prefer:**
- ✅ Embedded SVG icons (no external icon fonts)
- ✅ System fonts with fallbacks (no external font loading)
- ✅ Inline styles (no external stylesheets)

**Avoid:**
- ❌ External icon fonts (Material Icons CDN, Font Awesome CDN)
- ❌ External font services (Google Fonts, Adobe Fonts)
- ❌ External stylesheet frameworks (Bootstrap CDN, Tailwind CDN)

### 2. Use Specific Domains

**Prefer:**
```typescript
resourceDomains: [
  "https://cdn.example.com",
  "https://images.example.com"
]
```

**Avoid:**
```typescript
resourceDomains: ["https://*"]  // Too permissive
```

### 3. Extract Domains Dynamically

For dynamic content (e.g., scraped images), extract domains from the data:

```typescript
function extractImageDomains(data: any): string[] {
  const domains = new Set<string>();
  
  // Extract from OG images
  if (data.metadata?.['og:image']) {
    const url = new URL(data.metadata['og:image']);
    domains.add(`${url.protocol}//${url.hostname}`);
  }
  
  // Extract from markdown images
  const imageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = imageRegex.exec(data.markdown)) !== null) {
    const url = new URL(match[1]);
    domains.add(`${url.protocol}//${url.hostname}`);
  }
  
  return Array.from(domains);
}

// Use in CSP configuration
const imageDomains = extractImageDomains(scrapedData);
csp: {
  resourceDomains: imageDomains
}
```

### 4. Proxy External Resources (Most Secure)

Instead of allowing external domains, proxy resources through your server:

```typescript
// Client-side: Convert external URLs to proxy URLs
function proxyImageUrl(externalUrl: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(externalUrl)}`;
}

// Server-side: Proxy handler
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  res.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
  res.send(Buffer.from(buffer));
});

// Then CSP only needs:
csp: {
  resourceDomains: []  // No external domains needed
}
```

## Testing CSP Compliance

### 1. Check Browser Console

Open browser DevTools → Console and look for CSP violation errors:

```
Refused to load the image 'https://example.com/image.png' 
because it violates the following Content Security Policy directive: 
"img-src 'self' data:".
```

### 2. Test with External Resources

- Test external images (should load if in `resourceDomains`)
- Test external fonts (should load if in `resourceDomains`)
- Test API calls (should work if in `connectDomains`)
- Test iframes (should load if in `frameDomains`)

### 3. Verify Restrictive Defaults

Test without CSP metadata - external resources should be blocked.

## Troubleshooting

### Issue: External images not loading
**Cause:** Image domain not in `resourceDomains`  
**Solution:** Add domain to `resourceDomains` array

### Issue: Fonts not loading
**Cause:** Font domain not in `resourceDomains`  
**Solution:** Add font domain to `resourceDomains` OR use system fonts

### Issue: API calls failing
**Cause:** API domain not in `connectDomains`  
**Solution:** Add API domain to `connectDomains` array

### Issue: Iframes not loading
**Cause:** Iframe domain not in `frameDomains`  
**Solution:** Add iframe domain to `frameDomains` array

### Issue: Scripts/styles blocked
**Cause:** External script/stylesheet domain not in `resourceDomains`  
**Solution:** Add domain to `resourceDomains` OR use inline scripts/styles

## Reference

- [MCP Apps Specification - CSP Section](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx#content-security-policy-enforcement)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Test your CSP configuration
