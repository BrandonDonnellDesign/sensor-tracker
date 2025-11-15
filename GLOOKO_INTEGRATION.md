# Glooko Chrome Extension Integration

This integration allows users to upload their Glooko pump data directly from the Glooko web interface using a Chrome extension.

---

## 🎯 Overview

**Flow:**
1. User installs Chrome extension
2. User authenticates via `/extension/login` page
3. Extension receives JWT token
4. User exports data from Glooko website
5. Extension intercepts download and uploads to your server
6. Server stores ZIP file in Supabase Storage
7. Background job processes pump data into database

---

## 📁 Files Created

### Backend
- `web/app/extension/login/page.tsx` - Extension authentication page
- `web/app/api/glooko/upload/route.ts` - File upload endpoint
- `web/supabase/migrations/20251114000006_create_glooko_uploads.sql` - Database schema

### Database Tables
- `glooko_uploads` - Tracks uploaded ZIP files
- `pump_bolus_events` - Bolus deliveries
- `pump_basal_events` - Basal rates
- `pump_status_events` - Pod changes, alarms
- `pump_delivery_logs` - Unified delivery log

### Storage
- Supabase Storage bucket: `glooko`
- Files stored as: `{user_id}/{timestamp}_glooko.zip`

---

## 🔧 Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Extension ID (get from Chrome Web Store or unpacked extension)
NEXT_PUBLIC_EXTENSION_ID=your-extension-id-here

# JWT Secret (generate random 32+ character string)
EXTENSION_JWT_SECRET=your-secret-key-here
```

**Generate secrets:**
```bash
# Generate EXTENSION_JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Apply Database Migrations

```bash
cd web
supabase db push
```

This creates:
- `glooko_uploads` table
- `pump_*` tables (bolus, basal, status, delivery)
- Storage bucket with RLS policies

### 3. Chrome Extension Setup

Your Chrome extension needs:

**manifest.json:**
```json
{
  "externally_connectable": {
    "matches": [
      "https://yourdomain.com/*",
      "http://localhost:3000/*"
    ]
  },
  "permissions": [
    "storage",
    "downloads"
  ]
}
```

**Background script:**
```javascript
// Listen for login message from website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'extension-login' && request.token) {
    // Store token
    chrome.storage.local.set({ authToken: request.token });
    sendResponse({ success: true });
  }
});

// Intercept Glooko downloads
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  if (downloadItem.filename.includes('glooko') && downloadItem.filename.endsWith('.zip')) {
    // Get auth token
    const { authToken } = await chrome.storage.local.get('authToken');
    
    if (!authToken) {
      console.error('Not authenticated');
      return;
    }

    // Download file
    const response = await fetch(downloadItem.url);
    const blob = await response.blob();
    
    // Upload to server
    const formData = new FormData();
    formData.append('file', blob, downloadItem.filename);
    
    const uploadResponse = await fetch('https://yourdomain.com/api/glooko/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const result = await uploadResponse.json();
    console.log('Upload result:', result);
    
    // Cancel original download
    chrome.downloads.cancel(downloadItem.id);
  }
});
```

---

## 🔐 Security

### JWT Token
- 30-day expiration
- Signed with `EXTENSION_JWT_SECRET`
- Contains: `{ sub: userId, email, type: 'extension' }`

### Storage Policies
- Users can only access their own files
- Files stored in user-specific folders: `{user_id}/`
- RLS policies enforce user isolation

### API Authentication
- Bearer token required
- JWT verification on every request
- Service role key for storage operations

---

## 📊 Data Processing

### Upload Flow
1. Extension uploads ZIP to `/api/glooko/upload`
2. Server verifies JWT token
3. File saved to Supabase Storage
4. Record created in `glooko_uploads` table with status `uploaded`

### Processing Flow (TODO)
1. Background job detects new upload
2. Unzips file and parses CSV data
3. Inserts into `pump_bolus_events`, `pump_basal_events`, etc.
4. Updates `glooko_uploads` status to `processed`
5. Calculates stats (bolus_count, basal_count)

---

## 🚀 Usage

### For Users

1. **Install Extension**
   - Install from Chrome Web Store (or load unpacked for dev)

2. **Authenticate**
   - Visit: `https://yourdomain.com/extension/login`
   - Extension receives token automatically
   - Or copy/paste token manually

3. **Export from Glooko**
   - Go to Glooko website
   - Export pump data as usual
   - Extension intercepts and uploads automatically

4. **View Data**
   - Data appears in your dashboard
   - IOB calculations include pump data
   - Analytics updated with pump events

---

## 🔍 Monitoring

### Check Upload Status

```sql
-- View recent uploads
SELECT 
  id,
  filename,
  size,
  status,
  bolus_count,
  basal_count,
  created_at
FROM glooko_uploads
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;
```

### Check Pump Data

```sql
-- View recent boluses
SELECT * FROM pump_bolus_events
WHERE user_id = 'user-id-here'
ORDER BY timestamp DESC
LIMIT 10;

-- View basal rates
SELECT * FROM pump_basal_events
WHERE user_id = 'user-id-here'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Extension Can't Connect
- Check `NEXT_PUBLIC_EXTENSION_ID` matches actual extension ID
- Verify `externally_connectable` in manifest.json
- Check browser console for errors

### Upload Fails
- Verify `EXTENSION_JWT_SECRET` is set
- Check JWT token hasn't expired
- Verify Supabase Storage bucket exists
- Check RLS policies are correct

### Token Issues
- Token expires after 30 days
- User must re-authenticate at `/extension/login`
- Check JWT_SECRET matches between login and upload

---

## 📝 Next Steps

### TODO: Create Processing Job

Create a background job to process uploaded ZIP files:

1. **Unzip and Parse**
   - Extract CSV files from ZIP
   - Parse pump data (boluses, basals, events)

2. **Insert Data**
   - Bulk insert into `pump_*` tables
   - Handle duplicates gracefully
   - Update `glooko_uploads` status

3. **Update Stats**
   - Calculate bolus_count, basal_count
   - Mark as `processed` or `failed`

4. **Notify User**
   - Create notification when processing complete
   - Show stats in dashboard

### TODO: Dashboard Integration

- Show recent uploads in settings
- Display processing status
- Allow re-processing failed uploads
- View pump data alongside manual logs

---

## 🔗 Related Files

- IOB Calculator: `web/lib/iob-calculator.ts`
- Unified View: `all_insulin_delivery` (SQL view)
- IOB Function: `calculate_total_iob()` (SQL function)
- Pump Types: `web/types/pump.ts`

---

*Last Updated: November 14, 2025*
