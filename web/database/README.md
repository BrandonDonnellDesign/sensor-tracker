# Database Setup Guide

The sensors table doesn't exist in your Supabase database yet. Follow these steps to create it:

## Step 1: Access Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project for the Dexcom Sensor Tracker

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (in the left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `schema.sql` file
4. Paste it into the SQL editor
5. Click **"Run"** to execute the schema

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** (in the left sidebar)
2. You should see these tables:
   - `sensors`
   - `photos`

## Step 4: Test the Connection

1. Go back to your app at `/test-db`
2. Click "Test Database Connection"
3. You should now see successful results

## What the Schema Creates:

### Tables:
- **sensors**: Stores sensor information (serial number, lot number, etc.)
- **photos**: Stores photo metadata for sensors

### Security:
- **Row Level Security (RLS)**: Users can only see/modify their own data
- **Policies**: Automatic security rules based on authenticated user

### Features:
- **UUID Primary Keys**: Secure, unique identifiers
- **Timestamps**: Automatic created_at and updated_at tracking
- **Indexes**: Optimized for common queries
- **Foreign Keys**: Maintains data integrity

## Troubleshooting:

### If you get permission errors:
- Make sure you're signed in to Supabase
- Check that you have admin access to the project

### If tables already exist:
- The schema uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- You can also drop existing tables first if needed

### If RLS policies fail:
- Make sure Supabase Auth is enabled in your project
- The policies reference `auth.uid()` which requires authentication

## Next Steps:

After running the schema:
1. Test database connection at `/test-db`
2. Try creating a sensor at `/dashboard/sensors/new`
3. Check that the sensor appears in `/dashboard/sensors`