import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test if we can access the upload through the proxy
    const testUrl = '/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9';
    
    // In a real scenario, Next.js would proxy this request to http://localhost:8000/uploads/...
    // But we can't easily test that from within the API route itself
    
    res.status(200).json({
      success: true,
      message: 'Proxy test endpoint',
      testUrl: testUrl,
      note: 'This endpoint just confirms the route is working. Actual proxying happens at the Next.js level.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}