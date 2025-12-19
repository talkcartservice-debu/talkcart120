const axios = require('axios');

async function debugTrendingProducts() {
  try {
    console.log('Fetching trending products from backend...');
    
    const response = await axios.get('http://localhost:8000/api/marketplace/products/trending?limit=4');
    
    console.log('Response status:', response.status);
    console.log('Response data structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected structure
    if (response.data?.success && response.data?.data?.products) {
      console.log('\n✅ Response has expected structure');
      console.log('Number of products:', response.data.data.products.length);
      
      if (response.data.data.products.length > 0) {
        console.log('\nFirst product details:');
        console.log(JSON.stringify(response.data.data.products[0], null, 2));
      }
    } else {
      console.log('\n❌ Response does not have expected structure');
      console.log('Available keys:', Object.keys(response.data || {}));
      if (response.data?.data) {
        console.log('Data keys:', Object.keys(response.data.data || {}));
      }
    }
  } catch (error) {
    console.error('Error fetching trending products:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugTrendingProducts();