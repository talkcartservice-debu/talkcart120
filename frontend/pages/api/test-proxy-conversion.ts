import { NextApiRequest, NextApiResponse } from 'next';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { convertToProxyUrl } from '@/utils/urlConverter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testUrls = [
    'http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
    '/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    '/cloudinary/demo/image/upload/sample.jpg'
  ];

  const results = testUrls.map(url => {
    const converted = convertToProxyUrl(url);
    const proxied = proxyCloudinaryUrl(url);
    return {
      original: url,
      converted,
      proxied,
      success: converted.startsWith('/uploads/') || converted.startsWith('/cloudinary/') || converted.includes('placeholder'),
      proxiedSuccess: proxied.startsWith('/uploads/') || proxied.startsWith('/cloudinary/') || proxied.includes('placeholder')
    };
  });

  res.status(200).json({
    success: true,
    results
  });
}