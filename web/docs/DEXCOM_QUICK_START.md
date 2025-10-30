# Dexcom API - Quick Start Guide

## ✅ Current Status

The Dexcom API integration is **fully implemented** and ready to use!

## 🚀 Quick Setup (5 minutes)

### 1. Get Dexcom API Credentials

1. Visit [Dexcom Developer Portal](https://developer.dexcom.com/)
2. Create an account and register your app
3. Set redirect URI: `https://yourdomain.com/api/auth/dexcom/callback`
4. Copy your Client ID and Client Secret

### 2. Add Environment Variables

Add to `.env.local`:

```env
DEXCOM_CLIENT_ID=your_client_id_here
DEXCOM_CLIENT_SECRET=your_client_secret_here
DEXCOM_API_BASE_URL=https://api.dexcom.com/v2
DEXCOM_REDIRECT_URI=https://yourdomain.com/api/auth/dexcom/callback

NEXT_PUBLIC_DEXCOM_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_DEXCOM_REDIRECT_URI=https://yourdomain.com/api/auth/dexcom/callback
```

### 3. Test Configuration

Visit: `https://yourdomain.com/api/dexcom/test`

Should show all values as `true`.

### 4. Connect Your Account

1. Go to Settings → Integrations
2. Click "Connect Dexcom Account"
3. Authorize on Dexcom's page
4. You'll be redirected back with success message

### 5. Sync Your Data

Click "Sync Now" button to import:

- ✅ Transmitter/sensor information
- ✅ Device status
- ✅ Last 24 hours of glucose readings

## 📊 What Gets Synced

### Automatically Created:

- **Sensor Records** - One for each transmitter ID
- **Sync Logs** - Audit trail of all sync operations
- **Sync Settings** - User preferences

### Data Available:

- Transmitter IDs
- Device information
- Last upload dates
- EGV (glucose) readings (last 24 hours)

## 🔧 Features

### ✅ Implemented

- OAuth 2.0 authentication
- Manual sync button
- Automatic token refresh
- Sync history/logs
- User preferences
- Error handling
- Security (RLS policies)

### 🚧 Not Yet Implemented

- Automatic background sync (cron job)
- Token encryption (currently plaintext)
- Webhook support
- Glucose data storage/charts
- Real-time alerts

## 🎯 User Experience

### First Time Setup:

1. User clicks "Connect Dexcom"
2. Redirected to Dexcom OAuth
3. Authorizes the app
4. Redirected back to settings
5. Success message shown
6. Can now sync data

### Regular Usage:

1. Click "Sync Now" anytime
2. System fetches latest data
3. Creates sensor records
4. Shows sync results
5. Updates last sync time

## 🔐 Security

### Current Security:

- ✅ RLS policies (users see only their data)
- ✅ OAuth 2.0 flow
- ✅ Token refresh mechanism
- ✅ Audit logging
- ⚠️ Tokens stored as plaintext (marked for encryption)

### Recommended Improvements:

1. Implement token encryption using Supabase Vault
2. Add rate limiting
3. Implement webhook verification
4. Add IP whitelisting for callbacks

## 📝 Database Tables

### dexcom_tokens

Stores OAuth tokens for each user

- `access_token_encrypted` - Access token (TODO: encrypt)
- `refresh_token_encrypted` - Refresh token (TODO: encrypt)
- `token_expires_at` - When token expires
- `is_active` - Whether connection is active

### dexcom_sync_settings

User sync preferences

- `auto_sync_enabled` - Enable automatic sync
- `sync_frequency_minutes` - How often to sync
- `last_successful_sync` - Last successful sync time
- `sync_sensor_data` - What to sync

### dexcom_sync_log

Audit trail of sync operations

- `sync_type` - Type of sync (manual, auto, etc.)
- `status` - success, error, partial_success
- `operation` - Description of what was done
- `records_processed` - How many records synced

## 🐛 Troubleshooting

### "No active Dexcom connection found"

**Solution:** User needs to connect their account first

### "Token expired and refresh failed"

**Solution:** User needs to reconnect their account

### "Token exchange failed"

**Possible causes:**

- Redirect URI mismatch
- Invalid client credentials
- Dexcom API is down

**Check:**

1. Visit `/api/dexcom/test` to verify config
2. Check redirect URI matches exactly
3. Verify credentials are correct

### No sensors imported after sync

**Possible causes:**

- No transmitters in Dexcom account
- Transmitters already imported
- API returned no data

**Check sync logs:**

```sql
SELECT * FROM dexcom_sync_log
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

## 📚 API Endpoints

### User-Facing:

- `GET /api/auth/dexcom/callback` - OAuth callback
- `POST /api/dexcom/sync` - Manual sync
- `GET /api/dexcom/test` - Test configuration

### Admin (Future):

- `GET /api/admin/dexcom/stats` - Usage statistics
- `POST /api/admin/dexcom/sync-all` - Sync all users
- `GET /api/admin/dexcom/logs` - View all logs

## 🎨 UI Components

### DexcomSettings Component

Location: `web/components/dexcom-settings.tsx`

Features:

- Connection status display
- Connect/Disconnect buttons
- Manual sync button
- Sync settings (frequency, auto-sync)
- Sync history display

Usage:

```tsx
import { DexcomSettings } from '@/components/dexcom-settings';

<DexcomSettings user={user} />;
```

## 📈 Next Steps

### Immediate (Production Ready):

1. ✅ Test OAuth flow end-to-end
2. ✅ Verify sync creates sensors correctly
3. ⚠️ Implement token encryption
4. ⚠️ Add error monitoring (Sentry)

### Short Term (1-2 weeks):

1. Implement automatic background sync
2. Add glucose data storage
3. Create glucose charts/trends
4. Add sync notifications

### Long Term (1-3 months):

1. Webhook support for real-time updates
2. Advanced analytics
3. Alert system for high/low glucose
4. Multi-device support

## 💡 Tips

### For Development:

- Use Dexcom sandbox environment for testing
- Check `/api/dexcom/test` before debugging
- Monitor sync logs for issues
- Test token refresh flow

### For Production:

- Implement token encryption ASAP
- Set up monitoring/alerts
- Document rate limits
- Have fallback for API downtime

## 🔗 Resources

- [Dexcom Developer Portal](https://developer.dexcom.com/)
- [API Documentation](https://developer.dexcom.com/docs)
- [OAuth 2.0 Guide](https://oauth.net/2/)
- [Full Integration Guide](./DEXCOM_API_INTEGRATION.md)
