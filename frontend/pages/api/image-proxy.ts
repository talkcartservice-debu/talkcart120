import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  console.log('=== PROXY IMAGE REQUEST ===');
  console.log('Raw request:', { url, method: req.method, headers: req.headers });

  if (!url || typeof url !== 'string') {
    console.error('Invalid URL parameter:', url);
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  // Clean the URL to remove any error messages that might have been appended
  const cleanUrl = url.split(' ')[0];
  console.log('Cleaned URL:', cleanUrl, 'from original:', url);
  
  // Validate the cleaned URL
  if (!cleanUrl) {
    console.error('Empty URL after cleaning');
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  try {
    new URL(cleanUrl);
  } catch (urlError) {
    console.error('Invalid URL format after cleaning:', cleanUrl);
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Allow localhost URLs for security (this is development only)
  // Also allow relative URLs that start with /uploads/
  if (!cleanUrl.includes('localhost') && !cleanUrl.startsWith('/uploads/')) {
    console.error('Non-localhost and non-relative URL rejected:', cleanUrl);
    return res.status(403).json({ error: 'Only localhost URLs and relative /uploads/ paths are allowed' });
  }

  // Handle relative /uploads/ paths by converting them to full localhost URLs
  let finalUrl = cleanUrl;
  if (cleanUrl.startsWith('/uploads/')) {
    finalUrl = `http://localhost:8000${cleanUrl}`;
    console.log('Converted relative URL to full URL:', finalUrl);
  }

  try {
    console.log('Fetching image from:', finalUrl);
    
    // Fetch the image from the backend server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const imageResponse = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TalkCart-Frontend-Proxy/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image from ${finalUrl}:`, {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers: Object.fromEntries(imageResponse.headers.entries())
      });
      return res.status(imageResponse.status).json({ 
        error: 'Failed to fetch image',
        details: {
          status: imageResponse.status,
          statusText: imageResponse.statusText
        }
      });
    }

    console.log('Image fetched successfully, content-type:', imageResponse.headers.get('content-type'));

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log('Image buffer size:', imageBuffer.byteLength);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour (shorter for development)
    res.setHeader('Content-Length', imageBuffer.byteLength.toString());
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS

    // Send the image
    console.log('Sending image response');
    res.status(200).send(Buffer.from(imageBuffer));
  } catch (error: any) {
    console.error('Error proxying image:', {
      error: error.message,
      stack: error.stack,
      originalUrl: url,
      cleanUrl: cleanUrl,
      finalUrl: finalUrl,
      name: error.name
    });
    
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}