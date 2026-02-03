# BrightData Website Scrape MCP App

A beautiful, modern MCP app template for displaying BrightData website scrape results. Built with TypeScript, featuring smooth animations, dark mode support, and responsive design.

## Features

- 🎨 **Beautiful UI** - Modern, gradient-based design with smooth animations
- 🌓 **Dark Mode** - Automatic theme detection and switching
- 📱 **Responsive** - Works perfectly on all screen sizes
- ⚡ **Fast** - Optimized rendering with anime.js animations
- 🔒 **Secure** - XSS protection with HTML escaping
- 📊 **Rich Content** - Markdown rendering and HTML display

## Data Format

The app expects BrightData scrape results in the following format:

```json
{
  "status_code": 200,
  "body": "Apigene MCP Gateway | AI Orchestration for Any Tools, Any AI Platform\n\n..."
}
```

### Supported Formats

- Direct format: `{ status_code: 200, body: "..." }`
- Nested in `message.template_data`
- Nested in `message.response_content`
- Common patterns: `data.results`, `data.items`, `data.records`

## Usage

1. **Copy the template directory**
   ```bash
   cp -r brightdata-scrape my-brightdata-app
   ```

2. **Configure in your MCP server**
   - Point your MCP server's UI template handler to `mcp-app.html`
   - Ensure CSP is configured for external resources (Google Fonts, Material Icons)

3. **CSP Configuration**
   If using external resources, configure CSP in your MCP server:
   ```javascript
   resourceDomains: [
     "https://fonts.googleapis.com",
     "https://fonts.gstatic.com"
   ]
   ```

## Customization

### Colors

Edit `src/mcp-app.css` to customize the color scheme:

```css
:root {
  --primary-color: #ff6b35;  /* BrightData orange */
  --primary-hover: #e55a2b;
  /* ... */
}
```

### Styling

- `src/mcp-app.css` - Template-specific styles
- `src/global.css` - Base styles (do not modify)

### Functionality

Edit `src/mcp-app.ts` to customize:
- Data unwrapping logic
- Rendering format
- Additional features

## File Structure

```
brightdata-scrape/
├── mcp-app.html          # Main HTML file
├── src/
│   ├── mcp-app.ts        # TypeScript logic
│   ├── mcp-app.css       # Template-specific styles
│   ├── global.css        # Common base styles (DO NOT MODIFY)
│   └── anime.min.js      # Animation library
└── README.md             # This file
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Same as the base template.
