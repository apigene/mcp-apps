# CSP (Content Security Policy) Solution for MCP Apps

## Problem

MCP Apps running in Claude (and other hosts) can experience CSP blocking issues when:
- External resources (fonts, images, scripts) are loaded
- Dynamic content (scraped websites, user content) includes external images
- External APIs are called from the app

## Solution Overview

We've implemented a **generic CSP solution** that:

1. ✅ **Removes external dependencies** from apps (fonts, icons embedded)
2. ✅ **Provides CSP configuration guides** for server-side setup
3. ✅ **Includes helper utilities** for dynamic CSP generation
4. ✅ **Documents best practices** for CSP compliance

## Files Created

### 1. `/base-template/CSP_GUIDE.md`
Comprehensive guide covering:
- CSP configuration structure
- Server implementation examples
- Common scenarios and best practices
- Troubleshooting guide

### 2. `/base-template/csp-helper.ts`
TypeScript utility functions:
- `extractImageDomains()` - Extract image domains from content
- `extractLinkDomains()` - Extract link domains from content
- `generateCSPForDynamicContent()` - Generate CSP for scraped/user content
- `generateCSPForSelfContained()` - Generate CSP for apps with no externals
- `mergeCSPConfigs()` - Combine multiple CSP configs
- `validateCSPConfig()` - Validate and warn about CSP issues

### 3. `/firecrawl/CSP_CONFIG.md`
Firecrawl-specific CSP guide with examples

### 4. Updated Apps
- **Firecrawl app**: Removed Google Fonts dependency, uses system fonts
- **Base template**: Added CSP configuration comments

## Quick Start

### For Apps with No External Dependencies

Your app is already CSP-compliant! No configuration needed.

### For Apps with External Images (Dynamic Content)

**In your MCP server's `resources/read` handler:**

```typescript
import { generateCSPForDynamicContent } from './base-template/csp-helper';

async function handleResourcesRead(request: ReadResourceRequest) {
  if (request.uri === "ui://my-app/template") {
    const htmlContent = await fs.readFile("path/to/mcp-app.html", "utf-8");
    
    // Get scraped data (example)
    const scrapedData = await getScrapedData();
    
    // Generate CSP config dynamically
    const csp = generateCSPForDynamicContent(scrapedData, {
      allowAllImages: true,  // Allow images from any HTTPS domain
      apiDomains: []  // Add API domains if needed
    });
    
    return {
      contents: [{
        uri: request.uri,
        mimeType: "text/html;profile=mcp-app",
        text: htmlContent,
        _meta: {
          ui: { csp }
        }
      }]
    };
  }
}
```

### For Apps with Known External Resources

```typescript
return {
  contents: [{
    uri: request.uri,
    mimeType: "text/html;profile=mcp-app",
    text: htmlContent,
    _meta: {
      ui: {
        csp: {
          resourceDomains: [
            "https://cdn.example.com",
            "https://fonts.googleapis.com"
          ],
          connectDomains: [
            "https://api.example.com"
          ]
        }
      }
    }
  }]
};
```

## Key Principles

### 1. Minimize External Dependencies

**Prefer:**
- ✅ Embedded SVG icons
- ✅ System fonts with fallbacks
- ✅ Inline styles/scripts

**Avoid:**
- ❌ External icon fonts (Material Icons CDN)
- ❌ External font services (Google Fonts)
- ❌ External CDN scripts/styles

### 2. Declare CSP at Server Level

CSP must be configured in the `resources/read` response, not in the HTML file itself.

### 3. Use Helper Utilities

The `csp-helper.ts` utilities make it easy to:
- Extract domains from dynamic content
- Generate appropriate CSP configs
- Validate configurations

## Testing

1. **Check browser console** for CSP violation errors
2. **Test external resources** - verify they load correctly
3. **Test without CSP** - verify restrictive defaults work

## Common Issues

### External images not loading
→ Add image domains to `resourceDomains` in CSP config

### Fonts not loading  
→ Use system fonts OR add font domains to `resourceDomains`

### API calls failing
→ Add API domains to `connectDomains` in CSP config

## Reference

- [MCP Apps Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [CSP Guide](./base-template/CSP_GUIDE.md)
- [Firecrawl CSP Config](./firecrawl/CSP_CONFIG.md)
- [CSP Helper Utilities](./base-template/csp-helper.ts)
