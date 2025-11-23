const express = require('express');
const router = express.Router();
const { Comment, Post, User, Notification } = require('../models');
const { authenticateToken, authenticateTokenStrict } = require('./auth');

// MongoDB-only comment management

// Add this after the imports at the top of the file
const NotificationService = require('../services/notificationService');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Comments service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/comments/search
// @desc    Search comments
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query, postId, limit = 20, page = 1 } = req.query;

    console.log(`GET /api/comments/search - Query: ${query}`);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    // Use simple regex search instead of text search for now
    const searchFilter = {
      isActive: true,
      content: { $regex: query, $options: 'i' }
    };

    if (postId) {
      searchFilter.post = postId;
    }

    // Search comments
    const comments = await Comment.find(searchFilter)
      .populate('author', 'username displayName avatar isVerified')
      .populate('post', 'content')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Comment.countDocuments(searchFilter);

    // Get current user ID for isLiked field
    const currentUserId = req.user?.userId || req.user?.id;

    const results = comments.map(comment => {
      const likesArray = Array.isArray(comment.likes) ? comment.likes : [];
      const likesCount = likesArray.length;
      const isLiked = currentUserId ? likesArray.some(like => like.user?.toString() === currentUserId.toString()) : false;

      return {
        ...comment.toObject(),
        id: comment._id,
        likes: likesCount,
        isLiked
      };
    });

    res.json({
      success: true,
      data: {
        comments: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Search comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search comments',
      message: error.message,
    });
  }
});

// @route   GET /api/comments/:postId
// @desc    Get comments for a specific post
// @access  Public
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, page = 1, sortBy = 'newest' } = req.query;

    console.log(`GET /api/comments/${postId} - Request received`);

    // Validate postId is a valid MongoDB ObjectId
    if (!postId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID format',
      });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Determine sort options
    let sortOptions = {};
    if (sortBy === 'oldest') {
      sortOptions = { sortBy: 'createdAt', sortOrder: 1 };
    } else if (sortBy === 'popular') {
      sortOptions = { sortBy: 'likeCount', sortOrder: -1 };
    } else {
      // newest (default)
      sortOptions = { sortBy: 'createdAt', sortOrder: -1 };
    }

    // Get comments with threading
    const comments = await Comment.getPostComments(postId, {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      ...sortOptions,
    });

    // Get total count for pagination
    const total = await Comment.countDocuments({
      post: postId,
      isActive: true
    });

    console.log(`Found ${comments.length} comments (${total} total)`);

    // Get current user ID for isLiked field
    const currentUserId = req.user?.userId || req.user?.id;



    res.json({
      success: true,
      data: {
        comments: comments.map(comment => {
          // Now we should have proper likes array from toObject()
          const likesArray = Array.isArray(comment.likes) ? comment.likes : [];
          const likesCount = likesArray.length;

          // Calculate isLiked status
          const isLiked = currentUserId ? likesArray.some(like => like.user?.toString() === currentUserId.toString()) : false;

          return {
            ...comment,
            id: comment._id,
            postId: comment.post,
            authorId: comment.author?._id, // Fixed: null-safe access
            isLiked: isLiked,
            likes: likesCount,
            replies: comment.replies?.map(reply => {
              const replyLikesArray = Array.isArray(reply.likes) ? reply.likes : [];
              const replyLikesCount = replyLikesArray.length;

              return {
                ...reply,
                id: reply.id || reply._id?.toString(),
                isLiked: currentUserId ? replyLikesArray.some(like => like.user?.toString() === currentUserId.toString()) : false,
                likes: replyLikesCount,
              };
            }) || []
          };
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments',
      message: error.message,
    });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Public (anonymous allowed)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { postId, content, parentId = null } = req.body;

    console.log('POST /api/comments - Request received');

    // Validation
    if (!postId || !content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Post ID and content are required',
      });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if parent comment exists (for replies)
    if (parentId) {
      // Validate parentId is a valid MongoDB ObjectId
      if (!parentId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parent comment ID format',
        });
      }

      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.post.toString() !== postId) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found',
        });
      }
    }

    // Handle both authenticated and anonymous users
    const userId = req.user?.userId || req.user?.id;

    // Resolve authorId (ObjectId). For anonymous, create/find a persistent anonymous user.
    let authorId;
    if (!userId || userId === 'anonymous-user' || req.user?.isAnonymous) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    } else {
      const user = await User.findById(userId).select('_id');
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid user' });
      }
      authorId = user._id;
    }

    // Extract mentions from content and validate privacy settings
    const mentionRegex = /@(\w+)/g;
    const mentionUsernames = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentionUsernames.push(match[1]);
    }

    // Validate mentions privacy settings if any mentions found
    if (mentionUsernames.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentionUsernames }
      }).select('settings.privacy.allowMentions username displayName');

      const usersWhoDisallowMentions = mentionedUsers.filter(
        u => !u.settings?.privacy?.allowMentions
      );

      if (usersWhoDisallowMentions.length > 0) {
        const disallowedNames = usersWhoDisallowMentions
          .map(u => u.displayName || u.username)
          .join(', ');

        return res.status(403).json({
          success: false,
          error: `The following users have disabled mentions: ${disallowedNames}`,
        });
      }
    }

    // Create new comment
    const newComment = new Comment({
      post: postId,
      author: authorId,
      content: content.trim(),
      parent: parentId,
    });

    // Save comment to MongoDB
    await newComment.save();

    // Populate author data for response
    await newComment.populate('author', 'username displayName avatar isVerified');

    console.log(`Comment created successfully: ${newComment._id}`);

    // Create notification for post author (if it's not the author themselves) using NotificationService
    try {
      const post = await Post.findById(postId).populate('author', 'username displayName');
      if (post && post.author && post.author._id.toString() !== authorId.toString()) { // Fixed: null-safe access
        await NotificationService.createCommentNotification(
          authorId.toString(),
          post.author._id.toString(),
          postId,
          content.trim()
        );
      }
    } catch (notificationError) {
      console.error('Error creating comment notification:', notificationError);
    }

    // Compute latest comment count for this post
    const commentCount = await Comment.countDocuments({ post: postId, isActive: true });

    // Broadcast the new comment to the specific post room only (avoid duplicates)
    if (global.broadcastToPost) {
      global.broadcastToPost(postId, 'new-comment', {
        comment: {
          ...newComment.toObject(),
          id: newComment._id,
          postId: newComment.post,
          authorId: newComment.author?._id, // Fixed: null-safe access
        },
        postId,
        commentCount,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...newComment.toObject(),
        id: newComment._id,
        postId: newComment.post,
        authorId: newComment.author._id,
        isLiked: false,
        likes: 0,
        commentCount,
      },
      message: 'Comment created successfully',
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      message: error.message,
    });
  }
});

// @route   POST /api/comments/:commentId/like
// @desc    Like a comment
// @access  Private (strict)
router.post('/:commentId/like', authenticateTokenStrict, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/comments/${commentId}/like - User: ${userId}`);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Add like if not already liked
    await comment.addLike(userId);

    // Broadcast like update to all connected clients
    if (global.broadcastToAll) {
      global.broadcastToAll('comment-updated', {
        commentId,
        likes: comment.likeCount,
        isLiked: true,
        action: 'like'
      });
    }

    res.json({
      success: true,
      data: {
        likes: comment.likeCount,
        isLiked: true
      },
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment',
      message: error.message,
    });
  }
});

// @route   DELETE /api/comments/:commentId/like
// @desc    Unlike a comment
// @access  Private (strict)
router.delete('/:commentId/like', authenticateTokenStrict, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`DELETE /api/comments/${commentId}/like - User: ${userId}`);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Remove like
    await comment.removeLike(userId);

    // Broadcast unlike update to all connected clients
    if (global.broadcastToAll) {
      global.broadcastToAll('comment-updated', {
        commentId,
        likes: comment.likeCount,
        isLiked: false,
        action: 'unlike'
      });
    }

    res.json({
      success: true,
      data: {
        likes: comment.likeCount,
        isLiked: false
      },
    });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike comment',
      message: error.message,
    });
  }
});

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private (strict)
router.delete('/:commentId', authenticateTokenStrict, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`DELETE /api/comments/${commentId} - User: ${userId}`);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    const comment = await Comment.findById(commentId).populate('author', '_id');
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user is the author of the comment
    if (comment.author._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments',
      });
    }

    // Mark comment as inactive instead of deleting
    comment.isActive = false;
    await comment.save();

    // Also mark replies as inactive
    await Comment.updateMany(
      { parent: commentId },
      { isActive: false }
    );

    console.log(`Comment deleted: ${commentId}`);

    // Broadcast comment deletion to all connected clients
    if (global.broadcastToAll) {
      global.broadcastToAll('comment-deleted', {
        commentId,
        postId: comment.post,
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
      message: error.message,
    });
  }
});

// @route   PUT /api/comments/:commentId
// @desc    Edit a comment
// @access  Private (strict)
router.put('/:commentId', authenticateTokenStrict, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`PUT /api/comments/${commentId} - User: ${userId}`);
    console.log('Request body:', req.body);
    console.log('Content received:', content);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    const comment = await Comment.findById(commentId).populate('author', '_id');
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user is the author of the comment
    if (comment.author._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments',
      });
    }

    // Store edit history
    if (!comment.editHistory) {
      comment.editHistory = [];
    }
    comment.editHistory.push({
      content: comment.content,
      editedAt: new Date(),
    });

    // Update comment
    comment.content = content.trim();
    comment.isEdited = true;
    comment.updatedAt = new Date();
    await comment.save();

    console.log(`Comment edited: ${commentId}`);

    // Broadcast comment update to all connected clients
    if (global.broadcastToAll) {
      global.broadcastToAll('comment-updated', {
        commentId,
        content: comment.content,
        isEdited: true,
        updatedAt: comment.updatedAt,
        action: 'edit'
      });
    }

    res.json({
      success: true,
      data: {
        id: comment._id,
        content: comment.content,
        isEdited: true,
        updatedAt: comment.updatedAt,
      },
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit comment',
      message: error.message,
    });
  }
});

// @route   POST /api/comments/:commentId/report
// @desc    Report a comment
// @access  Private
router.post('/:commentId/report', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/comments/${commentId}/report - User: ${userId}`);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    // Validation
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required',
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Check if user already reported this comment
    const existingReport = comment.reports?.find(
      report => report.reportedBy.toString() === userId.toString()
    );

    if (existingReport) {
      return res.status(400).json({
        success: false,
        error: 'You have already reported this comment',
      });
    }

    // Add report
    if (!comment.reports) {
      comment.reports = [];
    }

    comment.reports.push({
      reportedBy: userId,
      reason,
      description: description || '',
      reportedAt: new Date(),
    });

    await comment.save();

    console.log(`Comment reported: ${commentId} by ${userId}`);

    // TODO: Notify moderators if report count exceeds threshold
    if (comment.reports.length >= 5) {
      console.log(`Comment ${commentId} has ${comment.reports.length} reports - needs moderation`);
    }

    res.json({
      success: true,
      message: 'Comment reported successfully',
    });
  } catch (error) {
    console.error('Report comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report comment',
      message: error.message,
    });
  }
});

// @route   GET /api/comments/:commentId/thread
// @desc    Get comment thread (comment with all its replies)
// @access  Public
router.get('/:commentId/thread', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { maxDepth = 5 } = req.query;

    console.log(`GET /api/comments/${commentId}/thread`);

    // Validate commentId is a valid MongoDB ObjectId
    if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment ID format',
      });
    }

    const thread = await Comment.getCommentThread(commentId, { maxDepth: parseInt(maxDepth) });

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    // Get current user ID for isLiked field
    const currentUserId = req.user?.userId || req.user?.id;

    // Add isLiked field to the thread
    const addIsLikedField = (comment) => {
      const likesArray = Array.isArray(comment.likes) ? comment.likes : [];
      const likesCount = likesArray.length;
      const isLiked = currentUserId ? likesArray.some(like => like.user?.toString() === currentUserId.toString()) : false;

      const result = {
        ...comment,
        id: comment._id,
        likes: likesCount,
        isLiked
      };

      if (comment.replies && comment.replies.length > 0) {
        result.replies = comment.replies.map(reply => addIsLikedField(reply));
      }

      return result;
    };

    const threadWithLikes = addIsLikedField(thread);

    res.json({
      success: true,
      data: { thread: threadWithLikes },
    });
  } catch (error) {
    console.error('Get comment thread error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comment thread',
      message: error.message,
    });
  }
});



module.exports = router;
