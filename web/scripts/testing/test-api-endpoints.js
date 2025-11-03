#!/usr/bin/env node

/**
 * Simple script to test API endpoints
 * Run with: node scripts/test-api-endpoints.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testEndpoint(path, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 URL: ${BASE_URL}${path}`);
    
    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response keys: ${Object.keys(data).join(', ')}`);
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`📦 Data items: ${data.data.length}`);
      }
      
      if (data.meta) {
        console.log(`⏱️  Response time: ${data.meta.responseTime}`);
      }
    } else {
      console.log(`❌ Status: ${response.status}`);
      console.log(`💬 Error: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting API endpoint tests...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  // Test API info endpoint
  await testEndpoint('/api', 'API Information');
  
  // Test OpenAPI docs
  await testEndpoint('/api/v1/docs', 'OpenAPI Specification');
  
  // Test community endpoints
  await testEndpoint('/api/v1/community/categories', 'Categories List');
  await testEndpoint('/api/v1/community/tips', 'Tips List');
  await testEndpoint('/api/v1/community/tips?limit=5', 'Tips List (Limited)');
  await testEndpoint('/api/v1/community/tips?category=general', 'Tips by Category');
  await testEndpoint('/api/v1/community/comments', 'Comments List');
  await testEndpoint('/api/v1/community/search?q=sensor', 'Search Results');
  
  // Test error cases
  await testEndpoint('/api/v1/community/tips/invalid-uuid', 'Invalid UUID (should fail)');
  await testEndpoint('/api/v1/community/search?q=a', 'Short search query (should fail)');
  
  console.log('\n🏁 API tests completed!');
  console.log('\n📖 Visit /docs for interactive documentation');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };