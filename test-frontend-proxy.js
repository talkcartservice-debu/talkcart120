const http = require('http');

// Test the frontend proxy endpoint
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/marketplace/products/trending?limit=5',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Frontend Proxy Status: ${res.statusCode}`);
  console.log(`Frontend Proxy Headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    console.log(`Body: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Frontend proxy request completed');
  });
});

req.on('error', (e) => {
  console.error(`Problem with frontend proxy request: ${e.message}`);
});

req.end();