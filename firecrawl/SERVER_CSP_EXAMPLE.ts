/**
 * Example: Server-side CSP Configuration for Firecrawl MCP App
 * 
 * This shows how to implement dynamic CSP domain extraction on the server side
 * when returning the Firecrawl UI resource via resources/read.
 * 
 * IMPORTANT: CSP configuration MUST be done server-side, not client-side.
 */

import { generateCSPForDynamicContent, extractDomainsFromContent } from '../base-template/csp-helper';

/**
 * Example 1: Using the CSP helper utility (recommended)
 */
async function handleResourcesRead_Firecrawl_Example1(request: any) {
  if (request.uri === "ui://firecrawl/scrape-template") {
    const htmlContent = await fs.readFile("path/to/firecrawl/mcp-app.html", "utf-8");
    
    // Get the scraped data (from tool result or cache)
    const toolResult = await getToolResult(); // Your method to get tool result
    const scrapedData = toolResult?.structuredContent || toolResult?.data;
    
    // Generate CSP config dynamically from scraped content
    const csp = generateCSPForDynamicContent(scrapedData, {
      allowAllImages: false,  // Extract specific domains (more secure)
      // allowAllImages: true,  // OR allow all HTTPS images (less secure but simpler)
      apiDomains: []  // Add if your app makes API calls
    });
    
    return {
      contents: [{
        uri: request.uri,
        mimeType: "text/html;profile=mcp-app",
        text: htmlContent,
        _meta: {
          ui: {
            csp
          }
        }
      }]
    };
  }
}

/**
 * Example 2: Manual domain extraction
 */
async function handleResourcesRead_Firecrawl_Example2(request: any) {
  if (request.uri === "ui://firecrawl/scrape-template") {
    const htmlContent = await fs.readFile("path/to/firecrawl/mcp-app.html", "utf-8");
    
    const toolResult = await getToolResult();
    const scrapedData = toolResult?.structuredContent || toolResult?.data;
    
    // Extract domains manually
    const imageDomains = extractDomainsFromContent(scrapedData);
    
    return {
      contents: [{
        uri: request.uri,
        mimeType: "text/html;profile=mcp-app",
        text: htmlContent,
        _meta: {
          ui: {
            csp: {
              resourceDomains: imageDomains.length > 0 
                ? imageDomains 
                : ["https://*"],  // Fallback: allow all HTTPS images
              connectDomains: [],
              frameDomains: [],
              baseUriDomains: []
            }
          }
        }
      }]
    };
  }
}

/**
 * Example 3: Permissive CSP (simplest, less secure)
 * Use this if you want to allow images from any HTTPS domain
 */
async function handleResourcesRead_Firecrawl_Example3(request: any) {
  if (request.uri === "ui://firecrawl/scrape-template") {
    const htmlContent = await fs.readFile("path/to/firecrawl/mcp-app.html", "utf-8");
    
    return {
      contents: [{
        uri: request.uri,
        mimeType: "text/html;profile=mcp-app",
        text: htmlContent,
        _meta: {
          ui: {
            csp: {
              resourceDomains: ["https://*"],  // Allow all HTTPS images
              connectDomains: [],
              frameDomains: [],
              baseUriDomains: []
            }
          }
        }
      }]
    };
  }
}

/**
 * Example 4: Extract domains from tool result before rendering
 * This is useful if you have access to the tool result when handling resources/read
 */
async function handleResourcesRead_Firecrawl_Example4(request: any, toolCallId?: string) {
  if (request.uri === "ui://firecrawl/scrape-template") {
    const htmlContent = await fs.readFile("path/to/firecrawl/mcp-app.html", "utf-8");
    
    // If you have access to the tool call that triggered this resource request
    let csp;
    if (toolCallId) {
      const toolResult = await getToolResultById(toolCallId);
      const scrapedData = toolResult?.structuredContent || toolResult?.data;
      
      if (scrapedData) {
        // Extract domains from the actual scraped content
        csp = generateCSPForDynamicContent(scrapedData);
      } else {
        // Fallback: permissive CSP
        csp = {
          resourceDomains: ["https://*"],
          connectDomains: [],
          frameDomains: [],
          baseUriDomains: []
        };
      }
    } else {
      // No tool result available, use permissive CSP
      csp = {
        resourceDomains: ["https://*"],
        connectDomains: [],
        frameDomains: [],
        baseUriDomains: []
      };
    }
    
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

// Helper functions (implement these based on your server architecture)
async function getToolResult(): Promise<any> {
  // Your implementation: get the current tool result
  // This might come from a cache, database, or be passed as a parameter
  throw new Error("Implement getToolResult()");
}

async function getToolResultById(id: string): Promise<any> {
  // Your implementation: get tool result by ID
  throw new Error("Implement getToolResultById()");
}
