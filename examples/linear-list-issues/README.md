# Linear List Issues

MCP App that displays Linear issues in a list/detail layout with Linear-style UI.

## Data format

Expects tool result in one of these shapes:

- **Content array** (recommended): `content[0].type === "text"` and `content[0].text.issues` is the array of issues; optional `content[0].text.hasNextPage`.
- **Direct**: `data.issues` as array.
- **Array**: payload is the issues array itself.

## Features

- **List view**: Table with Identifier, Title, Status, Priority, Assignee, Team. Click a row to open the detail view; selected row is highlighted.
- **Detail view**: Full issue (description, dates, assignee, branch, labels, link to Linear). “Back to list” returns to the table.
- **Search**: Filters by title, identifier, and description.
- **Filters**: Status, Priority, and Assignee dropdowns.

## Build

```bash
npm install
npm run build
```

Output: `dist/mcp-app.html`

## Preview

Use the MCP Apps Playground and point it at this template with `response.json` for mock data.
