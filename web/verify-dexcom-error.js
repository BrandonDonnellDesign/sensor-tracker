// Dexcom Configuration Verification Script
// This script will help you verify your exact configuration and provide fix steps

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

console.log('🚨 DEXCOM "CLIENT NOT KNOWN" ERROR - VERIFICATION GUIDE\n');

console.log('📋 CURRENT CONFIGURATION:');
console.log('═'.repeat(70));
console.log(`Client ID:     ${process.env.DEXCOM_CLIENT_ID}`);
console.log(`Redirect URI:  ${process.env.DEXCOM_REDIRECT_URI}`);
console.log(`Auth URL:      ${process.env.DEXCOM_AUTH_BASE_URL}`);
console.log(`API URL:       ${process.env.DEXCOM_API_BASE_URL}`);
console.log(`Environment:   ${process.env.DEXCOM_AUTH_BASE_URL?.includes('sandbox') ? '🧪 SANDBOX' : '🚀 PRODUCTION'}`);
console.log('═'.repeat(70));

console.log('\n🔍 POSSIBLE CAUSES & SOLUTIONS:\n');

console.log('1️⃣  CLIENT ID DOESN\'T EXIST');
console.log('   Problem: The Client ID is not registered in Dexcom Developer Portal');
console.log('   Solution: Verify the Client ID in your Dexcom Developer Portal');
console.log('   Steps:');
console.log('   • Go to: https://developer.dexcom.com/');
console.log('   • Sign in to your account');
console.log('   • Check "My Apps" or "Applications" section');
console.log(`   • Look for Client ID: ${process.env.DEXCOM_CLIENT_ID}`);
console.log('   • If not found, you need to create a new application\n');

console.log('2️⃣  APPLICATION NOT CREATED YET');
console.log('   Problem: No application exists in your Dexcom account');
console.log('   Solution: Create a new application with these EXACT settings:');
console.log('   ┌─────────────────────────────────────────────────────────────────────────┐');
console.log('   │                    CREATE NEW DEXCOM APPLICATION                        │');
console.log('   ├─────────────────────────────────────────────────────────────────────────┤');
console.log('   │ Application Name:      CGM Tracker                                     │');
console.log('   │ Application Type:      Server-side Web Application                     │');
console.log(`   │ Redirect URI:          ${process.env.DEXCOM_REDIRECT_URI || 'YOUR_NGROK_URL/auth/dexcom/debug'}              │`);
console.log('   │ Scopes:               offline_access                                   │');
console.log('   │ Description:          Sensor tracking application                      │');
console.log('   └─────────────────────────────────────────────────────────────────────────┘\n');

console.log('3️⃣  APPLICATION NEEDS ACTIVATION');
console.log('   Problem: Application exists but is pending approval');
console.log('   Solution: Contact Dexcom Developer Support');
console.log('   • Email: developersupport@dexcom.com');
console.log('   • Include your Client ID and application name');
console.log('   • Request activation for development/testing\n');

console.log('4️⃣  WRONG ENVIRONMENT');
console.log('   Problem: Using sandbox URLs but app is in production (or vice versa)');
console.log('   Current Environment: ' + (process.env.DEXCOM_AUTH_BASE_URL?.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION'));
console.log('   Solution: Ensure your Dexcom app environment matches these URLs');
console.log('   • Sandbox: https://sandbox-api.dexcom.com');
console.log('   • Production: https://api.dexcom.com\n');

console.log('5️⃣  REDIRECT URI MISMATCH');
console.log('   Problem: Redirect URI in Dexcom portal doesn\'t match environment');
console.log(`   Current URI: ${process.env.DEXCOM_REDIRECT_URI}`);
console.log('   Solution: Update Dexcom portal with EXACT URI above\n');

console.log('🎯 IMMEDIATE ACTION REQUIRED:\n');

console.log('STEP 1: VERIFY DEXCOM DEVELOPER PORTAL');
console.log('• Go to: https://developer.dexcom.com/');
console.log('• Sign in with your developer account');
console.log('• Check if you have ANY applications listed');
console.log('• Take a screenshot of your "My Apps" page\n');

console.log('STEP 2: IF NO APPLICATIONS EXIST');
console.log('• Click "Create Application" or "New App"');
console.log('• Use the settings from the table above');
console.log('• Copy the generated Client ID and Client Secret\n');

console.log('STEP 3: IF APPLICATION EXISTS');
console.log('• Click on your existing application');
console.log('• Verify the Client ID matches this config');
console.log('• Update the Redirect URI to match this config');
console.log('• Check the application status (Active/Pending/Disabled)\n');

console.log('STEP 4: UPDATE YOUR CONFIGURATION');
console.log('• If you get a different Client ID, update .env.local');
console.log('• If using different Client Secret, update .env.local');
console.log('• Restart your development server\n');

console.log('🔗 TESTING URLs:\n');
console.log('OAuth URL that should work:');
const state = 'test-' + Date.now();
const authUrl = new URL(`${process.env.DEXCOM_AUTH_BASE_URL}/oauth2/login`);
authUrl.searchParams.set('client_id', process.env.DEXCOM_CLIENT_ID);
authUrl.searchParams.set('redirect_uri', process.env.DEXCOM_REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'offline_access');
authUrl.searchParams.set('state', state);

console.log(authUrl.toString());
console.log('\n📞 NEED HELP?');
console.log('• Dexcom Developer Support: developersupport@dexcom.com');
console.log('• Dexcom Developer Portal: https://developer.dexcom.com/');
console.log('• API Documentation: https://developer.dexcom.com/overview');

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('• New Dexcom developer accounts may require approval');
console.log('• Some applications need manual activation by Dexcom');
console.log('• Sandbox environment has limited data but easier approval');
console.log('• ngrok URLs change on restart - update Dexcom portal each time');