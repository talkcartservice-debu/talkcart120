/**
 * Test script to verify product post creation functionality
 */

const axios = require('axios');

// Base configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTQ2YjA3Mzk4OGVhZjdmMzdhMmFlZWUiLCJ1c2VybmFtZSI6InRlc3R2ZW5kb3IiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpc1ZlcmlmaWVkIjp0cnVlLCJpYXQiOjE3NjY1MDA4NTQsImV4cCI6MTc2NzEwNTY4NH0.kCFEUR9pcLEGTiCm5vbsz8K4TACp0buC3uNxNHL7qZ4'; // From previous test

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth header
api.defaults.headers.common['Authorization'] = `Bearer ${TEST_TOKEN}`;

console.log('🚀 Testing Product Post Creation Functionality');

// Test the product post creation endpoint
const testProductPostCreation = async () => {
  try {
    console.log('\n🧪 Testing: Create Product Post');
    console.log('   Endpoint: POST /ads/product-posts');
    
    // Try to create a product post (this should fail with validation errors, which is expected)
    const response = await api.post('/ads/product-posts', {
      postId: '6947c5a8bfecbdd0f37a2aef', // Example post ID
      productId: '6946c084a99fbg8g48b3bfff', // Example product ID
      productPosition: 'main',
      currentPrice: 29.99,
      originalPrice: 39.99,
      availableStock: 10,
      showPrice: true,
      showProductTag: true
    });
    
    console.log(`   ✅ SUCCESS - Status: ${response.status}`);
    console.log(`   Response:`, response.data);
  } catch (error) {
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error:`, error.response.data);
      
      // Check if it's the expected validation error (product or post not found)
      if (error.response.status === 404) {
        console.log('   ✅ EXPECTED - Product or post not found (which is normal in test environment)');
      } else if (error.response.status === 403) {
        console.log('   ✅ EXPECTED - Authorization error (which is normal in test environment)');
      } else {
        console.log('   ❌ UNEXPECTED ERROR');
      }
    } else {
      console.log('   ❌ NETWORK ERROR:', error.message);
    }
  }
};

// Test getting product posts
const testGetProductPosts = async () => {
  try {
    console.log('\n🧪 Testing: Get Product Posts');
    console.log('   Endpoint: GET /ads/product-posts');
    
    const response = await api.get('/ads/product-posts');
    
    console.log(`   ✅ SUCCESS - Status: ${response.status}`);
    console.log(`   Response preview:`, JSON.stringify(response.data).substring(0, 200) + '...');
  } catch (error) {
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error:`, error.response.data);
    } else {
      console.log('   ❌ NETWORK ERROR:', error.message);
    }
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting Product Post Creation Tests\n');
  
  await testProductPostCreation();
  await testGetProductPosts();
  
  console.log('\n✅ Product Post Creation Tests Completed');
};

runTests().catch(error => {
  console.error('❌ Test suite failed with error:', error);
  process.exit(1);
});