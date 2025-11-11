# Swagger API Documentation

Complete guide to the CGM Tracker interactive API documentation.

## Quick Start

**Access the API docs**: `http://localhost:3000/docs`

1. Visit `/docs` in your browser
2. Click "Authorize" button (🔓 icon)
3. Enter your API key: `sk_your_key`
4. Click "Authorize" then "Close"
5. Try any endpoint with "Try it out"

## Features

- 🎨 Beautiful, interactive Swagger UI interface
- 🧪 Test endpoints directly in the browser
- 📝 View request/response examples
- 🔐 Built-in authentication (add API key once)
- 📱 Mobile-friendly responsive design
- 🌙 Dark mode support (auto-detects system preference)

## Access Points

### 1. Direct URL
- Development: `http://localhost:3000/docs`
- Production: `https://cgmtracker.netlify.app/docs`

### 2. From Settings
Settings → API Keys → "Open Swagger UI" button

### 3. From Help
Help page → API & Integrations section

### 4. API Shortcut Cards
Throughout the app (dashboard, etc.)

## API Key Setup (Required)

Before using the API, link your API key to your user account:

### Step 1: Generate API Key
1. Go to Settings → API Keys
2. Click "Create New Key"
3. Copy the key (starts with `sk_`)

### Step 2: Link to User Account
Run this SQL in Supabase SQL Editor:

```sql
UPDATE api_keys 
SET user_id = (SELECT id FROM profiles WHERE email = 'your@email.com')
WHERE key_prefix = 'sk_your_prefix';
```

Or use the provided script:
```bash
psql <connection-string> -f web/scripts/fix-api-key-user.sql
```

### Step 3: Test Authentication
1. Visit `/docs`
2. Click "Authorize"
3. Enter your API key
4. Try `GET /community/tips` (should return 200)

## Using the Swagger UI

### Testing Endpoints

1. **Expand an endpoint** - Click on any endpoint to see details
2. **Click "Try it out"** - Enables the test interface
3. **Fill parameters** - Enter required/optional parameters
4. **Click "Execute"** - Sends the request
5. **View response** - See status code, headers, and body

### Tips

- **Authentication persists** - Authorize once per session
- **Copy examples** - Click "Example Value" to auto-fill
- **View schemas** - Expand "Schema" tab for all fields
- **Test safely** - POST/PUT/DELETE work on real data
- **Check responses** - See actual HTTP codes and bodies

### Example: Create a Community Tip

1. Expand `POST /community/tips/create`
2. Click "Try it out"
3. Use this example:
   ```json
   {
     "title": "Best sensor placement for accuracy",
     "content": "I found that placing the sensor on the back of my arm gives the most accurate readings...",
     "category": "sensor-placement",
     "tags": ["accuracy", "placement"],
     "is_anonymous": false
   }
   ```
4. Click "Execute"
5. Should return 201 with your new tip

## API Documentation Structure

### Implemented Endpoints ✅

**Community Tips**
- `GET /community/tips` - List tips with filtering
- `POST /community/tips/create` - Create new tip
- `POST /community/tips/{tipId}/vote` - Vote on tip
- `GET /community/categories` - List categories

**Glucose Data**
- `GET /glucose/readings` - Get glucose readings
- `POST /glucose/readings` - Add glucose reading

**Food Logging**
- `GET /food/logs` - Get food logs
- `POST /food/logs` - Log food consumption
- `GET /food/search` - Search food database
- `GET /food/items` - List/search food items
- `POST /food/items` - Create custom food item
- `GET /food/barcode/{barcode}` - Lookup by barcode
- `GET /food/favorites` - Get favorite foods

**Analytics**
- `GET /analytics/glucose-trends` - Glucose trends
- `GET /analytics/daily-summary` - Daily summary
- `GET /export/glucose` - Export glucose data

**Health Metrics**
- `GET /health/metrics` - Get health metrics (weight, HbA1c, BP, etc.)
- `POST /health/metrics` - Add health metric

**User Profile**
- `GET /user/profile` - Get user profile with stats
- `PUT /user/profile` - Update user profile

**Authentication**
- `GET /auth/api-keys` - List API keys
- `POST /auth/api-keys` - Create API key
- `GET /auth/usage` - Get usage statistics

### Placeholder Endpoints ⚠️

These return empty data or 501 (not implemented):

**Insulin Tracking**
- `GET /insulin/doses` - Returns empty array
- `POST /insulin/doses` - Returns 501

**Sensor Management**
- `GET /sensors` - Returns empty array
- `POST /sensors` - Returns 501

## Authentication

The API supports two methods:

### 1. API Key (Recommended)
```bash
curl -H "X-API-Key: sk_your_key" \
  http://localhost:3000/api/v1/community/tips
```

### 2. JWT Bearer Token
```bash
curl -H "Authorization: Bearer your_jwt_token" \
  http://localhost:3000/api/v1/community/tips
```

## Rate Limiting

- **Default**: 100 requests per hour per API key
- **Headers**: Rate limit info in response headers
- **Meta**: Also included in response `meta.rateLimit` object
- **Exceeded**: Returns `429 Too Many Requests`

## Response Format

All endpoints return consistent JSON:

```json
{
  "data": [...],           // Response data
  "pagination": {          // For paginated endpoints
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "responseTime": "45ms",
    "apiVersion": "1.0.0",
    "rateLimit": {
      "limit": "100",
      "remaining": "95",
      "reset": "1699564800"
    }
  }
}
```

## Error Responses

### 400 - Bad Request
```json
{
  "error": "validation_error",
  "message": "Title, content, and category are required"
}
```

### 401 - Unauthorized
```json
{
  "error": "authentication_failed",
  "message": "Unable to determine user ID"
}
```

**Fix**: Link your API key to a user account (see setup above)

### 404 - Not Found
```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

### 429 - Rate Limit Exceeded
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again later."
}
```

### 501 - Not Implemented
```json
{
  "error": "not_implemented",
  "message": "Insulin tracking will be available after database migration"
}
```

## Troubleshooting

### "Unable to determine user ID" Error
**Cause**: API key not linked to user account  
**Fix**: Run the SQL script in Step 2 of API Key Setup

### Swagger UI Not Loading
1. Check browser console for errors
2. Verify `/api/v1/docs` returns valid JSON
3. Try hard refresh (Ctrl+Shift+R)
4. Clear browser cache

### React Warning in Console
You may see `UNSAFE_componentWillReceiveProps` warning. This is a known issue with `swagger-ui-react` library and doesn't affect functionality. The warning is automatically suppressed.

### Dark Mode Issues
Dark mode uses CSS filters. If colors look off:
1. Switch your system theme
2. Refresh the page
3. Use light mode instead

### Authentication Not Working
1. Click "Authorize" and enter your key
2. Check key starts with `sk_`
3. Verify key is active in Settings → API Keys
4. Ensure key is linked to user account

### 501 Errors on Insulin/Sensor Endpoints
This is expected. These endpoints are placeholders and will be implemented after database migration.

## Raw OpenAPI Spec

### JSON Format
```bash
curl http://localhost:3000/api/v1/docs
```

### YAML Format
```bash
curl http://localhost:3000/api/v1/docs?format=yaml
```

### Use in External Tools
Copy the JSON and paste into:
- [Swagger Editor](https://editor.swagger.io/)
- Postman (Import → OpenAPI)
- Insomnia (Import → OpenAPI)

## Testing Script

Automated test script available:

```bash
# Set your API key
$env:CGM_TRACKER_API_KEY="sk_your_key"

# Run tests
node web/scripts/test-api.js
```

Expected results after API key setup:
- ✅ 15 tests passing
- ⚠️ 2 tests returning 501 (not implemented)
- Pass rate: ~88%

## Technical Details

### Implementation
- **Framework**: Next.js 14+ with App Router
- **Library**: `swagger-ui-react@5.30.2`
- **Loading**: Dynamic import to avoid SSR issues
- **Spec Source**: `/api/v1/docs` endpoint

### Files
- `web/app/docs/page.tsx` - Swagger UI page
- `web/app/docs/layout.tsx` - Metadata
- `web/app/api/v1/docs/route.ts` - OpenAPI spec

### Dark Mode
Uses CSS filters to invert colors:
```css
@media (prefers-color-scheme: dark) {
  .swagger-ui {
    filter: invert(0.9) hue-rotate(180deg);
  }
}
```

## Production Deployment

The Swagger UI works in production at:
`https://cgmtracker.netlify.app/docs`

No additional configuration needed - it's just a Next.js page that fetches the OpenAPI spec.

## Next Steps

1. ✅ Link your API key to user account
2. ✅ Test endpoints in Swagger UI
3. ✅ Build integrations using the API
4. ⏳ Wait for insulin/sensor endpoints to be implemented

## Related Documentation

- **API Key Usage**: `web/docs/api/API_KEY_USAGE.md`
- **Test Results**: `web/docs/fixes/API_TEST_FIXES.md`
- **API Summary**: `web/docs/api/comprehensive-api-summary.md`

## Support

For API issues:
1. Check this documentation
2. Review error messages in responses
3. Test with the automated script
4. Check Supabase logs for database issues
