// Add these endpoints after the POST /reviews/:productId endpoint and before the GET /vendors/:vendorId/products endpoint

// @route   GET /api/marketplace/products/:productId/reviews
// @desc    Get product reviews
// @access  Public
router.get('/products/:productId/reviews', asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 'Invalid product ID', 400);
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reviews with user information
    const reviews = await ProductReview.find({ productId })
      .populate('userId', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Transform reviews for frontend compatibility
    const transformedReviews = reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      userId: review.userId._id,
      username: review.userId.username,
      userDisplayName: review.userId.displayName,
      userAvatar: review.userId.avatar,
      isVerifiedPurchase: true, // All reviews are from purchasers
      helpfulVotes: review.helpfulVotes || 0,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      productId: review.productId
    }));

    sendSuccess(res, {
      reviews: transformedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await ProductReview.countDocuments({ productId })
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    sendError(res, 'Failed to fetch product reviews');
  }
}));

// @route   GET /api/marketplace/products/:productId/reviews/stats
// @desc    Get product review statistics
// @access  Public
router.get('/products/:productId/reviews/stats', asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 'Invalid product ID', 400);
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Get all reviews for this product
    const reviews = await ProductReview.find({ productId });

    if (reviews.length === 0) {
      return sendSuccess(res, {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      });
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = sumRatings / totalReviews;

    // Calculate rating distribution
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    sendSuccess(res, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews,
      ratingDistribution
    });
  } catch (error) {
    console.error('Get product review stats error:', error);
    sendError(res, 'Failed to fetch product review statistics');
  }
}));

// @route   POST /api/marketplace/reviews/:reviewId/helpful
// @desc    Mark a review as helpful
// @access  Private
router.post('/reviews/:reviewId/helpful', authenticateTokenStrict, asyncHandler(async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return sendError(res, 'Invalid review ID', 400);
    }

    // Find the review
    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    // Check if user has already marked this review as helpful
    if (review.helpfulBy && review.helpfulBy.includes(userId)) {
      return sendError(res, 'You have already marked this review as helpful', 400);
    }

    // Add user to helpfulBy array or create it if it doesn't exist
    if (!review.helpfulBy) {
      review.helpfulBy = [];
    }
    review.helpfulBy.push(userId);
    review.helpfulVotes = (review.helpfulVotes || 0) + 1;
    
    await review.save();

    sendSuccess(res, {
      helpfulVotes: review.helpfulVotes
    }, 'Review marked as helpful');
  } catch (error) {
    console.error('Mark review helpful error:', error);
    sendError(res, 'Failed to mark review as helpful');
  }
}));

// @route   DELETE /api/marketplace/reviews/:reviewId
// @desc    Delete a product review
// @access  Private
router.delete('/reviews/:reviewId', authenticateTokenStrict, asyncHandler(async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return sendError(res, 'Invalid review ID', 400);
    }

    // Find the review
    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    // Check if user owns this review or is admin
    if (review.userId.toString() !== userId) {
      // Check if user is admin
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        return sendError(res, 'Not authorized to delete this review', 403);
      }
    }

    // Delete the review
    await ProductReview.findByIdAndDelete(reviewId);

    // Update product rating
    const productId = review.productId;
    const reviews = await ProductReview.find({ productId });
    
    if (reviews.length === 0) {
      // No reviews left, reset product rating
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0
      });
    } else {
      // Recalculate average rating
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Product.findByIdAndUpdate(productId, {
        rating: averageRating,
        reviewCount: reviews.length
      });
    }

    sendSuccess(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    sendError(res, 'Failed to delete review');
  }
}));