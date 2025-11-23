import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetPosts(req, res);
    case 'POST':
      return handleCreatePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
  }
}

async function handleGetPosts(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Fetching posts from backend...');
    
    // Get query parameters
    const {
      feedType = 'for-you',
      limit = '20',
      page = '1',
      contentType = 'all',
      authorId,
      hashtag,
      search
    } = req.query;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append('feedType', feedType as string);
    queryParams.append('limit', limit as string);
    queryParams.append('page', page as string);
    queryParams.append('contentType', contentType as string);
    
    if (authorId) queryParams.append('authorId', authorId as string);
    if (hashtag) queryParams.append('hashtag', hashtag as string);
    if (search) queryParams.append('search', search as string);
    
    // Use environment variable for backend URL or fallback to default
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Try the enhanced endpoint first, fallback to regular endpoint
    let backendUrl = `${backendBaseUrl}/api/posts/enhanced?${queryParams.toString()}`;
    console.log('Trying enhanced backend URL:', backendUrl);
    
    let response;
    try {
      response = await axios.get(backendUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for better reliability
      });
    } catch (enhancedError) {
      console.log('Enhanced endpoint failed, trying regular endpoint');
      backendUrl = `${backendBaseUrl}/api/posts?${queryParams.toString()}`;
      console.log('Backend URL:', backendUrl);
      response = await axios.get(backendUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for better reliability
      });
    }
    
    console.log('Backend response status:', response.status);
    
    if (response.data?.success && response.data?.data?.posts) {
      // The enhanced endpoint already processes posts properly, so we can return them directly
      const posts = response.data.data.posts;
      
      console.log(`Successfully fetched ${posts.length} posts`);
      
      return res.status(200).json({
        success: true,
        posts: posts,
        count: posts.length,
        pagination: response.data.data.pagination || {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: posts.length,
          pages: 1,
        },
        feedType,
      });
    }
    
    console.log('No posts found in response');
    return res.status(200).json({
      success: true,
      posts: [],
      count: 0,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0,
        pages: 0,
      },
      message: 'No posts found',
      feedType,
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    
    // More detailed error handling
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Backend service unavailable',
        message: 'Unable to connect to the backend service. Please make sure the backend server is running on port 8000.',
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The request to fetch posts timed out. Please check if the backend server is running and responsive.',
      });
    }
    
    // Handle Axios timeout specifically
    if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 408)) {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The request to fetch posts timed out. Please check if the backend server is running and responsive.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch posts',
      message: 'An error occurred while fetching posts. Please check if the backend server is running.',
    });
  }
}

async function handleCreatePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Creating post via backend proxy...');
    
    // Use environment variable for backend URL or fallback to default
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const backendUrl = `${backendBaseUrl}/api/posts`;
    
    // Forward the POST request to the backend
    const response = await axios.post(backendUrl, req.body, {
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      },
      timeout: 30000, // 30 second timeout for better reliability
    });
    
    console.log('Backend post creation response status:', response.status);
    
    // Return the backend response directly
    return res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Error creating post:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Backend responded with error status
      return res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Backend service unavailable',
        message: 'Unable to connect to the backend service. Please make sure the backend server is running on port 8000.',
      });
    } else if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The request to create post timed out. Please check if the backend server is running and responsive.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create post',
      message: 'An error occurred while creating the post. Please try again.',
    });
  }
}