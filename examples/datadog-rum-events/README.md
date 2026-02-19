# Datadog RUM Events

MCP App template that displays **Datadog RUM (Real User Monitoring) view events** with a Datadog-style UI: list view and detail view.

## Data shape

Expects the tool result to be the **Datadog RUM events API response** (or its `body`), e.g. from:

`GET https://api.datadoghq.eu/api/v2/rum/events?filter[query]=@type:view&...`

- **Full response**: `{ status_code, headers, body }` — the app uses `body`.
- **Body only**: `{ data: RumEvent[], meta?, links? }` — the app uses `data` as the list of events.

Each event in `data` should have:

- `id`, `type` (e.g. `"rum"`), `timestamp`
- `attributes`: `view` (name, url, url_host, time_spent, error.count, loading_type, performance, …), `usr`, `application`, `geo`, `device`, `browser`, `connectivity`, `session`, etc.

## Features

- **List view**: Cards for each view event with path, host, app name, user, relative time, time on view, loading type, and error count badge.
- **Detail view**: Click a card to open a detailed panel with sections: View, User, Application, Geo, Device, Browser, Performance, Connectivity, Session.
- **Datadog-style UI**: Purple accent (`#7754c0`), clean panels, badges, and dark mode support.

## Build

```bash
npm install
npm run build
```

Output: `dist/mcp-app.html` (single-file bundle).

## Copy from base template

This example was created from `base-template-sdk` and customized for Datadog RUM events. To create a similar template:

```bash
cp -r examples/base-template-sdk examples/my-rum-viewer
# Then update APP_NAME, renderData(), and styles in the new example.
```
