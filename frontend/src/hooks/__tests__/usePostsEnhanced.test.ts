import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostsEnhanced } from '../usePostsEnhanced';

// Mock the api module
jest.mock('@/lib/api', () => ({
  api: {
    posts: {
      getAll: jest.fn(),
      getBookmarkedPosts: jest.fn(),
    },
  },
}));

describe('usePostsEnhanced', () => {
  const mockPosts = [
    {
      id: '1',
      content: 'Test post 1',
      author: { id: 'user1', name: 'User 1' },
      media: [],
      createdAt: new Date().toISOString(),
      likeCount: 5,
      commentCount: 3,
      shareCount: 1,
    },
    {
      id: '2',
      content: 'Test post 2',
      author: { id: 'user2', name: 'User 2' },
      media: [
        {
          id: 'media1',
          url: 'https://example.com/image.jpg',
          secure_url: 'https://example.com/image.jpg',
          resource_type: 'image',
        },
      ],
      createdAt: new Date().toISOString(),
      likeCount: 10,
      commentCount: 2,
      shareCount: 0,
    },
  ];

  const mockApiResponse = {
    success: true,
    data: {
      posts: mockPosts,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch posts successfully', async () => {
    const { api } = require('@/lib/api');
    api.posts.getAll.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => usePostsEnhanced());

    expect(result.current.loading).toBe(true);
    expect(result.current.posts).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.hasMore).toBe(false);
    expect(api.posts.getAll).toHaveBeenCalledWith({
      feedType: 'for-you',
      limit: '20',
      page: '1',
    });
  });

  it('should handle fetch error', async () => {
    const { api } = require('@/lib/api');
    api.posts.getAll.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => usePostsEnhanced());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to fetch posts. Please try again.');
    expect(result.current.posts).toEqual([]);
  });

  it('should fetch bookmarked posts', async () => {
    const { api } = require('@/lib/api');
    api.posts.getBookmarkedPosts.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => usePostsEnhanced());

    await act(async () => {
      await result.current.fetchBookmarkedPosts('user123');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.posts).toEqual(mockPosts);
    expect(api.posts.getBookmarkedPosts).toHaveBeenCalledWith('user123', { limit: 20, page: 1 });
  });

  it('should handle post interactions', async () => {
    const { api } = require('@/lib/api');
    api.posts.getAll.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => usePostsEnhanced());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Test like post
    act(() => {
      result.current.likePost('1');
    });

    expect(result.current.posts[0]!.isLiked).toBe(true);
    expect(result.current.posts[0]!.likeCount).toBe(6);

    // Test bookmark post
    act(() => {
      result.current.bookmarkPost('1');
    });

    expect(result.current.posts[0]!.isBookmarked).toBe(true);

    // Test share post
    act(() => {
      result.current.sharePost('1');
    });

    expect(result.current.posts[0]!.likeCount).toBe(6);
    expect(result.current.posts[0]!.shareCount).toBe(2);
  });

  it('should load more posts', async () => {
    const { api } = require('@/lib/api');
    api.posts.getAll
      .mockResolvedValueOnce({
        success: true,
        data: {
          posts: [mockPosts[0]],
          pagination: {
            page: 1,
            limit: 1,
            total: 2,
            pages: 2,
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          posts: [mockPosts[1]],
          pagination: {
            page: 2,
            limit: 1,
            total: 2,
            pages: 2,
          },
        },
      });

    const { result } = renderHook(() => usePostsEnhanced({ limit: 1 }));

    // Wait for first page
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([mockPosts[0]]);
    expect(result.current.hasMore).toBe(true);

    // Load more
    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.hasMore).toBe(false);
  });

  it('should refresh posts', async () => {
    const { api } = require('@/lib/api');
    api.posts.getAll.mockResolvedValue(mockApiResponse);

    const { result } = renderHook(() => usePostsEnhanced());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialPosts = result.current.posts;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should have fetched posts again
    expect(api.posts.getAll).toHaveBeenCalledTimes(2);
    expect(result.current.posts).toEqual(initialPosts);
  });
});