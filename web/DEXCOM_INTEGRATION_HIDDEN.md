# Dexcom Integration - Hidden Files

This document tracks the Dexcom integration files that have been temporarily hidden for the production release.

## Hidden Files Location

### Components
- `src/components/settings/dexcom-integration.tsx.hidden` - Complete Dexcom integration settings component with OAuth, sync, and configuration

### API Routes  
- `src/app/api/dexcom.hidden/` - Complete Dexcom API integration
  - `oauth/route.ts` - OAuth authorization URL generation
  - `sync/route.ts` - Real Dexcom API sync with database integration
  - `token/route.ts` - Token management

### OAuth Pages
- `src/app/auth/dexcom.hidden/` - OAuth callback handling
  - `callback/page.tsx` - OAuth callback with token storage

### Libraries
- `src/lib/dexcom-api.ts.hidden` - Complete Dexcom API client with real sandbox integration

## Database Schema

The Dexcom integration database schema remains in place and is production-ready:

### Tables Created
- `dexcom_tokens` - Encrypted OAuth token storage
- `dexcom_sync_settings` - User sync preferences
- `dexcom_sync_log` - Sync operation history

### Sensor Table Extensions
- `dexcom_sensor_id` - Dexcom session ID
- `dexcom_activation_time` - Sensor start time from API
- `dexcom_expiry_time` - Sensor end time from API  
- `dexcom_device_serial` - Transmitter serial
- `dexcom_last_reading_time` - Last glucose reading
- `auto_detected` - Flag for API-detected sensors
- `sync_enabled` - Allow sensor sync

## Current UI State

The Integrations tab in Settings now shows a "Coming Soon" component (`dexcom-integration-coming-soon.tsx`) with:
- Professional coming soon message
- Feature roadmap
- Clean, polished UI

## To Re-enable Integration

1. Rename `.hidden` files back to original names
2. Update settings page import to use `DexcomIntegrationSettings`
3. Restore help page FAQ sections about Dexcom integration
4. Test OAuth flow and sync functionality

## Integration Status

✅ **Complete and Working**: OAuth flow, real API integration, database storage, sync functionality  
🚀 **Ready for Release**: All components tested and functional  
📦 **Currently Hidden**: For production release timing  

The integration is production-ready and can be enabled instantly when desired.