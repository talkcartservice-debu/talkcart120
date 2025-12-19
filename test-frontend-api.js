// Simple test to verify frontend can access the backend API
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Test endpoint to simulate the frontend calling the backend
app.get('/test-trending', async (req, res) => {
  try {
    console.log('Testing frontend API call to backend...');
    
    // Simulate the same call that the frontend would make
    const response = await fetch('http://localhost:8000/api/marketplace/products/trending?limit=4');
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Backend response data:', JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      message: 'Frontend can successfully call backend',
      data: data
    });
  } catch (error) {
    console.error('Error testing frontend-backend connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Frontend test server running on http://localhost:${PORT}`);
  console.log('Visit http://localhost:3001/test-trending to test the connection');
});