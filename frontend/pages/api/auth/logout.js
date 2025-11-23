// API proxy for authentication logout
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    console.log('Proxying logout request to backend:', `${backendUrl}/api/auth/logout`);

    const response = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log('Backend logout response status:', response.status);

    // Forward the response status and data
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Logout proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}