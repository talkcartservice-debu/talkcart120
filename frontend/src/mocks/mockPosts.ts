/**
 * Mock post data for testing video and image posts
 * These mocks are designed to test the fixes for media visibility and playback issues
 */

export const mockImagePost = {
  id: 'image-post-1',
  type: 'image',
  content: 'This is a test image post to verify image visibility fixes. The image should be clearly visible with no overlays.',
  author: {
    id: 'author-1',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://via.placeholder.com/40x40/FF0000/FFFFFF?text=A',
    isVerified: true,
  },
  createdAt: '2023-01-01T00:00:00Z',
  likes: 10,
  comments: 5,
  shares: 2,
  views: 100,
  likeCount: 10,
  commentCount: 5,
  shareCount: 2,
  hashtags: ['#test', '#image', '#visibility'],
  media: [
    {
      resource_type: 'image',
      secure_url: 'https://via.placeholder.com/600x400/FF0000/FFFFFF?text=Test+Image+Visible',
      url: 'https://via.placeholder.com/600x400/FF0000/FFFFFF?text=Test+Image+Visible',
    }
  ]
};

export const mockVideoPost = {
  id: 'video-post-1',
  type: 'video',
  content: 'This is a test video post to verify video visibility and audio playback fixes. The video should play with audio when unmuted.',
  author: {
    id: 'author-2',
    username: 'videouser',
    displayName: 'Video User',
    avatar: 'https://via.placeholder.com/40x40/0000FF/FFFFFF?text=V',
    isVerified: true,
  },
  createdAt: '2023-01-02T00:00:00Z',
  likes: 25,
  comments: 8,
  shares: 5,
  views: 250,
  likeCount: 25,
  commentCount: 8,
  shareCount: 5,
  hashtags: ['#test', '#video', '#audio'],
  media: [
    {
      resource_type: 'video',
      secure_url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      thumbnail_url: 'https://via.placeholder.com/600x400/0000FF/FFFFFF?text=Video+Thumbnail+Visible',
    }
  ]
};

export const mockVideoPostWithoutSource = {
  id: 'video-post-2',
  type: 'video',
  content: 'This is a video post without source to test error handling. You should see a "Video not available" message.',
  author: {
    id: 'author-3',
    username: 'brokenuser',
    displayName: 'Broken User',
    avatar: 'https://via.placeholder.com/40x40/808080/FFFFFF?text=X',
    isVerified: false,
  },
  createdAt: '2023-01-03T00:00:00Z',
  likes: 0,
  comments: 0,
  shares: 0,
  views: 0,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  hashtags: ['#broken', '#video', '#error'],
  media: [
    {
      resource_type: 'video',
      secure_url: null,
      url: null,
      thumbnail_url: null,
    }
  ]
};

export const mockTextPost = {
  id: 'text-post-1',
  type: 'text',
  content: 'This is a text-only post with #hashtag to verify that text posts work correctly alongside media posts.',
  author: {
    id: 'author-4',
    username: 'textuser',
    displayName: 'Text User',
    avatar: 'https://via.placeholder.com/40x40/00FF00/FFFFFF?text=T',
    isVerified: false,
  },
  createdAt: '2023-01-04T00:00:00Z',
  likes: 5,
  comments: 2,
  shares: 1,
  views: 50,
  likeCount: 5,
  commentCount: 2,
  shareCount: 1,
  hashtags: ['#text', '#hashtag', '#content'],
  media: []
};