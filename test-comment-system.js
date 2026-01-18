const axios = require('axios');

async function testCommentSystem() {
  console.log('🧪 Testing Comment System...\n');
  
  const baseURL = 'http://localhost:8000/api';
  
  try {
    // Test 1: Health check
    console.log('1. Testing comments health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/comments/health`);
    console.log('✅ Health check:', healthResponse.data.message);
    
    // Test 2: Try to create comment without authentication
    console.log('\n2. Testing comment creation without auth...');
    try {
      const commentResponse = await axios.post(`${baseURL}/comments`, {
        postId: '507f1f77bcf86cd799439011', // dummy post ID
        content: 'Test comment'
      });
      console.log('❌ Unexpected success:', commentResponse.data);
    } catch (error) {
      console.log('✅ Correctly rejected anonymous comment:', error.response?.data?.error || error.message);
    }
    
    // Test 3: Try to create comment with invalid post ID
    console.log('\n3. Testing comment creation with invalid post ID...');
    try {
      const commentResponse = await axios.post(`${baseURL}/comments`, {
        postId: 'invalid-id',
        content: 'Test comment'
      }, {
        headers: { Authorization: 'Bearer test-token' }
      });
      console.log('❌ Unexpected success:', commentResponse.data);
    } catch (error) {
      console.log('✅ Correctly rejected invalid post ID:', error.response?.data?.error || error.message);
    }
    
    // Test 4: Try to get comments for a post
    console.log('\n4. Testing getting comments for a post...');
    try {
      const commentsResponse = await axios.get(`${baseURL}/comments/507f1f77bcf86cd799439011`);
      console.log('✅ Successfully fetched comments:', commentsResponse.data.data?.comments?.length || 0, 'comments');
    } catch (error) {
      console.log('❌ Failed to fetch comments:', error.response?.data?.error || error.message);
    }
    
    console.log('\n✅ Comment system tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testCommentSystem();
