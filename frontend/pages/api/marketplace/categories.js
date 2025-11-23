const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
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

    const response = await fetch(`${API_BASE_URL}/marketplace/categories`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Categories API proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}