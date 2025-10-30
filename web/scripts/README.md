# Database Scripts

## Update Food Items Script

This script updates food items in the database with the latest information and images from Open Food Facts API.

### Prerequisites

1. Set up environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

#### Update items without images or old data (default)
```bash
npm run food:update
```

This will update:
- Food items without images
- Food items not updated in the last 30 days

#### Update all food items
```bash
npm run food:update-all
```

#### Dry run (preview changes without updating)
```bash
npm run food:update-dry-run
```

#### Update specific item by barcode
```bash
npm run food:update -- --barcode=0070847811985
```

#### Update specific item (dry run)
```bash
npm run food:update -- --barcode=0070847811985 --dry-run
```

### What it does

The script:
1. Fetches food items from your database that need updating
2. Queries Open Food Facts API for the latest product information
3. Updates the following fields:
   - Product name
   - Brand
   - Categories
   - **Image URL** (front image preferred)
   - Serving size
   - Nutritional information (calories, carbs, protein, fat, etc.)
   - Last updated timestamp
   - Data quality score

### Features

- **Rate limiting**: Waits 1 second between API requests to respect Open Food Facts API
- **Quality scoring**: Calculates a data quality score (0-100) based on available information
- **Dry run mode**: Preview changes before applying them
- **Selective updates**: Only updates items that need it (no images or old data)
- **Error handling**: Continues processing even if some items fail

### Output

The script provides detailed output:
```
============================================================
Food Items Update Script
============================================================
Mode: LIVE UPDATE
============================================================

Found 15 food items to update

[1/15] Processing: Monster Energy Drink

Fetching data for barcode: 0070847811985
Product: Monster Energy (Monster Energy)
Image: ✓
Quality Score: 90/100
✓ Successfully updated barcode: 0070847811985

...

============================================================
Update Summary
============================================================
Total items processed: 15
Successful updates: 14
Failed updates: 1
============================================================
```

### Troubleshooting

**Error: Missing required environment variables**
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`

**Error: Product not found for barcode**
- The barcode doesn't exist in Open Food Facts database
- The product may have been removed or the barcode is incorrect

**Error: Failed to fetch barcode**
- Network issue or Open Food Facts API is down
- Try again later

### Best Practices

1. **Always run dry-run first** to preview changes:
   ```bash
   npm run food:update-dry-run
   ```

2. **Update regularly** to keep food data fresh:
   - Run weekly or monthly depending on your needs
   - Use default mode (only updates items without images or old data)

3. **Monitor the output** for failed updates and investigate issues

4. **Be respectful** of the Open Food Facts API:
   - The script includes rate limiting (1 second between requests)
   - Don't run multiple instances simultaneously
   - Consider running during off-peak hours for large updates
