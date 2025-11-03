const OFF = require('openfoodfacts-nodejs');

// Use US-specific client for barcode lookups
const client = new OFF({ country: 'us' });

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
  imageUrl?: string;
  // Custom food properties
  isCustom?: boolean;
  isOwnCustom?: boolean;
  createdByUserId?: string;
  isPublic?: boolean;
}

export async function searchProducts(query: string): Promise<FoodItem[]> {
  try {
    // Use US-specific API - the API already filters by country and language
    const url = `https://us.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&page_size=20&json=true&sort_by=popularity`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.products || result.products.length === 0) {
      return [];
    }

    return result.products
      .filter((product: any) => {
        // Only filter for products with nutrition data
        return (
          product.nutriments &&
          product.product_name &&
          (product.nutriments['energy-kcal_100g'] !== undefined ||
            product.nutriments['energy-kcal'] !== undefined)
        );
      })
      .map((product: any) => convertToFoodItem(product))
      .slice(0, 10);
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error);
    return [];
  }
}

export async function getProductByBarcode(
  barcode: string
): Promise<FoodItem | null> {
  try {
    const result = await client.getProduct(barcode);

    if (!result.product || result.status === 0) {
      return null;
    }

    return convertToFoodItem(result.product);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
}

function convertToFoodItem(product: any): FoodItem {
  const nutriments = product.nutriments || {};

  // Helper to get per-100g value, or calculate from serving if needed
  const getPer100g = (nutrient: string) => {
    const per100g = nutriments[`${nutrient}_100g`];
    const perServing = nutriments[nutrient];
    const servingSize = product.serving_quantity || product.product_quantity;

    // If we have per-100g data and it's not 0, use it
    if (per100g && per100g > 0) {
      return per100g;
    }

    // If we have per-serving data and serving size, calculate per-100g
    if (perServing && servingSize && servingSize > 0) {
      return (perServing / servingSize) * 100;
    }

    // Fallback to per-serving or 0
    return perServing || 0;
  };

  const calories = getPer100g('energy-kcal');
  const protein = getPer100g('proteins');
  const carbs = getPer100g('carbohydrates');
  const fat = getPer100g('fat');
  const fiber = getPer100g('fiber') || undefined;
  const sugar = getPer100g('sugars') || undefined;
  const sodium = getPer100g('sodium') || undefined;

  // Combine brand and product name for better display
  const productName = product.product_name || 'Unknown Product';
  const brand = product.brands || '';
  const displayName =
    brand &&
    !productName.toLowerCase().includes(brand.toLowerCase().split(',')[0])
      ? `${brand.split(',')[0]} ${productName}`
      : productName;

  const finalServingSize = product.serving_quantity || '100';
  console.log('Final FoodItem:', {
    name: displayName,
    servingSize: finalServingSize,
    serving_quantity: product.serving_quantity,
  });

  return {
    id: product.code || product._id,
    name: displayName,
    brand: product.brands || undefined,
    barcode: product.code,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: fiber ? Math.round(fiber * 10) / 10 : 0,
    sugar: sugar ? Math.round(sugar * 10) / 10 : 0,
    sodium: sodium ? Math.round(sodium * 10) / 10 : 0,
    servingSize: finalServingSize,
    servingUnit: product.serving_quantity_unit || 'g',
    imageUrl:
      product.image_url ||
      product.image_front_url ||
      product.image_front_small_url ||
      undefined,
  };
}
