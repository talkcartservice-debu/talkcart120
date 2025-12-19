const http = require('http');

// Test multiple endpoints
const endpoints = [
  { path: '/api/marketplace/products/featured?limit=3', name: 'Featured Products' },
  { path: '/api/marketplace/products/best-selling?limit=3', name: 'Best Selling Products' },
  { path: '/api/marketplace/products/new?limit=3', name: 'New Products' }
];

function testEndpoint(index) {
  if (index >= endpoints.length) {
    console.log('All endpoints tested!');
    return;
  }
  
  const endpoint = endpoints[index];
  
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: endpoint.path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`\n${endpoint.name}:`);
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.success) {
          console.log(`✅ ${endpoint.name} endpoint is working!`);
          console.log(`Found ${jsonData.data.products.length} products`);
        } else {
          console.log(`❌ ${endpoint.name} endpoint failed:`, jsonData.error);
        }
      } catch (e) {
        console.log(`❌ ${endpoint.name} endpoint returned invalid JSON`);
      }
      
      // Test next endpoint
      testEndpoint(index + 1);
    });
  });

  req.on('error', (error) => {
    console.error(`Error testing ${endpoint.name}:`, error.message);
    testEndpoint(index + 1);
  });

  req.end();
}

// Start testing
testEndpoint(0);