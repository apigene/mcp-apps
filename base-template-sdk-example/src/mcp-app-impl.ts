// FakeStore API Implementation

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface FakeStoreResponse {
  actions_result?: Array<{
    response_content: Product;
    status_code: number;
  }>;
}

export function parseProductData(data: any): Product {
  console.log("Parsing product data:", data);

  // Check if this is an error response
  if (data.error) {
    throw new Error(`Server error: ${data.error.message || data.error}`);
  }
  if (data.isError) {
    throw new Error(`Error: ${data.content?.[0]?.text || "Unknown error"}`);
  }

  // Extract product from the response structure
  let product: Product;

  if (data.actions_result && data.actions_result.length > 0) {
    // FakeStore API response structure
    product = data.actions_result[0].response_content;
  } else if (data.id && data.title && data.price !== undefined) {
    // Direct product data
    product = data;
  } else {
    console.error("Invalid data structure received:", data);
    throw new Error(
      "Invalid data structure - expected FakeStore API product data",
    );
  }

  // Validate required fields
  if (!product.id || !product.title || product.price === undefined) {
    throw new Error("Missing required product fields (id, title, price)");
  }

  return product;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function formatRating(rate: number): string {
  return rate.toFixed(1);
}

export function generateStarRating(rate: number): string {
  const fullStars = Math.floor(rate);
  const hasHalfStar = rate % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let stars = "⭐".repeat(fullStars);
  if (hasHalfStar) stars += "✨";
  stars += "☆".repeat(emptyStars);

  return stars;
}
