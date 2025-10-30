# Automatic Dexcom Token Refresh

This document explains how automatic token refresh works for Dexcom API integration.

## Overview

The system now automatically handles expired Dexcom tokens during sync operations, eliminating the need for manual token refresh in most cases.

## How It Works

### 1. Token Expiration Detection

The enhanced `sync_dexcom_user` function checks for token expiration in two ways:

- **Pre-sync Check**: Verifies if the token expires within 5 minutes before making API calls
- **API Response Check**: Detects 401 (Unauthorized) responses from Dexcom API indicating expired tokens

### 2. Automatic Refresh Process

When an expired token is detected:

1. The sync API route (`/api/dexcom/sync`) catches the token expiration error
2. It automatically calls the token refresh edge function (`dexcom-refresh-token`)
3. If refresh succeeds, it retries the original sync operation
4. The response includes a `token_auto_refreshed: true` flag

### 3. Error Codes

The sync function returns specific error codes for better handling:

- `TOKEN_EXPIRED`: Token expired before API calls (pre-sync check)
- `TOKEN_EXPIRED_API`: Token expired during API calls (401 response)
- `NO_TOKEN`: No Dexcom token found for user

## API Integration

### Sync Endpoint Enhancement

The `/api/dexcom/sync` endpoint now:

```typescript
// Detects token expiration
if (result.error_code === 'TOKEN_EXPIRED' || result.error_code === 'TOKEN_EXPIRED_API') {
  // Automatically refresh token
  const refreshResponse = await fetch('/functions/v1/dexcom-refresh-token', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
  
  // Retry sync with new token
  if (refreshResponse.ok) {
    // Retry sync operation
  }
}
```

### Client-Side Handling

The glucose test client automatically shows when tokens are refreshed:

```typescript
const result = await response.json();
if (result.token_auto_refreshed) {
  alert('Synced successfully (Token was automatically refreshed)');
}
```

## Scheduled Sync Behavior

For scheduled/cron syncs:

- Expired tokens are detected and logged as warnings
- Users with expired tokens are skipped in scheduled syncs
- Manual refresh is still required for scheduled operations
- This prevents scheduled jobs from failing due to expired tokens

## Fallback Scenarios

If automatic refresh fails:

1. **API Returns 401**: Manual refresh required
2. **Refresh Function Unavailable**: Manual refresh required  
3. **Invalid Refresh Token**: User needs to re-authenticate with Dexcom

## Benefits

1. **Seamless User Experience**: No interruption during sync operations
2. **Reduced Manual Intervention**: Tokens refresh automatically when needed
3. **Better Error Handling**: Clear error codes and messages
4. **Graceful Degradation**: Falls back to manual refresh when needed

## Migration Files

- `20250130000001_consolidated_dexcom_integration.sql`: Complete Dexcom integration including:
  - Enhanced sync function with automatic token expiration detection
  - Updated scheduled sync to handle expired tokens gracefully
  - All Dexcom tables, functions, and cron jobs

## Testing

To test automatic refresh:

1. Wait for a token to expire naturally (tokens expire after 1 hour)
2. Trigger a sync operation via the glucose test page
3. Observe the automatic refresh in action
4. Check the response for `token_auto_refreshed: true`

## Monitoring

Check the `dexcom_sync_log` table for:

- `scheduled_sync_token_refresh_needed` operations (warnings for expired tokens in scheduled syncs)
- Successful syncs after automatic refresh
- Any refresh failures requiring manual intervention