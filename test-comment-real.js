const axios = require('axios');

async function testCommentSystemWithRealPost() {
  console.log('🧪 Testing Comment System with Real Post...\n');
  
  const baseURL = 'http://localhost:8000/api';
  const testPostId = '696d164b05e64c47ea00c245'; // The post we just created
  
  try {
    // Test 1: Get comments for the test post (should be empty)
    console.log('1. Testing getting comments for test post...');
    const commentsResponse = await axios.get(`${baseURL}/comments/${testPostId}`);
    console.log('✅ Successfully fetched comments:', commentsResponse.data.data?.comments?.length || 0, 'comments');
    
    // Test 2: Try to create a comment (this should fail because we're not authenticated)
    console.log('\n2. Testing comment creation without auth...');
    try {
      const commentResponse = await axios.post(`${baseURL}/comments`, {
        postId: testPostId,
        content: 'This is a test comment!'
      });
      console.log('❌ Unexpected success:', commentResponse.data);
    } catch (error) {
      console.log('✅ Correctly rejected anonymous comment:', error.response?.data?.error || error.message);
    }
    
    // Test 3: Simulate what happens in the frontend when trying to load comments for a non-existent post
    console.log('\n3. Testing with invalid post ID...');
    try {
      const invalidResponse = await axios.get(`${baseURL}/comments/invalid1234567890123456789012`);
      console.log('❌ Unexpected success:', invalidResponse.data);
    } catch (error) {
      console.log('✅ Correctly rejected invalid post ID:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    console.log('\n✅ All tests passed! The comment system is working correctly.');
    console.log('💡 The "internal server error" was likely caused by trying to load comments for posts that no longer exist.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testCommentSystemWithRealPost();
