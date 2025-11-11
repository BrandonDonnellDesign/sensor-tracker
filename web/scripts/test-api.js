#!/usr/bin/env node

/**
 * API Testing Script
 * Tests all v1 API endpoints with API key authentication
 * 
 * Usage: node scripts/test-api.js
 * 
 * Set environment variable:
 * - PowerShell: $env:CGM_TRACKER_API_KEY="sk_your_key"; node scripts/test-api.js
 * - Bash: CGM_TRACKER_API_KEY=sk_your_key node scripts/test-api.js
 * - Or create a .env file with: CGM_TRACKER_API_KEY=sk_your_key
 */

// Try to load .env file if it exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (error) {
  // Ignore errors loading .env
}

const API_KEY = process.env.CGM_TRACKER_API_KEY;
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passed = 0;
let failed = 0;
let skipped = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  log(`  ${icon} ${name}${details ? ` - ${details}` : ''}`, color);
  
  if (status === 'pass') passed++;
  else if (status === 'fail') failed++;
  else skipped++;
}

async function testEndpoint(name, method, path, options = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json();
    
    if (options.expectedStatus) {
      if (response.status === options.expectedStatus) {
        logTest(name, 'pass', `${response.status}`);
        return { success: true, data, status: response.status };
      } else {
        logTest(name, 'fail', `Expected ${options.expectedStatus}, got ${response.status}`);
        return { success: false, data, status: response.status };
      }
    } else if (response.ok) {
      logTest(name, 'pass', `${response.status}`);
      return { success: true, data, status: response.status };
    } else {
      logTest(name, 'fail', `${response.status} - ${data.message || data.error}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    logTest(name, 'fail', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🧪 CGM Tracker API Test Suite\n', colors.cyan);
  
  if (!API_KEY) {
    log('❌ Error: CGM_TRACKER_API_KEY environment variable not set', colors.red);
    log('Usage: CGM_TRACKER_API_KEY=sk_your_key node scripts/test-api.js\n', colors.yellow);
    process.exit(1);
  }
  
  log(`📍 Testing: ${BASE_URL}`, colors.blue);
  log(`🔑 API Key: ${API_KEY.substring(0, 15)}...\n`, colors.blue);
  
  // Test Community Tips API
  log('📝 Community Tips API', colors.cyan);
  
  await testEndpoint(
    'List tips',
    'GET',
    '/community/tips'
  );
  
  await testEndpoint(
    'List tips with limit',
    'GET',
    '/community/tips?limit=5'
  );
  
  await testEndpoint(
    'List tips by category',
    'GET',
    '/community/tips?category=general'
  );
  
  const createTipResult = await testEndpoint(
    'Create tip',
    'POST',
    '/community/tips/create',
    {
      body: {
        title: 'Test Tip from API',
        content: 'This is a test tip created by the automated test suite.',
        category: 'general',
        tags: ['test', 'automated']
      },
      expectedStatus: 201
    }
  );
  
  let tipId = null;
  if (createTipResult.success && createTipResult.data?.data?.id) {
    tipId = createTipResult.data.data.id;
  }
  
  if (tipId) {
    await testEndpoint(
      'Vote on tip (upvote)',
      'POST',
      `/community/tips/${tipId}/vote`,
      {
        body: { vote_type: 'up' }
      }
    );
    
    await testEndpoint(
      'Vote on tip (downvote)',
      'POST',
      `/community/tips/${tipId}/vote`,
      {
        body: { vote_type: 'down' }
      }
    );
  } else {
    logTest('Vote on tip', 'skip', 'No tip ID available');
  }
  
  // Test validation
  await testEndpoint(
    'Create tip - missing title',
    'POST',
    '/community/tips/create',
    {
      body: {
        content: 'Content without title',
        category: 'general'
      },
      expectedStatus: 400
    }
  );
  
  await testEndpoint(
    'Create tip - invalid category',
    'POST',
    '/community/tips/create',
    {
      body: {
        title: 'Test',
        content: 'Test content',
        category: 'invalid-category'
      },
      expectedStatus: 400
    }
  );
  
  // Test Insulin API
  log('\n💉 Insulin API', colors.cyan);
  
  await testEndpoint(
    'List insulin doses',
    'GET',
    '/insulin/doses'
  );
  
  await testEndpoint(
    'Create insulin dose',
    'POST',
    '/insulin/doses',
    {
      body: {
        insulin_type: 'Humalog',
        units: 5.5,
        delivery_type: 'bolus',
        taken_at: new Date().toISOString(),
        notes: 'Test insulin dose'
      },
      expectedStatus: 501 // Not implemented yet
    }
  );
  
  // Test Glucose API
  log('\n📊 Glucose API', colors.cyan);
  
  await testEndpoint(
    'List glucose readings',
    'GET',
    '/glucose/readings'
  );
  
  await testEndpoint(
    'Create glucose reading',
    'POST',
    '/glucose/readings',
    {
      body: {
        value: 120,
        trend: 'Flat',
        system_time: new Date().toISOString()
      }
    }
  );
  
  // Test Food API
  log('\n🍽️  Food API', colors.cyan);
  
  await testEndpoint(
    'List food logs',
    'GET',
    '/food/logs'
  );
  
  await testEndpoint(
    'Create food log',
    'POST',
    '/food/logs',
    {
      body: {
        product_name: 'Test Food',
        total_carbs_g: 45,
        total_calories: 200,
        meal_type: 'lunch',
        logged_at: new Date().toISOString()
      }
    }
  );
  
  // Test Sensors API
  log('\n📡 Sensors API', colors.cyan);
  
  await testEndpoint(
    'List sensors',
    'GET',
    '/sensors'
  );
  
  await testEndpoint(
    'Create sensor',
    'POST',
    '/sensors',
    {
      body: {
        sensor_model_id: 'dexcom-g7',
        serial_number: 'TEST123456',
        date_added: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  );
  
  // Test Health Metrics API
  log('\n❤️  Health Metrics API', colors.cyan);
  
  await testEndpoint(
    'List health metrics',
    'GET',
    '/health/metrics'
  );
  
  await testEndpoint(
    'Create health metric',
    'POST',
    '/health/metrics',
    {
      body: {
        metric_type: 'weight',
        value: 75.5,
        unit: 'kg',
        recorded_at: new Date().toISOString()
      },
      expectedStatus: 201
    }
  );
  
  // Test User Profile API
  log('\n👤 User Profile API', colors.cyan);
  
  await testEndpoint(
    'Get user profile',
    'GET',
    '/user/profile'
  );
  
  await testEndpoint(
    'Update user profile',
    'PUT',
    '/user/profile',
    {
      body: {
        full_name: 'Test User'
      }
    }
  );
  
  // Test Food Items API
  log('\n🍎 Food Items API', colors.cyan);
  
  await testEndpoint(
    'List food items',
    'GET',
    '/food/items?search=apple'
  );
  
  await testEndpoint(
    'Create custom food item',
    'POST',
    '/food/items',
    {
      body: {
        name: 'Test Food Item',
        serving_size: 100,
        serving_unit: 'g',
        calories: 150,
        carbs_g: 30,
        protein_g: 5,
        fat_g: 2
      },
      expectedStatus: 201
    }
  );
  
  // Test Authentication
  log('\n🔐 Authentication', colors.cyan);
  
  await testEndpoint(
    'Invalid API key',
    'GET',
    '/community/tips',
    {
      headers: { 'X-API-Key': 'sk_invalid_key_12345' },
      expectedStatus: 401
    }
  );
  
  await testEndpoint(
    'Missing API key',
    'GET',
    '/community/tips',
    {
      headers: { 'X-API-Key': '' },
      expectedStatus: 401
    }
  );
  
  // Summary
  log('\n' + '='.repeat(50), colors.cyan);
  log('📊 Test Summary', colors.cyan);
  log('='.repeat(50) + '\n', colors.cyan);
  
  const total = passed + failed + skipped;
  log(`Total Tests: ${total}`);
  log(`✓ Passed: ${passed}`, colors.green);
  log(`✗ Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);
  log(`○ Skipped: ${skipped}`, colors.yellow);
  
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  log(`\nPass Rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);
  
  if (failed === 0) {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the results above.', colors.yellow);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
