import React from 'react';
import { usePostsEnhanced } from './usePostsEnhanced';

// Example component showing how to use the enhanced hook
const PostsFeed: React.FC = () => {
  const {
    posts,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    likePost,
    bookmarkPost,
    sharePost
  } = usePostsEnhanced({
    feedType: 'for-you',
    limit: 10
  });

  if (loading && posts.length === 0) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Social Feed</h2>
        <button onClick={refresh}>Refresh</button>
      </div>
      
      {posts.map(post => (
        <div key={post.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            {post.author?.avatar && (
              <img 
                src={post.author.avatar} 
                alt={post.author.name} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '0.5rem' }} 
              />
            )}
            <div>
              <h4 style={{ margin: 0 }}>{post.author?.name || 'Unknown User'}</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date'}
              </p>
            </div>
          </div>
          
          <p>{post.content}</p>
          
          {post.media && post.media.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {post.media.map((media, index) => (
                <img 
                  key={index} 
                  src={media.secure_url || media.url} 
                  alt="Post media" 
                  style={{ maxWidth: '100%', borderRadius: '4px' }} 
                />
              ))}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => likePost(post.id)}>
              Like ({post.likeCount || 0})
            </button>
            <button onClick={() => bookmarkPost(post.id)}>
              Bookmark ({post.bookmarkCount || 0})
            </button>
            <button onClick={() => sharePost(post.id)}>
              Share ({post.shareCount || 0})
            </button>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <button onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PostsFeed;