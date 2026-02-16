# Template metadata for the Template Lab

Templates can include an optional **`template-metadata.json`** file in their directory. The Template Lab uses it to let users filter templates by UI elements and MCP features.

## File location

Place the file in the template root:

```
templates/<template-name>/template-metadata.json
```

## Schema

```json
{
  "uiElements": ["card", "search"],
  "mcpFeatures": ["tool-result", "host-context"]
}
```

- **`uiElements`** (optional, array of strings): UI patterns used in the app.
- **`mcpFeatures`** (optional, array of strings): MCP protocol features the app uses.

If the file is missing or invalid, both arrays are treated as empty (template still appears; it just won’t match any filter).

## Allowed values

### UI elements (`uiElements`)

| Value            | Description                                      |
|------------------|--------------------------------------------------|
| `chart`          | Charts (e.g. Chart.js, bar/line/pie)            |
| `graph`          | Graphs (network, flow, etc.)                     |
| `table`          | Tabular data in a table                          |
| `list`           | List of items (simple list, not table)           |
| `search`         | Search input or filter UI                        |
| `dialog`         | Modal or dialog                                  |
| `form`           | Form inputs (e.g. create session, submit)        |
| `card`           | Card layout (product cards, content cards)       |
| `pagination`     | Prev/next or page numbers                        |
| `iframe`         | Embedded iframe (e.g. browser view)              |
| `image-gallery`  | Multiple images / media gallery                  |

### MCP features (`mcpFeatures`)

| Value               | Description                                           |
|---------------------|-------------------------------------------------------|
| `tool-result`       | Receives `ui/notifications/tool-result` (display only) |
| `host-context`      | Uses theme/displayMode from host context              |
| `call-server-tool`  | App calls server tools from the UI                    |
| `send-message`      | App sends messages to the host                        |

## Example

For a template that shows product cards and uses tool-result + host-context:

**templates/my-shopping-app/template-metadata.json**

```json
{
  "uiElements": ["card", "list"],
  "mcpFeatures": ["tool-result", "host-context"]
}
```

Users in the Template Lab can then filter by “card” or “list” and by “tool-result” or “host-context” to find this template.
