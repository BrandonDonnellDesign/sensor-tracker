# V1 API Endpoints - Authentication Status

All V1 API endpoints now support **API key authentication** via Bearer tokens.

## Authentication Methods

All endpoints support two authentication methods:

1. **Session Authentication** - For web app users (JWT tokens)
2. **API Key Authentication** - For programmatic access (Bearer tokens with `sk_` prefix)

### Usage

```bash
# Using API Key
curl -H "Authorization: Bearer sk_YOUR_API_KEY_HERE" \
  https://your-domain.com/api/v1/endpoint

# Alternative: Using x-api-key header
curl -H "x-api-key: sk_YOUR_API_KEY_HERE" \
  https://your-domain.com/api/v1/endpoint
```

## Endpoint Status

### ✅ Fully Supported Endpoints

| Endpoint | Method | Authentication | Description |
|----------|--------|----------------|-------------|
| `/api/v1/glooko/upload` | POST | ✅ API Key + Session | Upload Glooko ZIP exports |
| `/api/v1/glucose/readings` | GET | ✅ API Key + Session | Get glucose readings |
| `/api/v1/insulin/doses` | GET, POST | ✅ API Key + Session | Insulin dose tracking |
| `/api/v1/food/logs` | GET | ✅ API Key + Session | Food log data |
| `/api/v1/food/search` | GET | ✅ API Key + Session | Search food database |
| `/api/v1/food/favorites` | GET, POST | ✅ API Key + Session | Manage food favorites |
| `/api/v1/food/items` | GET, POST | ✅ API Key + Session | Food item management |
| `/api/v1/export/glucose` | GET | ✅ API Key + Session | Export glucose data (CSV/JSON/PDF) |
| `/api/v1/analytics/daily-summary` | GET | ✅ API Key + Session | Daily analytics summary |
| `/api/v1/analytics/glucose-trends` | GET | ✅ API Key + Session | Glucose trend analysis |
| `/api/v1/sensors` | GET | ✅ API Key + Session | Sensor information |
| `/api/v1/user/profile` | GET | ✅ API Key + Session | User profile data |
| `/api/v1/community/tips` | GET | ✅ API Key + Session | Community tips |
| `/api/v1/community/comments` | GET | ✅ API Key + Session | Community comments |
| `/api/v1/community/categories` | GET | ✅ API Key + Session | Community categories |
| `/api/v1/community/search` | GET | ✅ API Key + Session | Search community content |

### 🔐 Auth Management Endpoints

| Endpoint | Method | Authentication | Description |
|----------|--------|----------------|-------------|
| `/api/v1/auth/api-keys` | GET, POST | ✅ Session Only | Manage API keys |
| `/api/v1/auth/api-keys/[keyId]` | PATCH, DELETE | ✅ Session Only | Update/delete specific key |
| `/api/v1/auth/usage` | GET | ✅ Session Only | API usage statistics |
| `/api/v1/auth/test` | GET | ✅ API Key + Session | Test authentication |

### 📚 Documentation

| Endpoint | Method | Authentication | Description |
|----------|--------|----------------|-------------|
| `/api/v1/docs` | GET | ❌ Public | API documentation |

## Implementation Details

### Middleware Used

Two authentication middlewares are available:

1. **`authenticateApiRequest`** (from `@/lib/api-middleware`)
   - Used by most endpoints
   - Supports both `x-api-key` header and `Bearer` tokens
   - Includes rate limiting
   - Auto-detects API key format (`sk_` prefix)

2. **`apiAuthMiddleware`** (from `@/lib/middleware/api-auth-middleware`)
   - Used by export and some analytics endpoints
   - More comprehensive logging
   - Supports both `x-api-key` header and `Bearer` tokens

### Rate Limiting

Rate limits are enforced per API key tier:

- **Free**: 100 requests/hour
- **Basic**: 1,000 requests/hour
- **Premium**: 10,000 requests/hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

Common error codes:
- `authentication_failed`: Invalid or missing authentication
- `rate_limit_exceeded`: Too many requests
- `database_error`: Database operation failed
- `validation_error`: Invalid request parameters
- `internal_error`: Server error

## Testing

### Generate an API Key

1. Log into the web app
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the key (starts with `sk_`)
5. Store it securely (you won't see it again)

### Test an Endpoint

```bash
# Test glucose readings
curl -H "Authorization: Bearer sk_YOUR_KEY" \
  "https://your-domain.com/api/v1/glucose/readings?limit=10"

# Test Glooko upload
curl -X POST \
  -H "Authorization: Bearer sk_YOUR_KEY" \
  -F "file=@glooko_export.zip" \
  "https://your-domain.com/api/v1/glooko/upload"

# Test food search
curl -H "Authorization: Bearer sk_YOUR_KEY" \
  "https://your-domain.com/api/v1/food/search?q=apple"
```

## Security Notes

- API keys are hashed (SHA-256) before storage
- Keys are validated on every request
- Expired keys are automatically rejected
- Last used timestamp is updated on each use
- Service role client bypasses RLS for API key requests
- All endpoints log usage for monitoring

## Next Steps

To add API key support to a new endpoint:

1. Import the middleware:
   ```typescript
   import { authenticateApiRequest } from '@/lib/api-middleware';
   ```

2. Add authentication check:
   ```typescript
   const authResult = await authenticateApiRequest(request);
   if (!authResult.success) {
     return NextResponse.json(
       { error: 'authentication_failed', message: authResult.error },
       { status: 401 }
     );
   }
   ```

3. Use `authResult.userId` to filter data by user

4. For write operations with API keys, use service role client to bypass RLS
