// API proxy for comments
export default async function handler(req, res) {
  const { method } = req;

  try {
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/comments`;
    
    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
      },
      ...(method !== 'GET' && { body: JSON.stringify(req.body) }),
    });

    const data = await backendResponse.json();
    
    // Return the response with the same status code
    res.status(backendResponse.status).json(data);
  } catch (error) {
    console.error('Comments API proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process comments request',
      message: error.message,
    });
  }
}