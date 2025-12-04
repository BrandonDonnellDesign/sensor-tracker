# Gmail OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "Sensor Tracker Gmail Integration"
4. Click "Create"

## Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Gmail API" → "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have Google Workspace)
3. Click "Create"

**App Information:**
- App name: `Sensor Tracker`
- User support email: Your email
- Developer contact: Your email

**Scopes:**
- Click "Add or Remove Scopes"
- Add: `https://www.googleapis.com/auth/gmail.readonly`
- This gives read-only access to Gmail

**Test Users (for development):**
- Add your Gmail address
- Add any test user emails

Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Sensor Tracker Web"

**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-domain.netlify.app
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/google/callback
https://your-domain.netlify.app/api/auth/google/callback
```

5. Click "Create"
6. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Add Environment Variables

### Local Development (`.env.local`):
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Netlify (Production):
1. Go to Netlify Dashboard → Your Site → Site Settings
2. Navigate to "Environment variables"
3. Add:
   - `GOOGLE_CLIENT_ID`: Your client ID
   - `GOOGLE_CLIENT_SECRET`: Your client secret
   - `GOOGLE_REDIRECT_URI`: `https://your-domain.netlify.app/api/auth/google/callback`

## Step 6: Run Database Migration

In Supabase SQL Editor, run:
```sql
-- Copy contents from supabase/migrations/20251128_gmail_integration.sql
```

## Step 7: Test OAuth Flow

1. Start your dev server: `npm run dev`
2. Navigate to Settings → Gmail Connection
3. Click "Connect Gmail"
4. Should redirect to Google OAuth
5. Grant permissions
6. Should redirect back with success message

## Security Notes

- **Never commit** `.env.local` to git
- Client secret should be kept secure
- Only request `gmail.readonly` scope (minimal permissions)
- Tokens are encrypted in database
- Users can revoke access anytime

## Troubleshooting

**"Redirect URI mismatch"**
- Check that redirect URI in Google Cloud matches exactly
- Include protocol (http/https)
- No trailing slashes

**"Access blocked: This app's request is invalid"**
- Make sure Gmail API is enabled
- Check OAuth consent screen is configured
- Verify scopes are added

**"Error 400: invalid_grant"**
- Refresh token expired
- User revoked access
- Need to re-authenticate
