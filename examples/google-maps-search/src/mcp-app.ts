/* ============================================
   GOOGLE MAPS SEARCH MCP APP (STANDALONE MODE)
   ============================================

   This app uses the official @modelcontextprotocol/ext-apps SDK
   in standalone mode with app.connect().

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

const APP_NAME = "Google Maps Search";
const APP_VERSION = "1.0.0";

/* ============================================
   COMMON UTILITY FUNCTIONS
   ============================================ */

/**
 * Extract data from MCP protocol messages
 * Handles standard JSON-RPC 2.0 format from run-action.html
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
 * Handles various wrapper formats from different MCP clients
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
 * Show error message in the app
 */
function showError(message: string) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }
}

/**
 * Show empty state message
 * Override the default message by passing a custom message
 */
function showEmpty(message: string = 'No data available.') {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
  }
}

/* ============================================
   TEMPLATE-SPECIFIC FUNCTIONS
   ============================================

   Add your template-specific utility functions here.
   Examples:
   - Data normalization functions
   - Formatting functions (dates, numbers, etc.)
   - Data transformation functions
   - Chart rendering functions (if using Chart.js)
   ============================================ */

/**
 * Google Maps API Key for constructing photo URLs
 *
 * SECURITY NOTE: This API key is visible in the client-side code.
 * To secure it properly:
 * 1. Go to Google Cloud Console → APIs & Services → Credentials
 * 2. Click on your API key
 * 3. Under "Application restrictions", select "HTTP referrers (web sites)"
 * 4. Add your domain(s) (e.g., https://yourdomain.com/*)
 * 5. Under "API restrictions", restrict to: Places API, Maps JavaScript API
 *
 * Alternatively, move this to the backend and have the backend add photo URLs to responses.
 */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Get photo URL from photo reference or use provided URL
 * Constructs Google Maps Places API photo URL with API key
 */
function getPhotoUrl(photo: any, maxWidth: number = 400): string | null {
  // If photo already has a URL, use it
  if (photo.url) {
    return photo.url;
  }

  // If photo has a photo_reference, construct URL with API key
  if (photo.photo_reference && GOOGLE_MAPS_API_KEY) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
  }

  return null;
}

/**
 * Format price level (1-4) to dollar signs
 */
function formatPriceLevel(priceLevel: number | undefined): string {
  if (!priceLevel || priceLevel < 1 || priceLevel > 4) return '';
  return '$'.repeat(priceLevel);
}

/**
 * Format rating with stars
 */
function formatRating(rating: number | undefined): string {
  if (!rating) return 'No rating';
  return rating.toFixed(1);
}

/**
 * Get place type display name
 */
function getPlaceTypeDisplay(types: string[] | undefined): string {
  if (!types || types.length === 0) return 'Place';
  // Filter out generic types
  const filtered = types.filter(t =>
    !['point_of_interest', 'establishment'].includes(t)
  );
  if (filtered.length === 0) return types[0] || 'Place';
  return filtered[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

let selectedPlaceId: string | null = null;

/**
 * View place details
 */
function viewPlaceDetails(placeId: string) {
  selectedPlaceId = placeId;
  // Re-render to show detail view
  const app = document.getElementById('app');
  if (app && app.dataset.placesData) {
    const placesData = JSON.parse(app.dataset.placesData);
    renderData(placesData);
  }
}

/**
 * Go back to list view
 */
function goBackToList() {
  selectedPlaceId = null;
  const app = document.getElementById('app');
  if (app && app.dataset.placesData) {
    const placesData = JSON.parse(app.dataset.placesData);
    renderData(placesData);
  }
}

/**
 * Open place in Google Maps
 */
function openInGoogleMaps(placeId: string, lat?: number, lng?: number) {
  let url: string;
  if (placeId) {
    url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  } else if (lat !== undefined && lng !== undefined) {
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else {
    return;
  }
  window.open(url, '_blank');
}

/* ============================================
   TEMPLATE-SPECIFIC RENDER FUNCTION
   ============================================

   This is the main function you need to implement.
   It receives the data and renders it in the app.

   Guidelines:
   1. Always validate data before rendering
   2. Use unwrapData() to handle nested structures
   3. Use escapeHtml() when inserting user content
   4. Handle errors gracefully with try/catch
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;

  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    // Unwrap data to handle nested structures
    const unwrapped = unwrapData(data);

    // Handle Google Maps Places API response format
    // Data can be: { body: { results: [...] } } or { results: [...] } or directly results array
    let places: any[] = [];

    if (unwrapped.body?.results) {
      places = unwrapped.body.results;
    } else if (unwrapped.results) {
      places = unwrapped.results;
    } else if (Array.isArray(unwrapped)) {
      places = unwrapped;
    }

    // Store places data for detail view navigation
    app.dataset.placesData = JSON.stringify(data);

    if (!places || places.length === 0) {
      showEmpty('No places found');
      return;
    }

    // If a place is selected, show detail view
    if (selectedPlaceId) {
      const place = places.find(p => p.place_id === selectedPlaceId);
      if (place) {
        renderPlaceDetail(place);
        return;
      }
    }

    // Render list view
    renderPlacesList(places);

  } catch (error: any) {
    app.sendLog({ level: "error", data: `Render error: ${JSON.stringify(error)}`, logger: APP_NAME });
    showError(`Error rendering data: ${error.message}`);
  }
}

function renderPlacesList(places: any[]) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="maps-container">
      <div class="maps-header">
        <div class="maps-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <h1 class="maps-title">Places Found</h1>
          <p class="maps-subtitle">${places.length} ${places.length === 1 ? 'place' : 'places'}</p>
        </div>
      </div>

      <div class="places-grid">
        ${places.map(place => renderPlaceCard(place)).join('')}
      </div>
    </div>
  `;

  // Add click handlers
  const cards = app.querySelectorAll('.place-card');
  cards.forEach(card => {
    const placeId = card.getAttribute('data-place-id');
    if (placeId) {
      card.addEventListener('click', () => {
        viewPlaceDetails(placeId);
      });
    }
  });
}

function renderPlaceCard(place: any): string {
  const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
  const photoUrl = photo ? getPhotoUrl(photo, 400) : '';
  const rating = place.rating || 0;
  const priceLevel = formatPriceLevel(place.price_level);
  const isOpen = place.opening_hours?.open_now;
  const placeType = getPlaceTypeDisplay(place.types);

  return `
    <div class="place-card" data-place-id="${escapeHtml(place.place_id)}">
      ${photoUrl ? `
        <div class="place-image-wrapper">
          <img src="${photoUrl}" alt="${escapeHtml(place.name)}" class="place-image" loading="lazy">
        </div>
      ` : `
        <div class="place-image-wrapper place-image-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `}

      <div class="place-info">
        <div class="place-header">
          <h3 class="place-name" title="${escapeHtml(place.name)}">${escapeHtml(place.name)}</h3>
          ${isOpen !== undefined ? `
            <span class="place-status ${isOpen ? 'open' : 'closed'}">
              ${isOpen ? 'Open now' : 'Closed'}
            </span>
          ` : ''}
        </div>

        <p class="place-type">${escapeHtml(placeType)}</p>

        <div class="place-rating">
          <span class="rating-stars">${'★'.repeat(Math.floor(rating))}${rating % 1 >= 0.5 ? '½' : ''}</span>
          <span class="rating-value">${formatRating(rating)}</span>
          ${place.user_ratings_total ? `
            <span class="rating-count">(${place.user_ratings_total.toLocaleString()})</span>
          ` : ''}
        </div>

        ${priceLevel ? `
          <div class="place-price">${priceLevel}</div>
        ` : ''}

        <p class="place-address" title="${escapeHtml(place.formatted_address)}">
          ${escapeHtml(place.formatted_address)}
        </p>
      </div>
    </div>
  `;
}

function renderPlaceDetail(place: any) {
  const app = document.getElementById('app');
  if (!app) return;

  const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
  const photoUrl = photo ? getPhotoUrl(photo, 800) : null;
  const rating = place.rating || 0;
  const priceLevel = formatPriceLevel(place.price_level);
  const isOpen = place.opening_hours?.open_now;
  const placeType = getPlaceTypeDisplay(place.types);
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;

  app.innerHTML = `
    <div class="maps-container">
      <div class="place-detail">
        <button class="back-button" onclick="window.goBackToList()" title="Back to list">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <div class="place-detail-main">
          ${photoUrl ? `
            <div class="place-detail-image">
              <img src="${photoUrl}" alt="${escapeHtml(place.name)}" class="detail-image">
            </div>
          ` : `
            <div class="place-detail-image place-image-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `}

          <div class="place-detail-info">
            <div class="detail-badge">
              <span>${escapeHtml(placeType)}</span>
            </div>

            <h1 class="detail-place-name">${escapeHtml(place.name)}</h1>

            <div class="place-rating">
              <span class="rating-stars">${'★'.repeat(Math.floor(rating))}${rating % 1 >= 0.5 ? '½' : ''}</span>
              <span class="rating-value">${formatRating(rating)}</span>
              ${place.user_ratings_total ? `
                <span class="rating-count">(${place.user_ratings_total.toLocaleString()} reviews)</span>
              ` : ''}
            </div>

            ${priceLevel ? `
              <div class="place-price">${priceLevel}</div>
            ` : ''}

            ${isOpen !== undefined ? `
              <div class="place-status ${isOpen ? 'open' : 'closed'}">
                ${isOpen ? '● Open now' : '● Closed'}
              </div>
            ` : ''}

            <p class="detail-address">${escapeHtml(place.formatted_address)}</p>

            <div class="detail-actions">
              <button class="maps-link-button" onclick="window.openInGoogleMaps('${escapeHtml(place.place_id)}', ${lat}, ${lng})">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Google Maps
              </button>
            </div>
          </div>
        </div>

        ${place.business_status ? `
          <div class="detail-section">
            <h3 class="detail-section-title">Business Status</h3>
            <p>${escapeHtml(place.business_status)}</p>
          </div>
        ` : ''}

        ${place.types && place.types.length > 0 ? `
          <div class="detail-section">
            <h3 class="detail-section-title">Types</h3>
            <div class="types-list">
              ${place.types.map((type: string) => `
                <span class="type-badge">${escapeHtml(type.replace(/_/g, ' '))}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Make functions available globally for onclick handlers
  (window as any).goBackToList = goBackToList;
  (window as any).openInGoogleMaps = openInGoogleMaps;
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
  // Add any cleanup logic specific to this app
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

// Export empty object to ensure this file is treated as an ES module
export {};
