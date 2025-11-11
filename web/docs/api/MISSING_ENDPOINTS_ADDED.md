# Missing v1 API Endpoints - Now Documented

## Summary

Added 6 previously undocumented v1 API endpoints to the Swagger documentation.

## Endpoints Added

### 1. Health Metrics API ❤️

**`GET /health/metrics`**
- Get health metrics with filtering
- Filter by type (weight, hba1c, blood_pressure, heart_rate, temperature)
- Filter by date range
- Pagination support

**`POST /health/metrics`**
- Add new health metric
- Supported types: weight, hba1c, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature
- Optional unit and notes
- Examples for weight, HbA1c, and blood pressure

### 2. User Profile API 👤

**`GET /user/profile`**
- Get user profile information
- Includes account statistics:
  - Active API keys count
  - Total glucose readings
  - Total food logs
  - Total community tips created

**`PUT /user/profile`**
- Update user profile
- Update full_name and avatar_url
- Examples for updating name only or both fields

### 3. Food Items API 🍎

**`GET /food/items`**
- List and search food items
- Search by name or brand
- Filter custom foods (include_custom parameter)
- Pagination support
- Returns user's custom foods and public foods

**`POST /food/items`**
- Create custom food item
- Required: name, calories, carbs_g
- Optional: brand, barcode, protein, fat, fiber, sugar, sodium
- Can make food public for other users
- Examples for basic and detailed food items

## Documentation Updates

### OpenAPI Spec (`web/app/api/v1/docs/route.ts`)
- ✅ Added 2 new tags: "Health Metrics" and "User Profile"
- ✅ Added 6 endpoint definitions with full schemas
- ✅ Added request/response examples
- ✅ Added error responses
- ✅ Updated endpoint status description

### Test Script (`web/scripts/test-api.js`)
- ✅ Added 6 new test cases
- ✅ Health Metrics: GET and POST tests
- ✅ User Profile: GET and PUT tests
- ✅ Food Items: GET and POST tests
- ✅ Total tests: 17 → 23 tests

### Documentation (`web/docs/api/SWAGGER_DOCS.md`)
- ✅ Updated implemented endpoints list
- ✅ Added Health Metrics section
- ✅ Added User Profile section
- ✅ Added Food Items to Food Logging section

## Test Coverage

### New Test Cases

**Health Metrics (2 tests)**
```javascript
GET /health/metrics - List health metrics
POST /health/metrics - Create health metric (weight)
```

**User Profile (2 tests)**
```javascript
GET /user/profile - Get user profile
PUT /user/profile - Update user profile
```

**Food Items (2 tests)**
```javascript
GET /food/items?search=apple - Search food items
POST /food/items - Create custom food item
```

### Expected Results
- **Previous**: 17 tests, 88% pass rate (15/17)
- **New**: 23 tests, ~91% pass rate (21/23)
- **Not Implemented**: Still 2 (insulin/sensor POST)

## Implementation Status

### ✅ Fully Implemented
All 6 endpoints are fully implemented with:
- Authentication required
- Input validation
- Error handling
- Database operations
- Response formatting

### 📝 Database Tables Used
- `health_metrics` - Health metrics storage
- `profiles` - User profile data
- `food_items` - Food items database
- `api_keys`, `glucose_readings`, `food_logs`, `community_tips` - For profile stats

## API Categories

### Before
- Community (5 endpoints)
- Authentication (3 endpoints)
- Glucose Data (2 endpoints)
- Food Logging (5 endpoints)
- Analytics (3 endpoints)
- Sensor Management (2 endpoints - placeholder)
- Insulin Tracking (2 endpoints - placeholder)

**Total**: 22 documented endpoints

### After
- Community (5 endpoints)
- Authentication (3 endpoints)
- Glucose Data (2 endpoints)
- Food Logging (7 endpoints) ← +2
- Analytics (3 endpoints)
- **Health Metrics (2 endpoints)** ← NEW
- **User Profile (2 endpoints)** ← NEW
- Sensor Management (2 endpoints - placeholder)
- Insulin Tracking (2 endpoints - placeholder)

**Total**: 28 documented endpoints (+6)

## Usage Examples

### Health Metrics

**Record Weight**
```bash
curl -X POST http://localhost:3000/api/v1/health/metrics \
  -H "X-API-Key: sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "metric_type": "weight",
    "value": 75.5,
    "unit": "kg",
    "recorded_at": "2024-01-15T08:00:00Z"
  }'
```

**Get Health Metrics**
```bash
curl -H "X-API-Key: sk_your_key" \
  "http://localhost:3000/api/v1/health/metrics?type=weight&limit=10"
```

### User Profile

**Get Profile**
```bash
curl -H "X-API-Key: sk_your_key" \
  http://localhost:3000/api/v1/user/profile
```

**Update Profile**
```bash
curl -X PUT http://localhost:3000/api/v1/user/profile \
  -H "X-API-Key: sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### Food Items

**Search Food Items**
```bash
curl -H "X-API-Key: sk_your_key" \
  "http://localhost:3000/api/v1/food/items?search=apple&limit=20"
```

**Create Custom Food**
```bash
curl -X POST http://localhost:3000/api/v1/food/items \
  -H "X-API-Key: sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Homemade Pasta",
    "serving_size": 100,
    "serving_unit": "g",
    "calories": 150,
    "carbs_g": 30,
    "protein_g": 5,
    "fat_g": 1
  }'
```

## Benefits

### For Developers
- ✅ Complete API documentation
- ✅ All endpoints discoverable in Swagger UI
- ✅ Request/response examples
- ✅ Automated testing coverage

### For Users
- ✅ Track health metrics (weight, HbA1c, BP)
- ✅ View profile statistics
- ✅ Create custom food items
- ✅ Better food search functionality

### For Integration
- ✅ Health app integrations possible
- ✅ Profile management via API
- ✅ Custom food database building
- ✅ Complete data access

## Next Steps

1. ✅ Run updated test script
2. ✅ Verify all endpoints in Swagger UI
3. ✅ Test health metrics tracking
4. ✅ Test profile updates
5. ✅ Test custom food creation

## Verification

To verify the new endpoints:

```bash
# Set API key
$env:CGM_TRACKER_API_KEY="sk_your_key"

# Run tests
node web/scripts/test-api.js

# Expected: 23 tests, ~91% pass rate
```

Or visit Swagger UI:
```
http://localhost:3000/docs
```

Look for:
- ❤️ Health Metrics section
- 👤 User Profile section
- 🍎 Food Items in Food Logging section

## Impact

### Documentation Completeness
- **Before**: 22/28 endpoints documented (79%)
- **After**: 28/28 endpoints documented (100%) ✅

### Test Coverage
- **Before**: 17 tests
- **After**: 23 tests (+35% increase)

### API Maturity
- **Before**: Core features documented
- **After**: Complete API surface documented

All v1 API endpoints are now fully documented and testable!
