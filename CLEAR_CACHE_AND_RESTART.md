# Clear Build Cache and Restart

## The `insulinDose is not defined` Error

This error is caused by **stale build cache** in Next.js. The old compiled code still references a variable that doesn't exist in the current source code.

## Solution: Clear the Cache

### Windows (PowerShell)
```powershell
# Stop the dev server first (Ctrl+C)

# Navigate to web directory
cd web

# Remove the build cache
Remove-Item -Recurse -Force .next

# Restart the dev server
npm run dev
```

### Windows (Command Prompt)
```cmd
REM Stop the dev server first (Ctrl+C)

cd web
rmdir /s /q .next
npm run dev
```

### Mac/Linux
```bash
# Stop the dev server first (Ctrl+C)

cd web
rm -rf .next
npm run dev
```

## Why This Happens

Next.js (with Turbopack) caches compiled code in the `.next` folder. When we:
1. Update code (like changing variable names or imports)
2. The cache still has the old compiled version
3. The browser loads the cached version with the old variable reference
4. Result: `insulinDose is not defined` error

## Prevention

After making significant code changes (especially to imports or variable names), always:
1. Stop the dev server
2. Clear the `.next` folder
3. Restart the dev server

## Alternative: Force Refresh

If you don't want to clear the cache, you can try:
1. Stop the dev server (Ctrl+C)
2. Wait 5 seconds
3. Start it again: `npm run dev`
4. Hard refresh in browser (Ctrl+Shift+R or Ctrl+F5)

## What We Changed

We updated the food logging components to use the centralized logger instead of console statements. The old cached code still has the console statements, which is why you're seeing the error.

Once you clear the cache, the error will be gone permanently.

## Quick Command

Just run this in PowerShell from the project root:
```powershell
cd web; Remove-Item -Recurse -Force .next; npm run dev
```

Or create a script file `clear-and-restart.ps1`:
```powershell
Write-Host "Stopping any running dev servers..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
Set-Location web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Starting dev server..." -ForegroundColor Green
npm run dev
```

Then run: `.\clear-and-restart.ps1`
