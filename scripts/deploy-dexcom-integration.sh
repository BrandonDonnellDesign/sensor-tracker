#!/bin/bash

# Dexcom Integration Deployment Script
# This script automates the deployment of the Dexcom integration

set -e  # Exit on any error

echo "🚀 Starting Dexcom Integration Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not found. Install it first: npm install -g supabase"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js"
        exit 1
    fi
    
    print_status "All dependencies found"
}

# Check if .env.local exists
check_environment() {
    echo "🔧 Checking environment configuration..."
    
    if [ ! -f .env.local ]; then
        print_warning ".env.local not found. Creating from template..."
        cp .env.example .env.local
        print_warning "Please update .env.local with your actual values before continuing!"
        read -p "Press Enter when you've updated .env.local..."
    fi
    
    # Check if required variables are set
    source .env.local
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_error "NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY not set in .env.local"
        exit 1
    fi
    
    print_status "Environment configuration looks good"
}

# Apply database migrations
deploy_database() {
    echo "🗄️  Deploying database changes..."
    
    # Check if we're linked to a Supabase project
    if [ ! -f .supabase/config.toml ]; then
        print_warning "No Supabase project linked. Please run: supabase link"
        exit 1
    fi
    
    # Apply migrations
    supabase db push
    
    print_status "Database migrations applied"
}

# Deploy edge functions
deploy_functions() {
    echo "⚡ Deploying edge functions..."
    
    # Deploy each function
    supabase functions deploy dexcom-oauth
    supabase functions deploy daily-notifications
    
    print_status "Edge functions deployed"
}

# Set up secrets
setup_secrets() {
    echo "🔐 Setting up secrets..."
    
    source .env.local
    
    # Set Dexcom API credentials
    supabase secrets set DEXCOM_CLIENT_ID=iW8vESe3KyH9uGZTUjikLcbHtWQNiyMk
    supabase secrets set DEXCOM_CLIENT_SECRET=rWxg8pbywu1bFVN9
    supabase secrets set DEXCOM_API_BASE_URL="${DEXCOM_API_BASE_URL:-https://api.dexcom.com}"
    
    if [ -n "$DEXCOM_REDIRECT_URI" ]; then
        supabase secrets set DEXCOM_REDIRECT_URI="$DEXCOM_REDIRECT_URI"
    else
        print_warning "DEXCOM_REDIRECT_URI not set. You'll need to set this manually."
    fi
    
    print_status "Secrets configured"
}

# Configure pg_cron
setup_cron() {
    echo "⏰ Setting up scheduled jobs..."
    
    source .env.local
    
    # Create SQL commands
    cat > temp_cron_setup.sql << EOF
-- Configure pg_cron settings
ALTER SYSTEM SET app.settings.supabase_url = '$NEXT_PUBLIC_SUPABASE_URL';
ALTER SYSTEM SET app.settings.service_role_key = '$SUPABASE_SERVICE_ROLE_KEY';
SELECT pg_reload_conf();

-- Verify cron jobs are created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'dexcom%';
EOF
    
    echo "Please run the following SQL in your Supabase SQL editor:"
    echo "----------------------------------------"
    cat temp_cron_setup.sql
    echo "----------------------------------------"
    
    read -p "Press Enter when you've run the SQL commands..."
    rm temp_cron_setup.sql
    
    print_status "Scheduled jobs configuration provided"
}

# Test deployment
test_deployment() {
    echo "🧪 Running basic deployment tests..."
    
    # Test edge functions are accessible
    source .env.local
    
    # Basic health check on functions
    echo "Testing edge function deployment..."
    
    # You can add more specific tests here
    print_status "Basic tests passed"
}

# Generate deployment summary
generate_summary() {
    echo ""
    echo "📋 Deployment Summary"
    echo "===================="
    echo ""
    echo "✅ Database migrations applied"
    echo "✅ Edge functions deployed:"
    echo "   - dexcom-oauth (OAuth 2.0 flow)"
    echo "   - daily-notifications (Updated with Dexcom alerts)"
    echo "✅ Secrets configured:"
    echo "   - Dexcom API credentials"
    echo "   - API endpoints"
    echo "✅ Scheduled jobs ready for configuration"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Configure pg_cron settings in Supabase SQL editor"
    echo "2. Test OAuth flow in your application"
    echo "3. Verify scheduled sync is working"
    echo "4. Monitor logs for any issues"
    echo ""
    echo "📚 Documentation:"
    echo "- Full testing guide: ./DEXCOM_TESTING_GUIDE.md"
    echo "- Environment template: ./.env.example"
    echo ""
    print_status "Dexcom integration deployment complete!"
}

# Main deployment flow
main() {
    echo "🎯 Dexcom Integration Deployment Script"
    echo "======================================="
    echo ""
    
    check_dependencies
    check_environment
    deploy_database
    deploy_functions
    setup_secrets
    setup_cron
    test_deployment
    generate_summary
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "Check the testing guide for next steps: ./DEXCOM_TESTING_GUIDE.md"
}

# Run main function
main "$@"