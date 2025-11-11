# API Documentation

Documentation for the CGM Tracker API.

## 📚 Documentation Files

### Main Documentation

**[SWAGGER_DOCS.md](./SWAGGER_DOCS.md)** - Complete Swagger UI documentation guide
- Quick start guide
- API key setup instructions
- Using the Swagger UI
- Authentication methods
- Error handling
- Troubleshooting

**[API_KEY_USAGE.md](./API_KEY_USAGE.md)** - API key management guide
- Creating API keys
- Using API keys
- Security best practices
- Rate limiting

### Planning Documents

**[api-expansion-plan.md](./api-expansion-plan.md)** - Future API endpoints
- Planned endpoints
- Feature roadmap
- Implementation priorities

### Legacy Documentation

**[API.md](./API.md)** - Old insulin API documentation
- Legacy `/api/insulin` endpoints (non-v1)
- Kept for reference during migration

## 🚀 Quick Links

### Interactive Documentation
- **Development**: http://localhost:3000/docs
- **Production**: https://cgmtracker.netlify.app/docs

### OpenAPI Spec
- **JSON**: http://localhost:3000/api/v1/docs
- **YAML**: http://localhost:3000/api/v1/docs?format=yaml

### In-App Access
- Settings → API Keys → "Open Swagger UI"
- Help → API & Integrations section

## 📖 Getting Started

1. **Read**: [SWAGGER_DOCS.md](./SWAGGER_DOCS.md) for complete guide
2. **Setup**: Generate API key in Settings → API Keys
3. **Link**: Run SQL script to link key to user account
4. **Test**: Visit `/docs` and try endpoints

## 🔑 API Key Setup

Quick setup:

```sql
-- Run in Supabase SQL Editor
UPDATE api_keys 
SET user_id = (SELECT id FROM profiles WHERE email = 'your@email.com')
WHERE key_prefix = 'sk_your_prefix';
```

Or use the script:
```bash
psql <connection-string> -f web/scripts/fix-api-key-user.sql
```

## 📊 API Status

### ✅ Implemented (v1)
- Community tips and comments
- Glucose readings
- Food logging
- Analytics
- Authentication

### ⚠️ Placeholder (v1)
- Insulin doses (returns empty data)
- Sensor management (returns empty data)

### 📝 Legacy (non-v1)
- Insulin stats (`/api/insulin/stats`)
- Insulin logs (`/api/insulin/logs`)

## 🧪 Testing

Automated test script:
```bash
$env:CGM_TRACKER_API_KEY="sk_your_key"
node web/scripts/test-api.js
```

Expected: ~88% pass rate (15/17 tests)

## 📞 Support

For API issues:
1. Check [SWAGGER_DOCS.md](./SWAGGER_DOCS.md) troubleshooting section
2. Review error messages in API responses
3. Run automated test script
4. Check Supabase logs

## 🔗 Related Documentation

- **Testing**: `web/docs/fixes/API_TEST_FIXES.md`
- **JWT Auth**: `web/docs/fixes/JWT_AUTH_FIX.md`
- **Test Checklist**: `web/docs/TESTING_CHECKLIST.md`
