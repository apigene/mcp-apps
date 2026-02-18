/* ============================================
   REBRICKABLE TEMPLATE - LEGO STYLE
   ============================================
   
   This file handles Rebrickable API responses with LEGO-themed rendering.
   Includes 3D rendering support with Three.js and LDrawLoader.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Rebrickable";
const APP_VERSION = "2.0.0";
const PROTOCOL_VERSION = "2026-01-26"; // MCP Apps protocol version

// Three.js and LDrawLoader are loaded via script tags in HTML
declare const THREE: any;
declare const LDrawLoader: any;
declare const OrbitControls: any;

/* ============================================
   REBRICKABLE LEGO PARTS 3D MCP APP (SDK VERSION)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   for utilities only (theme helpers, types, auto-resize).

   It does NOT call app.connect() because the proxy handles initialization.
   ============================================ */

/* ============================================
   SDK IMPORTS
   ============================================ */

import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

// Import styles (will be bundled by Vite)
import "./global.css";
import "./mcp-app.css";

/* ============================================
   APP CONFIGURATION
   ============================================ */


/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Extract data from MCP protocol messages
 */
function extractData(msg: any) {
  if (msg?.params?.structuredContent !== undefined) {
    return msg.params.structuredContent;
  }
  if (msg?.params !== undefined) {
    return msg.params;
  }
  return msg;
}

/**
 * Unwrap nested API response structures
 */
function unwrapData(data: any): any {
  if (!data) return null;
  
  // If data has body property (Rebrickable API format)
  if (data.body) {
    return data.body;
  }
  
  // Standard table format
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  // Nested patterns
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.results) return data.results;
  if (data.items) return data.items;
  
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return { rows: data };
  }
  
  return data;
}

/**
 * Initialize dark mode
 */


/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str: any): string {
  if (typeof str !== "string") return String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show error message
 */
function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Show empty state
 */
function showEmpty(message: string = 'No data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   REBRICKABLE-SPECIFIC FUNCTIONS
   ============================================ */

/**
 * Format external IDs into badges
 */
function formatExternalIds(externalIds: any): string {
  if (!externalIds || typeof externalIds !== 'object') {
    return '';
  }
  
  let badges = '';
  for (const [key, values] of Object.entries(externalIds)) {
    if (Array.isArray(values)) {
      values.forEach((value: string) => {
        const className = key.toLowerCase().replace(/\s+/g, '-');
        badges += `<span class="external-id-badge ${className}">${escapeHtml(key)}: ${escapeHtml(value)}</span>`;
      });
    }
  }
  
  return badges;
}

/**
 * Initialize 3D viewer for a part
 */
function init3DViewer(containerId: string, partNum: string) {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded, skipping 3D viewer');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(50, 50, 50);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, -50, -50);
    scene.add(directionalLight2);

    // Add controls if available
    let controls: any = null;
    if (typeof OrbitControls !== 'undefined' && OrbitControls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 20;
      controls.maxDistance = 200;
    }

    // Try to load LDraw model if LDrawLoader is available
    // Note: This requires LDraw parts library to be available
    // For now, we'll create a simple placeholder geometry
    const geometry = new THREE.BoxGeometry(20, 8, 10);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // LEGO red
      roughness: 0.3,
      metalness: 0.1
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 10, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      } else {
        // Simple rotation if no controls
        cube.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

  } catch (error) {
    console.error('Error initializing 3D viewer:', error);
    container.innerHTML = '<div class="viewer-error">3D viewer unavailable</div>';
  }
}

/**
 * Render a single part card with optional 3D viewer
 */
function renderPartCard(part: any, index: number): string {
  const partNum = part.part_num || 'N/A';
  const name = part.name || 'Unnamed Part';
  const category = part.part_cat_id ? `Category ${part.part_cat_id}` : '';
  const imageUrl = part.part_img_url;
  const partUrl = part.part_url || '#';
  const externalIds = formatExternalIds(part.external_ids);
  const containerId = `part-viewer-${index}`;
  
  // Check if we have LDraw ID for 3D rendering
  const hasLDraw = part.external_ids?.LDraw && Array.isArray(part.external_ids.LDraw) && part.external_ids.LDraw.length > 0;
  
  let imageHtml = '';
  if (imageUrl) {
    imageHtml = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" class="part-image" />`;
  } else if (hasLDraw && typeof THREE !== 'undefined') {
    // Show 3D viewer placeholder
    imageHtml = `<div id="${containerId}" class="part-3d-viewer"></div>`;
  } else {
    imageHtml = `<div class="part-image-placeholder">🧱</div>`;
  }
  
  return `
    <div class="part-card">
      <div class="part-image-container">
        ${imageHtml}
      </div>
      <div class="part-info">
        <div class="part-number">${escapeHtml(partNum)}</div>
        <div class="part-name">${escapeHtml(name)}</div>
        ${category ? `<div class="part-category">${escapeHtml(category)}</div>` : ''}
        ${externalIds ? `<div class="external-ids">${externalIds}</div>` : ''}
        <a href="${escapeHtml(partUrl)}" target="_blank" rel="noopener noreferrer" class="part-link">
          View on Rebrickable →
        </a>
      </div>
    </div>
  `;
}

/**
 * Render Rebrickable API response
 */
function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Unwrap data to get the body
    const unwrapped = unwrapData(data);
    
    // Handle Rebrickable API response format
    let body = unwrapped;
    if (data.body) {
      body = data.body;
    } else if (unwrapped.body) {
      body = unwrapped.body;
    } else if (unwrapped.results) {
      body = unwrapped;
    }
    
    // Extract parts/results
    const results = body.results || body.items || (Array.isArray(body) ? body : []);
    const count = body.count || results.length;
    const next = body.next;
    const previous = body.previous;
    
    if (!results || results.length === 0) {
      showEmpty('No parts found.');
      return;
    }
    
    // Build HTML
    let html = '<div class="container">';
    
    // Header with stats
    html += `
      <div class="header">
        <h1 class="header-title">🧱 Rebrickable Parts</h1>
        <div class="header-stats">
          <div class="stat-brick">
            <div class="stat-label">Total Parts</div>
            <div class="stat-value">${count.toLocaleString()}</div>
          </div>
          <div class="stat-brick">
            <div class="stat-label">Showing</div>
            <div class="stat-value">${results.length}</div>
          </div>
        </div>
      </div>
    `;
    
    // Parts grid
    html += '<div class="parts-grid">';
    results.forEach((part: any, index: number) => {
      html += renderPartCard(part, index);
    });
    html += '</div>';
    
    // Pagination (if available)
    if (next || previous) {
      html += '<div class="pagination">';
      if (previous) {
        html += `<button class="pagination-button" onclick="window.location.reload()">← Previous</button>`;
      }
      html += `<span class="pagination-info">Page ${Math.floor((count - results.length) / results.length) + 1}</span>`;
      if (next) {
        html += `<button class="pagination-button" onclick="window.location.reload()">Next →</button>`;
      }
      html += '</div>';
    }
    
    html += '</div>';
    
    app.innerHTML = html;
    
    // Initialize 3D viewers after DOM is ready
    setTimeout(() => {
      results.forEach((part: any, index: number) => {
        const hasLDraw = part.external_ids?.LDraw && Array.isArray(part.external_ids.LDraw) && part.external_ids.LDraw.length > 0;
        if (hasLDraw && typeof THREE !== 'undefined') {
          const containerId = `part-viewer-${index}`;
          init3DViewer(containerId, part.part_num);
        }
      });
      
      // Notify host of size change after rendering completes
    }, 100);
    
  } catch (error: any) {
    console.error('Render error:', error);
    showError(`Error rendering data: ${error.message}`);
  }
}

/* ============================================
   MESSAGE HANDLER
   ============================================ */

window.addEventListener('message', function(event: MessageEvent) {
  const msg = event.data;
  
  if (!msg || msg.jsonrpc !== '2.0') {
    return;
  }
  
  // Handle requests that require responses (like ui/resource-teardown)
  if (msg.id !== undefined && msg.method === 'ui/resource-teardown') {
    const reason = msg.params?.reason || 'Resource teardown requested';
    
    // Clean up resources
    // - Clear any timers
    if (sizeChangeTimeout) {
      clearTimeout(sizeChangeTimeout);
      sizeChangeTimeout = null;
    }
    
    // - Disconnect observers
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    // - Clean up 3D viewers (Three.js scenes, renderers, etc.)
    // Note: Three.js cleanup would require tracking all scene instances
    // For now, the DOM removal will handle most cleanup
    
    // Send response to host
    window.parent.postMessage({
      jsonrpc: "2.0",
      id: msg.id,
      result: {}
    }, '*');
    
    return; // Don't process further
  }
  
  if (msg.id !== undefined && !msg.method) {
    return;
  }
  
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      const data = msg.params?.structuredContent || msg.params;
      if (data !== undefined) {
        renderData(data);
      } else {
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;
      
    case 'ui/notifications/host-context-changed':
      console.info("Host context changed:", msg.params);

      if (msg.params?.theme) {
        applyDocumentTheme(msg.params.theme);
      }

      if (msg.params?.styles?.css?.fonts) {
        applyHostFonts(msg.params.styles.css.fonts);
      }

      if (msg.params?.styles?.variables) {
        applyHostStyleVariables(msg.params.styles.variables);
      }

      if (msg.params?.displayMode === 'fullscreen') {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
      break;

    // Handle tool cancellation
    case 'ui/notifications/tool-cancelled':
      const reason = msg.params?.reason || "Unknown reason";
      console.info("Tool cancelled:", reason);
      showError(`Operation cancelled: ${reason}`);
      break;

    // Handle resource teardown (requires response)
    case 'ui/resource-teardown':
      console.info("Resource teardown requested");

      if (msg.id !== undefined) {
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: msg.id,
            result: {},
          },
          "*"
        );
      }
      break;
      
    case 'ui/notifications/tool-input':
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        console.log('Tool input received:', toolArguments);
        // Example: Could show loading state with input parameters
      }
      break;

    case 'ui/notifications/initialized':
      // Initialization notification (optional - handle if needed)
      break;
      
    default:
      if (msg.params) {
        const fallbackData = msg.params.structuredContent || msg.params;
        if (fallbackData && fallbackData !== msg) {
          console.warn('Unknown method:', msg.method, '- attempting to render data');
          renderData(fallbackData);
        }
      }
  }
});

/* ============================================
   SDK APP INSTANCE (PROXY MODE - NO CONNECT)
   ============================================ */

const app = new App({
  name: APP_NAME,
  version: APP_VERSION,
});

/* ============================================
   AUTO-RESIZE VIA SDK
   ============================================ */

const cleanupResize = app.setupSizeChangedNotifications();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  cleanupResize();
});

console.info("MCP App initialized (proxy mode - SDK utilities only)");

// Export empty object to ensure this file is treated as an ES module
export {};
