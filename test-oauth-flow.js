const axios = require('axios');

// Test OAuth flow with enhanced debugging
async function testOAuthFlow() {
  console.log('🧪 OAuth Flow Test');
  console.log('==================\n');
  
  const BACKEND_URL = 'http://localhost:8001';
  const API_URL = `${BACKEND_URL}/api`;
  
  try {
    console.log('1. Testing OAuth endpoint accessibility...');
    
    // Test with invalid token first
    console.log('\n1a. Testing with invalid token:');
    try {
      const invalidResponse = await axios.post(`${API_URL}/auth/oauth/google`, 
        { idToken: '' }, 
        { timeout: 10000 }
      );
      console.log('❌ Unexpected success with empty token');
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      console.log(`✅ Correctly rejected empty token: ${status} - ${message}`);
    }
    
    // Test with malformed token
    console.log('\n1b. Testing with malformed token:');
    try {
      const malformedResponse = await axios.post(`${API_URL}/auth/oauth/google`, 
        { idToken: 'invalid-token-format' }, 
        { timeout: 10000 }
      );
      console.log('❌ Unexpected success with malformed token');
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      console.log(`✅ Correctly rejected malformed token: ${status} - ${message}`);
    }
    
    // Test audience verification logic
    console.log('\n2. Testing audience verification logic...');
    console.log('Expected Client ID: 526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com');
    
    // Simulate what Google would return
    const mockGoogleResponse = {
      aud: '526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com',
      sub: '110123456789012345678',
      email: 'test.user@gmail.com',
      name: 'Test User',
      email_verified: true,
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    console.log('Mock Google token payload:', mockGoogleResponse);
    console.log('✅ This should pass audience verification');
    
    // Test the actual verification endpoint
    console.log('\n3. Testing Google token verification endpoint...');
    const testToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiI1MjYxMDA3MzM1OTEtaWQza3FobTF0MTNndGJwcWlpOGtpaG1uOHU1azNraDUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTAxMjM0NTY3ODkwMTIzNDU2NzgiLCJlbWFpbCI6InRlc3QudXNlckBnbWFpbC5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsImV4cCI6MTczOTAxMjM0NX0.signature';
    
    try {
      console.log('Testing with sample Google token...');
      const oauthResponse = await axios.post(`${API_URL}/auth/oauth/google`,
        { idToken: testToken },
        { timeout: 15000 }
      );
      
      if (oauthResponse.data?.success) {
        console.log('✅ OAuth successful!');
        console.log('User:', oauthResponse.data.user?.username);
        console.log('Access Token:', oauthResponse.data.accessToken ? 'RECEIVED' : 'MISSING');
      } else {
        console.log('❌ OAuth failed:', oauthResponse.data?.message);
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      const debugInfo = error.response?.data?.debug;
      
      console.log(`❌ OAuth test failed: ${status} - ${message}`);
      if (debugInfo) {
        console.log('Debug info:', debugInfo);
      }
      
      // Specific handling for audience mismatch
      if (message?.includes('audience mismatch')) {
        console.log('\n🔧 Audience Mismatch Detected!');
        console.log('This indicates the Google token was issued for a different client ID');
        console.log('Solution: Verify your Google Cloud Console OAuth configuration');
        console.log('- Check that the client ID matches between frontend and backend');
        console.log('- Ensure the redirect URI is properly configured');
        console.log('- Verify the application is published in Google Cloud Console');
      }
    }
    
    console.log('\n✅ OAuth flow test completed');
    
  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testOAuthFlow();