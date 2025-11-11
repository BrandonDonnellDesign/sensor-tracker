# 🔑 API Key Usage Guide

Complete guide for using API keys to access the CGM Tracker API.

## Overview

The CGM Tracker API supports two authentication methods:
1. **JWT Bearer Tokens** - For web app users (automatic)
2. **API Keys** - For external scripts and integrations (manual)

This guide covers API key authentication for external access.

## Getting Your API Key

### 1. Generate an API Key

1. Log into the web app at `http://localhost:3000`
2. Go to **Settings** → **API Keys**
3. Click **"Generate New API Key"**
4. Give it a name (e.g., "Daily Tips Bot")
5. Select a tier:
   - **Free**: 100 requests/hour, 2 keys max
   - **Basic**: 1,000 requests/hour, 5 keys max
   - **Premium**: 10,000 requests/hour, 10 keys max
6. Copy the key immediately (it won't be shown again!)

### 2. Store Your API Key Securely

```bash
# .env file
CGM_TRACKER_API_KEY=sk_your_api_key_here
```

**⚠️ Never commit API keys to version control!**

## Using Your API Key

### Base URL

```
http://localhost:3000/api/v1
```

For production:
```
https://your-domain.com/api/v1
```

### Authentication Header

Include your API key in the `X-API-Key` header:

```bash
X-API-Key: sk_your_api_key_here
```

## Example Requests

### JavaScript/Node.js

```javascript
const API_KEY = process.env.CGM_TRACKER_API_KEY;
const BASE_URL = 'http://localhost:3000/api/v1';

async function createTip(title, content, category) {
  const response = await fetch(`${BASE_URL}/community/tips/create`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      content,
      category,
      tags: ['automated', 'daily-tip']
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.message}`);
  }
  
  return response.json();
}

// Usage
createTip(
  'Daily CGM Tip',
  'Keep your sensor calibrated and app synced.',
  'general'
).then(result => {
  console.log('Tip created:', result.data.id);
}).catch(error => {
  console.error('Failed:', error.message);
});
```

### Python

```python
import os
import requests

API_KEY = os.getenv('CGM_TRACKER_API_KEY')
BASE_URL = 'http://localhost:3000/api/v1'

def create_tip(title, content, category):
    response = requests.post(
        f'{BASE_URL}/community/tips/create',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        json={
            'title': title,
            'content': content,
            'category': category,
            'tags': ['automated', 'daily-tip']
        }
    )
    
    response.raise_for_status()
    return response.json()

# Usage
result = create_tip(
    'Daily CGM Tip',
    'Keep your sensor calibrated and app synced.',
    'general'
)
print(f"Tip created: {result['data']['id']}")
```

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/community/tips/create \
  -H "X-API-Key: sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily CGM Tip",
    "content": "Keep your sensor calibrated and app synced.",
    "category": "general",
    "tags": ["automated", "daily-tip"]
  }'
```

## Available Endpoints

### Community Tips

#### Create Tip
```
POST /api/v1/community/tips/create
```

**Body:**
```json
{
  "title": "string (max 200 chars)",
  "content": "string (max 10,000 chars)",
  "category": "sensor-placement|troubleshooting|lifestyle|alerts|data-analysis|general",
  "tags": ["string"],
  "is_anonymous": false
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "content": "string",
    "category": "string",
    "author_name": "string",
    "created_at": "timestamp",
    "upvotes": 0,
    "downvotes": 0
  },
  "meta": {
    "responseTime": "50ms",
    "apiVersion": "1.0.0"
  }
}
```

#### List Tips
```
GET /api/v1/community/tips
```

**Query Parameters:**
- `category` - Filter by category
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset

#### Vote on Tip
```
POST /api/v1/community/tips/{tipId}/vote
```

**Body:**
```json
{
  "vote_type": "up|down"
}
```

### Other Endpoints

See the full API documentation at:
```
http://localhost:3000/api/v1/docs
```

## Rate Limiting

Rate limits are enforced per API key:

| Tier | Requests/Hour | Max Keys |
|------|---------------|----------|
| Free | 100 | 2 |
| Basic | 1,000 | 5 |
| Premium | 10,000 | 10 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

When rate limited, you'll receive:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded",
  "rateLimit": {
    "allowed": false,
    "currentCount": 100,
    "limitValue": 100,
    "resetTime": "2024-01-01T12:00:00Z"
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `authentication_failed` | 401 | Invalid or missing API key |
| `rate_limit_exceeded` | 429 | Too many requests |
| `validation_error` | 400 | Invalid request data |
| `not_found` | 404 | Resource not found |
| `internal_error` | 500 | Server error |

### Example Error Handling

```javascript
try {
  const result = await createTip(title, content, category);
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('authentication_failed')) {
    console.error('Invalid API key');
  } else if (error.message.includes('rate_limit_exceeded')) {
    console.error('Rate limit exceeded, try again later');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

### 1. Secure Your API Keys
- Store in environment variables
- Never commit to version control
- Rotate keys regularly
- Use different keys for different environments

### 2. Handle Rate Limits
```javascript
async function createTipWithRetry(title, content, category, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await createTip(title, content, category);
    } catch (error) {
      if (error.message.includes('rate_limit_exceeded') && i < maxRetries - 1) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Log API Usage
```javascript
const response = await fetch(url, options);
console.log(`API Request: ${response.status} ${response.statusText}`);
console.log(`Rate Limit: ${response.headers.get('X-RateLimit-Remaining')}/${response.headers.get('X-RateLimit-Limit')}`);
```

### 4. Validate Data Before Sending
```javascript
function validateTip(title, content, category) {
  if (!title || title.length > 200) {
    throw new Error('Title must be 1-200 characters');
  }
  if (!content || content.length > 10000) {
    throw new Error('Content must be 1-10,000 characters');
  }
  const validCategories = ['sensor-placement', 'troubleshooting', 'lifestyle', 'alerts', 'data-analysis', 'general'];
  if (!validCategories.includes(category)) {
    throw new Error('Invalid category');
  }
}
```

## Monitoring Your Usage

### View API Key Stats

Go to **Settings** → **API Keys** to see:
- Total requests made
- Rate limit status
- Last used timestamp
- Key expiration date

### Programmatic Usage Check

```javascript
async function checkUsage() {
  const response = await fetch(`${BASE_URL}/auth/api-keys`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  const data = await response.json();
  console.log('API Keys:', data.data);
}
```

## Troubleshooting

### "Invalid API key"
- Check that you're using the correct key
- Verify the key hasn't expired
- Ensure you're sending it in the `X-API-Key` header (not `Authorization`)

### "Unable to determine user ID"
- Your API key might not be associated with a user
- Contact support or regenerate the key

### "Rate limit exceeded"
- Wait for the rate limit to reset (shown in error response)
- Upgrade to a higher tier
- Optimize your request frequency

### "Validation error"
- Check that all required fields are provided
- Verify field lengths and formats
- Review the API documentation

## Support

- **API Documentation**: `/api/v1/docs`
- **Swagger UI**: Interactive API testing
- **GitHub Issues**: Report bugs or request features

---

**Last Updated**: November 2025  
**API Version**: 1.0.0  
**Status**: Production Ready ✅
