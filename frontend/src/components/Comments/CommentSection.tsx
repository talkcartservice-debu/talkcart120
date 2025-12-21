import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Tooltip,
  Badge,
  Paper,
} from '@mui/material';
import {
  MessageCircle,
  Send,
  Heart,
  Reply,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Flag,
  SortAsc,
  SortDesc,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Smile,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/common/UserAvatar';
import FollowButton from '@/components/common/FollowButton';
import { formatTextWithMentions } from '@/utils/mentionUtils';
import useComments, { Comment } from '@/hooks/useComments';
import toast from 'react-hot-toast';
import EmojiPicker from '@/components/common/EmojiPicker';

interface CommentSectionProps {
  postId: string;
  initialCommentCount?: number;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  enableRealTime?: boolean;
  maxDepth?: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialCommentCount = 0,
  isExpanded = false,
  onToggle,
  enableRealTime = true,
  maxDepth = 3,
}) => {
  // Validate postId early as a Mongo ObjectId (24 hex chars) but don't return early (to maintain hook order)
  const isValidPostId = typeof postId === 'string' && /^[0-9a-fA-F]{24}$/.test(postId.trim());

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<HTMLElement | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'newComment' | 'reply' | null>(null);

  // Per-comment UI state for replies pagination/loading
  const REPLIES_PAGE_SIZE = 3;
  const [replyVisibleCount, setReplyVisibleCount] = useState<Record<string, number>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});

  // URL param helpers for reply visibility persistence (rv=query param)
  const parseRv = (rv: string): Record<string, number> => {
    const obj: Record<string, number> = {};
    try {
      rv.split(',').forEach((pair) => {
        const [id, countStr] = pair.split(':');
        if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
          const n = parseInt(countStr || '0', 10);
          if (Number.isFinite(n) && n > 0) obj[id] = n;
        }
      });
    } catch { }
    return obj;
  };

  const serializeRv = (map: Record<string, number>): string => {
    const entries = Object.entries(map)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([id, n]) => `${id}:${n}`).join(',');
  };

  // Initialize from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const rv = params.get('rv');
      if (rv) {
        const parsed = parseRv(rv);
        if (Object.keys(parsed).length > 0) {
          setReplyVisibleCount(parsed);
        }
      }
    } catch { }
  }, []);

  // Persist to URL when replyVisibleCount changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const serialized = serializeRv(replyVisibleCount);
      if (serialized) params.set('rv', serialized); else params.delete('rv');
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, '', newUrl);
    } catch { }
  }, [replyVisibleCount]);

  // Use the new comments hook
  const {
    comments,
    totalComments,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isCreating,
    isLiking,
    isDeleting,
    isEditing,
    isReporting,
    error,
    createComment,
    likeComment,
    deleteComment,
    editComment,
    reportComment,
    loadMoreComments,
    loadReplies,
    refetch,
    isConnected,
    realTimeEnabled,
  } = useComments({
    postId,
    enabled: isExpanded && isValidPostId,
    sortBy,
    realTimeUpdates: enableRealTime,
  });

  // Auto-retry on error once to handle transient network issues
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (error && retryCount < 1) {
      timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refetch();
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error, retryCount, refetch]);

  // Debug component mounting/unmounting (always call useEffect)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 CommentSection mounted/updated', {
        postId,
        isExpanded,
        isValidPostId,
        totalComments,
        realTimeEnabled,
        isConnected
      });
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 CommentSection cleanup', { postId });
      }
    };
  }, [postId, isExpanded, isValidPostId, totalComments, realTimeEnabled, isConnected]);

  // Event handlers
  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    // Check if comment is too long
    if (newComment.length > 1000) {
      toast.error('Comment is too long. Maximum 1000 characters allowed.');
      return;
    }
    
    createComment(newComment);
    setNewComment('');
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    
    // Check if reply is too long
    if (replyContent.length > 1000) {
      toast.error('Reply is too long. Maximum 1000 characters allowed.');
      return;
    }
    
    createComment(replyContent, parentId);
    setReplyContent('');
    setReplyingTo(null);
  };

  // Emoji handlers
  const handleEmojiClick = (event: React.MouseEvent<HTMLElement>, target: 'newComment' | 'reply') => {
    setEmojiPickerAnchor(event.currentTarget);
    setEmojiPickerTarget(target);
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (emojiPickerTarget === 'newComment') {
      setNewComment(prev => prev + emoji);
    } else if (emojiPickerTarget === 'reply') {
      setReplyContent(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
    setEmojiPickerAnchor(null);
    setEmojiPickerTarget(null);
  };

  const handleEmojiPickerClose = () => {
    setShowEmojiPicker(false);
    setEmojiPickerAnchor(null);
    setEmojiPickerTarget(null);
  };

  const handleToggleLike = (commentId: string, isLiked: boolean) => {
    likeComment(commentId, isLiked);
  };

  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded;
    onToggle?.(newExpanded);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, comment: Comment) => {
    setAnchorEl(event.currentTarget);
    setSelectedComment(comment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedComment(null);
  };

  const handleEditComment = () => {
    if (selectedComment) {
      setEditingComment(selectedComment.id);
      setEditContent(selectedComment.content);
      handleMenuClose();
    }
  };

  const handleSaveEdit = () => {
    if (editingComment && editContent.trim()) {
      // Check if edit content is too long
      if (editContent.length > 1000) {
        toast.error('Comment is too long. Maximum 1000 characters allowed.');
        return;
      }
      
      editComment(editingComment, editContent.trim());
      setEditingComment(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const handleDeleteComment = () => {
    if (selectedComment) {
      deleteComment(selectedComment.id);
      handleMenuClose();
    }
  };

  const handleReportComment = () => {
    setReportDialogOpen(true);
    handleMenuClose();
  };

  const handleSubmitReport = () => {
    if (selectedComment && reportReason) {
      reportComment(selectedComment.id, reportReason, reportDescription);
      setReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
      setSelectedComment(null);
    }
  };

  const handleSortChange = (newSortBy: 'newest' | 'oldest' | 'popular') => {
    setSortBy(newSortBy);
  };

  const renderComment = (comment: Comment, isReply = false, depth = 0) => (
    <Box key={comment.id} sx={{ mb: 1, ml: isReply ? 1 : 0, opacity: comment.id.startsWith('temp-') ? 0.7 : 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <UserAvatar
          src={comment.author.avatar}
          alt={comment.author.displayName}
          size="xsmall"
          isVerified={comment.author.isVerified}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <Typography variant="caption" fontWeight="bold">
              {comment.author.displayName}
            </Typography>
            {comment.author.isVerified && (
              <Chip
                label="Verified"
                size="small"
                color="primary"
                sx={{ height: 12, fontSize: '0.5rem' }}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
              @{comment.author.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
              •
            </Typography>
            <Tooltip title={comment.id.startsWith('temp-') ? 'Comment is being posted' : new Date(comment.createdAt).toLocaleString()}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                {comment.id.startsWith('temp-') ? 'Posting...' : formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </Typography>
            </Tooltip>
            {comment.isEdited && !comment.id.startsWith('temp-') && (
              <Tooltip title="This comment has been edited">
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.55rem' }}>
                  (edited)
                </Typography>
              </Tooltip>
            )}
          </Box>

          {editingComment === comment.id ? (
            <Box sx={{ mb: 0.5 }}>
              <TextField
                fullWidth
                multiline
                rows={1}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit your comment..."
                variant="outlined"
                size="small"
                disabled={isEditing}
                helperText={`${editContent.length}/1000`}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isEditing}
                  startIcon={isEditing ? <Loader2 className="animate-spin" size={12} /> : <Edit size={12} />}
                  sx={{ fontSize: '0.65rem', py: 0.25, px: 0.5 }}
                >
                  {isEditing ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={isEditing}
                  sx={{ fontSize: '0.65rem', py: 0.25, px: 0.5 }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
              {formatTextWithMentions(comment.content)}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={
              comment.id.startsWith('temp-') ? 'Comment is being posted...' :
                !isAuthenticated ? 'Please log in to like comments' : ''
            }>
              <span>
                <Button
                  size="small"
                  startIcon={
                    <Heart
                      size={12}
                      fill={comment.isLiked ? '#ef4444' : 'none'}
                      color={comment.isLiked ? '#ef4444' : 'currentColor'}
                    />
                  }
                  onClick={() => handleToggleLike(comment.id, comment.isLiked)}
                  disabled={isLiking || !isAuthenticated || comment.id.startsWith('temp-')}
                  sx={{
                    minWidth: 'auto',
                    color: comment.isLiked ? 'error.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: comment.isLiked ? 'error.light' : 'action.hover',
                    },
                    opacity: (!isAuthenticated || comment.id.startsWith('temp-')) ? 0.6 : 1,
                    fontSize: '0.65rem',
                    py: 0.25,
                    px: 0.5
                  }}
                >
                  {comment.likes > 0 && comment.likes}
                </Button>
              </span>
            </Tooltip>

            {depth < maxDepth && !comment.id.startsWith('temp-') && (
              <Button
                size="small"
                startIcon={<MessageCircle size={12} />}
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                sx={{ 
                  minWidth: 'auto', 
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  py: 0.25,
                  px: 0.5
                }}
              >
                Reply
              </Button>
            )}

            {user && (user.id === comment.author.id || user.role === 'admin') && !comment.id.startsWith('temp-') && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, comment)}
                sx={{ color: 'text.secondary', p: 0.25 }}
              >
                <MoreVertical size={12} />
              </IconButton>
            )}

            {user && user.id !== comment.author.id && !comment.id.startsWith('temp-') && (
              <Button
                size="small"
                startIcon={<Flag size={12} />}
                onClick={() => {
                  setSelectedComment(comment);
                  handleReportComment();
                }}
                sx={{ 
                  minWidth: 'auto', 
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  py: 0.25,
                  px: 0.5
                }}
              >
                Report
              </Button>
            )}
          </Box>

          {replyingTo === comment.id && (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={1}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author.displayName}...`}
                variant="outlined"
                size="small"
                disabled={isCreating}
                helperText={`${replyContent.length}/1000`}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={(e) => handleEmojiClick(e, 'reply')}
                      disabled={isCreating}
                      sx={{ p: 0.25 }}
                    >
                      <Smile size={12} />
                    </IconButton>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyContent.trim() || isCreating}
                  startIcon={isCreating ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                  sx={{ fontSize: '0.65rem', py: 0.25, px: 0.5 }}
                >
                  {isCreating ? 'Posting...' : 'Reply'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  disabled={isCreating}
                  sx={{ fontSize: '0.65rem', py: 0.25, px: 0.5 }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
            <Box sx={{ mt: 1 }}>
              {(comment.replies || [])
                .slice(0, replyVisibleCount[comment.id] || REPLIES_PAGE_SIZE)
                .map((reply) => renderComment(reply, true, depth + 1))}
            </Box>
          )}

          {/* Load more replies / indicator */}
          {depth < maxDepth && (
            <Box sx={{ mt: 0.5 }}>
              {replyLoading[comment.id] && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
                  <Loader2 className="animate-spin" size={12} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    Loading replies…
                  </Typography>
                </Box>
              )}

              {(() => {
                const visible = replyVisibleCount[comment.id] || REPLIES_PAGE_SIZE;
                const totalLoaded = comment.replies?.length || 0;
                const totalAvailable = comment.replyCount || totalLoaded;
                const canShowMoreLoaded = totalLoaded > visible;
                const canFetchMore = totalAvailable > totalLoaded;

                if (canShowMoreLoaded) {
                  return (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ 
                        color: 'primary.main',
                        fontSize: '0.65rem',
                        py: 0.25,
                        px: 0.5
                      }}
                      onClick={() => {
                        setReplyVisibleCount((prev) => ({
                          ...prev,
                          [comment.id]: (prev[comment.id] || REPLIES_PAGE_SIZE) + REPLIES_PAGE_SIZE,
                        }));
                      }}
                    >
                      Show more replies
                    </Button>
                  );
                }

                if (canFetchMore) {
                  return (
                    <Button
                      size="small"
                      variant="text"
                      sx={{ 
                        color: 'primary.main',
                        fontSize: '0.65rem',
                        py: 0.25,
                        px: 0.5
                      }}
                      disabled={!!replyLoading[comment.id]}
                      onClick={async () => {
                        try {
                          setReplyLoading((prev) => ({ ...prev, [comment.id]: true }));
                          await loadReplies(comment.id, maxDepth - depth);
                          // After loading, extend visible window to reveal new ones
                          setReplyVisibleCount((prev) => ({
                            ...prev,
                            [comment.id]: (prev[comment.id] || REPLIES_PAGE_SIZE) + REPLIES_PAGE_SIZE,
                          }));
                        } catch (e) {
                          toast.error('Failed to load replies');
                        } finally {
                          setReplyLoading((prev) => ({ ...prev, [comment.id]: false }));
                        }
                      }}
                    >
                      Load more replies
                    </Button>
                  );
                }

                return null;
              })()}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  // Show error if postId is invalid
  if (!isValidPostId) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ py: 1, px: 1.5 }}>
            Invalid post ID. Cannot load comments.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ boxShadow: 'none', border: 'none' }}>
      <CardContent sx={{ p: 1 }}>
        {/* Comments Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
          sx={{ cursor: 'pointer' }}
          onClick={handleToggleExpanded}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <MessageCircle size={16} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
              Comments ({totalComments || initialCommentCount})
            </Typography>
            {realTimeEnabled && isConnected && (
              <Tooltip title="Real-time updates enabled">
                <Badge color="success" variant="dot" sx={{ '& .MuiBadge-badge': { width: 6, height: 6 } }}>
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.6rem' }}>
                    Live
                  </Typography>
                </Badge>
              </Tooltip>
            )}
          </Box>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </Box>

        <Collapse in={isExpanded}>
          {/* Sort Options */}
          {isExpanded && comments.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Sort by:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['newest', 'oldest', 'popular'] as const).map((option) => (
                  <Button
                    key={option}
                    size="small"
                    variant={sortBy === option ? 'contained' : 'outlined'}
                    onClick={() => handleSortChange(option)}
                    startIcon={
                      option === 'newest' ? <SortDesc size={12} /> :
                        option === 'oldest' ? <SortAsc size={12} /> :
                          <TrendingUp size={12} />
                    }
                    sx={{ 
                      textTransform: 'capitalize',
                      fontSize: '0.6rem',
                      py: 0.25,
                      px: 0.5,
                      minWidth: 'auto'
                    }}
                  >
                    {option}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {/* Add Comment */}
          <Box mb={1.5}>
            <Box display="flex" gap={1} mb={1}>
              <UserAvatar
                src={user?.avatar}
                alt={isAuthenticated ? (user?.displayName || user?.username) : 'Anonymous User'}
                size="small"
                isVerified={user?.isVerified}
              />
              <TextField
                fullWidth
                multiline
                rows={1}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                variant="outlined"
                disabled={isCreating}
                helperText={`${newComment.length}/1000`}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={(e) => handleEmojiClick(e, 'newComment')}
                      disabled={isCreating}
                      sx={{ p: 0.25 }}
                    >
                      <Smile size={14} />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={isCreating ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                onClick={handleSubmitComment}
                disabled={isCreating || !newComment.trim()}
                sx={{ 
                  fontSize: '0.65rem',
                  py: 0.25,
                  px: 0.75
                }}
              >
                {isCreating ? 'Posting...' : 'Post Comment'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Comments List */}
          {isLoading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 1, py: 0.5, px: 1 }}>
              Failed to load comments. {error.message || 'Please try again.'}
              <Button onClick={() => {
                // Clear any cached error state and retry
                queryClient.invalidateQueries({ queryKey: ['comments', postId, sortBy] });
                refetch();
              }} sx={{ ml: 1, fontSize: '0.7rem' }}>
                Retry
              </Button>
            </Alert>
          )}

          {comments.length === 0 && !isLoading && !error && (
            <Box textAlign="center" py={2}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                No comments yet. Be the first to comment!
              </Typography>
            </Box>
          )}

          {comments.length > 0 && (
            <Box>
              {comments.map((comment: Comment) => {
                // Validate comment object to prevent rendering errors
                if (!comment || typeof comment !== 'object' || !comment.id) {
                  console.warn('Invalid comment data:', comment);
                  return null;
                }

                return renderComment(comment);
              })}

              {/* Load More Button */}
              {hasNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                  <Button
                    variant="outlined"
                    onClick={loadMoreComments}
                    disabled={isFetchingNextPage}
                    startIcon={isFetchingNextPage ? <Loader2 className="animate-spin" size={12} /> : <ChevronDown size={12} />}
                    sx={{ 
                      fontSize: '0.7rem',
                      py: 0.25,
                      px: 1
                    }}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More Comments'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Collapse>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{ '& .MuiMenu-paper': { minWidth: 120 } }}
        >
          {selectedComment && user && user.id === selectedComment.author.id && (
            <MenuItem onClick={handleEditComment} disabled={isEditing} sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}>
              <Edit size={12} style={{ marginRight: 4 }} />
              Edit Comment
            </MenuItem>
          )}
          {selectedComment && user && (user.id === selectedComment.author.id || user.role === 'admin') && (
            <MenuItem onClick={handleDeleteComment} disabled={isDeleting} sx={{ color: 'error.main', fontSize: '0.75rem', py: 0.5, px: 1 }}>
              <Trash2 size={12} style={{ marginRight: 4 }} />
              Delete Comment
            </MenuItem>
          )}
        </Menu>

        {/* Report Dialog */}
        <Dialog 
          open={reportDialogOpen} 
          onClose={() => setReportDialogOpen(false)} 
          maxWidth="xs"
          fullWidth
          disableEnforceFocus
          hideBackdrop={false}
          sx={{ '& .MuiDialog-paper': { m: 1 } }}
        >
          <DialogTitle sx={{ py: 1, px: 1.5, fontSize: '1rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AlertTriangle size={16} color="#f57c00" />
              Report Comment
            </Box>
          </DialogTitle>
          <DialogContent sx={{ py: 1, px: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>
              Help us understand what&apos;s wrong with this comment.
            </Typography>
            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel sx={{ fontSize: '0.75rem' }}>Reason</InputLabel>
              <Select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                label="Reason"
                size="small"
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              >
                <MenuItem value="spam" sx={{ fontSize: '0.75rem' }}>Spam</MenuItem>
                <MenuItem value="harassment" sx={{ fontSize: '0.75rem' }}>Harassment</MenuItem>
                <MenuItem value="hate-speech" sx={{ fontSize: '0.75rem' }}>Hate Speech</MenuItem>
                <MenuItem value="misinformation" sx={{ fontSize: '0.75rem' }}>Misinformation</MenuItem>
                <MenuItem value="inappropriate" sx={{ fontSize: '0.75rem' }}>Inappropriate Content</MenuItem>
                <MenuItem value="other" sx={{ fontSize: '0.75rem' }}>Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Additional Details (Optional)"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Please provide more details about why you&apos;re reporting this comment..."
              size="small"
              sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
            />
          </DialogContent>
          <DialogActions sx={{ py: 1, px: 1.5 }}>
            <Button 
              onClick={() => setReportDialogOpen(false)} 
              disabled={isReporting}
              sx={{ fontSize: '0.75rem', py: 0.25, px: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              variant="contained"
              color="error"
              disabled={!reportReason || isReporting}
              startIcon={isReporting ? <Loader2 className="animate-spin" size={12} /> : <Flag size={12} />}
              sx={{ fontSize: '0.75rem', py: 0.25, px: 1 }}
            >
              {isReporting ? 'Reporting...' : 'Submit Report'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Emoji Picker */}
        <EmojiPicker
          open={showEmojiPicker}
          anchorEl={emojiPickerAnchor}
          onClose={handleEmojiPickerClose}
          onSelect={handleEmojiSelect}
        />
      </CardContent>
    </Card>
  );
};

export default CommentSection;