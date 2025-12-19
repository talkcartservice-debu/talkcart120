export default async function handler(req, res) {
  console.log('Test proxy route hit!');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  
  // Try to make a request to the backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/marketplace/products/trending?limit=5`;
    
    console.log('Making request to backend:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Backend response status:', response.status);
    
    const data = await response.json();
    console.log('Backend response data:', JSON.stringify(data, null, 2));
    
    res.status(200).json({
      success: true,
      message: 'Test proxy working',
      backendData: data,
    });
  } catch (error) {
    console.error('Test proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}