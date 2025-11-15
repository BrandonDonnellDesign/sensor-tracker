# Environment Setup Guide

## Error: Missing ENCRYPTION_KEY

You're seeing this error because the environment validation is working correctly! The app requires an `ENCRYPTION_KEY` to encrypt sensitive data like API tokens.

## Quick Fix

### Option 1: Generate Key with Script (Recommended)
```bash
cd web
node scripts/generate-encryption-key.js
```

This will output a secure 64-character encryption key. Copy it and add it to your `.env.local` file.

### Option 2: Generate Key Manually

**On Windows (PowerShell):**
```powershell
cd web
$key = -join ((48..57) + (65..70) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "ENCRYPTION_KEY=$key"
```

**On Mac/Linux:**
```bash
cd web
openssl rand -hex 32
```

## Setup Steps

1. **Create or edit `web/.env.local`:**
   ```bash
   # If file doesn't exist, copy from example
   cp .env.local.example .env.local
   ```

2. **Add the encryption key:**
   Open `web/.env.local` and add:
   ```
   ENCRYPTION_KEY=your-generated-key-here
   ```
   
   Replace `your-generated-key-here` with the key you generated.

3. **Verify other required variables:**
   Make sure these are also set in your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Example .env.local File

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Encryption Key (REQUIRED - Generate with script above)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Optional: Dexcom Integration
DEXCOM_CLIENT_ID=your-dexcom-client-id
DEXCOM_CLIENT_SECRET=your-dexcom-client-secret
DEXCOM_REDIRECT_URI=http://localhost:3000/auth/dexcom/callback

# Optional: Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` to version control
- Keep your encryption key secret
- Use different keys for development and production
- The key must be at least 32 characters (64 hex characters recommended)

## What This Key Does

The `ENCRYPTION_KEY` is used to:
- Encrypt OAuth tokens (Dexcom, MyFitnessPal, etc.)
- Secure sensitive user data
- Protect API credentials in the database

Without this key, the app cannot:
- Store encrypted tokens
- Refresh OAuth tokens
- Sync data from external services

## Troubleshooting

### "ENCRYPTION_KEY must be at least 32 characters long"
Your key is too short. Generate a new one using the script above.

### "Missing required environment variables"
Make sure you have all three required variables:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `ENCRYPTION_KEY`

### "NEXT_PUBLIC_SUPABASE_URL must be a valid URL"
Check that your Supabase URL starts with `http://` or `https://`

### Still having issues?
1. Check that `.env.local` is in the `web/` directory
2. Restart your development server
3. Clear the Next.js cache: `rm -rf .next`

## Why This Validation Exists

This validation was added to prevent runtime errors and security issues. It's better to fail fast at startup than to have the app crash when trying to encrypt data later.

This is part of the security improvements made to the application. See `IMPROVEMENTS_SUMMARY.md` for more details.
