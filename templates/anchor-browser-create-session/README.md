# Anchor Browser Create Session – MCP App

View and control live [Anchor Browser](https://anchorbrowser.io) sessions from the `anchor-browser-create-session` tool result.

## Data contract

Expects tool result (or API response) with session data:

- **`data.id`** – Unique session identifier
- **`data.cdp_url`** – CDP WebSocket URL (optional)
- **`data.live_view_url`** – Live view URL (embedded in iframe)

Supports both shapes:

- `body.data` (full API response: `{ body: { data: { id, cdp_url, live_view_url } } }`)
- Direct `data` or `params` with `id`, `cdp_url`, `live_view_url`

## Features

- **Session header** – Session ID with copy button
- **Controls** – “Open live view in new tab” and “Copy CDP URL”
- **Live view** – Embedded iframe of the session live view

## CSP (Content Security Policy)

This app embeds the Anchor live view in an iframe. When serving the app via `resources/read`, set:

- **`frameDomains`**: `["https://live.anchorbrowser.io"]`

See `CSP_GUIDE.md` for full CSP configuration.

## Build

```bash
cd templates/anchor-browser-create-session
npm install
npm run build
```

Output: `dist/mcp-app.html`

## Preview

Use `response.json` in this directory with the template lab / MCP Apps Playground for local preview.
