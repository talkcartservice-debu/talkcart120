# usePostsEnhanced Hook

This is an enhanced version of the `usePosts` hook with improved error handling, better media processing, and more robust post structure validation.

## Improvements Over Original usePosts

### 1. Enhanced Media Processing
- Better handling of media items that might be strings instead of objects
- Improved fallbacks for all required media fields
- Proper resource type detection for videos vs images
- Special handling for localhost URLs

### 2. Robust Post Structure
- Ensures all required post fields are present with proper fallbacks
- Better author object handling with fallback values
- Proper post type determination based on media content
- Enhanced error handling for missing or malformed data

### 3. Improved Error Handling
- Retry mechanism with exponential backoff
- Better error messages for different failure scenarios
- Proper handling of network timeouts
- Graceful degradation for partial data

### 4. Enhanced Functionality
- Better TypeScript typing
- Improved pagination handling
- More reliable infinite scrolling
- Better event handling for real-time updates

## Usage

```typescript
import { usePostsEnhanced } from '@/hooks/usePostsEnhanced';

const MyComponent = () => {
  const {
    posts,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    page,
    fetchPosts,
    fetchBookmarkedPosts,
    likePost,
    bookmarkPost,
    sharePost
  } = usePostsEnhanced({
    feedType: 'for-you', // 'for-you' | 'following' | 'recent' | 'trending'
    limit: 20,
    authorId: 'user123', // optional
    hashtag: 'trending', // optional
    search: 'query' // optional
  });

  // Fetch posts with specific options
  const handleRefresh = () => {
    fetchPosts({ feedType: 'recent', page: 1, reset: true });
  };

  // Load more posts for infinite scroll
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  // Handle post interactions
  const handleLike = (postId: string) => {
    likePost(postId);
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {posts.map(post => (
        <PostComponent 
          key={post.id} 
          post={post} 
          onLike={handleLike}
          // ... other handlers
        />
      ))}
      {hasMore && <button onClick={handleLoadMore}>Load More</button>}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
};
```

## API

### Hook Options
- `feedType`: Type of feed to fetch ('for-you', 'following', 'recent', 'trending')
- `limit`: Number of posts per page (default: 20)
- `authorId`: Filter posts by specific author
- `hashtag`: Filter posts by hashtag
- `search`: Search posts by content

### Return Values
- `posts`: Array of post objects with proper typing
- `loading`: Boolean indicating if posts are being fetched
- `error`: Error message if fetch failed
- `refresh`: Function to refresh the current feed
- `loadMore`: Function to load the next page of posts
- `hasMore`: Boolean indicating if there are more posts to load
- `page`: Current page number
- `fetchPosts`: Function to fetch posts with specific options
- `fetchBookmarkedPosts`: Function to fetch bookmarked posts for a user
- `likePost`: Function to like/unlike a post
- `bookmarkPost`: Function to bookmark/unbookmark a post
- `sharePost`: Function to share a post

## Testing

The hook includes comprehensive tests in `usePostsEnhanced.test.ts` that cover:
- Successful post fetching
- Error handling
- Post interactions (like, bookmark, share)
- Pagination and infinite scrolling
- Refresh functionality