# Custom Foods Feature

## Overview

The custom foods feature allows users to create and manage their own food items when they can't find what they're looking for in the existing database. This is particularly useful for:

- Homemade recipes
- Local or regional foods not in OpenFoodFacts
- Specific brand variations
- Restaurant items with known nutrition info

## Database Schema

### New Columns in `food_items` table:

- `created_by_user_id` (uuid): References the user who created this custom food
- `is_custom` (boolean): Indicates if this is a user-created food item
- `is_public` (boolean): Whether other users can see and use this custom food

### Updated View

The `food_logs_with_cgm` view now includes:
- All custom food columns
- `custom_food_name` field for easier display logic

## API Endpoints

### Create Custom Food
```
POST /api/food/items
```

**Body:**
```json
{
  "product_name": "My Custom Recipe",
  "brand": "Homemade",
  "serving_size": 100,
  "serving_unit": "g",
  "energy_kcal": 250,
  "carbohydrates_g": 30,
  "proteins_g": 15,
  "fat_g": 8,
  "fiber_g": 5,
  "sugars_g": 10,
  "sodium_mg": 200,
  "is_public": false
}
```

### Get User's Custom Foods
```
GET /api/food/items?include_public=false
```

### Update Custom Food
```
PUT /api/food/items/[itemId]
```

### Delete Custom Food
```
DELETE /api/food/items/[itemId]
```

## Security (RLS Policies)

1. **View Policy**: Users can see:
   - All public foods (`is_public = true`)
   - Their own custom foods (`created_by_user_id = auth.uid()`)

2. **Create Policy**: Authenticated users can create custom foods with:
   - `created_by_user_id` set to their user ID
   - `is_custom = true`

3. **Update Policy**: Users can only update their own custom foods

4. **Delete Policy**: Users can only delete their own custom foods

## Frontend Components

### CustomFoodForm
- Located: `web/components/food/custom-food-form.tsx`
- Allows users to create new custom foods
- Includes nutrition information input
- Option to make foods public

### Food Search Integration
- Custom foods appear in search results
- Prioritized for the user who created them
- Marked with "Custom" badge for foods created by others

### Food Log Display
- Uses `custom_food_name || product_name` for display
- Shows custom food indicators in the UI

## Usage Flow

1. User searches for a food item
2. If not found, they can click "Create Custom Food"
3. Fill out the custom food form with nutrition info
4. Food is created and immediately available for logging
5. Custom food appears in future searches and can be favorited

## Migration

The migration `20251102000001_ensure_custom_food_columns.sql`:
- Safely adds columns with existence checks
- Creates appropriate indexes
- Sets up RLS policies
- Updates the food logs view
- Handles existing data gracefully

## Testing

Run the test script to verify everything works:
```bash
cd web
node scripts/test-custom-food-migration.js
```

## Benefits

- **Flexibility**: Users can track any food, even if not in public databases
- **Privacy**: Custom foods can be kept private or shared
- **Accuracy**: Users can input exact nutrition information
- **Integration**: Custom foods work seamlessly with all existing features (favorites, CGM correlation, analytics)