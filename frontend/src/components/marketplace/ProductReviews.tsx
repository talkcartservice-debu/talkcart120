import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Rating, 
  Avatar, 
  Chip, 
  Button,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import { Star, ThumbsUp, Edit, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import ReviewEditModal from '@/components/marketplace/ReviewEditModal';

// Interface for reviews fetched from API
interface ApiReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userAvatar: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  createdAt: string;
  updatedAt: string;
  productId: string;
}

// Interface for ReviewEditModal (same as in ReviewEditModal.tsx)
interface EditableReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  productId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductReviewsProps {
  productId: string;
  userId?: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, userId }) => {
  const theme = useTheme();
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EditableReview | null>(null);
  const [helpfulLoading, setHelpfulLoading] = useState<string | null>(null);

  useEffect(() => {
    console.log('ProductReviews: useEffect called with productId:', productId);
    fetchReviews();
    fetchReviewStats();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      console.log('ProductReviews: fetchReviews called');
      setLoading(true);
      const response: any = await api.marketplace.getProductReviews(productId, 1, 100);
      console.log('ProductReviews: getProductReviews response:', response);
      if (response?.success && response?.data?.reviews) {
        console.log('ProductReviews: Setting reviews from response.data.reviews:', response.data.reviews);
        setReviews(response.data.reviews);
      } else {
        console.log('ProductReviews: No reviews found or unexpected response format');
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      console.log('ProductReviews: fetchReviewStats called');
      const response: any = await api.marketplace.getProductReviewStats(productId);
      console.log('ProductReviews: getProductReviewStats response:', response);
      if (response?.success && response?.data) {
        console.log('ProductReviews: Setting stats from response.data:', response.data);
        setStats(response.data);
      } else {
        console.log('ProductReviews: No stats found or unexpected response format');
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      setHelpfulLoading(reviewId);
      const response: any = await api.marketplace.markReviewHelpful(reviewId);
      if (response?.success) {
        // Update the review's helpful votes count
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpfulVotes: response.data.helpfulVotes } 
            : review
        ));
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    } finally {
      setHelpfulLoading(reviewId);
    }
  };

  const handleEditReview = (review: ApiReview) => {
    // Convert ApiReview to EditableReview
    const editableReview: EditableReview = {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      productId: review.productId,
      userId: review.userId,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
    setSelectedReview(editableReview);
    setOpenEditModal(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const response: any = await api.marketplace.deleteProductReview(reviewId);
      if (response?.success) {
        setReviews(prev => prev.filter(review => review.id !== reviewId));
        fetchReviewStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleReviewUpdated = (updatedReview: EditableReview) => {
    // Convert back to ApiReview format for display
    const apiReview: ApiReview = {
      ...updatedReview,
      username: '', // These will be updated when we refresh the data
      userDisplayName: '',
      userAvatar: '',
      isVerifiedPurchase: false,
      helpfulVotes: 0
    } as ApiReview;
    
    // In a real app, we would update the local state or refetch
    fetchReviews(); // Refresh all reviews to get updated data
  };

  // Function to parse combined title and comment for newly created reviews
  const parseReviewContent = (review: ApiReview) => {
    // If this is a newly created review (combined title and comment), parse it
    if (review.title === '' && review.comment.includes('\n\n')) {
      const parts = review.comment.split('\n\n');
      return {
        title: parts[0],
        comment: parts.slice(1).join('\n\n')
      };
    }
    // Otherwise, return as is
    return {
      title: review.title,
      comment: review.comment
    };
  };

  if (loading) {
    console.log('ProductReviews: Loading, showing spinner');
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('ProductReviews: Rendering reviews', reviews);
  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={600} mb={2}>
          Customer Reviews
        </Typography>
        
        {stats && (
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h4" fontWeight={700}>
                {stats.averageRating.toFixed(1)}
              </Typography>
              <Star fill={theme.palette.warning.main} color={theme.palette.warning.main} size={24} />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Based on {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </Typography>
          </Box>
        )}
        
        {stats?.ratingDistribution && (
          <Box>
            {[5, 4, 3, 2, 1].map(rating => (
              <Box key={rating} display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="body2" width={20}>
                  {rating}
                </Typography>
                <Star fill={theme.palette.warning.main} color={theme.palette.warning.main} size={16} />
                <Box 
                  sx={{ 
                    flexGrow: 1, 
                    height: 8, 
                    backgroundColor: theme.palette.grey[200],
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      height: '100%', 
                      backgroundColor: theme.palette.warning.main,
                      width: `${(stats.ratingDistribution[rating] / stats.totalReviews) * 100}%`
                    }}
                  />
                </Box>
                <Typography variant="body2" width={30} textAlign="right">
                  {stats.ratingDistribution[rating]}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {reviews.length === 0 ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          No reviews yet. Be the first to review this product!
        </Typography>
      ) : (
        <Box>
          {reviews.map(review => {
            // Parse the review content to handle both old and new formats
            const { title, comment } = parseReviewContent(review);
            
            return (
              <Box key={review.id} mb={3} pb={3} borderBottom={`1px solid ${theme.palette.divider}`}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar 
                      src={review.userAvatar} 
                      alt={review.userDisplayName || review.username}
                      sx={{ width: 32, height: 32 }}
                    />
                    <Box>
                      <Typography variant="subtitle2">
                        {review.userDisplayName || review.username}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={review.rating} readOnly size="small" />
                        {review.isVerifiedPurchase && (
                          <Chip 
                            label="Verified Purchase" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  {title}
                </Typography>
                
                <Typography variant="body2" mb={2}>
                  {comment}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    size="small"
                    startIcon={<ThumbsUp size={16} />}
                    onClick={() => handleMarkHelpful(review.id)}
                    disabled={helpfulLoading === review.id}
                  >
                    {helpfulLoading === review.id ? (
                      <CircularProgress size={16} />
                    ) : (
                      `Helpful (${review.helpfulVotes})`
                    )}
                  </Button>
                  
                  {userId === review.userId && (
                    <>
                      <Button
                        size="small"
                        startIcon={<Edit size={16} />}
                        onClick={() => handleEditReview(review)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteReview(review.id)}
                        color="error"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      
      <ReviewEditModal
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        review={selectedReview}
        onReviewUpdated={handleReviewUpdated}
      />
    </Box>
  );
};

export default ProductReviews;