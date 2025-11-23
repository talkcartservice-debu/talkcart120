const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    // Forward the request to the backend
    const url = new URL(`${API_BASE_URL}/marketplace/products`);
    
    // Add query parameters
    Object.keys(query).forEach(key => {
      if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
        url.searchParams.append(key, query[key]);
      }
    });

    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const options = {
      method,
      headers,
    };

    // Add body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Marketplace API proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}