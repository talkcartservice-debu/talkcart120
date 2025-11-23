import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to fetch posts from the backend
    const response = await axios.get('http://localhost:8000/api/posts', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data?.success && response.data?.data?.posts) {
      // Filter posts with media
      const postsWithMedia = response.data.data.posts.filter((post: any) => 
        post.media && post.media.length > 0
      );

      // Return the posts with media
      return res.status(200).json({
        success: true,
        posts: postsWithMedia,
        count: postsWithMedia.length,
      });
    }

    return res.status(200).json({
      success: true,
      posts: [],
      count: 0,
      message: 'No posts with media found',
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch posts',
    });
  }
}