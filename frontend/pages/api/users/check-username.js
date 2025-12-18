// API proxy for username availability check
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
        available: false
      });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    console.log('Proxying username check request to backend:', `${backendUrl}/api/users/check-username?username=${username}`);

    const response = await fetch(`${backendUrl}/api/users/check-username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Backend response status:', response.status);
    console.log('Backend response data:', data);

    // Forward the response status and data
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Username check proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}