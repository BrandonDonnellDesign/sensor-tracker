# Reorder Notifications Setup for Netlify

## Setup Instructions

### 1. Install Netlify CLI Tools
```bash
npm install @netlify/functions
```

### 2. Configure netlify.toml
Add this to your `netlify.toml` file:

```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 3. Deploy to Netlify
The scheduled function will automatically run daily at 9 AM UTC once deployed.

### 4. Verify in Netlify Dashboard
1. Go to your Netlify site dashboard
2. Navigate to **Functions** tab
3. You should see `scheduled-reorder-check` listed
4. Check the logs to verify it's running

## Alternative: Use Netlify Build Hooks with External Cron

If scheduled functions don't work, use an external cron service:

### Setup with cron-job.org:
1. Go to https://cron-job.org
2. Create a free account
3. Add a new cron job:
   - **URL**: `https://your-site.netlify.app/api/cron/reorder-reminders`
   - **Schedule**: Daily at 9:00 AM
   - **Method**: GET

### Setup with GitHub Actions:
Create `.github/workflows/reorder-reminders.yml`:

```yaml
name: Daily Reorder Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-reorders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reorder Check
        run: |
          curl -X GET https://your-site.netlify.app/api/cron/reorder-reminders
```

## Testing

### Test Locally:
```bash
netlify dev
# Then visit: http://localhost:8888/.netlify/functions/scheduled-reorder-check
```

### Test in Production:
```bash
curl https://your-site.netlify.app/api/cron/reorder-reminders
```

## Monitoring

Check function logs in Netlify:
1. Go to **Functions** tab
2. Click on `scheduled-reorder-check`
3. View execution logs

## Troubleshooting

**Function not running?**
- Check Netlify Functions logs
- Verify `@netlify/functions` is installed
- Ensure `netlify.toml` is configured correctly
- Scheduled functions require a paid Netlify plan (Pro or higher)

**For free tier users:**
Use the external cron service option (cron-job.org or GitHub Actions) instead.
