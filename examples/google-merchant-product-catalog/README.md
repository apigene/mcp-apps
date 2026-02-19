# Google Merchant Product Catalog MCP App

Displays product catalog from **Google Shopping Content API** (Content API for Shopping, `content/v2.1/products` list response).

## Data format

Expects tool result with Google Content API products list response:

- **Direct**: `body.resources` array of `content#product` items.
- **Wrapped**: If the tool returns `{ status_code, headers, body }`, the app uses `body.resources`.

Each product may include: `id`, `offerId`, `title`, `description`, `link`, `imageLink`, `additionalImageLinks`, `price` (e.g. `{ value: "79.99", currency: "USD" }`), `brand`, `color`, `sizes`, `availability`, `productTypes`, `condition`, `targetCountry`, `feedLabel`, `channel`.

## Features

- **Grid / List view** with toggle
- **Filters**: Search, Brand, Color, Size, Price range, Availability
- **Sort**: Relevance, Price (low/high), Name A–Z
- **Product cards**: Image, title, brand, price, color, sizes, availability, link
- **Detail modal**: Full description, images, attributes, product link
- **Compare**: Select multiple products and compare in a table
- **Dark mode** and **fullscreen** supported

## Build

```bash
npm install
npm run build
```

Output: `dist/mcp-app.html`

## API reference

- [Content API for Shopping – Products](https://developers.google.com/shopping-content/guides/quickstart)
