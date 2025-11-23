// API proxy for token refresh
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    console.log('Proxying refresh token request to backend:', `${backendUrl}/api/auth/refresh`);
    console.log('Request body:', req.body);

    const response = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log('Backend refresh response status:', response.status);
    console.log('Backend refresh response data:', data);

    // Forward the response status and data
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Refresh token proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}