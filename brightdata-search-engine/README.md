# BrightData Search Engine MCP App

This MCP app displays search results from BrightData's search_engine tool in a beautiful, interactive interface.

## Features

- **Search Results Display**: Shows organic search results with title, description, and source URL
- **Expandable Cards**: Click on any result to expand and see full details
- **Search & Filter**: Search within results and filter by unique domains
- **Dark Mode Support**: Automatically adapts to system theme preferences
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Favicon Display**: Shows favicons for each result's domain

## Response Format

The app expects data in the following format:

```json
{
  "status_code": 200,
  "body": {
    "organic": [
      {
        "link": "https://example.com/",
        "title": "Example Title",
        "description": "Example description text..."
      }
    ],
    "current_page": 1
  }
}
```

## Usage

This app is designed to work with BrightData's `search_engine` tool. It automatically handles various response formats including:

- Direct BrightData API responses: `{status_code: 200, body: {...}}`
- Claude format: `{message: {status_code: 200, response_content: {...}}}`
- Nested formats from various MCP clients

## File Structure

```
brightdata-search-engine/
├── mcp-app.html          # Main HTML file
├── src/
│   ├── mcp-app.ts        # TypeScript logic
│   ├── mcp-app.css       # Template-specific styles
│   └── global.css        # Common base styles
└── README.md             # This file
```

## Customization

The app uses BrightData's brand colors (orange gradient) and includes:

- Custom header with BrightData icon
- Search input for filtering results
- Category filters (All, Unique Domains)
- Expandable result cards with detailed information
- Responsive layout for mobile devices

## Based On

This app is based on:
- `base-template/` - For MCP protocol handling and common utilities
- `brightdata-search/` - For search result rendering patterns
