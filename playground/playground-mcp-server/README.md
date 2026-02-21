# Template MCP Server

Root-level MCP dev server for full UI integration testing in MCP hosts (Claude, MCPJam, etc.).

## Behavior

**Tools:** `list_demo_apps`, `show_demo_app`, and one per-template tool per app (e.g. `show_demo_xyz-users`).

## CSP Configuration

The server includes Content Security Policy (CSP) metadata in resource responses as per the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx).

### Adding CSP for New Templates

When creating a new template that requires external resources (APIs, images, etc.), add its CSP configuration to `TEMPLATE_CSP_CONFIGS` in `server.ts`:

```typescript
const TEMPLATE_CSP_CONFIGS: Record<string, CSPConfig> = {
  "my-new-template": {
    connectDomains: ["https://api.example.com"],  // For API calls
    resourceDomains: ["https://cdn.example.com"], // For images, fonts, etc.
    frameDomains: [],                              // For embedded iframes
    baseUriDomains: [],                            // Usually empty
  },
};
```

### CSP Fields

- **connectDomains**: Origins for network requests (fetch/XHR/WebSocket)
- **resourceDomains**: Origins for static resources (images, scripts, stylesheets, fonts, media)
- **frameDomains**: Origins for nested iframes
- **baseUriDomains**: Allowed base URIs for the document

Templates without a CSP configuration use restrictive defaults (no external resources).

## Permissions Configuration

MCP Apps can request special browser permissions through the `permissions` field in resource metadata. According to the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx), the following permissions are supported:

### Available Permissions

- **camera**: Access to the device camera
- **microphone**: Access to the device microphone
- **geolocation**: Access to the user's location
- **clipboardWrite**: Permission to write to the system clipboard

### Example: Adding Permissions to a Template

```typescript
return {
  contents: [
    {
      uri: template.resourceUri,
      mimeType: RESOURCE_MIME_TYPE,
      text: html,
      _meta: {
        ui: {
          csp: { /* ... */ },
          permissions: ["clipboardWrite"],  // Request clipboard access
          prefersBorder: true,
        },
      },
    },
  ],
};
```

### Notes on Permissions

1. **HTML5 Audio/Video**: Standard audio and video playback via `<audio>` or `<video>` elements does not require MCP permissions. These are standard browser APIs that work without explicit permission requests.

2. **User Gesture Requirements**: Modern browsers require user gestures (clicks) before playing audio. MCP Apps handle this naturally through play button click events.

3. **Permission Prompts**: When an MCP App requests permissions, the host may prompt the user for consent before granting access.

4. **Minimal Permissions**: Only request permissions that are strictly necessary for your app's functionality. This improves user trust and acceptance rates.

### Tool Visibility

All tools are registered with `visibility: ["model", "app"]` allowing them to be:
- Called by the AI model
- Invoked from the UI app itself

### `list_demo_apps`
- No arguments. Returns all MCP app templates available to demo.
- Structured content: `{ ok, count, apps: [ { name, tool } ] }`.
- Use this to discover which apps you can open before calling `show_demo_app` or a specific tool.

### `show_demo_app`
- Accepts either:
  - `template`: folder name (e.g. `xyz-users`)
  - `request`: natural phrase, e.g. `show demo app xyz-users`
- If template exists and is built, opens `templates/<template>/dist/mcp-app.html` (or source) and sends mock payload.
- If template exists but is not built, server auto-runs build before opening.
- If template does not exist, returns `Template not found: <name>` and lists available templates.
- If template exists, returns the concrete UI tool name to call (e.g. `show_demo_xyz-users`).

### Per-template UI tools
- One tool is registered for each template folder in `templates/`:
  - `show_demo_xyz-users`
  - `show_demo_vercel-deployments-sdk`
  - etc.
- These tools open template-specific resource URIs, so UI does not get stuck on the previous template.
- Missing `dist/mcp-app.html` is auto-generated on first call (`npm run build`, fallback `npm install` + build).
- Payload source:
  1. `examples/<name>/response.json`
  2. fallback: `playground/playground-app/mock-data/default.json`

Example tool calls:

```json
{ "name": "list_demo_apps" }
```

```json
{ "name": "show_demo_app", "arguments": { "template": "xyz-users" } }
```

```json
{ "name": "show_demo_app", "arguments": { "request": "show demo app xyz-users" } }
```

## Run

```bash
cd tools/template-mcp-server
npm install
npm run server:http    # http://localhost:3001/mcp
```

For stdio clients:

```bash
npm run server:stdio
```
