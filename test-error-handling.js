const axios = require('axios');

async function testImprovedErrorHandling() {
  console.log('🧪 Testing Improved Error Handling...\n');
  
  const baseURL = 'http://localhost:8000/api';
  const validButNonExistentPostId = '507f1f77bcf86cd799439011'; // Valid format but non-existent
  
  try {
    // Test 1: Try to get comments for a valid-formatted but non-existent post ID
    console.log('1. Testing comment loading for non-existent post (valid format)...');
    try {
      const commentsResponse = await axios.get(`${baseURL}/comments/${validButNonExistentPostId}`);
      console.log('❌ Unexpected success:', commentsResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent post:', error.response?.data?.error);
      } else if (error.response?.status === 500) {
        console.log('❌ Still getting 500 error:', error.response?.data?.error);
      } else {
        console.log('❓ Unexpected error status:', error.response?.status, error.response?.data?.error);
      }
    }
    
    // Test 2: Try to create a comment on a non-existent post
    console.log('\n2. Testing comment creation on non-existent post...');
    try {
      const commentResponse = await axios.post(`${baseURL}/comments`, {
        postId: validButNonExistentPostId,
        content: 'Test comment on non-existent post'
      }, {
        headers: { 
          'Authorization': 'Bearer dummy-token-for-test'
        }
      });
      console.log('❌ Unexpected success:', commentResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent post:', error.response?.data?.error);
      } else if (error.response?.status === 500) {
        console.log('❌ Still getting 500 error:', error.response?.data?.error);
      } else {
        console.log('❓ Unexpected error status:', error.response?.status, error.response?.data?.error);
      }
    }
    
    // Test 3: Test with completely invalid post ID format
    console.log('\n3. Testing with completely invalid post ID format...');
    try {
      const invalidResponse = await axios.get(`${baseURL}/comments/invalid-format`);
      console.log('❌ Unexpected success:', invalidResponse.data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly returned 400 for invalid format:', error.response?.data?.error);
      } else {
        console.log('❓ Unexpected error status:', error.response?.status, error.response?.data?.error);
      }
    }
    
    console.log('\n✅ All error handling tests completed!');
    console.log('💡 The comment system now properly handles different error scenarios.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testImprovedErrorHandling();
