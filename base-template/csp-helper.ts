/**
 * CSP Helper Utilities for MCP Apps
 * 
 * This file provides utilities to help MCP servers generate CSP configurations
 * dynamically based on content analysis.
 * 
 * Usage:
 *   import { extractDomainsFromContent, generateCSPConfig } from './csp-helper';
 *   
 *   const domains = extractDomainsFromContent(scrapedData);
 *   const csp = generateCSPConfig({ resourceDomains: domains });
 */

export interface CSPConfig {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  baseUriDomains?: string[];
}

/**
 * Extract image domains from content
 */
export function extractImageDomains(data: any): string[] {
  const domains = new Set<string>();
  
  // Extract from OG images
  if (data.metadata?.['og:image']) {
    try {
      const url = new URL(data.metadata['og:image']);
      domains.add(`${url.protocol}//${url.hostname}`);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Extract from markdown images
  if (typeof data.markdown === 'string') {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(data.markdown)) !== null) {
      try {
        const url = new URL(match[1]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  // Extract from HTML content
  if (typeof data.html === 'string') {
    const imgSrcRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = imgSrcRegex.exec(data.html)) !== null) {
      try {
        const url = new URL(match[1]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  return Array.from(domains);
}

/**
 * Extract link domains from content
 */
export function extractLinkDomains(data: any): string[] {
  const domains = new Set<string>();
  
  // Extract from markdown links
  if (typeof data.markdown === 'string') {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(data.markdown)) !== null) {
      try {
        const url = new URL(match[2]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  // Extract from HTML links
  if (typeof data.html === 'string') {
    const linkRegex = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(data.html)) !== null) {
      try {
        const url = new URL(match[1]);
        domains.add(`${url.protocol}//${url.hostname}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }
  
  return Array.from(domains);
}

/**
 * Extract all external domains from content
 */
export function extractDomainsFromContent(data: any): string[] {
  const imageDomains = extractImageDomains(data);
  const linkDomains = extractLinkDomains(data);
  
  const allDomains = new Set([...imageDomains, ...linkDomains]);
  return Array.from(allDomains);
}

/**
 * Generate CSP configuration
 */
export function generateCSPConfig(config: Partial<CSPConfig>): CSPConfig {
  return {
    connectDomains: config.connectDomains || [],
    resourceDomains: config.resourceDomains || [],
    frameDomains: config.frameDomains || [],
    baseUriDomains: config.baseUriDomains || []
  };
}

/**
 * Generate CSP config for dynamic content (scraped websites, user content, etc.)
 */
export function generateCSPForDynamicContent(
  data: any,
  options: {
    allowAllImages?: boolean;
    allowedImageDomains?: string[];
    apiDomains?: string[];
  } = {}
): CSPConfig {
  const resourceDomains: string[] = [];
  
  if (options.allowAllImages) {
    // Permissive: allow images from any HTTPS domain
    resourceDomains.push('https://*');
  } else if (options.allowedImageDomains) {
    // Restrictive: only allow specific domains
    resourceDomains.push(...options.allowedImageDomains);
  } else {
    // Extract domains from content
    const extractedDomains = extractDomainsFromContent(data);
    resourceDomains.push(...extractedDomains);
  }
  
  return generateCSPConfig({
    resourceDomains,
    connectDomains: options.apiDomains || []
  });
}

/**
 * Generate CSP config for apps with no external dependencies
 */
export function generateCSPForSelfContained(): CSPConfig {
  return generateCSPConfig({
    resourceDomains: [],
    connectDomains: [],
    frameDomains: [],
    baseUriDomains: []
  });
}

/**
 * Merge multiple CSP configs (useful when combining static and dynamic configs)
 */
export function mergeCSPConfigs(...configs: CSPConfig[]): CSPConfig {
  const merged: CSPConfig = {
    connectDomains: [],
    resourceDomains: [],
    frameDomains: [],
    baseUriDomains: []
  };
  
  for (const config of configs) {
    if (config.connectDomains) {
      merged.connectDomains!.push(...config.connectDomains);
    }
    if (config.resourceDomains) {
      merged.resourceDomains!.push(...config.resourceDomains);
    }
    if (config.frameDomains) {
      merged.frameDomains!.push(...config.frameDomains);
    }
    if (config.baseUriDomains) {
      merged.baseUriDomains!.push(...config.baseUriDomains);
    }
  }
  
  // Remove duplicates
  merged.connectDomains = Array.from(new Set(merged.connectDomains));
  merged.resourceDomains = Array.from(new Set(merged.resourceDomains));
  merged.frameDomains = Array.from(new Set(merged.frameDomains));
  merged.baseUriDomains = Array.from(new Set(merged.baseUriDomains));
  
  return merged;
}

/**
 * Validate CSP config (check for common mistakes)
 */
export function validateCSPConfig(config: CSPConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for overly permissive configs
  if (config.resourceDomains?.includes('https://*')) {
    warnings.push('Using "https://*" in resourceDomains is very permissive. Consider restricting to specific domains.');
  }
  
  if (config.connectDomains?.includes('*')) {
    warnings.push('Using "*" in connectDomains is very permissive. Consider restricting to specific domains.');
  }
  
  // Check for HTTP (should prefer HTTPS)
  const allDomains = [
    ...(config.resourceDomains || []),
    ...(config.connectDomains || []),
    ...(config.frameDomains || []),
    ...(config.baseUriDomains || [])
  ];
  
  for (const domain of allDomains) {
    if (domain.startsWith('http://') && !domain.startsWith('https://')) {
      warnings.push(`Domain "${domain}" uses HTTP. Consider using HTTPS for security.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
