import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Rating, 
  Box, 
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import { api } from '@/lib/api';
import useMarketplace from '@/hooks/useMarketplace';

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  productId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for creating a new review (some fields may be empty)
interface NewReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  productId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewEditModalProps {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  onReviewUpdated: (updatedReview: Review) => void;
}

const ReviewEditModal: React.FC<ReviewEditModalProps> = ({ 
  open, 
  onClose, 
  review, 
  onReviewUpdated 
}) => {
  const theme = useTheme();
  const { addProductReview, loading: marketplaceLoading } = useMarketplace();
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (review) {
      // If this is a newly created review (combined title and comment), parse it
      if (!review.id && review.comment && review.comment.includes('\n\n')) {
        const parts = review.comment.split('\n\n');
        setRating(review.rating);
        setTitle(parts[0] || '');
        setComment(parts.slice(1).join('\n\n') || '');
      } else {
        // Otherwise, set as is
        setRating(review.rating);
        setTitle(review.title || '');
        setComment(review.comment || '');
      }
    } else {
      // Reset form when no review is provided
      setRating(0);
      setTitle('');
      setComment('');
    }
  }, [review]);

  const handleSubmit = async () => {
    if (!review) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let response: any;
      
      // Check if this is a new review (no ID) or an existing one
      if (!review.id) {
        // Create new review - use the hook
        response = await addProductReview(review.productId, {
          rating: rating || 0,
          title: title.trim(),
          comment: comment.trim()
        });
      } else {
        // Update existing review - call API directly
        const reviewData = {
          rating: rating || 0,
          title: title.trim(),
          comment: comment.trim()
        };
        response = await api.marketplace.updateProductReview(review.id, reviewData);
      }
      
      if (response) {
        onReviewUpdated(response);
        handleClose();
      } else {
        throw new Error(`Failed to ${review.id ? 'update' : 'create'} review`);
      }
    } catch (err: any) {
      console.error(`Error ${review.id ? 'updating' : 'creating'} review:`, err);
      setError(err.message || `Failed to ${review.id ? 'update' : 'create'} review`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setTitle('');
    setComment('');
    setError(null);
    onClose();
  };

  // Determine if this is for creating a new review or editing an existing one
  const isCreating = !review?.id;
  const titleText = isCreating ? 'Write a Review' : 'Edit Your Review';
  const buttonText = isCreating ? (loading ? 'Submitting...' : 'Submit Review') : (loading ? 'Updating...' : 'Update Review');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={600} component="div">
          {titleText}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
            Rating
          </Typography>
          <Rating
            value={rating}
            onChange={(event, newValue) => setRating(newValue || 0)}
            size="large"
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            margin="normal"
          />
        </Box>
        
        <Box>
          <TextField
            fullWidth
            label="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            variant="outlined"
            multiline
            rows={4}
            margin="normal"
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !title.trim() || rating === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewEditModal;