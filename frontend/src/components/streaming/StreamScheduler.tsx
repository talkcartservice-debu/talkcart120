import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Delete,
  Save,
  X,
} from 'lucide-react';
// Using native HTML datetime-local input instead of MUI X DateTimePicker to avoid compatibility issues
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import { useStreamCategories } from '@/hooks/useStreaming';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface StreamSchedulerProps {
  streamId?: string;
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (scheduledStream: any) => void;
}

const StreamScheduler: React.FC<StreamSchedulerProps> = ({
  streamId,
  isOpen,
  onClose,
  onScheduled,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
  });
  const [tagInput, setTagInput] = useState('');

  // Fetch categories
  const { data: categoriesData } = useStreamCategories();
  const categories = categoriesData?.data?.categories || [];

  // Fetch scheduled streams
  const { data: scheduledStreamsData, isLoading } = useQuery({
    queryKey: ['scheduled-streams'],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        streams: []
      }
    }),
    enabled: isOpen,
  });

  const scheduledStreams = scheduledStreamsData?.data?.streams || [];

  // Schedule stream mutation
  const scheduleStreamMutation = useMutation({
    mutationFn: (data: any) => {
      // TODO: Implement schedule stream API endpoint
      return Promise.resolve({
        success: true,
        data: {
          id: 'scheduled-stream-id',
          title: data.title,
          description: data.description,
          category: data.category,
          tags: data.tags,
          scheduledAt: data.scheduledAt.toISOString(),
          createdAt: new Date().toISOString()
        }
      });
    },
    onSuccess: (data) => {
      toast.success('Stream scheduled successfully! 📅');
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
      if (onScheduled) {
        onScheduled(data.data);
      }
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to schedule stream');
    },
  });

  // Cancel schedule mutation
  const cancelScheduleMutation = useMutation({
    mutationFn: (streamId: string) => {
      // TODO: Implement cancel schedule API endpoint
      return Promise.resolve({
        success: true,
        data: {
          id: streamId,
          cancelled: true
        }
      });
    },
    onSuccess: () => {
      toast.success('Stream schedule cancelled');
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel schedule');
    },
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSchedule = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a stream title');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (formData.scheduledAt <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    scheduleStreamMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: [],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    setTagInput('');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Calendar size={24} />
          <Typography variant="h6" flex={1}>
            Schedule Stream
          </Typography>
          <IconButton onClick={handleClose}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Schedule Form */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                New Scheduled Stream
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Stream Title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What will you be streaming?"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell viewers what to expect..."
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      label="Category"
                    >
                      {categories.map((category: string) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Scheduled Date & Time"
                    type="datetime-local"
                    value={formData.scheduledAt.toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setFormData(prev => ({ ...prev, scheduledAt: newDate }));
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      min: new Date().toISOString().slice(0, 16), // Prevent past dates
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      size="small"
                      label="Add tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="gaming, tutorial, etc."
                    />
                    <Button onClick={handleAddTag} variant="outlined" size="small">
                      <Plus size={16} />
                    </Button>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {formData.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={handleSchedule}
                disabled={scheduleStreamMutation.isPending}
                startIcon={scheduleStreamMutation.isPending ? <CircularProgress size={16} /> : <Save size={16} />}
                sx={{ mt: 2 }}
              >
                {scheduleStreamMutation.isPending ? 'Scheduling...' : 'Schedule Stream'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Scheduled Streams */}
          <Typography variant="h6" gutterBottom>
            Your Scheduled Streams
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : scheduledStreams.length === 0 ? (
            <Alert severity="info">
              No scheduled streams. Create your first scheduled stream above!
            </Alert>
          ) : (
            <Box>
              {scheduledStreams.map((stream: any) => (
                <Card key={stream.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="between" alignItems="start">
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {stream.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {stream.description}
                        </Typography>
                        <Box display="flex" gap={1} mb={1}>
                          <Chip label={stream.category} size="small" />
                          {stream.tags?.map((tag: string) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                        <Typography variant="body2" color="primary">
                          <Clock size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {formatDistanceToNow(new Date(stream.scheduledAt), { addSuffix: true })}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => cancelScheduleMutation.mutate(stream.id)}
                        disabled={cancelScheduleMutation.isPending}
                        color="error"
                      >
                        <Delete size={16} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default StreamScheduler;
