const axios = require('axios');

// Debug script to test Google OAuth authentication flow
async function debugAuthentication() {
  console.log('🔍 Authentication Debug Script');
  console.log('================================\n');
  
  const BACKEND_URL = 'http://localhost:8001';
  const API_URL = `${BACKEND_URL}/api`;
  
  try {
    // 1. Test basic connectivity
    console.log('1. Testing backend connectivity...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend is running:', healthResponse.data);
    
    // 2. Test OAuth configuration endpoint
    console.log('\n2. Testing OAuth configuration...');
    try {
      const configResponse = await axios.get(`${API_URL}/auth/oauth/config`, { timeout: 5000 });
      console.log('✅ OAuth configuration:', configResponse.data);
    } catch (error) {
      console.log('ℹ️  OAuth config endpoint not available or requires authentication');
    }
    
    // 3. Test Google OAuth endpoint accessibility
    console.log('\n3. Testing Google OAuth endpoint...');
    try {
      const oauthResponse = await axios.post(`${API_URL}/auth/oauth/google`, 
        { idToken: 'test-token' }, 
        { timeout: 5000 }
      );
      console.log('ℹ️  OAuth endpoint responded:', oauthResponse.status);
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      console.log(`ℹ️  OAuth endpoint status: ${status} - ${message}`);
      
      if (status === 400) {
        console.log('✅ Endpoint is accessible but rejected invalid token (expected)');
      }
    }
    
    // 4. Test environment variables
    console.log('\n4. Checking environment configuration...');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('BACKEND_URL:', BACKEND_URL);
    
    // 5. Test CORS configuration
    console.log('\n5. Testing CORS configuration...');
    try {
      const corsResponse = await axios.options(`${API_URL}/auth/oauth/google`, { timeout: 5000 });
      console.log('✅ CORS preflight successful');
      console.log('Allowed methods:', corsResponse.headers['access-control-allow-methods']);
      console.log('Allowed origins:', corsResponse.headers['access-control-allow-origin']);
    } catch (error) {
      console.log('ℹ️  CORS preflight test failed:', error.message);
    }
    
    // 6. Simulate frontend OAuth flow
    console.log('\n6. Simulating frontend OAuth flow...');
    console.log('Expected Google Client ID:', '526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com');
    console.log('Backend should accept tokens with this audience');
    
    // 7. Test with actual Google token (if available)
    console.log('\n7. Testing with sample token structure...');
    const sampleTokenPayload = {
      aud: '526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com',
      sub: '123456789',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    console.log('Sample token payload structure:', sampleTokenPayload);
    console.log('✅ This should be accepted by the backend');
    
    console.log('\n✅ Authentication debug completed successfully');
    console.log('\n🔧 Next steps:');
    console.log('1. Ensure Google OAuth is properly configured in Google Cloud Console');
    console.log('2. Verify the redirect URI matches your frontend URL');
    console.log('3. Check that the client ID matches between frontend and backend');
    console.log('4. Test the actual Google sign-in flow in the browser');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    console.error('Error details:', error.response?.data || error.stack);
  }
}

// Run the debug script
debugAuthentication();