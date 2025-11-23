import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { X, Trophy, Award, Target, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Post } from '@/types/social';

interface CreateAchievementDialogProps {
  open: boolean;
  onClose: () => void;
  onAchievementCreated?: (post: Post) => void;
}

export const CreateAchievementDialog: React.FC<CreateAchievementDialogProps> = ({
  open,
  onClose,
  onAchievementCreated,
}) => {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [achievementType, setAchievementType] = useState<'milestone' | 'award' | 'challenge' | 'custom'>('milestone');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your achievement');
      return;
    }
    
    setSubmitting(true);
    try {
      // Create achievement post data
      const postData = {
        content: description.trim() || title,
        type: 'text',
        isAchievement: true,
        achievementType,
        achievementData: {
          title: title.trim(),
          description: description.trim(),
        },
        privacy: privacy
      };
      
      // Create the achievement post
      const response = await api.posts.createAchievement(postData) as any;
      
      if (response?.success) {
        toast.success('Achievement created successfully!');
        // Reset form
        setTitle('');
        setDescription('');
        setAchievementType('milestone');
        setPrivacy('public');
        // Notify parent component
        if (onAchievementCreated && response.data?.post) {
          onAchievementCreated(response.data.post);
        }
        onClose();
      } else {
        throw new Error(response?.message || 'Failed to create achievement');
      }
    } catch (error: any) {
      console.error('Error creating achievement:', error);
      toast.error(error.message || 'Failed to create achievement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAchievementTypeChange = (event: SelectChangeEvent) => {
    setAchievementType(event.target.value as any);
  };

  const handlePrivacyChange = (event: SelectChangeEvent) => {
    setPrivacy(event.target.value as any);
  };

  // Function to get achievement icon based on type
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'award':
        return <Award size={20} />;
      case 'challenge':
        return <Target size={20} />;
      case 'custom':
        return <Star size={20} />;
      default: // milestone
        return <Trophy size={20} />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {getAchievementIcon(achievementType)}
            <Typography variant="h6">Create Achievement</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <FormControl fullWidth>
            <InputLabel>Achievement Type</InputLabel>
            <Select
              value={achievementType}
              onChange={handleAchievementTypeChange}
              label="Achievement Type"
            >
              <MenuItem value="milestone">
                <Box display="flex" alignItems="center" gap={1}>
                  <Trophy size={16} />
                  <span>Milestone</span>
                </Box>
              </MenuItem>
              <MenuItem value="award">
                <Box display="flex" alignItems="center" gap={1}>
                  <Award size={16} />
                  <span>Award</span>
                </Box>
              </MenuItem>
              <MenuItem value="challenge">
                <Box display="flex" alignItems="center" gap={1}>
                  <Target size={16} />
                  <span>Challenge</span>
                </Box>
              </MenuItem>
              <MenuItem value="custom">
                <Box display="flex" alignItems="center" gap={1}>
                  <Star size={16} />
                  <span>Custom</span>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Achievement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            helperText="Enter a title for your achievement"
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="Add a description of your achievement (optional)"
          />
          
          <FormControl fullWidth>
            <InputLabel>Privacy</InputLabel>
            <Select
              value={privacy}
              onChange={handlePrivacyChange}
              label="Privacy"
            >
              <MenuItem value="public">
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <span>Public</span>
                </Box>
              </MenuItem>
              <MenuItem value="followers">
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'info.main' }} />
                  <span>Followers</span>
                </Box>
              </MenuItem>
              <MenuItem value="private">
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }} />
                  <span>Private</span>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={submitting || !title.trim()}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Creating...' : 'Create Achievement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};