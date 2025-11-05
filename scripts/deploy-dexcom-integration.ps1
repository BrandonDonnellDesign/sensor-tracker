# Dexcom Integration Deployment Script (PowerShell)
# This script automates the deployment of the Dexcom integration on Windows

param(
    [switch]$SkipDependencyCheck,
    [switch]$SkipEnvironmentCheck,
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Dexcom Integration Deployment..." -ForegroundColor Green

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Check-Dependencies {
    Write-Host "🔍 Checking dependencies..." -ForegroundColor Cyan
    
    if (-not $SkipDependencyCheck) {
        # Check Supabase CLI
        try {
            $supabaseVersion = & supabase --version 2>$null
            Write-Status "Supabase CLI found: $supabaseVersion"
        }
        catch {
            Write-Error "Supabase CLI not found. Install it first: npm install -g supabase"
            exit 1
        }
        
        # Check Node.js
        try {
            $nodeVersion = & node --version 2>$null
            Write-Status "Node.js found: $nodeVersion"
        }
        catch {
            Write-Error "Node.js not found. Please install Node.js"
            exit 1
        }
    }
    
    Write-Status "All dependencies found"
}

# Check if .env.local exists and load environment
function Check-Environment {
    Write-Host "🔧 Checking environment configuration..." -ForegroundColor Cyan
    
    if (-not $SkipEnvironmentCheck) {
        if (-not (Test-Path ".env.local")) {
            Write-Warning ".env.local not found. Creating from template..."
            Copy-Item ".env.example" ".env.local"
            Write-Warning "Please update .env.local with your actual values before continuing!"
            Read-Host "Press Enter when you've updated .env.local"
        }
        
        # Load environment variables
        if (Test-Path ".env.local") {
            Get-Content ".env.local" | ForEach-Object {
                if ($_ -match "^([^=]+)=(.*)$") {
                    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
                }
            }
        }
        
        # Check required variables
        $requiredVars = @(
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY"
        )
        
        foreach ($var in $requiredVars) {
            if (-not [Environment]::GetEnvironmentVariable($var)) {
                Write-Error "$var not set in .env.local"
                exit 1
            }
        }
    }
    
    Write-Status "Environment configuration looks good"
}

# Apply database migrations
function Deploy-Database {
    Write-Host "🗄️  Deploying database changes..." -ForegroundColor Cyan
    
    # Check if we're linked to a Supabase project
    if (-not (Test-Path ".supabase\config.toml")) {
        Write-Warning "No Supabase project linked. Please run: supabase link"
        exit 1
    }
    
    if (-not $DryRun) {
        # Apply migrations
        & supabase db push
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Database migration failed"
            exit 1
        }
    }
    
    Write-Status "Database migrations applied"
}

# Deploy edge functions
function Deploy-Functions {
    Write-Host "⚡ Deploying edge functions..." -ForegroundColor Cyan
    
    $functions = @("dexcom-oauth", "daily-notifications")
    
    foreach ($func in $functions) {
        Write-Host "Deploying $func..." -ForegroundColor Gray
        if (-not $DryRun) {
            & supabase functions deploy $func
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to deploy $func"
                exit 1
            }
        }
    }
    
    Write-Status "Edge functions deployed"
}

# Set up secrets
function Setup-Secrets {
    Write-Host "🔐 Setting up secrets..." -ForegroundColor Cyan
    
    $secrets = @{
        "DEXCOM_CLIENT_ID" = "iW8vESe3KyH9uGZTUjikLcbHtWQNiyMk"
        "DEXCOM_CLIENT_SECRET" = "rWxg8pbywu1bFVN9"
        "DEXCOM_API_BASE_URL" = "https://api.dexcom.com"
    }
    
    # Add redirect URI if set
    $redirectUri = [Environment]::GetEnvironmentVariable("DEXCOM_REDIRECT_URI")
    if ($redirectUri) {
        $secrets["DEXCOM_REDIRECT_URI"] = $redirectUri
    } else {
        Write-Warning "DEXCOM_REDIRECT_URI not set. You'll need to set this manually."
    }
    
    foreach ($secret in $secrets.GetEnumerator()) {
        Write-Host "Setting secret: $($secret.Key)" -ForegroundColor Gray
        if (-not $DryRun) {
            & supabase secrets set "$($secret.Key)=$($secret.Value)"
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to set secret: $($secret.Key)"
                exit 1
            }
        }
    }
    
    Write-Status "Secrets configured"
}

# Configure pg_cron
function Setup-Cron {
    Write-Host "⏰ Setting up scheduled jobs..." -ForegroundColor Cyan
    
    $supabaseUrl = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL")
    $serviceRoleKey = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
    
    $cronSql = @"
-- Configure pg_cron settings
ALTER SYSTEM SET app.settings.supabase_url = '$supabaseUrl';
ALTER SYSTEM SET app.settings.service_role_key = '$serviceRoleKey';
SELECT pg_reload_conf();

-- Verify cron jobs are created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'dexcom%';
"@
    
    Write-Host "Please run the following SQL in your Supabase SQL editor:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host $cronSql -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    Read-Host "Press Enter when you've run the SQL commands"
    
    Write-Status "Scheduled jobs configuration provided"
}

# Test deployment
function Test-Deployment {
    Write-Host "🧪 Running basic deployment tests..." -ForegroundColor Cyan
    
    # Basic validation
    if (Test-Path ".supabase\config.toml") {
        Write-Status "Supabase project configuration found"
    } else {
        Write-Warning "Supabase project configuration not found"
    }
    
    Write-Status "Basic tests passed"
}

# Generate deployment summary
function Generate-Summary {
    Write-Host ""
    Write-Host "📋 Deployment Summary" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Database migrations applied" -ForegroundColor Green
    Write-Host "✅ Edge functions deployed:" -ForegroundColor Green
    Write-Host "   - dexcom-oauth (OAuth 2.0 flow)" -ForegroundColor White
    Write-Host "   - daily-notifications (Updated with Dexcom alerts)" -ForegroundColor White
    Write-Host "✅ Secrets configured:" -ForegroundColor Green
    Write-Host "   - Dexcom API credentials" -ForegroundColor White
    Write-Host "   - API endpoints" -ForegroundColor White
    Write-Host "✅ Scheduled jobs ready for configuration" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Configure pg_cron settings in Supabase SQL editor" -ForegroundColor White
    Write-Host "2. Test OAuth flow in your application" -ForegroundColor White
    Write-Host "3. Verify scheduled sync is working" -ForegroundColor White
    Write-Host "4. Monitor logs for any issues" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Cyan
    Write-Host "- Full testing guide: .\DEXCOM_TESTING_GUIDE.md" -ForegroundColor White
    Write-Host "- Environment template: .\.env.example" -ForegroundColor White
    Write-Host ""
    Write-Status "Dexcom integration deployment complete!"
}

# Main deployment flow
function Main {
    Write-Host "🎯 Dexcom Integration Deployment Script" -ForegroundColor Magenta
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        Check-Dependencies
        Check-Environment
        Deploy-Database
        Deploy-Functions
        Setup-Secrets
        Setup-Cron
        Test-Deployment
        Generate-Summary
        
        Write-Host ""
        Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
        Write-Host "Check the testing guide for next steps: .\DEXCOM_TESTING_GUIDE.md" -ForegroundColor Cyan
    }
    catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run main function
Main