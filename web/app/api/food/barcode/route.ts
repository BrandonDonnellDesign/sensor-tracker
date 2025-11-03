import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import { getProductByBarcode } from '@/lib/openfoodfacts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // First, check local cache
    const supabase = createClient();
    const { data: cachedProduct } = await supabase
      .from('food_items')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (cachedProduct) {
      // Return from cache
      const product = {
        id: cachedProduct.id,
        name: cachedProduct.product_name,
        brand: cachedProduct.brand,
        barcode: cachedProduct.barcode,
        calories: Number(cachedProduct.energy_kcal) || 0,
        protein: Number(cachedProduct.proteins_g) || 0,
        carbs: Number(cachedProduct.carbohydrates_g) || 0,
        fat: Number(cachedProduct.fat_g) || 0,
        fiber: Number(cachedProduct.fiber_g) || undefined,
        sugar: Number(cachedProduct.sugars_g) || undefined,
        sodium: Number(cachedProduct.sodium_mg) || undefined,
        servingSize: Number(cachedProduct.serving_size) || 100,
        servingUnit: cachedProduct.serving_unit || 'g',
        imageUrl: cachedProduct.image_url,
      };

      return NextResponse.json({
        product,
        source: 'cache',
      });
    }

    // Not in cache, fetch from OpenFoodFacts
    const product = await getProductByBarcode(barcode);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Cache the result in background
    cacheProduct(product).catch(err => 
      console.error('Error caching barcode result:', err)
    );

    return NextResponse.json({
      product,
      source: 'openfoodfacts',
    });
  } catch (error) {
    console.error('Error in barcode lookup:', error);
    return NextResponse.json(
      { error: 'Failed to lookup barcode' },
      { status: 500 }
    );
  }
}

// Cache product to database
async function cacheProduct(product: any) {
  try {
    const supabase = createClient();
    await supabase
      .from('food_items')
      .insert({
        barcode: product.barcode,
        product_name: product.name,
        brand: product.brand,
        image_url: product.imageUrl,
        serving_size: product.servingSize,
        serving_unit: product.servingUnit,
        energy_kcal: product.calories,
        carbohydrates_g: product.carbs,
        sugars_g: product.sugar,
        fiber_g: product.fiber,
        proteins_g: product.protein,
        fat_g: product.fat,
        sodium_mg: product.sodium,
        off_id: product.id,
        data_quality_score: 1.0,
      });
  } catch (error) {
    console.warn('Failed to cache product:', product.name, error);
  }
}
