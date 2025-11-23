import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test direct Cloudinary access
    const testImageUrl = 'https://res.cloudinary.com/dftpdqd4k/image/upload/talkcart/file_1762529225547_3uzoa3u7b7o.jpg';
    
    console.log('Testing direct Cloudinary access:', testImageUrl);
    
    // Try to fetch the image directly
    const response = await axios.get(testImageUrl, {
      responseType: 'arraybuffer',
      timeout: 5000
    });
    
    console.log('Direct Cloudinary response status:', response.status);
    
    res.status(200).json({
      success: true,
      message: 'Direct Cloudinary access successful',
      status: response.status,
      headers: {
        'content-type': response.headers['content-type'],
        'content-length': response.headers['content-length']
      }
    });
  } catch (error: any) {
    console.error('Direct Cloudinary access failed:', error.message);
    
    res.status(200).json({
      success: false,
      error: error.message,
      code: error.code,
      note: 'This test helps determine if the issue is with direct Cloudinary access or the proxy'
    });
  }
}