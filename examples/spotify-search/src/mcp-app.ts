/* ============================================
   SPOTIFY SEARCH MCP APP (SDK VERSION)
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

const APP_NAME = "Spotify Search";
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
  
  // Format 1: response_content at top level (API gateway format)
  if (data.response_content) {
    return data;
  }
  
  // Format 2: Standard table format { columns: [], rows: [] }
  if (data.columns || (Array.isArray(data.rows) && data.rows.length > 0) || 
      (typeof data === 'object' && !data.message)) {
    return data;
  }
  
  // Format 3: Nested in message.template_data (3rd party MCP clients)
  if (data.message?.template_data) {
    return data.message.template_data;
  }
  
  // Format 4: Nested in message.response_content (3rd party MCP clients)
  if (data.message?.response_content) {
    return data.message.response_content;
  }
  
  // Format 5: Common nested patterns
  if (data.data?.results) return data.data.results;
  if (data.data?.items) return data.data.items;
  if (data.data?.records) return data.data.records;
  if (data.results) return data.results;
  if (data.items) return data.items;
  if (data.records) return data.records;
  
  // Format 6: Direct rows array
  if (Array.isArray(data.rows)) {
    return data;
  }
  
  // Format 7: If data itself is an array
  if (Array.isArray(data)) {
    return { rows: data };
  }
  
  // Format 8: Handle raw JSON strings (fallback)
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
  
  return data;
}


/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str: any): string {
  if (typeof str !== "string") return str;
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
 * Format duration in milliseconds to MM:SS format
 */
function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get best album image URL (prefer 300x300, fallback to largest)
 */
function getAlbumImage(album: any): string {
  if (!album?.images || album.images.length === 0) {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="%23191919" width="300" height="300"/><text fill="%23b3b3b3" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14">No Image</text></svg>';
  }
  
  // Prefer 300x300, then largest available
  const image300 = album.images.find((img: any) => img.width === 300);
  if (image300) return image300.url;
  
  return album.images[0].url; // Largest is usually first
}

/**
 * Get artist names as comma-separated string
 */
function getArtistNames(artists: any[]): string {
  if (!artists || artists.length === 0) return 'Unknown Artist';
  return artists.map((a: any) => a.name).join(', ');
}

let currentAudio: HTMLAudioElement | null = null;
let currentlyPlayingId: string | null = null;
let selectedTrackId: string | null = null;
let tracksData: any[] = [];

/**
 * Play track preview
 */
function playTrack(trackId: string, previewUrl: string | null, spotifyUrl: string) {
  // If clicking the same track that's playing, pause it
  if (currentlyPlayingId === trackId && currentAudio) {
    stopPlayback();
    return;
  }
  
  // Stop current audio if playing different track
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  // Update UI for previous track (card view)
  const prevButton = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .play-button`);
  if (prevButton) {
    prevButton.classList.remove('playing');
    const prevPlayIcon = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .play-icon`);
    const prevPauseIcon = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .pause-icon`);
    if (prevPlayIcon) (prevPlayIcon as HTMLElement).style.display = 'block';
    if (prevPauseIcon) (prevPauseIcon as HTMLElement).style.display = 'none';
  }
  
  // Update detail view buttons if visible
  const prevDetailButton = document.querySelector('.detail-play-button');
  const prevDetailPlayIcon = document.querySelector('.detail-play-button .play-icon');
  const prevDetailPauseIcon = document.querySelector('.detail-play-button .pause-icon');
  if (prevDetailButton) {
    prevDetailButton.classList.remove('playing');
    if (prevDetailPlayIcon) (prevDetailPlayIcon as HTMLElement).style.display = 'block';
    if (prevDetailPauseIcon) (prevDetailPauseIcon as HTMLElement).style.display = 'none';
  }
  
  const prevActionButton = document.querySelector('.spotify-play-button');
  const prevActionPlayIcon = document.querySelector('.spotify-play-button .play-icon');
  const prevActionPauseIcon = document.querySelector('.spotify-play-button .pause-icon');
  if (prevActionButton) {
    prevActionButton.classList.remove('playing');
    if (prevActionPlayIcon) (prevActionPlayIcon as HTMLElement).style.display = 'block';
    if (prevActionPauseIcon) (prevActionPauseIcon as HTMLElement).style.display = 'none';
  }
  
  currentlyPlayingId = null;
  
  if (!previewUrl) {
    // No preview available, open Spotify
    window.open(spotifyUrl, '_blank');
    return;
  }
  
  // Play preview
  currentAudio = new Audio(previewUrl);
  currentAudio.play();
  currentlyPlayingId = trackId;
  
  // Update card play button
  const button = document.querySelector(`[data-track-id="${trackId}"] .play-button`);
  const playIcon = document.querySelector(`[data-track-id="${trackId}"] .play-icon`);
  const pauseIcon = document.querySelector(`[data-track-id="${trackId}"] .pause-icon`);
  if (button) {
    button.classList.add('playing');
    if (playIcon) (playIcon as HTMLElement).style.display = 'none';
    if (pauseIcon) (pauseIcon as HTMLElement).style.display = 'block';
  }
  
  // Update detail view play button if visible
  const detailButton = document.querySelector('.detail-play-button');
  const detailPlayIcon = document.querySelector('.detail-play-button .play-icon');
  const detailPauseIcon = document.querySelector('.detail-play-button .pause-icon');
  if (detailButton && selectedTrackId === trackId) {
    detailButton.classList.add('playing');
    if (detailPlayIcon) (detailPlayIcon as HTMLElement).style.display = 'none';
    if (detailPauseIcon) (detailPauseIcon as HTMLElement).style.display = 'block';
  }
  
  // Update detail view play button in actions section
  const actionButton = document.querySelector('.spotify-play-button');
  const actionPlayIcon = document.querySelector('.spotify-play-button .play-icon');
  const actionPauseIcon = document.querySelector('.spotify-play-button .pause-icon');
  if (actionButton && selectedTrackId === trackId) {
    actionButton.classList.add('playing');
    if (actionPlayIcon) (actionPlayIcon as HTMLElement).style.display = 'none';
    if (actionPauseIcon) (actionPauseIcon as HTMLElement).style.display = 'block';
  }
  
  currentAudio.addEventListener('ended', () => {
    // Update card button
    if (button) {
      button.classList.remove('playing');
      const playIcon = document.querySelector(`[data-track-id="${trackId}"] .play-icon`);
      const pauseIcon = document.querySelector(`[data-track-id="${trackId}"] .pause-icon`);
      if (playIcon) (playIcon as HTMLElement).style.display = 'block';
      if (pauseIcon) (pauseIcon as HTMLElement).style.display = 'none';
    }
    // Update detail buttons
    const detailButton = document.querySelector('.detail-play-button');
    const detailPlayIcon = document.querySelector('.detail-play-button .play-icon');
    const detailPauseIcon = document.querySelector('.detail-play-button .pause-icon');
    if (detailButton) {
      detailButton.classList.remove('playing');
      if (detailPlayIcon) (detailPlayIcon as HTMLElement).style.display = 'block';
      if (detailPauseIcon) (detailPauseIcon as HTMLElement).style.display = 'none';
    }
    const actionButton = document.querySelector('.spotify-play-button');
    const actionPlayIcon = document.querySelector('.spotify-play-button .play-icon');
    const actionPauseIcon = document.querySelector('.spotify-play-button .pause-icon');
    if (actionButton) {
      actionButton.classList.remove('playing');
      if (actionPlayIcon) (actionPlayIcon as HTMLElement).style.display = 'block';
      if (actionPauseIcon) (actionPauseIcon as HTMLElement).style.display = 'none';
    }
    currentAudio = null;
    currentlyPlayingId = null;
  });
  
  currentAudio.addEventListener('error', () => {
    // Update card button
    if (button) {
      button.classList.remove('playing');
      const playIcon = document.querySelector(`[data-track-id="${trackId}"] .play-icon`);
      const pauseIcon = document.querySelector(`[data-track-id="${trackId}"] .pause-icon`);
      if (playIcon) (playIcon as HTMLElement).style.display = 'block';
      if (pauseIcon) (pauseIcon as HTMLElement).style.display = 'none';
    }
    // Update detail buttons
    const detailButton = document.querySelector('.detail-play-button');
    const detailPlayIcon = document.querySelector('.detail-play-button .play-icon');
    const detailPauseIcon = document.querySelector('.detail-play-button .pause-icon');
    if (detailButton) {
      detailButton.classList.remove('playing');
      if (detailPlayIcon) (detailPlayIcon as HTMLElement).style.display = 'block';
      if (detailPauseIcon) (detailPauseIcon as HTMLElement).style.display = 'none';
    }
    const actionButton = document.querySelector('.spotify-play-button');
    const actionPlayIcon = document.querySelector('.spotify-play-button .play-icon');
    const actionPauseIcon = document.querySelector('.spotify-play-button .pause-icon');
    if (actionButton) {
      actionButton.classList.remove('playing');
      if (actionPlayIcon) (actionPlayIcon as HTMLElement).style.display = 'block';
      if (actionPauseIcon) (actionPauseIcon as HTMLElement).style.display = 'none';
    }
    currentAudio = null;
    currentlyPlayingId = null;
  });
}

/**
 * Stop current playback
 */
function stopPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentlyPlayingId) {
    // Update card button
    const button = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .play-button`);
    if (button) {
      button.classList.remove('playing');
      const playIcon = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .play-icon`);
      const pauseIcon = document.querySelector(`[data-track-id="${currentlyPlayingId}"] .pause-icon`);
      if (playIcon) (playIcon as HTMLElement).style.display = 'block';
      if (pauseIcon) (pauseIcon as HTMLElement).style.display = 'none';
    }
    // Update detail buttons
    const detailButton = document.querySelector('.detail-play-button');
    const detailPlayIcon = document.querySelector('.detail-play-button .play-icon');
    const detailPauseIcon = document.querySelector('.detail-play-button .pause-icon');
    if (detailButton) {
      detailButton.classList.remove('playing');
      if (detailPlayIcon) (detailPlayIcon as HTMLElement).style.display = 'block';
      if (detailPauseIcon) (detailPauseIcon as HTMLElement).style.display = 'none';
    }
    const actionButton = document.querySelector('.spotify-play-button');
    const actionPlayIcon = document.querySelector('.spotify-play-button .play-icon');
    const actionPauseIcon = document.querySelector('.spotify-play-button .pause-icon');
    if (actionButton) {
      actionButton.classList.remove('playing');
      if (actionPlayIcon) (actionPlayIcon as HTMLElement).style.display = 'block';
      if (actionPauseIcon) (actionPauseIcon as HTMLElement).style.display = 'none';
    }
    currentlyPlayingId = null;
  }
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
   4. Call notifySizeChanged() after rendering completes
   5. Handle errors gracefully with try/catch
   ============================================ */

function renderData(data: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Stop any playing audio when re-rendering (but keep track selection)
  if (!selectedTrackId) {
    stopPlayback();
  }
  
  if (!data) {
    showEmpty('No data received');
    return;
  }

  try {
    const unwrapped = unwrapData(data);
    console.log('Unwrapped data:', unwrapped);
    
    // Extract tracks from Spotify API response
    let tracks: any[] = [];
    // Handle response_content.tracks.items format (from API gateway)
    if (unwrapped?.response_content?.tracks?.items && Array.isArray(unwrapped.response_content.tracks.items)) {
      tracks = unwrapped.response_content.tracks.items;
      console.log('Found tracks in response_content.tracks.items:', tracks.length);
    } else if (unwrapped?.body?.tracks?.items && Array.isArray(unwrapped.body.tracks.items)) {
      tracks = unwrapped.body.tracks.items;
      console.log('Found tracks in body.tracks.items:', tracks.length);
    } else if (unwrapped?.tracks?.items && Array.isArray(unwrapped.tracks.items)) {
      tracks = unwrapped.tracks.items;
      console.log('Found tracks in tracks.items:', tracks.length);
    } else if (Array.isArray(unwrapped)) {
      tracks = unwrapped;
      console.log('Found tracks as direct array:', tracks.length);
    } else {
      console.warn('No tracks found in data structure. Available keys:', Object.keys(unwrapped || {}));
    }
    
    tracksData = tracks;
    
    if (tracks.length === 0) {
      console.warn('No tracks extracted. Showing empty state.');
      showEmpty('No tracks found');
      return;
    }
    
    console.log('Rendering', tracks.length, 'tracks');
    
    // Render detail view or list view
    if (selectedTrackId) {
      const track = tracks.find(t => t.id === selectedTrackId);
      if (track) {
        renderTrackDetail(track);
      } else {
        selectedTrackId = null;
        renderTracksList(tracks, unwrapped);
      }
    } else {
      renderTracksList(tracks, unwrapped);
    }
    
    // Notify host of size change after rendering completes
    setTimeout(() => {
      notifySizeChanged();
    }, 50);
    
  } catch (error: any) {
    console.error('Render error:', error);
    console.error('Data that failed to render:', data);
    showError(`Error rendering data: ${error.message}`);
  }
}

function renderTracksList(tracks: any[], unwrapped: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Get total count if available (handle multiple data formats)
  const total = unwrapped?.response_content?.tracks?.total || 
                unwrapped?.body?.tracks?.total || 
                unwrapped?.tracks?.total || 
                tracks.length;
  
  app.innerHTML = `
    <div class="spotify-container">
      <div class="spotify-header">
        <div class="spotify-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <h1 class="spotify-title">Search Results</h1>
        <div class="spotify-subtitle">${total} track${total !== 1 ? 's' : ''} found</div>
      </div>
      <div class="tracks-grid">
        ${tracks.map((track: any) => {
          const imageUrl = getAlbumImage(track.album);
          const artistNames = getArtistNames(track.artists || []);
          const duration = formatDuration(track.duration_ms);
          const previewUrl = track.preview_url;
          const spotifyUrl = track.external_urls?.spotify || '#';
          const hasPreview = !!previewUrl;
          
          return `
            <div class="track-card" data-track-id="${escapeHtml(track.id)}">
              <div class="track-image-wrapper">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(track.album?.name || 'Album')}" class="track-image" loading="lazy">
                <div class="track-overlay">
                  <button class="play-button" onclick="event.stopPropagation(); playTrack('${escapeHtml(track.id)}', ${hasPreview ? `'${escapeHtml(previewUrl)}'` : 'null'}, '${escapeHtml(spotifyUrl)}')" title="${hasPreview ? 'Play preview' : 'Open in Spotify'}">
                    ${hasPreview ? `
                      <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ` : `
                      <svg class="spotify-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    `}
                  </button>
                </div>
              </div>
              <div class="track-info">
                <h3 class="track-name" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</h3>
                <p class="track-artist" title="${escapeHtml(artistNames)}">${escapeHtml(artistNames)}</p>
                <div class="track-meta">
                  <span class="track-album">${escapeHtml(track.album?.name || 'Unknown Album')}</span>
                  <span class="track-duration">${duration}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  // Add click handlers for cards (to view details)
  const cards = app.querySelectorAll('.track-card');
  cards.forEach(card => {
    const trackId = card.getAttribute('data-track-id');
    if (trackId) {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking buttons
        if ((e.target as HTMLElement).closest('.play-button')) return;
        viewTrackDetails(trackId);
      });
    }
  });
}

function renderTrackDetail(track: any) {
  const app = document.getElementById('app');
  if (!app) return;
  
  const imageUrl = getAlbumImage(track.album);
  const artistNames = getArtistNames(track.artists || []);
  const duration = formatDuration(track.duration_ms);
  const previewUrl = track.preview_url;
  const spotifyUrl = track.external_urls?.spotify || '#';
  const hasPreview = !!previewUrl;
  const albumReleaseDate = track.album?.release_date || 'Unknown';
  const albumType = track.album?.album_type || 'album';
  const popularity = track.popularity || 0;
  const isExplicit = track.explicit || false;
  const trackNumber = track.track_number || 'N/A';
  const discNumber = track.disc_number || 1;
  
  // Format release date
  let formattedDate = albumReleaseDate;
  if (albumReleaseDate && albumReleaseDate !== 'Unknown') {
    try {
      const date = new Date(albumReleaseDate);
      formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      // Keep original if parsing fails
    }
  }
  
  app.innerHTML = `
    <div class="spotify-container">
      <div class="spotify-header">
        <button class="back-button" onclick="viewTracksList()" title="Back to list">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="spotify-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div>
          <h1 class="spotify-title">Track Details</h1>
        </div>
      </div>
      
      <div class="track-detail">
        <div class="track-detail-main">
          <div class="track-detail-image">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(track.album?.name || 'Album')}" class="detail-album-image">
            <div class="detail-play-overlay">
              <button class="detail-play-button" onclick="playTrack('${escapeHtml(track.id)}', ${hasPreview ? `'${escapeHtml(previewUrl)}'` : 'null'}, '${escapeHtml(spotifyUrl)}')" title="${hasPreview ? 'Play preview' : 'Open in Spotify'}">
                ${hasPreview ? `
                  <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ` : `
                  <svg class="spotify-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                `}
              </button>
            </div>
          </div>
          <div class="track-detail-info">
            <div class="detail-badge">${isExplicit ? '<span class="explicit-badge">E</span>' : ''} ${albumType.charAt(0).toUpperCase() + albumType.slice(1)}</div>
            <h2 class="detail-track-name">${escapeHtml(track.name)}</h2>
            <p class="detail-track-artist">
              ${track.artists?.map((artist: any, idx: number) => `
                <a href="${escapeHtml(artist.external_urls?.spotify || '#')}" target="_blank" class="artist-link">${escapeHtml(artist.name)}</a>${idx < track.artists.length - 1 ? ', ' : ''}
              `).join('') || 'Unknown Artist'}
            </p>
            <div class="detail-stats">
              <div class="detail-stat">
                <span class="stat-label">Popularity</span>
                <div class="popularity-bar">
                  <div class="popularity-fill" style="width: ${popularity}%"></div>
                </div>
                <span class="stat-value">${popularity}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="track-detail-sections">
          <div class="detail-section">
            <h3 class="detail-section-title">Album Information</h3>
            <div class="detail-section-content">
              <div class="detail-row">
                <span class="detail-label">Album:</span>
                <a href="${escapeHtml(track.album?.external_urls?.spotify || '#')}" target="_blank" class="detail-link">${escapeHtml(track.album?.name || 'Unknown Album')}</a>
              </div>
              <div class="detail-row">
                <span class="detail-label">Release Date:</span>
                <span class="detail-value">${escapeHtml(formattedDate)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Track Number:</span>
                <span class="detail-value">${trackNumber}${discNumber > 1 ? ` (Disc ${discNumber})` : ''}</span>
              </div>
              ${track.album?.total_tracks ? `
                <div class="detail-row">
                  <span class="detail-label">Total Tracks:</span>
                  <span class="detail-value">${track.album.total_tracks}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="detail-section">
            <h3 class="detail-section-title">Track Information</h3>
            <div class="detail-section-content">
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${duration}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Preview:</span>
                <span class="detail-value">${hasPreview ? 'Available' : 'Not available'}</span>
              </div>
              ${track.external_ids?.isrc ? `
                <div class="detail-row">
                  <span class="detail-label">ISRC:</span>
                  <span class="detail-value detail-value-monospace">${escapeHtml(track.external_ids.isrc)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="detail-section">
            <h3 class="detail-section-title">Artists</h3>
            <div class="detail-section-content">
              ${track.artists?.map((artist: any) => `
                <div class="detail-row">
                  <span class="detail-label">${escapeHtml(artist.name)}:</span>
                  <a href="${escapeHtml(artist.external_urls?.spotify || '#')}" target="_blank" class="detail-link">View on Spotify</a>
                </div>
              `).join('') || '<div class="detail-row">No artist information</div>'}
            </div>
          </div>
          
          <div class="detail-section">
            <h3 class="detail-section-title">Actions</h3>
            <div class="detail-section-content">
              <div class="detail-actions">
                <a href="${escapeHtml(spotifyUrl)}" target="_blank" class="spotify-link-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Open in Spotify
                </a>
                ${hasPreview ? `
                  <button class="spotify-play-button" onclick="playTrack('${escapeHtml(track.id)}', '${escapeHtml(previewUrl)}', '${escapeHtml(spotifyUrl)}')">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                    Play Preview
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Update play button state if this track is currently playing
  if (currentlyPlayingId === track.id) {
    // Update overlay play button
    const button = document.querySelector(`.detail-play-button`);
    const playIcon = document.querySelector(`.detail-play-button .play-icon`);
    const pauseIcon = document.querySelector(`.detail-play-button .pause-icon`);
    if (button) {
      button.classList.add('playing');
      if (playIcon) (playIcon as HTMLElement).style.display = 'none';
      if (pauseIcon) (pauseIcon as HTMLElement).style.display = 'block';
    }
    // Update action play button
    const actionButton = document.querySelector(`.spotify-play-button`);
    const actionPlayIcon = document.querySelector(`.spotify-play-button .play-icon`);
    const actionPauseIcon = document.querySelector(`.spotify-play-button .pause-icon`);
    if (actionButton) {
      actionButton.classList.add('playing');
      if (actionPlayIcon) (actionPlayIcon as HTMLElement).style.display = 'none';
      if (actionPauseIcon) (actionPauseIcon as HTMLElement).style.display = 'block';
    }
  }
}

// Global navigation functions
function viewTrackDetails(trackId: string) {
  selectedTrackId = trackId;
  renderData({ body: { tracks: { items: tracksData } } });
}

function viewTracksList() {
  selectedTrackId = null;
  renderData({ body: { tracks: { items: tracksData } } });
}

// Make functions globally accessible
(window as any).viewTrackDetails = viewTrackDetails;
(window as any).viewTracksList = viewTracksList;

// Make playTrack globally accessible
(window as any).playTrack = playTrack;

/* ============================================
   MESSAGE HANDLER (Standardized MCP Protocol)
   ============================================
   
   This handles all incoming messages from the MCP host.
   You typically don't need to modify this section.
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
    
    // - Cancel any pending requests (if you track them)
    // - Destroy chart instances, etc. (template-specific cleanup)
    
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
        console.log('Received tool-result data:', data);
        renderData(data);
      } else {
        console.warn('ui/notifications/tool-result received but no data found:', msg);
        showEmpty('No data received');
      }
      break;
      
    case 'ui/notifications/host-context-changed':
      if (msg.params?.theme) {
        applyDocumentTheme(msg.params.theme);
      }
      if (msg.params?.styles?.css?.fonts) {
        applyHostFonts(msg.params.styles.css.fonts);
      }
      if (msg.params?.styles?.variables) {
        applyHostStyleVariables(msg.params.styles.variables);
      }
      if (msg.params?.displayMode) {
        handleDisplayModeChange(msg.params.displayMode);
      }
      break;
      
    case 'ui/notifications/tool-input':
      // Tool input notification - Host MUST send this with complete tool arguments
      const toolArguments = msg.params?.arguments;
      if (toolArguments) {
        // Store tool arguments for reference (may be needed for context)
        // Template-specific: You can use this for initial rendering or context
        console.log('Tool input received:', toolArguments);
        // Example: Show loading state with input parameters
        // Example: Store for later use in renderData()
      }
      break;
      
    case 'ui/notifications/tool-cancelled':
      // Tool cancellation notification - Host MUST send this if tool is cancelled
      const reason = msg.params?.reason || 'Tool execution was cancelled';
      showError(`Operation cancelled: ${reason}`);
      // Clean up any ongoing operations
      // - Stop timers
      // - Cancel pending requests
      // - Reset UI state
      break;
      
    case 'ui/notifications/initialized':
      // Initialization notification (optional - handle if needed)
      break;
      
    default:
      // Unknown method - try to extract data as fallback
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
   MCP COMMUNICATION
   ============================================
   
   Functions for communicating with the MCP host.
   You typically don't need to modify this section.
   ============================================ */

let requestIdCounter = 1;
function sendRequest(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestIdCounter++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, '*');
    
    const listener = (event: MessageEvent) => {
      if (event.data?.id === id) {
        window.removeEventListener('message', listener);
        if (event.data?.result) {
          resolve(event.data.result);
        } else if (event.data?.error) {
          reject(new Error(event.data.error.message || 'Unknown error'));
        }
      }
    };
    window.addEventListener('message', listener);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

function sendNotification(method: string, params: any) {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, '*');
}

/* ============================================
   DISPLAY MODE HANDLING
   ============================================
   
   Handles switching between inline and fullscreen display modes.
   You may want to customize handleDisplayModeChange() to adjust
   your layout for fullscreen mode.
   ============================================ */

let currentDisplayMode = 'inline';

function handleDisplayModeChange(mode: string) {
  currentDisplayMode = mode;
  if (mode === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
    // Adjust layout for fullscreen if needed
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '100%';
      (container as HTMLElement).style.padding = '20px';
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    // Restore normal layout
    const container = document.querySelector('.container');
    if (container) {
      (container as HTMLElement).style.maxWidth = '';
      (container as HTMLElement).style.padding = '';
    }
  }
  // Notify host of size change after mode change
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

function requestDisplayMode(mode: string): Promise<any> {
  return sendRequest('ui/request-display-mode', { mode: mode })
    .then(result => {
      if (result?.mode) {
        handleDisplayModeChange(result.mode);
      }
      return result;
    })
    .catch(err => {
      console.warn('Failed to request display mode:', err);
      throw err;
    });
}

// Make function globally accessible for testing/debugging
(window as any).requestDisplayMode = requestDisplayMode;

/* ============================================
   SIZE CHANGE NOTIFICATIONS
   ============================================
   
   Notifies the host when the content size changes.
   This is critical for proper iframe sizing.
   You typically don't need to modify this section.
   ============================================ */

function notifySizeChanged() {
  const width = document.body.scrollWidth || document.documentElement.scrollWidth;
  const height = document.body.scrollHeight || document.documentElement.scrollHeight;
  
  sendNotification('ui/notifications/size-changed', {
    width: width,
    height: height
  });
}

// Debounce function to avoid too many notifications
let sizeChangeTimeout: NodeJS.Timeout | null = null;
function debouncedNotifySizeChanged() {
  if (sizeChangeTimeout) {
    clearTimeout(sizeChangeTimeout);
  }
  sizeChangeTimeout = setTimeout(() => {
    notifySizeChanged();
  }, 100); // Wait 100ms after last change
}

// Use ResizeObserver to detect size changes
let resizeObserver: ResizeObserver | null = null;
function setupSizeObserver() {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      debouncedNotifySizeChanged();
    });
    resizeObserver.observe(document.body);
  } else {
    // Fallback: use window resize and mutation observer
    window.addEventListener('resize', debouncedNotifySizeChanged);
    const mutationObserver = new MutationObserver(debouncedNotifySizeChanged);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // Send initial size after a short delay to ensure content is rendered
  setTimeout(() => {
    notifySizeChanged();
  }, 100);
}

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
