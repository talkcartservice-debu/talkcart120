// Simulate the frontend API service call
const http = require('http');

// Test the frontend API service call
const url = 'http://localhost:4000/api/marketplace/products/trending?limit=10';

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/marketplace/products/trending?limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Making request to:', url);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response data:');
    console.log(data);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();