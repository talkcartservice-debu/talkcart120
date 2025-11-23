const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Product ID is required'
    });
  }

  try {
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

    const response = await fetch(`${API_BASE_URL}/marketplace/products/${id}`, options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Product API proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}