# Dexcom API Integration Guide

## Overview

The Dexcom API integration allows users to automatically sync their CGM sensor data from their Dexcom account.

## Architecture

### Database Tables

1. **dexcom_tokens** - Stores OAuth tokens (encrypted)
2. **dexcom_sync_settings** - User sync preferences
3. **dexcom_sync_log** - Audit log of sync operations

### API Endpoints

#### 1. OAuth Callback

**Endpoint:** `/api/auth/dexcom/callback`
**Method:** GET
**Purpose:** Handles OAuth callback from Dexcom

**Flow:**

1. Receives authorization code from Dexcom
2. Exchanges code for access/refresh tokens
3. Stores encrypted tokens in database
4. Creates default sync settings
5. Redirects to settings page

#### 2. Sync Endpoint

**Endpoint:** `/api/dexcom/sync`
**Method:** POST
**Purpose:** Manually trigger sync with Dexcom API

**What it syncs:**

- Devices (transmitters)
- Sensor data (creates sensor records)
- EGV (Estimated Glucose Values) - last 24 hours

**Features:**

- Automatic token refresh if expired
- Creates sensor records from transmitter IDs
- Logs all sync operations
- Error handling and partial success support

#### 3. Test Endpoint

**Endpoint:** `/api/dexcom/test`
**Method:** GET
**Purpose:** Verify Dexcom configuration

## Environment Variables Required

```env
# Dexcom API Configuration
DEXCOM_CLIENT_ID=your_client_id
DEXCOM_CLIENT_SECRET=your_client_secret
DEXCOM_API_BASE_URL=https://api.dexcom.com/v2
DEXCOM_REDIRECT_URI=https://yourdomain.com/api/auth/dexcom/callback

# Public (Frontend) Variables
NEXT_PUBLIC_DEXCOM_CLIENT_ID=your_client_id
NEXT_PUBLIC_DEXCOM_REDIRECT_URI=https://yourdomain.com/api/auth/dexcom/callback
```

## Setup Instructions

### 1. Register Your Application with Dexcom

1. Go to [Dexcom Developer Portal](https://developer.dexcom.com/)
2. Create a new application
3. Set redirect URI to: `https://yourdomain.com/api/auth/dexcom/callback`
4. Note your Client ID and Client Secret

### 2. Configure Environment Variables

Add the variables above to your `.env.local` file

### 3. Apply Database Migration

```bash
# The migration is already in place:
# web/supabase/migrations/20251011194831_dexcom_integration.sql
```

### 4. Test Configuration

Visit: `https://yourdomain.com/api/dexcom/test`

Should return:

```json
{
  "configured": {
    "client_id": true,
    "client_secret": true,
    "public_client_id": true,
    "api_base_url": true,
    "redirect_uri": true,
    "public_redirect_uri": true
  }
}
```

## User Flow

### Connecting Dexcom Account

1. User goes to Settings → Integrations
2. Clicks "Connect Dexcom"
3. Redirected to Dexcom OAuth page
4. User authorizes the app
5. Redirected back to callback endpoint
6. Tokens stored, sync settings created
7. User redirected to settings with success message

### Syncing Data

1. User clicks "Sync Now" button
2. POST request to `/api/dexcom/sync`
3. System fetches devices and EGV data
4. Creates sensor records for new transmitters
5. Updates last sync timestamp
6. Returns sync results

## Security Features

### Token Storage

- Tokens are stored in `dexcom_tokens` table
- **Note:** Currently stored as plaintext with `_encrypted` suffix
- **TODO:** Implement actual encryption using Supabase Vault or similar

### Row Level Security (RLS)

- Users can only access their own tokens
- Users can only view their own sync logs
- Users can only manage their own sync settings

### Token Refresh

- Automatic token refresh when expired
- Refresh token stored securely
- Failed refresh triggers re-authentication

## API Rate Limits

Dexcom API has rate limits:

- **Devices endpoint:** 100 requests/hour
- **EGV endpoint:** 100 requests/hour

Current implementation:

- Manual sync only (no automatic background sync)
- Fetches last 24 hours of EGV data
- Logs API calls made for monitoring

## Sync Settings

Users can configure:

- `auto_sync_enabled` - Enable/disable automatic sync (not yet implemented)
- `sync_frequency_minutes` - How often to sync (default: 60 minutes)
- `sync_sensor_data` - Sync transmitter/sensor info
- `sync_glucose_data` - Sync EGV readings
- `sync_device_status` - Sync device status

## Troubleshooting

### Common Issues

**1. "No active Dexcom connection found"**

- User needs to connect their Dexcom account first
- Check if tokens exist in `dexcom_tokens` table

**2. "Token expired and refresh failed"**

- Refresh token may be invalid
- User needs to reconnect their account

**3. "Token exchange failed"**

- Check redirect URI matches exactly
- Verify client ID and secret are correct
- Check Dexcom API status

### Debugging

Check sync logs:

```sql
SELECT * FROM dexcom_sync_log
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

Check token status:

```sql
SELECT
  user_id,
  token_expires_at,
  is_active,
  last_sync_at,
  created_at
FROM dexcom_tokens
WHERE user_id = 'USER_ID';
```

## Future Enhancements

### Planned Features

1. **Automatic Background Sync**

   - Implement cron job for automatic syncing
   - Use sync_frequency_minutes setting
   - Only sync when auto_sync_enabled is true

2. **Token Encryption**

   - Implement proper encryption for tokens
   - Use Supabase Vault or similar solution
   - Rotate encryption keys periodically

3. **Webhook Support**

   - Receive real-time updates from Dexcom
   - Reduce API calls
   - Faster data availability

4. **Enhanced Glucose Data**

   - Store EGV readings in separate table
   - Create charts and trends
   - Alert on high/low readings

5. **Device Management**
   - Track multiple devices per user
   - Device history and status
   - Transmitter expiration tracking

## API Reference

### Dexcom API Endpoints Used

**Get Devices:**

```
GET /v2/users/self/devices
Authorization: Bearer {access_token}
```

**Get EGV Data:**

```
GET /v2/users/self/egvs?startDate={ISO8601}&endDate={ISO8601}
Authorization: Bearer {access_token}
```

**Refresh Token:**

```
POST /v2/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
&client_secret={client_secret}
&refresh_token={refresh_token}
&grant_type=refresh_token
```

## Support

For Dexcom API issues:

- [Dexcom Developer Portal](https://developer.dexcom.com/)
- [API Documentation](https://developer.dexcom.com/docs)
- [Support Contact](https://developer.dexcom.com/support)
