# 🔗 Insulin Management API Documentation

## **Authentication**
All API endpoints require authentication. Include the user's session token in requests.

## **Base URL**
```
https://your-domain.com/api/insulin
```

---

## **📊 GET /api/insulin/stats**
Get comprehensive insulin statistics and analytics.

### **Query Parameters**
- `period` (optional): Number of days to analyze (default: 30, max: 365)
- `include_iob` (optional): Include current IOB calculation (true/false)

### **Example Request**
```bash
GET /api/insulin/stats?period=14&include_iob=true
```

### **Response**
```json
{
  "data": {
    "period": {
      "days": 14,
      "startDate": "2025-10-24T00:00:00.000Z",
      "endDate": "2025-11-07T00:00:00.000Z",
      "daysWithData": 12
    },
    "totals": {
      "insulin": 245.6,
      "bolus": 156.3,
      "basal": 89.3,
      "entries": 45
    },
    "dailyAverages": {
      "total": 20.5,
      "bolus": 13.0,
      "basal": 7.4
    },
    "percentages": {
      "basal": 36.4,
      "bolus": 63.6
    },
    "insulinTypeBreakdown": {
      "rapid": 142.1,
      "short": 14.2
    },
    "trend": "stable",
    "currentIOB": 2.3
  }
}
```

---

## **📋 GET /api/insulin/logs**
Retrieve insulin logs with pagination and filtering.

### **Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `delivery_type` (optional): Filter by delivery type (bolus, basal, correction)
- `insulin_type` (optional): Filter by insulin type (rapid, short, intermediate, long)
- `start_date` (optional): Start date filter (ISO 8601 format)
- `end_date` (optional): End date filter (ISO 8601 format)

### **Example Request**
```bash
GET /api/insulin/logs?page=1&limit=20&delivery_type=bolus&start_date=2025-11-01T00:00:00.000Z
```

### **Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "units": 5.5,
      "insulin_type": "rapid",
      "insulin_name": "Humalog",
      "taken_at": "2025-11-07T12:30:00.000Z",
      "delivery_type": "bolus",
      "meal_relation": "with_meal",
      "blood_glucose_before": 145,
      "notes": "Lunch bolus",
      "logged_via": "manual",
      "created_at": "2025-11-07T12:30:15.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## **➕ POST /api/insulin/logs**
Create a new insulin log entry.

### **Request Body**
```json
{
  "units": 5.5,
  "insulin_type": "rapid",
  "taken_at": "2025-11-07T12:30:00.000Z",
  "insulin_name": "Humalog",
  "delivery_type": "bolus",
  "meal_relation": "with_meal",
  "blood_glucose_before": 145,
  "notes": "Lunch bolus"
}
```

### **Required Fields**
- `units` (number): Amount of insulin (must be positive)
- `insulin_type` (string): One of: rapid, short, intermediate, long
- `taken_at` (string): ISO 8601 timestamp

### **Optional Fields**
- `insulin_name` (string): Brand name of insulin
- `delivery_type` (string): bolus, basal, correction (default: bolus)
- `meal_relation` (string): with_meal, before_meal, after_meal, correction
- `injection_site` (string): Injection location
- `blood_glucose_before` (number): BG reading before dose
- `blood_glucose_after` (number): BG reading after dose
- `notes` (string): Additional notes
- `mood` (string): User mood
- `activity_level` (string): Activity level

### **Response**
```json
{
  "message": "Insulin log created successfully",
  "data": {
    "id": "uuid",
    "units": 5.5,
    "insulin_type": "rapid",
    "taken_at": "2025-11-07T12:30:00.000Z",
    "logged_via": "api",
    "created_at": "2025-11-07T12:30:15.000Z"
  }
}
```

---

## **🔒 Error Responses**

### **401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

### **400 Bad Request**
```json
{
  "error": "Missing required fields: units, insulin_type, taken_at"
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## **📝 Usage Examples**

### **JavaScript/TypeScript**
```typescript
// Get statistics
const stats = await fetch('/api/insulin/stats?period=30&include_iob=true')
  .then(res => res.json());

// Get recent logs
const logs = await fetch('/api/insulin/logs?limit=10')
  .then(res => res.json());

// Create new log entry
const newLog = await fetch('/api/insulin/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    units: 4.5,
    insulin_type: 'rapid',
    taken_at: new Date().toISOString(),
    notes: 'Breakfast bolus'
  })
}).then(res => res.json());
```

### **Python**
```python
import requests

# Get statistics
response = requests.get('/api/insulin/stats?period=14')
stats = response.json()

# Create new log entry
new_log = {
    'units': 3.5,
    'insulin_type': 'rapid',
    'taken_at': '2025-11-07T08:30:00.000Z',
    'notes': 'Morning bolus'
}
response = requests.post('/api/insulin/logs', json=new_log)
```

### **cURL**
```bash
# Get statistics
curl -X GET "/api/insulin/stats?period=7&include_iob=true"

# Create new log entry
curl -X POST "/api/insulin/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "units": 6.0,
    "insulin_type": "rapid",
    "taken_at": "2025-11-07T18:30:00.000Z",
    "meal_relation": "with_meal"
  }'
```

---

## **🔄 Rate Limits**
- **GET requests**: 100 requests per minute
- **POST requests**: 30 requests per minute

## **📊 Data Formats**
- **Dates**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Numbers**: Decimal precision to 1 decimal place for insulin units
- **Timestamps**: UTC timezone

## **🔐 Security**
- All endpoints require valid authentication
- User data is isolated by user ID
- Input validation on all parameters
- SQL injection protection
- Rate limiting enabled

---

**API Version**: 1.0  
**Last Updated**: November 7, 2025