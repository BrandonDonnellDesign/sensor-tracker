# Glooko Data Upload API Guide

## Overview

The Glooko Upload API allows you to programmatically upload Glooko export ZIP files for automatic processing. The system will extract and import insulin doses, glucose readings, and other data from the ZIP file.

## Endpoint

```
POST /api/v1/glooko/upload
```

## Authentication

All requests require authentication using a Bearer token in the Authorization header.

### Getting Your API Key

1. Log into your account
2. Go to Settings → API Keys
3. Generate a new API key
4. Copy and save it securely (it won't be shown again)

## Upload Request

### Headers

```
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
```

### Body

Form data with a single field:
- `file`: Your Glooko export ZIP file

### Example using cURL

```bash
curl -X POST https:/localhost:300/api/v1/glooko/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@/path/to/glooko_export.zip"
```

### Example using JavaScript/Fetch

```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('file', file);

const response = await fetch('https://your-domain.com/api/v1/glooko/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Example using Python

```python
import requests

url = 'https://your-domain.com/api/v1/glooko/upload'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY'
}
files = {
    'file': open('/path/to/glooko_export.zip', 'rb')
}

response = requests.post(url, headers=headers, files=files)
print(response.json())
```

### Example using Node.js

```javascript
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const form = new FormData();
form.append('file', fs.createReadStream('/path/to/glooko_export.zip'));

const response = await fetch('https://your-domain.com/api/v1/glooko/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    ...form.getHeaders()
  },
  body: form
});

const result = await response.json();
console.log(result);
```

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "glooko_export.zip",
  "size": 1048576,
  "status": "processing",
  "message": "File uploaded successfully. Processing will begin automatically.",
  "estimatedProcessingTime": "1-5 minutes"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid file type",
  "message": "Only ZIP files are accepted"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Upload failed",
  "message": "Error details here"
}
```

## Check Upload Status

### Endpoint

```
GET /api/v1/glooko/upload?uploadId=YOUR_UPLOAD_ID
```

### Example

```bash
curl -X GET "https://your-domain.com/api/v1/glooko/upload?uploadId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Response

```json
{
  "success": true,
  "upload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "glooko_export.zip",
    "status": "completed",
    "recordsProcessed": 150,
    "createdAt": "2024-01-01T00:00:00Z",
    "completedAt": "2024-01-01T00:05:00Z"
  }
}
```

## List All Uploads

### Endpoint

```
GET /api/v1/glooko/upload
```

Returns the 10 most recent uploads.

### Example

```bash
curl -X GET "https://your-domain.com/api/v1/glooko/upload" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Response

```json
{
  "success": true,
  "uploads": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "glooko_export.zip",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## File Requirements

- **Format**: ZIP file only
- **Max Size**: 50MB
- **Content**: Glooko export data (CSV files)

## Processing

Once uploaded, the file is automatically processed:

1. **Extraction**: ZIP file is extracted
2. **Parsing**: CSV files are parsed
3. **Import**: Data is imported into your account
4. **Validation**: Duplicates are detected and skipped
5. **Completion**: Status updated to "completed"

Processing typically takes 1-5 minutes depending on file size.

## Status Values

- `processing`: File is being processed
- `completed`: Successfully processed
- `failed`: Processing failed (check error message)

## Rate Limits

- Maximum 10 uploads per hour
- Maximum 100 uploads per day

## Best Practices

1. **Export from Glooko**: Use the official Glooko export feature
2. **Check Status**: Poll the status endpoint to know when processing is complete
3. **Handle Errors**: Implement proper error handling
4. **Secure Keys**: Never commit API keys to version control
5. **Rotate Keys**: Regularly rotate your API keys

## Troubleshooting

### Upload Fails

- Verify file is a valid ZIP
- Check file size is under 50MB
- Ensure API key is valid
- Check network connectivity

### Processing Stuck

- Wait at least 5 minutes
- Check status endpoint
- Contact support if stuck for >10 minutes

### Data Not Appearing

- Verify upload status is "completed"
- Check for duplicate data (duplicates are skipped)
- Refresh your dashboard

## Support

For issues or questions:
- Check the API documentation
- Review error messages
- Contact support with your upload ID

## Security

- API keys are sensitive - treat them like passwords
- Use HTTPS for all requests
- Rotate keys if compromised
- Monitor API usage in settings
