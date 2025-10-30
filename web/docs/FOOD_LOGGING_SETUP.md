# Food Logging System

## Overview
The food logging system allows users to track their meals and nutrition using barcode scanning or manual entry, powered by the OpenFoodFacts API.

## Features

### 1. Barcode Scanning
- Scan product barcodes to instantly get nutritional information
- Data cached locally for faster subsequent lookups
- Powered by OpenFoodFacts database (700k+ products)

### 2. Manual Entry
- Search for foods by name
- Create custom food entries
- Save favorite foods for quick logging

### 3. Meal Tracking
- Log meals by type (breakfast, lunch, dinner, snack)
- Track serving sizes
- Calculate total nutrition per meal
- Add photos and notes

### 4. Nutritional Information
- Calories
- Carbohydrates (important for diabetes management)
- Sugars
- Fiber
- Protein
- Fat
- Sodium

## Database Schema

### Tables

#### `food_items`
Cached food products from OpenFoodFacts
- Product information (name, brand, barcode)
- Nutritional data per 100g
- Images and serving sizes
- Data quality scores

#### `food_logs`
User meal logs
- Links to food items or custom entries
- Serving size and calculated nutrition
- Meal type and timestamp
- Optional photos and notes

#### `favorite_foods`
User's frequently logged foods
- Quick access to common items
- Custom nicknames
- Default serving sizes

## API Endpoints

### GET `/api/food/barcode?barcode={code}`
Lookup product by barcode
- Checks local cache first
- Falls back to OpenFoodFacts API
- Automatically caches new products

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "barcode": "1234567890",
    "product_name": "Product Name",
    "brand": "Brand Name",
    "energy_kcal": 250,
    "carbohydrates_g": 30,
    "sugars_g": 15,
    ...
  },
  "source": "cache" | "api"
}
```

### GET `/api/food/search?q={query}&page=1&pageSize=20`
Search for foods by name
- Searches local database
- Searches OpenFoodFacts API
- Returns combined results

**Response:**
```json
{
  "local": [...],
  "remote": [...],
  "total": 100,
  "page": 1
}
```

## Setup Instructions

### 1. Run the Migration
```bash
# Apply the food logging tables migration
supabase db push
```

Or run in SQL Editor:
```sql
-- Copy contents of web/supabase/migrations/20241227000002_create_food_logging_tables.sql
```

### 2. Test the API

**Barcode Lookup:**
```bash
curl "http://localhost:3000/api/food/barcode?barcode=737628064502"
```

**Search:**
```bash
curl "http://localhost:3000/api/food/search?q=apple"
```

## Usage Examples

### Scanning a Barcode
```typescript
const response = await fetch(`/api/food/barcode?barcode=${barcode}`);
const { product } = await response.json();
```

### Searching for Food
```typescript
const response = await fetch(`/api/food/search?q=${query}`);
const { local, remote } = await response.json();
```

### Logging a Meal
```typescript
const { data, error } = await supabase
  .from('food_logs')
  .insert({
    user_id: userId,
    food_item_id: foodItemId,
    serving_size: 150,
    serving_unit: 'g',
    total_carbs_g: 45,
    total_calories: 300,
    meal_type: 'lunch',
    logged_at: new Date().toISOString(),
  });
```

## Next Steps

### UI Components to Build
1. **Barcode Scanner Component**
   - Use device camera or external scanner
   - Libraries: `react-webcam`, `@zxing/library`

2. **Food Search Component**
   - Search bar with autocomplete
   - Display results with nutrition info
   - Quick add buttons

3. **Meal Log Form**
   - Select food item
   - Adjust serving size
   - Choose meal type
   - Add notes/photos

4. **Food Log History**
   - Daily/weekly view
   - Nutrition summaries
   - Edit/delete entries

5. **Favorites Management**
   - Save frequently logged items
   - Quick log from favorites
   - Custom serving sizes

### Integration with Glucose Data
- Correlate meals with glucose readings
- Identify foods that spike blood sugar
- Generate insights and recommendations

## OpenFoodFacts API
- **Website:** https://world.openfoodfacts.org
- **API Docs:** https://openfoodfacts.github.io/api-documentation/
- **Database:** 700,000+ products worldwide
- **License:** Open Database License (ODbL)
- **Rate Limits:** None for reasonable use
- **User-Agent:** Required (set to "CGMTracker - Diabetes Management App")

## Privacy & Data
- Food items are cached locally for performance
- User food logs are private (RLS enabled)
- No personal data sent to OpenFoodFacts
- Users can create custom food entries

## Future Enhancements
- Recipe builder
- Meal planning
- Nutrition goals and tracking
- Food-glucose correlation analysis
- Restaurant menu integration
- Voice logging
- Meal photo recognition (AI)
