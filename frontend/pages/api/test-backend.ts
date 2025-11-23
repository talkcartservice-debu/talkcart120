import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const testUrl = backendBaseUrl;
  
  try {
    console.log('Testing backend connectivity to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'HEAD', // Just test connectivity, don't fetch content
      headers: {
        'User-Agent': 'TalkCart-Frontend-Test/1.0'
      }
    });
    
    console.log('Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    res.status(200).json({
      success: true,
      backend: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        accessible: response.ok
      }
    });
    
  } catch (error: any) {
    console.error('Backend connectivity test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      backend: {
        url: testUrl,
        accessible: false
      }
    });
  }
}