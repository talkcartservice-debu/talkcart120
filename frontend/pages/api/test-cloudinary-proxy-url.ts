import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test proxy Cloudinary access
    const proxyImageUrl = '/cloudinary/dftpdqd4k/image/upload/talkcart/file_1762529225547_3uzoa3u7b7o.jpg';
    
    console.log('Testing proxy Cloudinary access:', proxyImageUrl);
    
    // Since this is running on the server, we need to test differently
    // We'll just return information about what the proxy should do
    res.status(200).json({
      success: true,
      message: 'Proxy URL test',
      proxyUrl: proxyImageUrl,
      expectedDestination: 'https://res.cloudinary.com/dftpdqd4k/image/upload/talkcart/file_1762529225547_3uzoa3u7b7o.jpg',
      note: 'This URL should be handled by Next.js rewrites in next.config.js'
    });
  } catch (error: any) {
    console.error('Proxy Cloudinary test failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}