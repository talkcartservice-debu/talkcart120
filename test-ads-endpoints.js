/**
 * Test script to verify all advertising system endpoints are working correctly
 */

const axios = require('axios');

// Base configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000/api';
const TEST_TOKEN = process.env.TEST_TOKEN; // You'll need to provide a valid JWT token

if (!TEST_TOKEN) {
  console.log('⚠️  Warning: No TEST_TOKEN provided. Some endpoints will fail without authentication.');
  console.log('   To run full tests, set the TEST_TOKEN environment variable with a valid JWT token.');
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth header if token is available
if (TEST_TOKEN) {
  api.defaults.headers.common['Authorization'] = `Bearer ${TEST_TOKEN}`;
}

// Test results
const results = [];

const testEndpoint = async (name, method, endpoint, data = null, expectedStatus = 200) => {
  try {
    console.log(`🧪 Testing: ${name}`);
    console.log(`   Endpoint: ${method.toUpperCase()} ${endpoint}`);
    
    let response;
    if (method.toLowerCase() === 'get') {
      response = await api.get(endpoint);
    } else if (method.toLowerCase() === 'post') {
      response = await api.post(endpoint, data);
    } else if (method.toLowerCase() === 'put') {
      response = await api.put(endpoint, data);
    } else if (method.toLowerCase() === 'delete') {
      response = await api.delete(endpoint);
    }
    
    const passed = response.status === expectedStatus;
    results.push({ name, endpoint, status: response.status, expected: expectedStatus, passed });
    
    if (passed) {
      console.log(`   ✅ PASSED - Status: ${response.status}`);
    } else {
      console.log(`   ❌ FAILED - Status: ${response.status}, Expected: ${expectedStatus}`);
    }
    
    // Show response data for debugging
    if (response.data) {
      console.log(`   Response preview: ${JSON.stringify(response.data).substring(0, 100)}...`);
    }
  } catch (error) {
    const status = error.response ? error.response.status : 'ERROR';
    results.push({ name, endpoint, status, expected: expectedStatus, passed: false });
    
    if (error.response) {
      console.log(`   ❌ FAILED - Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message || error.response.statusText}`);
    } else if (error.request) {
      console.log(`   ❌ FAILED - Request error: No response received`);
    } else {
      console.log(`   ❌ FAILED - Error: ${error.message}`);
    }
  }
  console.log(''); // Empty line for readability
};

const runTests = async () => {
  console.log('🚀 Starting Vetora Advertising System Endpoint Tests\n');
  
  // Health check
  await testEndpoint('Ads Service Health Check', 'get', '/ads/health', null, 200);
  
  // Ad targeting and delivery endpoints
  await testEndpoint('Get Targeted Ads', 'get', '/ads/targeted', null, TEST_TOKEN ? 200 : 401);
  await testEndpoint('Get Feed with Ads', 'get', '/ads/feed-with-ads', null, TEST_TOKEN ? 200 : 401);
  
  // Product posts endpoints
  await testEndpoint('Get Product Posts', 'get', '/ads/product-posts', null, TEST_TOKEN ? 200 : 401);
  
  // Tracking endpoints
  await testEndpoint('Record Ad Impression (Missing ID)', 'post', '/ads/record-impression', {}, TEST_TOKEN ? 400 : 401);
  await testEndpoint('Record Ad Click (Missing ID)', 'post', '/ads/record-click', {}, TEST_TOKEN ? 400 : 401);
  
  // Product post tracking endpoints
  await testEndpoint('Record Product Post View (Invalid ID)', 'post', '/ads/product-posts/invalid_id/views', {}, TEST_TOKEN ? 400 : 401);
  await testEndpoint('Record Product Post Interaction (Invalid ID)', 'post', '/ads/product-posts/invalid_id/interactions', { type: 'click' }, TEST_TOKEN ? 400 : 401);
  
  // Ad management endpoints (these will likely fail without proper data)
  await testEndpoint('Get Ad Campaigns', 'get', '/ads/campaigns', null, TEST_TOKEN ? 200 : 401);
  await testEndpoint('Get Ad Sets', 'get', '/ads/adsets', null, TEST_TOKEN ? 200 : 401);
  await testEndpoint('Get Ads', 'get', '/ads', null, TEST_TOKEN ? 200 : 401);
  
  // Analytics endpoint
  await testEndpoint('Get Ad Analytics', 'get', '/ads/analytics', null, TEST_TOKEN ? 200 : 401);
  await testEndpoint('Get Trending Topics', 'get', '/ads/trending-topics', null, 200);
  
  // Summary
  console.log('📊 Test Results Summary:');
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  
  if (totalTests > 0) {
    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
      const statusEmoji = result.passed ? '✅' : '❌';
      console.log(`   ${statusEmoji} ${result.name} - ${result.status}/${result.expected}`);
    });
  }
  
  // Final status
  const allPassed = passedTests === totalTests;
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed.'}`);
  
  // Specific advice based on results
  if (!TEST_TOKEN) {
    console.log('\n💡 Tip: Authentication-related failures are expected without a TEST_TOKEN.');
    console.log('   Run with TEST_TOKEN="your_jwt_token" npm run test-ads to test protected endpoints.');
  }
  
  if (passedTests === 0) {
    console.log('\n❌ No tests passed. The ads service may not be running or configured properly.');
  } else if (passedTests < totalTests) {
    console.log('\n🔍 Some tests failed. Check the specific endpoints that failed above.');
  } else {
    console.log('\n🎊 All endpoint tests completed successfully!');
  }
};

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed with error:', error);
  process.exit(1);
});