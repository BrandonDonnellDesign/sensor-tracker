// USDA FoodData Central API Integration
// https://fdc.nal.usda.gov/api-guide.html

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  dataType: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>;
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDASearchResult {
  foods: USDAFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Search USDA FoodData Central
 */
export async function searchUSDAFoods(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<USDASearchResult | null> {
  try {
    const params = new URLSearchParams({
      query: query,
      pageSize: pageSize.toString(),
      pageNumber: page.toString(),
      dataType: 'Survey (FNDDS),Foundation,SR Legacy', // Focus on whole foods
      sortBy: 'dataType.keyword',
      sortOrder: 'asc',
    });

    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?${params}&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching USDA foods:', error);
    return null;
  }
}

/**
 * Get food details by FDC ID
 */
export async function getUSDAFoodById(
  fdcId: number
): Promise<USDAFood | null> {
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching USDA food:', error);
    return null;
  }
}

/**
 * Convert USDA food to our database format
 */
export function convertUSDAToFoodItem(food: USDAFood) {
  const nutrients = food.foodNutrients || [];

  // Helper to find nutrient value by name
  const getNutrient = (names: string[]): number | null => {
    for (const name of names) {
      const nutrient = nutrients.find((n) =>
        n.nutrientName.toLowerCase().includes(name.toLowerCase())
      );
      if (nutrient) return nutrient.value;
    }
    return null;
  };

  return {
    barcode: null, // USDA foods don't have barcodes
    product_name: food.description,
    brand: food.brandOwner || food.brandName || null,
    categories: food.dataType || 'USDA Food',
    image_url: null, // USDA doesn't provide images
    serving_size: food.servingSize?.toString() || '100',
    serving_unit: food.servingSizeUnit || 'g',
    energy_kcal: getNutrient(['Energy', 'Calories']),
    carbohydrates_g: getNutrient(['Carbohydrate']),
    sugars_g: getNutrient(['Sugars, total', 'Total Sugars']),
    fiber_g: getNutrient(['Fiber', 'Dietary Fiber']),
    proteins_g: getNutrient(['Protein']),
    fat_g: getNutrient(['Total lipid', 'Total Fat']),
    saturated_fat_g: getNutrient(['Fatty acids, total saturated', 'Saturated Fat']),
    sodium_mg: getNutrient(['Sodium']),
    off_id: `usda_${food.fdcId}`,
    off_last_updated: new Date().toISOString(),
    data_quality_score: food.dataType === 'Foundation' ? 1 : 3,
  };
}

/**
 * Check if query is likely for fresh food
 */
export function isFreshFoodQuery(query: string): boolean {
  const freshFoodKeywords = [
    'apple',
    'banana',
    'orange',
    'grape',
    'strawberry',
    'blueberry',
    'tomato',
    'lettuce',
    'carrot',
    'broccoli',
    'chicken',
    'beef',
    'pork',
    'fish',
    'salmon',
    'egg',
    'milk',
    'cheese',
    'yogurt',
    'bread',
    'rice',
    'pasta',
    'potato',
    'onion',
    'garlic',
    'spinach',
    'cucumber',
    'pepper',
    'avocado',
    'mango',
    'pineapple',
    'watermelon',
    'peach',
    'pear',
    'cherry',
    'kiwi',
    'lemon',
    'lime',
  ];

  const lowerQuery = query.toLowerCase();
  return freshFoodKeywords.some((keyword) => lowerQuery.includes(keyword));
}
