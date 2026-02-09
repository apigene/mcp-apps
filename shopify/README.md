# Shopify Catalog MCP App

A simple, clean horizontal scrollable catalog layout for Shopify products, inspired by modern shopping interfaces.

## ✨ Features

### Layout
- **Horizontal Scrollable Carousel**: Smooth scrolling product cards
- **Navigation Arrows**: Left/right buttons to navigate through products
- **Dark Theme**: Modern dark background with white product cards
- **Clean Design**: Minimal, focused on product images and key information

### Product Cards
- **Large Product Image**: Prominent product image at the top
- **Product Title**: Clear, readable product name
- **Price Display**: Formatted price with currency
- **Star Ratings**: Visual star ratings with review counts (e.g., "4.5 ⭐ (1.2K)")
- **Shop Information**: Shop name with colored logo badge
- **Place Order Button**: Prominent call-to-action button

### Header
- **Logo**: Simple logo with "Z" icon
- **App Title**: "Zen Shopping" branding
- **Action Buttons**: Like/Dislike buttons (UI only, can be extended)

## 📊 Data Format

The app expects Shopify catalog data in the following format:

```json
{
  "status_code": 200,
  "body": {
    "offers": [
      {
        "id": "gid://shopify/p/...",
        "title": "Product Name",
        "description": "Product description",
        "media": [{"url": "https://...", "altText": "..."}],
        "priceRange": {
          "min": {"amount": 15995, "currency": "USD"},
          "max": {"amount": 15995, "currency": "USD"}
        },
        "rating": {"rating": 4.5, "count": 1200},
        "lookupUrl": "https://...",
        "variants": [
          {
            "shop": {"name": "Shop Name"}
          }
        ]
      }
    ]
  }
}
```

## 🚀 Usage

1. Products are displayed in a horizontal scrollable carousel
2. Use the left/right arrow buttons to navigate
3. Or scroll horizontally with mouse/trackpad
4. Click "Place Order" to visit the product page
5. Product cards show image, title, price, rating, and shop info

## 🎨 Design Features

- **Dark Background**: #1a1a1a for modern look
- **White Cards**: Clean white product cards with rounded corners
- **Smooth Scrolling**: Native smooth scroll behavior
- **Hover Effects**: Cards lift slightly on hover
- **Responsive**: Adapts to mobile and desktop screens
- **Shop Logos**: Colorful badges with shop initials

## 📱 Responsive

- **Mobile**: Smaller cards, adjusted spacing
- **Desktop**: Full-width carousel with navigation arrows
- **Touch Support**: Native touch scrolling on mobile devices

## 🔧 Customization

### Colors
- Modify background colors in `mcp-app.css`
- Change card colors, button colors
- Adjust shop logo colors

### Layout
- Change card width: `.product-card { flex: 0 0 300px; }`
- Adjust image height: `.product-image-container { height: 300px; }`
- Modify spacing: `.carousel-wrapper { gap: 20px; }`

### Functionality
- Add click handlers for like/dislike buttons
- Implement product detail modal
- Add filtering/search (can extend from advanced version)

## 📝 Notes

This is a simple, streamlined catalog view focused on easy browsing. For advanced features like filtering, sorting, comparison, and detailed product views, see the `shopify-catalog` app.

## 📝 Version History

### v1.0.0
- Initial release
- Horizontal scrollable layout
- Basic product cards
- Navigation arrows
- Dark theme
