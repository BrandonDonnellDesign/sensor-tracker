import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/food/barcode/{barcode}:
 *   get:
 *     tags: [Food Logging]
 *     summary: Get food item by barcode
 *     description: Retrieve food item information using barcode scanning (UPC/EAN)
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: The barcode number (UPC/EAN)
 *       - in: query
 *         name: fallback_api
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to use external API if not found in database
 *     responses:
 *       200:
 *         description: Food item found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     brand:
 *                       type: string
 *                     barcode:
 *                       type: string
 *                     serving_size:
 *                       type: number
 *                     serving_unit:
 *                       type: string
 *                     calories_per_100g:
 *                       type: number
 *                     carbs_per_100g:
 *                       type: number
 *                     protein_per_100g:
 *                       type: number
 *                     fat_per_100g:
 *                       type: number
 *                     fiber_per_100g:
 *                       type: number
 *                     sugar_per_100g:
 *                       type: number
 *                     sodium_per_100g:
 *                       type: number
 *                     source:
 *                       type: string
 *                       enum: [database, openfoodfacts, usda]
 *                     confidence:
 *                       type: number
 *                       description: Confidence score for external API results (0-1)
 *       404:
 *         description: Food item not found
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded for external API calls
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { barcode } = await params;
    const { searchParams } = new URL(request.url);
    const fallbackApi = searchParams.get('fallback_api') !== 'false';

    // Validate barcode format
    if (!barcode || !/^\d{8,14}$/.test(barcode)) {
      return NextResponse.json(
        { error: 'Invalid barcode format. Must be 8-14 digits' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First, check our database
    const { data: foodItem, error: dbError } = await supabase
      .from('food_items')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (foodItem && !dbError) {
      return NextResponse.json({
        success: true,
        data: {
          ...foodItem,
          source: 'database',
          confidence: 1.0
        }
      });
    }

    // If not found in database and fallback is enabled, try external APIs
    if (fallbackApi) {
      try {
        // Try OpenFoodFacts first
        const openFoodFactsResult = await fetchFromOpenFoodFacts(barcode);
        if (openFoodFactsResult) {
          // Optionally save to database for future use
          await saveToDatabase(supabase, openFoodFactsResult, authResult.userId);
          return NextResponse.json({
            success: true,
            data: openFoodFactsResult
          });
        }

        // Try USDA FoodData Central as fallback
        const usdaResult = await fetchFromUSDA(barcode);
        if (usdaResult) {
          await saveToDatabase(supabase, usdaResult, authResult.userId);
          return NextResponse.json({
            success: true,
            data: usdaResult
          });
        }
      } catch (apiError) {
        console.error('External API error:', apiError);
        // Continue to return 404 if external APIs fail
      }
    }

    return NextResponse.json(
      { error: 'Food item not found for this barcode' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error in barcode lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchFromOpenFoodFacts(barcode: string) {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'CGM-Tracker/1.0 (https://your-domain.com)'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Convert per 100g values
    return {
      id: null, // Will be generated when saved
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      barcode: barcode,
      serving_size: parseFloat(product.serving_size) || 100,
      serving_unit: product.serving_quantity_unit || 'g',
      calories_per_100g: parseFloat(nutriments['energy-kcal_100g']) || parseFloat(nutriments['energy_100g']) / 4.184 || null,
      carbs_per_100g: parseFloat(nutriments.carbohydrates_100g) || null,
      protein_per_100g: parseFloat(nutriments.proteins_100g) || null,
      fat_per_100g: parseFloat(nutriments.fat_100g) || null,
      fiber_per_100g: parseFloat(nutriments.fiber_100g) || null,
      sugar_per_100g: parseFloat(nutriments.sugars_100g) || null,
      sodium_per_100g: parseFloat(nutriments.sodium_100g) || null,
      source: 'openfoodfacts',
      confidence: calculateConfidence(product)
    };
  } catch (error) {
    console.error('OpenFoodFacts API error:', error);
    return null;
  }
}

async function fetchFromUSDA(barcode: string) {
  // Note: USDA FoodData Central doesn't directly support barcode lookup
  // This is a placeholder for potential future integration or other APIs
  // You might want to integrate with other services like Edamam, Spoonacular, etc.
  
  try {
    // Example integration with a hypothetical USDA barcode service
    // const apiKey = process.env.USDA_API_KEY;
    // if (!apiKey) return null;
    
    // const response = await fetch(
    //   `https://api.nal.usda.gov/fdc/v1/foods/search?query=${barcode}&api_key=${apiKey}`
    // );
    
    // For now, return null as USDA doesn't have direct barcode support
    return null;
  } catch (error) {
    console.error('USDA API error:', error);
    return null;
  }
}

function calculateConfidence(product: any): number {
  let score = 0;
  let maxScore = 0;

  // Check for essential fields
  const essentialFields = [
    'product_name',
    'nutriments.energy-kcal_100g',
    'nutriments.carbohydrates_100g',
    'nutriments.proteins_100g',
    'nutriments.fat_100g'
  ];

  essentialFields.forEach(field => {
    maxScore += 0.2;
    const value = field.split('.').reduce((obj, key) => obj?.[key], product);
    if (value !== undefined && value !== null && value !== '') {
      score += 0.2;
    }
  });

  // Bonus for additional data
  if (product.brands) score += 0.1;
  if (product.nutriments?.fiber_100g) score += 0.05;
  if (product.nutriments?.sugars_100g) score += 0.05;
  if (product.image_url) score += 0.05;

  return Math.min(score, 1.0);
}

async function saveToDatabase(supabase: any, foodData: any, userId: string) {
  try {
    // Check if item already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('food_items')
      .select('id')
      .eq('barcode', foodData.barcode)
      .single();

    if (existing) {
      return existing.id;
    }

    // Save new food item
    const { data: newItem, error } = await supabase
      .from('food_items')
      .insert({
        name: foodData.name,
        brand: foodData.brand,
        barcode: foodData.barcode,
        serving_size: foodData.serving_size,
        serving_unit: foodData.serving_unit,
        calories_per_100g: foodData.calories_per_100g,
        carbs_per_100g: foodData.carbs_per_100g,
        protein_per_100g: foodData.protein_per_100g,
        fat_per_100g: foodData.fat_per_100g,
        fiber_per_100g: foodData.fiber_per_100g,
        sugar_per_100g: foodData.sugar_per_100g,
        sodium_per_100g: foodData.sodium_per_100g,
        created_by: userId,
        is_verified: false // External API data needs verification
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving food item to database:', error);
      return null;
    }

    return newItem.id;
  } catch (error) {
    console.error('Error in saveToDatabase:', error);
    return null;
  }
}