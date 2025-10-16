# Dexcom Integration Setup

## 🎯 Quick Setup Guide

### 1. Run Database Migration
Execute the SQL from `web/supabase/migrations/20251011194831_dexcom_integration.sql` in your Supabase SQL Editor.

### 2. Environment Variables
The following are already configured in your `.env.local`:
```bash
DEXCOM_CLIENT_ID=iW8vESe3KyH9uGZTUjikLcbHtWQNiyMk
DEXCOM_CLIENT_SECRET=rWxg8pbywu1bFVN9
NEXT_PUBLIC_DEXCOM_CLIENT_ID=iW8vESe3KyH9uGZTUjikLcbHtWQNiyMk
DEXCOM_API_BASE_URL=https://api.dexcom.com/v2
DEXCOM_REDIRECT_URI=https://unfailed-provisorily-coralie.ngrok-free.dev/api/auth/dexcom/callback
NEXT_PUBLIC_DEXCOM_REDIRECT_URI=https://unfailed-provisorily-coralie.ngrok-free.dev/api/auth/dexcom/callback
```

### 3. Dexcom Developer Settings
In your Dexcom Developer Portal, ensure the redirect URI is set to:
```
https://unfailed-provisorily-coralie.ngrok-free.dev/api/auth/dexcom/callback
```

### 4. Test the Integration
1. Go to Settings → Integrations → Configure Dexcom
2. Click "Connect Dexcom Account"
3. Complete OAuth flow
4. Test manual sync

## 🔧 Features Included

- **OAuth Integration**: Secure account connection
- **Automatic Sync**: Configurable sync intervals (15 min to daily)
- **Manual Sync**: On-demand data synchronization
- **Token Management**: Automatic token refresh
- **Activity Logging**: Track all sync attempts
- **Sensor Import**: Auto-create sensor records from Dexcom devices

## 🗄️ Database Tables Created

- `dexcom_tokens` - OAuth token storage (encrypted)
- `dexcom_sync_settings` - User sync preferences
- `dexcom_sync_log` - Sync activity audit log

## 🚀 Ready to Use!

The integration is production-ready and will automatically import sensor data from connected Dexcom accounts.