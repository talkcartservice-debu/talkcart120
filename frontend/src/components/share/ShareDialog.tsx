import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Checkbox,
  Avatar,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Share2,
  Users,
  Globe,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '../common/UserAvatar';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  post: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`share-tabpanel-${index}`}
      aria-labelledby={`share-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, post }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get user's followers for sharing
  const {
    data: followersData,
    isLoading: followersLoading,
    error: followersError,
  } = useQuery({
    queryKey: ['user-followers', user?.id],
    queryFn: () => api.users.getFollowers(user?.id || ''),
    enabled: isAuthenticated && !!user?.id && open,
    retry: false, // Don't retry on 404
  });

  // Get user's following for sharing
  const {
    data: followingData,
    isLoading: followingLoading,
    error: followingError,
  } = useQuery({
    queryKey: ['user-following', user?.id],
    queryFn: () => api.users.getFollowing(user?.id || ''),
    enabled: isAuthenticated && !!user?.id && open,
    retry: false, // Don't retry on 404
  });

  // Share with followers mutation
  const shareWithFollowersMutation = useMutation({
    mutationFn: (message: string) =>
      api.posts.shareWithFollowers(post.id || post._id, message),
    onSuccess: () => {
      toast.success('Post shared with your followers!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    },
    onError: (error) => {
      console.error('Share with followers error:', error);
      toast.error('Failed to share with followers');
    }
  });

  // Share with specific users mutation
  const shareWithUsersMutation = useMutation({
    mutationFn: (data: { userIds: string[]; message: string }) =>
      api.posts.shareWithUsers(post.id || post._id, data.userIds, data.message),
    onSuccess: () => {
      toast.success('Post shared successfully!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    },
    onError: (error) => {
      console.error('Share with users error:', error);
      toast.error('Failed to share with selected users');
    }
  });

  // External share mutation
  const externalShareMutation = useMutation({
    mutationFn: (platform: string) =>
      api.posts.share(post.id || post._id, platform),
    onSuccess: () => {
      toast.success('Share recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('External share error:', error);
      toast.error('Failed to record share');
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Ensure newValue is always a number and within valid range
    const tabValue = typeof newValue === 'string' ? parseInt(newValue, 10) : newValue;
    const validTabValue = isNaN(tabValue) ? 0 : Math.max(0, Math.min(2, tabValue)); // 0-2 for 3 tabs
    setTabValue(validTabValue);
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShareWithFollowers = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      return;
    }
    shareWithFollowersMutation.mutate(message);
  };

  const handleShareWithUsers = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    shareWithUsersMutation.mutate({ userIds: selectedUsers, message });
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id || post._id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Link copied to clipboard!');
    externalShareMutation.mutate('copy_link');
  };

  const handleExternalShare = (platform: string, url?: string) => {
    const postUrl = `${window.location.origin}/post/${post.id || post._id}`;
    const text = `Check out this post: ${post.content?.substring(0, 100)}...`;

    if (url) {
      const shareUrl = url
        .replace('{url}', encodeURIComponent(postUrl))
        .replace('{text}', encodeURIComponent(text));

      window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    externalShareMutation.mutate(platform);
  };

  const followingList = (followingData?.data as any)?.following || [];
  const filteredFollowing = followingList.filter((user: any) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const username = (user.username || '').toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    
    return username.includes(searchLower) || displayName.includes(searchLower);
  });

  const followersList = (followersData?.data as any)?.followers || [];
  const followerCount = followersList.length || 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Share2 size={20} />
            <Typography variant="h6">Share Post</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              icon={<Users size={16} />}
              label="Followers"
              iconPosition="start"
            />
            <Tab
              icon={<MessageCircle size={16} />}
              label="Direct"
              iconPosition="start"
            />
            <Tab
              icon={<Globe size={16} />}
              label="External"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Share with Followers Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box>
            {followersLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading followers...
                </Typography>
              </Box>
            ) : followersError ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Share this post with all your followers
                </Typography>
                <Typography variant="body2" color="warning.main" gutterBottom>
                  ⚠️ Follower data unavailable. You can still share using other methods.
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Share this post with all your followers ({followerCount} followers)
              </Typography>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mt: 2 }}
              disabled={!!followersError}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleShareWithFollowers}
              disabled={shareWithFollowersMutation.isPending || !!followersError}
              startIcon={shareWithFollowersMutation.isPending ? <CircularProgress size={16} /> : <Send size={16} />}
              sx={{ mt: 2 }}
            >
              {shareWithFollowersMutation.isPending
                ? 'Sharing...'
                : followersError
                  ? 'Followers Unavailable'
                  : `Share with ${followerCount} Followers`
              }
            </Button>
          </Box>
        </TabPanel>

        {/* Direct Share Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
            />

            {followingLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading following...
                </Typography>
              </Box>
            ) : followingError ? (
              <Box p={2} textAlign="center">
                <Typography variant="body2" color="warning.main">
                  ⚠️ Following data unavailable
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Unable to load your following list. Please try the other sharing options.
                </Typography>
              </Box>
            ) : filteredFollowing.length === 0 ? (
              <Box p={2} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  {searchQuery ? 'No users found matching your search' : 'You are not following anyone yet'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {filteredFollowing.map((user: any) => (
                  <ListItem key={user.id || user._id} disablePadding>
                    <ListItemButton>
                      <ListItemAvatar>
                        <UserAvatar
                          src={user.avatar}
                          alt={user.displayName || user.username}
                          size={32}
                          isVerified={user.isVerified}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.displayName || user.username || 'Unknown User'}
                        secondary={`@${user.username || 'unknown'}`}
                      />
                      <Checkbox
                        checked={selectedUsers.includes(user.id || user._id)}
                        onChange={() => handleUserToggle(user.id || user._id)}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}

            {selectedUsers.length > 0 && (
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>
                  Selected: {selectedUsers.length} users
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleShareWithUsers}
                  disabled={shareWithUsersMutation.isPending}
                  startIcon={shareWithUsersMutation.isPending ? <CircularProgress size={16} /> : <Send size={16} />}
                >
                  {shareWithUsersMutation.isPending
                    ? 'Sharing...'
                    : `Share with ${selectedUsers.length} Users`
                  }
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* External Share Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Share this post on other platforms or copy the link
            </Typography>

            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={handleCopyLink}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'grey.100' }}>
                      <Copy size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Copy Link"
                    secondary="Copy post URL to clipboard"
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleExternalShare('twitter', 'https://twitter.com/intent/tweet?text={text}&url={url}')}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#1DA1F2' }}>
                      <Twitter size={20} color="white" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Twitter"
                    secondary="Share on Twitter"
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleExternalShare('facebook', 'https://www.facebook.com/sharer/sharer.php?u={url}')}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#4267B2' }}>
                      <Facebook size={20} color="white" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Facebook"
                    secondary="Share on Facebook"
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleExternalShare('linkedin', 'https://www.linkedin.com/sharing/share-offsite/?url={url}')}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#0077B5' }}>
                      <Linkedin size={20} color="white" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="LinkedIn"
                    secondary="Share on LinkedIn"
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
