/* ============================================
   REBRICKABLE LEGO PARTS 3D MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().
   Includes 3D rendering support with Three.js and LDrawLoader.
   ============================================ */

/* ============================================
   APP CONFIGURATION
   ============================================ */

const APP_NAME = "Rebrickable";
const APP_VERSION = "2.0.0";

// Three.js and LDrawLoader are loaded via script tags in HTML
declare const THREE: any;
declare const LDrawLoader: any;
declare const OrbitControls: any;

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
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Unwrap nested API response structures
 */
function unwrapData(data: any): any {
  if (!data) return null;

  // If data itself is an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }

  // Handle GitHub API response format - check for body array
  if (data.body && Array.isArray(data.body)) {
    return data.body;
  }

  // Nested formats
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  if (data.message?.response_content) {
    return data.message.response_content;
  }

  // Common nested patterns - check these BEFORE generic object check
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;

  // Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }

  // Standard table format
  if (data.columns) {
    return data;
  }

  return data;
}

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
    app.sendLog({ level: "warning", data: "Three.js not loaded, skipping 3D viewer", logger: APP_NAME });
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
    app.sendLog({ level: "error", data: `Error initializing 3D viewer: ${JSON.stringify(error)}`, logger: APP_NAME });
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
    }, 100);

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering data: ${error.message}`);
  }
}

/* ============================================
   HOST CONTEXT HANDLER
   ============================================ */

function handleHostContextChanged(ctx: any) {
  if (!ctx) return;

  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
    // Also toggle body.dark class for CSS compatibility
    if (ctx.theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }

  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }

  if (ctx.displayMode === "fullscreen") {
    document.body.classList.add("fullscreen-mode");
  } else {
    document.body.classList.remove("fullscreen-mode");
  }
}

/* ============================================
   SDK APP INSTANCE (STANDALONE MODE)
   ============================================ */

const app = new App(
  { name: APP_NAME, version: APP_VERSION },
  { availableDisplayModes: ["inline", "fullscreen"] }
);

app.onteardown = async () => {
  app.sendLog({ level: "info", data: "Resource teardown requested", logger: APP_NAME });
  return {};
};

app.ontoolinput = (params) => {
  app.sendLog({ level: "info", data: `Tool input received: ${JSON.stringify(params.arguments)}`, logger: APP_NAME });
};

app.ontoolresult = (params) => {
  app.sendLog({ level: "info", data: "Tool result received", logger: APP_NAME });

  // Check for tool execution errors
  if (params.isError) {
    app.sendLog({ level: "error", data: `Tool execution failed: ${JSON.stringify(params.content)}`, logger: APP_NAME });
    const errorText =
      params.content?.map((c: any) => c.text || "").join("\n") ||
      "Tool execution failed";
    showError(errorText);
    return;
  }

  const data = params.structuredContent || params.content;
  if (data !== undefined) {
    renderData(data);
  } else {
    app.sendLog({ level: "warning", data: `Tool result received but no data found: ${JSON.stringify(params)}`, logger: APP_NAME });
    showEmpty("No data received");
  }
};

app.ontoolcancelled = (params) => {
  const reason = params.reason || "Unknown reason";
  app.sendLog({ level: "info", data: `Tool cancelled: ${reason}`, logger: APP_NAME });
  showError(`Operation cancelled: ${reason}`);
};

app.onerror = (error) => {
  app.sendLog({ level: "error", data: `App error: ${JSON.stringify(error)}`, logger: APP_NAME });
};

app.onhostcontextchanged = (ctx) => {
  app.sendLog({ level: "info", data: `Host context changed: ${JSON.stringify(ctx)}`, logger: APP_NAME });
  handleHostContextChanged(ctx);
};

/* ============================================
   CONNECT TO HOST
   ============================================ */

app
  .connect()
  .then(() => {
    app.sendLog({ level: "info", data: "MCP App connected to host", logger: APP_NAME });
    const ctx = app.getHostContext();
    if (ctx) {
      handleHostContextChanged(ctx);
    }
  })
  .catch((error) => {
    app.sendLog({ level: "error", data: `Failed to connect to MCP host: ${JSON.stringify(error)}`, logger: APP_NAME });
  });

export {};
