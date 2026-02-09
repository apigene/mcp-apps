# Shopify Catalog MCP App - Advanced Edition

An advanced, feature-rich catalog display app for Shopify products with filtering, drill-down product details, comparison mode, and more.

## ✨ Features

### Core Features
- **Product Cards**: Beautiful responsive grid and list layouts
- **Product Images**: High-quality product images with fallback placeholders
- **Clickable Titles**: Product titles link to their Shopify product pages
- **Price Display**: Formatted price ranges with currency support
- **Ratings**: Star ratings with review counts
- **Key Features**: Top product features display
- **Variant Count**: Shows number of available variants
- **Shop Information**: Displays which shop sells each product

### Advanced Features

#### 🔍 **Search & Filtering**
- **Real-time Search**: Search across product titles, descriptions, and features
- **Price Range Filter**: Filter products by minimum and maximum price
- **Rating Filter**: Filter by minimum star rating (1-5 stars)
- **Shop Filter**: Filter products by specific shops
- **Attribute Filter**: Filter by product attributes (colors, sizes, etc.)
- **Clear Filters**: One-click to reset all filters

#### 📊 **Sorting Options**
- Relevance (default)
- Price: Low to High
- Price: High to Low
- Highest Rated
- Most Reviews
- Name A-Z

#### 👁️ **View Modes**
- **Grid View**: Card-based layout perfect for browsing
- **List View**: Compact list layout for detailed scanning
- **Toggle**: Easy switching between views

#### 🔎 **Drill-Down Product Details**
- **Product Modal**: Click "View Details" or product image to see full details
- **Image Gallery**: Multiple product images with thumbnails
- **Complete Information**: 
  - Full description
  - Unique selling point
  - All top features
  - Technical specifications
  - All attributes
  - All variants with prices and options
  - Shop information
  - Direct link to Shopify product page

#### ⚖️ **Product Comparison**
- **Compare Mode**: Select multiple products using checkboxes
- **Side-by-Side Comparison**: Compare products in a detailed table
- **Comparison Features**:
  - Price comparison
  - Rating comparison
  - Feature comparison
  - Variant count comparison
  - Shop comparison
  - Direct links to each product

#### 🎨 **UI/UX Enhancements**
- **Dark Mode**: Full dark mode support
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Sticky Filters**: Filters sidebar stays visible while scrolling
- **Smooth Animations**: Polished transitions and hover effects
- **Empty States**: Helpful messages when no products match filters
- **Loading States**: Beautiful loading indicators

## 📊 Data Format

The app expects data in the following format:

```json
{
  "status_code": 200,
  "body": {
    "offers": [
      {
        "id": "gid://shopify/p/...",
        "title": "Product Name",
        "description": "Product description",
        "uniqueSellingPoint": "USP",
        "topFeatures": ["Feature 1", "Feature 2", ...],
        "techSpecs": ["Spec 1", "Spec 2", ...],
        "attributes": [
          {"name": "Color", "values": ["Red", "Blue"]},
          ...
        ],
        "media": [
          {"url": "https://...", "altText": "..."}
        ],
        "priceRange": {
          "min": {"amount": 15995, "currency": "USD"},
          "max": {"amount": 15995, "currency": "USD"}
        },
        "rating": {"rating": 5, "count": 3},
        "lookupUrl": "https://...",
        "options": [...],
        "variants": [
          {
            "id": "...",
            "displayName": "...",
            "price": {"amount": 15995, "currency": "USD"},
            "options": [{"name": "Size", "value": "M"}],
            "shop": {"name": "Shop Name"},
            "variantUrl": "https://..."
          }
        ]
      }
    ]
  }
}
```

## 🚀 Usage

### Basic Usage
1. The app automatically extracts products from `body.offers` or `offers` array
2. Products are displayed in a grid or list view
3. Use filters and search to find specific products
4. Click "View Details" to see full product information
5. Select products to compare them side-by-side

### Filtering Products
1. **Search**: Type in the search box to filter by title, description, or features
2. **Price Range**: Enter min/max prices in dollars
3. **Rating**: Select minimum star rating
4. **Shops**: Check shops to filter by
5. **Attributes**: Check attributes (colors, sizes, etc.) to filter
6. **Clear**: Click "Clear All" to reset filters

### Comparing Products
1. Check the "Compare" checkbox on products you want to compare
2. Click the "Compare (X)" button in the header
3. View side-by-side comparison in the modal
4. Uncheck products to remove them from comparison

### Viewing Product Details
1. Click the "View Details" button on any product card
2. Or click the product image
3. View complete product information in the modal
4. Click outside the modal or the × button to close

## 🎨 Customization

### Styling
- Modify `src/mcp-app.css` to change colors, spacing, and layout
- Update CSS variables for consistent theming
- Adjust breakpoints for responsive behavior

### Functionality
- Modify `renderProductCard()` to change card layout
- Update `renderProductListItem()` for list view customization
- Customize `showProductDetails()` for detail modal content
- Adjust `showCompareView()` for comparison table layout

### Filtering
- Add custom filters in `filterProducts()` function
- Modify `getAvailableShops()` and `getAvailableAttributes()` for filter options
- Update sorting logic in the `filterProducts()` sort section

## 📱 Responsive Breakpoints

- **Mobile**: < 768px - Single column, stacked filters
- **Tablet**: 769px - 1024px - Two columns, sidebar filters
- **Desktop**: > 1024px - Multi-column grid, sticky sidebar

## 🔧 Technical Details

### State Management
- Global state variables track filters, selections, and view preferences
- State persists during filtering and sorting operations
- Comparison selections maintained across view changes

### Performance
- Efficient filtering with array methods
- Debounced search for better performance
- Lazy loading of product images
- Optimized rendering with template strings

### Accessibility
- Semantic HTML structure
- Keyboard navigation support
- ARIA labels where appropriate
- Focus management in modals

## 🐛 Troubleshooting

### Products not showing
- Check browser console for errors
- Verify data format matches expected structure
- Ensure `body.offers` or `offers` array exists

### Filters not working
- Check that filter values match product data
- Verify price range inputs are valid numbers
- Ensure shop names match exactly

### Comparison not working
- Verify product IDs are unique
- Check that selected products still exist after filtering
- Ensure comparison modal has enough space

## 📝 Version History

### v2.0.0 (Advanced Edition)
- Added advanced filtering system
- Implemented product comparison
- Added drill-down product details modal
- Added grid/list view toggle
- Enhanced search functionality
- Improved responsive design
- Added dark mode support

### v1.0.0 (Initial Release)
- Basic product card display
- Simple grid layout
- Price and rating display
