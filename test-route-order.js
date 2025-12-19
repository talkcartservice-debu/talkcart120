// Test to see which route is being hit
const express = require('express');
const app = express();

// Simulate the route order issue
app.get('/products/:id', (req, res) => {
  console.log('Parameterized route hit with id:', req.params.id);
  res.json({ route: 'parameterized', id: req.params.id });
});

app.get('/products/featured', (req, res) => {
  console.log('Static route hit');
  res.json({ route: 'static', type: 'featured' });
});

app.listen(3000, () => {
  console.log('Test server running on port 3000');
  
  // Test the routes
  setTimeout(() => {
    const http = require('http');
    
    // Test featured route
    http.get('http://localhost:3000/products/featured', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Featured route response:', data);
        process.exit(0);
      });
    });
  }, 1000);
});