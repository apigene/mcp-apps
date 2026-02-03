# CSP Configuration Guide for Firecrawl MCP App

## Overview

According to the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx), Content Security Policy (CSP) must be declared in the resource's `_meta.ui.csp` field when returning the resource via `resources/read`.

## Current Status

✅ **No external dependencies** - This app is CSP-compliant by default:
- ✅ All icons are embedded as SVG (no external icon fonts)
- ✅ Fonts use system fonts with fallbacks (no external font loading)
- ✅ No external scripts or stylesheets

## CSP Configuration for Dynamic Content

### External Images (OG Images, Scraped Content)

If your scraped content includes external images (e.g., OG images from different domains), you need to declare those domains in the CSP configuration at the **server level**.

#### Example Server Implementation

When your MCP server returns the Firecrawl resource via `resources/read`, include CSP metadata:

```typescript
// In your MCP server's resources/read handler
{
  contents: [{
    uri: "ui://firecrawl/scrape-template",
    mimeType: "text/html;profile=mcp-app",
    text: htmlContent, // The HTML from mcp-app.html
    _meta: {
      ui: {
        csp: {
          // Allow images from any domain (for scraped content)
          // Note: This is permissive - consider restricting to known domains
          resourceDomains: ["https://*"], // Wildcard for all HTTPS domains
          
          // OR restrict to specific domains:
          // resourceDomains: [
          //   "https://example.com",
          //   "https://cdn.example.com",
          //   "https://*.cloudflare.com"
          // ],
          
          // No network requests needed (no fetch/XHR)
          connectDomains: [],
          
          // No nested iframes
          frameDomains: [],
          
          // No external base URIs
          baseUriDomains: []
        }
      }
    }
  }]
}
```

### Restrictive Default (If CSP Omitted)

If `_meta.ui.csp` is omitted, hosts MUST enforce:

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

This means **external images will be blocked** unless explicitly allowed via `resourceDomains`.

## Best Practices

### 1. Minimal CSP (Recommended)

For maximum security, only allow specific known domains:

```typescript
csp: {
  resourceDomains: [
    "https://cdn.example.com",
    "https://images.example.com"
  ]
}
```

### 2. Wildcard Subdomains

If you need to allow images from a specific domain and its subdomains:

```typescript
csp: {
  resourceDomains: [
    "https://*.example.com"
  ]
}
```

### 3. Dynamic Domain Extraction

For scraped content, you may need to extract domains from the scraped data and include them dynamically:

**Option A: Use the CSP Helper Utility**

```typescript
import { generateCSPForDynamicContent } from './base-template/csp-helper';

// Automatically extracts domains from content
const csp = generateCSPForDynamicContent(scrapedData, {
  allowAllImages: false,  // Set to true for permissive mode
  apiDomains: []  // Add API domains if needed
});

// Use in resource response
_meta: {
  ui: { csp }
}
```

**Option B: Manual Extraction**

```typescript
// Extract image domains from scraped content
const imageDomains = extractImageDomains(scrapedData);
// e.g., ["https://example.com", "https://cdn.example.com"]

csp: {
  resourceDomains: imageDomains
}
```

### 4. Proxy Images (Most Secure)

Instead of allowing external domains, proxy images through your server:

```typescript
// Convert external image URLs to proxy URLs
const proxiedImageUrl = `/api/proxy-image?url=${encodeURIComponent(externalUrl)}`;

// Then CSP only needs:
csp: {
  resourceDomains: [] // No external domains needed
}
```

## Testing CSP Compliance

1. **Check browser console** for CSP violation errors
2. **Test with external images** - verify they load correctly
3. **Verify restrictive defaults** - test without CSP metadata

## Common CSP Issues

### Issue: External images not loading
**Solution**: Add image domains to `resourceDomains`

### Issue: Fonts not loading
**Solution**: This app uses system fonts - no external fonts needed. If you add external fonts, add font domains to `resourceDomains`

### Issue: Scripts/styles blocked
**Solution**: This app uses inline scripts/styles (`'unsafe-inline'` is allowed by default). For external scripts/styles, add domains to `resourceDomains`

## Reference

- [MCP Apps Specification - CSP Section](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx#content-security-policy-enforcement)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
