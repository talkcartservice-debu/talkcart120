import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  SelectChangeEvent,
  Divider,
} from '@mui/material';
import { X, ImageIcon, Video, Type, Hash, AtSign, Music, Play, Globe2, UserCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Post } from '@/types/social';
import { validateMediaFile } from '@/utils/mediaValidation';
import VendorProductPostCreator from '@/components/ads/VendorProductPostCreator';

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  onPostCreated?: (post: Post) => void;
  linkPostId?: string; // If provided, we're linking products to an existing post
}

export const CreatePostDialog: React.FC<CreatePostDialogProps> = ({
  open,
  onClose,
  onPostCreated,
  linkPostId,
}) => {
  const theme = useTheme();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detectedHashtags, setDetectedHashtags] = useState<string[]>([]);
  const [detectedMentions, setDetectedMentions] = useState<string[]>([]);
  const [postResponseForProductPost, setPostResponseForProductPost] = useState<any>(null);
  const [isCreatingProductPost, setIsCreatingProductPost] = useState(false);
  const [linkingExistingPost, setLinkingExistingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }
    
    setSubmitting(true);
    try {
      // Collect media if selected
      let mediaArray: any[] = [];
      
      // Upload media if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResponse = await api.media.upload(selectedFile, 'post');
        console.log('Media upload response:', uploadResponse);
        if (!uploadResponse?.success || !uploadResponse?.data) {
          throw new Error('Failed to upload media');
        }
        const uploaded = uploadResponse.data;
        
        // Ensure proper media structure with all required fields
        mediaArray = [
          {
            public_id: uploaded.public_id,
            secure_url: uploaded.secure_url || uploaded.url,
            url: uploaded.url || uploaded.secure_url,
            resource_type: uploaded.resource_type || (selectedFile.type.startsWith('image/') ? 'image' : 'video'),
            format: uploaded.format || selectedFile.type.split('/')[1],
            width: uploaded.width,
            height: uploaded.height,
            bytes: uploaded.bytes || selectedFile.size,
            duration: uploaded.duration,
            created_at: uploaded.created_at || new Date().toISOString(),
          },
        ];
        setUploading(false);
      }
      
      // Create post data
      const postData = {
        content: content.trim(),
        type: postType,
        ...(mediaArray.length > 0 ? { media: mediaArray } : {}),
        privacy: privacy
      };
      
      console.log('Creating post with data:', postData);
      
      // Create the post
      const response = await api.posts.create(postData) as any;
      
      console.log('Post creation response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      // Extract post data from response - simplified and more reliable approach
      let postResponse = null;
      
      console.log('Raw response:', response);
      
      // Handle the expected backend response structure
      if (response?.success && response?.data?.post) {
        postResponse = response.data.post;
        console.log('Found post in response.data.post:', postResponse);
      } 
      // Handle case where response.data is the post directly
      else if (response?.success && response?.data && !response?.data?.posts) {
        // Make sure it's not a posts feed response
        postResponse = response.data;
        console.log('Found post in response.data:', postResponse);
      }
      // Handle direct post object in response
      else if (response?.post) {
        postResponse = response.post;
        console.log('Found post in response.post:', postResponse);
      }
      // Handle response as post object directly
      else if (response && (response.content || response.type || response.media)) {
        postResponse = response;
        console.log('Found post properties directly in response:', postResponse);
      }
      // Handle case where response is the post directly (new structure)
      else if (response?.success && !response?.posts) {
        // If it's a success response but not a posts list, treat the response as the post
        postResponse = response.data || response;
        console.log('Found post in response.data or response:', postResponse);
      }
      // Handle the specific error case mentioned: {success: true, posts: Array(0), count: 0, pagination: {…}, feedType: 'for-you'}
      else if (response?.success && response?.posts && Array.isArray(response.posts)) {
        // This looks like a posts feed response, not a single post creation response
        // This indicates the backend is returning the wrong response type
        console.error('Invalid post response structure - received posts feed instead of single post:', response);
        throw new Error('Backend returned incorrect response format for post creation');
      }
      
      // Additional check for post structure - ensure it has required fields
      if (postResponse && !postResponse.id && postResponse._id) {
        postResponse.id = postResponse._id;
      }
      
      console.log('Extracted post response:', postResponse);
      
      // Validate that we have a proper post response
      // More flexible validation - check for common post properties
      const hasPostProperties = postResponse && (
        postResponse._id || 
        postResponse.id || 
        postResponse.content !== undefined || 
        postResponse.type || 
        postResponse.media ||
        postResponse.author ||
        postResponse.createdAt
      );
      
      console.log('Has post properties:', hasPostProperties);
      
      if (!postResponse || !hasPostProperties) {
        console.error('Invalid post response structure:', response);
        // Try to extract post from response if it's a complex object
        if (response?.data?.post) {
          // Handle the standard backend response structure
          postResponse = response.data.post;
        } else if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data) && !response.data?.posts) {
          // Handle direct data object that's not a posts feed
          postResponse = response.data;
        } else if (response?.data && !response?.data?.posts) {
          postResponse = response?.data;
        } else {
          postResponse = response;
        }
      }
      
      // Ensure post has proper media structure
      if (postResponse && postResponse.media) {
        // Normalize media array
        if (Array.isArray(postResponse.media)) {
          postResponse.media = postResponse.media.map((mediaItem: any) => {
            // Handle string URLs
            if (typeof mediaItem === 'string') {
              console.log('Media item is string, converting to object');
              return {
                url: mediaItem,
                secure_url: mediaItem,
                resource_type: mediaItem.match(/\.(mp4|mov|webm|ogg|avi)$/i) ? 'video' : 'image',
                id: mediaItem
              };
            }
            
            // Ensure proper media structure
            const processedMediaItem = {
              ...mediaItem,
              id: mediaItem.id || mediaItem._id || mediaItem.public_id || mediaItem.url || mediaItem.secure_url,
              secure_url: mediaItem.secure_url || mediaItem.url,
              resource_type: mediaItem.resource_type || (mediaItem.url || mediaItem.secure_url)?.match(/\.(mp4|mov|webm|ogg|avi)$/i) ? 'video' : 'image',
              url: mediaItem.url || mediaItem.secure_url,
            };
            
            console.log('Processed media item in CreatePostDialog:', processedMediaItem);
            return processedMediaItem;
          });
        } else {
          // If media is not an array, convert it to an array
          console.log('Media is not an array, converting to array');
          postResponse.media = [postResponse.media];
        }
      }
      
      // Check if we have a successful response
      console.log('Post creation successful, postResponse:', postResponse);
      if (response?.success || postResponse) {
        toast.success('Post created successfully!');
        
        // Ensure post has proper structure before dispatching
        const normalizedPost = {
          ...postResponse,
          id: postResponse.id || postResponse._id,
          _id: postResponse._id || postResponse.id,
          // Ensure media has proper structure
          media: Array.isArray(postResponse.media) ? postResponse.media : (postResponse.media ? [postResponse.media] : []),
          // Ensure author is properly structured
          author: postResponse.author || {
            id: postResponse.authorId || (response.data?.post?.authorId || response.data?.post?.author?._id || response.data?.post?.author?.id),
            username: response.data?.post?.author?.username || 'Unknown User',
            displayName: response.data?.post?.author?.displayName || response.data?.post?.author?.username || 'Unknown User',
            avatar: response.data?.post?.author?.avatar,
          },
          // Ensure counts are properly set
          likeCount: postResponse.likeCount || 0,
          commentCount: postResponse.commentCount || 0,
          shareCount: postResponse.shareCount || 0,
          bookmarkCount: postResponse.bookmarkCount || 0,
          // Ensure timestamps are properly set
          createdAt: postResponse.createdAt || new Date().toISOString(),
          updatedAt: postResponse.updatedAt || new Date().toISOString(),
          // Ensure privacy and other fields
          privacy: postResponse.privacy || 'public',
          type: postResponse.type || postType,
          isLiked: postResponse.isLiked || false,
          isBookmarked: postResponse.isBookmarked || false,
          isShared: postResponse.isShared || false,
        };
        
        // Emit socket event for real-time updates
        if (typeof window !== 'undefined') {
          // Emit socket event for real-time updates if available
          if ((window as any).socket) {
            console.log('Emitting socket event with post:', postResponse);
            (window as any).socket.emit('post:create', {
              post: postResponse
            });
          }
          
          // Dispatch a custom event that feeds can listen to, to prepend the post immediately
          try {
            console.log('Dispatching posts:new event with normalized post:', normalizedPost);
            const event = new CustomEvent('posts:new', { detail: { post: normalizedPost } });
            window.dispatchEvent(event);
          } catch (e) {
            console.error('Error dispatching posts:new event:', e);
            // Ignore if CustomEvent is not supported
          }
        }
        // Also trigger a feed refresh to ensure the post appears
        try {
          console.log('Dispatching posts:refresh event');
          const refreshEvent = new CustomEvent('posts:refresh', { detail: { feedType: 'for-you' } });
          window.dispatchEvent(refreshEvent);
        } catch (e) {
          console.error('Error dispatching posts:refresh event:', e);
          // Ignore if CustomEvent is not supported
        }
        
        // Update the component state to show the option to make the post shoppable
        setIsCreatingProductPost(true);
        
        // Don't close the dialog yet, allow user to create a product post
        setPostResponseForProductPost(normalizedPost);
        onPostCreated?.(postResponse);
      } else {
        throw new Error(response?.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      
      // Handle timeout errors specifically
      if (error.message && error.message.includes('timeout')) {
        toast.error('Request timed out. Please check your internet connection and try again.');
      } else if (error.message && error.message.includes('Network Error')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        toast.error(error.message || 'Failed to create post. Please try again.');
      }
    } finally {
      if (!isCreatingProductPost) {
        // Only set to false if we haven't already set up for product post creation
        setSubmitting(false);
        setUploading(false);
      }
    }
  };

  const handleFileSelect = (type: 'image' | 'video') => {
    setPostType(type);
    if (fileInputRef.current) {
      // Reset the file input to allow selecting the same file again
      fileInputRef.current.value = '';
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file using our utility
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        toast.error(`${validation.error} - ${validation.details || ''}`);
        return;
      }
      
      setSelectedFile(file);
      // Auto-detect post type based on file
      if (file.type.startsWith('image/')) {
        setPostType('image');
      } else if (file.type.startsWith('video/')) {
        setPostType('video');
      }
    }
  };

  // Handle when linkPostId is provided
  useEffect(() => {
    if (linkPostId && open) {
      // We're linking an existing post to products, so show the product post creator
      setLinkingExistingPost(true);
      setIsCreatingProductPost(true);
      
      // Set the post ID in state to be used by the VendorProductPostCreator
      setPostResponseForProductPost({ id: linkPostId });
    }
  }, [linkPostId, open]);

  const resetForm = () => {
    setContent('');
    setSelectedFile(null);
    setPostType('text');
    setPrivacy('public');
    setDetectedHashtags([]);
    setDetectedMentions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Update hashtags and mentions when content changes
  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Detect hashtags
    const hashtagMatches = value.match(/#(\w+)/g) || [];
    setDetectedHashtags(hashtagMatches);
    
    // Detect mentions
    const mentionMatches = value.match(/@(\w+)/g) || [];
    setDetectedMentions(mentionMatches);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEnforceFocus  // Prevents focus trapping issues
      hideBackdrop={false}  // Ensure backdrop is properly handled
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>Create Post</Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ minHeight: 400, py: 2 }}>
        {/* Preview area for media */}
        <Box sx={{ 
          mb: 2, 
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
          position: 'relative'
        }}>
          {selectedFile ? (
            <>
              {postType === 'image' ? (
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    borderRadius: 8,
                    objectFit: 'contain'
                  }} 
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Play size={48} color={theme.palette.primary.main} />
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(selectedFile.size / 1024)} KB
                  </Typography>
                </Box>
              )}
              <IconButton 
                size="small"
                onClick={() => setSelectedFile(null)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'background.paper'
                  }
                }}
              >
                <X size={16} />
              </IconButton>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No media selected
            </Typography>
          )}
        </Box>
        
        {/* Media selection buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImageIcon size={18} />}
            onClick={() => handleFileSelect('image')}
            sx={{ flex: 1 }}
          >
            Image
          </Button>
          <Button
            variant="outlined"
            startIcon={<Video size={18} />}
            onClick={() => handleFileSelect('video')}
            sx={{ flex: 1 }}
          >
            Video
          </Button>
        </Box>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {/* Content text field */}
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="What&apos;s happening?"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
        />
        
        {/* Detected hashtags and mentions */}
        {(detectedHashtags.length > 0 || detectedMentions.length > 0) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {detectedHashtags.map((hashtag, index) => (
              <Chip
                key={index}
                label={hashtag}
                size="small"
                icon={<Hash size={14} />}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }}
              />
            ))}
            {detectedMentions.map((mention, index) => (
              <Chip
                key={index}
                label={mention}
                size="small"
                icon={<AtSign size={14} />}
                sx={{ 
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: 'secondary.main'
                }}
              />
            ))}
          </Box>
        )}
        
        {/* Privacy selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Privacy</InputLabel>
          <Select
            value={privacy}
            label="Privacy"
            onChange={(e) => setPrivacy(e.target.value as any)}
          >
            <MenuItem value="public">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Globe2 size={16} />
                <span>Public</span>
              </Box>
            </MenuItem>
            <MenuItem value="followers">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UserCheck size={16} />
                <span>Followers</span>
              </Box>
            </MenuItem>
            <MenuItem value="private">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lock size={16} />
                <span>Private</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        {(postResponseForProductPost && !submitting && !uploading) || linkingExistingPost ? (
          // After post is created or when linking existing post, show option to make it shoppable
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={() => {
                // If we're linking an existing post, close the dialog
                if (linkingExistingPost) {
                  setPostResponseForProductPost(null);
                  setIsCreatingProductPost(false);
                  setLinkingExistingPost(false);
                  onClose();
                } else {
                  // Otherwise go back to post creation
                  setPostResponseForProductPost(null);
                  setIsCreatingProductPost(false);
                }
              }}>
                Back
              </Button>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                <VendorProductPostCreator
                  postId={postResponseForProductPost?.id || postResponseForProductPost?._id || linkPostId}
                  onSuccess={() => {
                    toast.success('Product post created successfully!');
                    // Reset the form but don't close the dialog immediately
                    // The dialog will be closed by the parent component
                    setPostResponseForProductPost(null);
                    setIsCreatingProductPost(false);
                    setLinkingExistingPost(false);
                    // Reset the form to allow creating another post if needed
                    resetForm();
                    // Close the dialog after a short delay
                    setTimeout(() => {
                      onClose();
                    }, 500);
                  }}
                />
              </Box>
            </Box>
          </Box>
        ) : (
          // Initial state - create post
          <>
            <Button onClick={handleClose} disabled={submitting || uploading}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={submitting || uploading || !content.trim()}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};