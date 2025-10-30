# Food Database Sources

The food logging system uses two complementary databases to provide comprehensive food data:

## USDA FoodData Central
**Used for:** Fresh foods, produce, whole ingredients

**Examples:**
- Fruits (apples, bananas, oranges)
- Vegetables (broccoli, carrots, lettuce)
- Meats (chicken, beef, fish)
- Dairy (milk, cheese, yogurt)
- Grains (rice, pasta, bread)

**Advantages:**
- Accurate nutritional data
- Government-verified information
- Comprehensive nutrient profiles
- Great for whole foods

**API Key:**
- Free API key available at: https://fdc.nal.usda.gov/api-key-signup.html
- DEMO_KEY allows 30 requests/hour per IP
- Production key allows 1000 requests/hour

## OpenFoodFacts
**Used for:** Packaged foods with barcodes

**Examples:**
- Snacks (chips, cookies, crackers)
- Beverages (soda, juice, energy drinks)
- Processed foods (frozen meals, canned goods)
- Branded products (Coca-Cola, Doritos, etc.)

**Advantages:**
- 700k+ products worldwide
- Barcode scanning support
- Product images
- Brand information
- Community-maintained

## Automatic Selection

The system automatically chooses the best database:

```typescript
// Fresh food keywords trigger USDA
"banana" → USDA FoodData Central
"apple" → USDA FoodData Central
"chicken breast" → USDA FoodData Central

// Other queries use OpenFoodFacts
"doritos" → OpenFoodFacts
"coca cola" → OpenFoodFacts
"oreos" → OpenFoodFacts
```

## Testing

```bash
# Fresh food (uses USDA)
curl "http://localhost:3000/api/food/search?q=banana"

# Packaged food (uses OpenFoodFacts)
curl "http://localhost:3000/api/food/search?q=doritos"

# Barcode (always uses OpenFoodFacts)
curl "http://localhost:3000/api/food/barcode?barcode=5449000000996"
```

## Response Format

Both APIs return data in the same format:

```json
{
  "local": [],
  "remote": [
    {
      "product_name": "Bananas, raw",
      "brand": null,
      "energy_kcal": 89,
      "carbohydrates_g": 22.8,
      "sugars_g": 12.2,
      "proteins_g": 1.09,
      "fat_g": 0.33,
      ...
    }
  ],
  "total": 50,
  "page": 1,
  "source": "usda" | "openfoodfacts"
}
```

## Rate Limits

**USDA (DEMO_KEY):**
- 30 requests per hour per IP
- Upgrade to full API key for 1000/hour

**OpenFoodFacts:**
- No rate limits
- Free and open source

## Future Enhancements

- [ ] Add more fresh food keywords
- [ ] Allow manual source selection
- [ ] Cache USDA results locally
- [ ] Add nutritionix API for restaurant foods
- [ ] Support multiple languages
