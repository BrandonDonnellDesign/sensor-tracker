/**
 * Script to update food items in the database with latest info and images from Open Food Facts
 * 
 * Usage:
 *   node scripts/update-food-items.js
 * 
 * Options:
 *   --all: Update all food items (default: only items without images or old data)
 *   --barcode=<barcode>: Update specific item by barcode
 *   --dry-run: Show what would be updated without making changes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load from .env.local
const envPath = join(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.warn('Could not load .env.local, trying dotenv...');
  config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease add these to your .env.local file in the web directory.');
  console.error('\nExample .env.local:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchFromOpenFoodFacts(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    
    if (!response.ok) {
      console.error(`Failed to fetch barcode ${barcode}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      console.log(`Product not found for barcode: ${barcode}`);
      return null;
    }

    return data.product;
  } catch (error) {
    console.error(`Error fetching barcode ${barcode}:`, error);
    return null;
  }
}

function getImageUrl(product) {
  // Prefer front image, then fall back to generic image
  return product.image_front_url || product.image_url || null;
}

function calculateDataQuality(product) {
  let score = 0;
  
  if (product.product_name) score += 20;
  if (product.brands) score += 15;
  if (product.image_url || product.image_front_url) score += 20;
  if (product.nutriments?.['energy-kcal_100g']) score += 15;
  if (product.nutriments?.['carbohydrates_100g']) score += 10;
  if (product.nutriments?.['proteins_100g']) score += 10;
  if (product.nutriments?.['fat_100g']) score += 10;
  
  return score;
}

async function updateFoodItem(barcode, dryRun = false) {
  console.log(`\nFetching data for barcode: ${barcode}`);
  
  const product = await fetchFromOpenFoodFacts(barcode);
  
  if (!product) {
    return false;
  }

  const imageUrl = getImageUrl(product);
  const dataQuality = calculateDataQuality(product);
  
  const updateData = {
    product_name: product.product_name || null,
    brand: product.brands || null,
    categories: product.categories || null,
    image_url: imageUrl,
    serving_size: product.serving_size ? parseFloat(product.serving_size) : 100,
    serving_unit: 'g',
    energy_kcal: product.nutriments?.['energy-kcal_100g'] || null,
    carbohydrates_g: product.nutriments?.['carbohydrates_100g'] || null,
    sugars_g: product.nutriments?.['sugars_100g'] || null,
    fiber_g: product.nutriments?.['fiber_100g'] || null,
    proteins_g: product.nutriments?.['proteins_100g'] || null,
    fat_g: product.nutriments?.['fat_100g'] || null,
    saturated_fat_g: product.nutriments?.['saturated-fat_100g'] || null,
    sodium_mg: product.nutriments?.['sodium_100g'] ? product.nutriments['sodium_100g'] * 1000 : null,
    off_last_updated: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString() : null,
    data_quality_score: dataQuality,
    updated_at: new Date().toISOString()
  };

  console.log(`Product: ${updateData.product_name} (${updateData.brand})`);
  console.log(`Image: ${imageUrl ? '✓' : '✗'}`);
  console.log(`Quality Score: ${dataQuality}/100`);

  if (dryRun) {
    console.log('DRY RUN - Would update with:', JSON.stringify(updateData, null, 2));
    return true;
  }

  const { error } = await supabase
    .from('food_items')
    .update(updateData)
    .eq('barcode', barcode);

  if (error) {
    console.error(`Error updating barcode ${barcode}:`, error);
    return false;
  }

  console.log(`✓ Successfully updated barcode: ${barcode}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const updateAll = args.includes('--all');
  const dryRun = args.includes('--dry-run');
  const barcodeArg = args.find(arg => arg.startsWith('--barcode='));
  const specificBarcode = barcodeArg ? barcodeArg.split('=')[1] : null;

  console.log('='.repeat(60));
  console.log('Food Items Update Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log('='.repeat(60));

  if (specificBarcode) {
    // Update specific barcode
    console.log(`\nUpdating specific barcode: ${specificBarcode}`);
    await updateFoodItem(specificBarcode, dryRun);
    return;
  }

  // Fetch food items that need updating
  let query = supabase
    .from('food_items')
    .select('barcode, product_name, image_url, off_last_updated, updated_at');

  if (!updateAll) {
    // Only update items without images or with old data (>30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    query = query.or(`image_url.is.null,updated_at.lt.${thirtyDaysAgo.toISOString()}`);
  }

  const { data: foodItems, error } = await query;

  if (error) {
    console.error('Error fetching food items:', error);
    process.exit(1);
  }

  if (!foodItems || foodItems.length === 0) {
    console.log('\nNo food items found that need updating.');
    return;
  }

  console.log(`\nFound ${foodItems.length} food items to update`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < foodItems.length; i++) {
    const item = foodItems[i];
    console.log(`\n[${i + 1}/${foodItems.length}] Processing: ${item.product_name || item.barcode}`);
    
    const success = await updateFoodItem(item.barcode, dryRun);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting - wait 1 second between requests to be nice to Open Food Facts API
    if (i < foodItems.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Update Summary');
  console.log('='.repeat(60));
  console.log(`Total items processed: ${foodItems.length}`);
  console.log(`Successful updates: ${successCount}`);
  console.log(`Failed updates: ${failCount}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\nThis was a DRY RUN. No changes were made to the database.');
    console.log('Run without --dry-run to apply changes.');
  }
}

main().catch(console.error);
