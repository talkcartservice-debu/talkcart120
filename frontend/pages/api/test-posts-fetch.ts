import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing posts fetch from backend...');
    
    // Test the backend posts endpoint directly
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const backendUrl = `${backendBaseUrl}/api/posts?feedType=for-you&limit=5`;
    console.log('Backend URL:', backendUrl);
    
    const response = await axios.get(backendUrl, {
      timeout: 30000
    });
    
    console.log('Backend response status:', response.status);
    console.log('Backend response data keys:', Object.keys(response.data));
    
    if (response.data.data?.posts) {
      console.log('Posts count:', response.data.data.posts.length);
      
      // Log details of first post if available
      if (response.data.data.posts.length > 0) {
        const firstPost = response.data.data.posts[0];
        console.log('First post sample:', {
          id: firstPost._id,
          content: firstPost.content?.substring(0, 50) + '...',
          author: firstPost.author?.displayName || firstPost.author?.username,
          mediaCount: firstPost.media?.length || 0
        });
        
        if (firstPost.media && firstPost.media.length > 0) {
          console.log('First post media sample:', firstPost.media[0]);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Backend posts fetch test completed',
      backendResponse: {
        status: response.status,
        postsCount: response.data.data?.posts?.length || 0,
        hasPosts: !!response.data.data?.posts,
        samplePost: response.data.data?.posts?.[0] ? {
          id: response.data.data.posts[0]._id,
          content: response.data.data.posts[0].content?.substring(0, 50) + '...',
          mediaCount: response.data.data.posts[0].media?.length || 0
        } : null
      }
    });
  } catch (error: any) {
    console.error('Backend posts fetch test failed:', error.message);
    
    res.status(200).json({
      success: false,
      error: error.message,
      code: error.code,
      note: 'This test helps determine if the backend is returning posts correctly'
    });
  }
}