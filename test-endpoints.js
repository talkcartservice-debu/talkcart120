const http = require('http');

// Test the featured products endpoint
const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/marketplace/products/featured?limit=3',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:');
    console.log(data);
    
    // Check if response contains success
    if (data.includes('"success":true')) {
      console.log('✅ Featured products endpoint is working!');
    } else {
      console.log('❌ Featured products endpoint is not working properly.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();