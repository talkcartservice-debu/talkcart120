import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This is a simple test to see if the API route is working
  res.status(200).json({
    success: true,
    message: 'API route is working',
    timestamp: new Date().toISOString()
  });
}