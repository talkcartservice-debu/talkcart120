import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search,
  Filter,
  X,
  Play,
  Clock,
  Eye,
  ThumbsUp,
  TrendingUp,
  Calendar,
  User,
  Tag,
} from 'lucide-react';

interface VideoSearchFilters {
  query: string;
  duration: [number, number]; // min, max in seconds
  quality: string[];
  format: string[];
  dateRange: string;
  sortBy: string;
  author: string;
  tags: string[];
  minViews: number;
  minLikes: number;
  hasComments: boolean;
}

interface VideoSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  duration: number;
  format: string;
  quality: string;
  views: number;
  likes: number;
  comments: number;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  createdAt: Date;
  size: number;
}

interface VideoSearchProps {
  videos: VideoSearchResult[];
  onVideoSelect: (video: VideoSearchResult) => void;
  onFiltersChange: (filters: VideoSearchFilters) => void;
}

export const VideoSearch: React.FC<VideoSearchProps> = ({
  videos,
  onVideoSelect,
  onFiltersChange,
}) => {
  const [filters, setFilters] = useState<VideoSearchFilters>({
    query: '',
    duration: [0, 3600], // 0 to 1 hour
    quality: [],
    format: [],
    dateRange: 'all',
    sortBy: 'relevance',
    author: '',
    tags: [],
    minViews: 0,
    minLikes: 0,
    hasComments: false,
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);

  // Extract available tags and authors from videos
  useEffect(() => {
    const tags = new Set<string>();
    const authors = new Set<string>();

    videos.forEach(video => {
      video.tags.forEach(tag => tags.add(tag));
      authors.add(video.author.name);
    });

    setAvailableTags(Array.from(tags));
    setAvailableAuthors(Array.from(authors));
  }, [videos]);

  // Filter videos based on current filters
  const filteredVideos = useMemo(() => {
    let filtered = videos;

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.tags.some(tag => tag.toLowerCase().includes(query)) ||
        video.author.name.toLowerCase().includes(query)
      );
    }

    // Duration filter
    filtered = filtered.filter(video =>
      video.duration >= filters.duration[0] && video.duration <= filters.duration[1]
    );

    // Quality filter
    if (filters.quality.length > 0) {
      filtered = filtered.filter(video => filters.quality.includes(video.quality));
    }

    // Format filter
    if (filters.format.length > 0) {
      filtered = filtered.filter(video => filters.format.includes(video.format));
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(video => video.createdAt >= cutoffDate);
    }

    // Author filter
    if (filters.author) {
      filtered = filtered.filter(video => video.author.name === filters.author);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(video =>
        filters.tags.some(tag => video.tags.includes(tag))
      );
    }

    // Views and likes filter
    filtered = filtered.filter(video =>
      video.views >= filters.minViews && video.likes >= filters.minLikes
    );

    // Comments filter
    if (filters.hasComments) {
      filtered = filtered.filter(video => video.comments > 0);
    }

    // Sort results
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'views':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'likes':
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case 'duration':
        filtered.sort((a, b) => b.duration - a.duration);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // relevance
        // Keep original order for relevance
        break;
    }

    return filtered;
  }, [videos, filters]);

  const handleFilterChange = (key: keyof VideoSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: VideoSearchFilters = {
      query: '',
      duration: [0, 3600],
      quality: [],
      format: [],
      dateRange: 'all',
      sortBy: 'relevance',
      author: '',
      tags: [],
      minViews: 0,
      minLikes: 0,
      hasComments: false,
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search videos by title, description, tags, or author..."
          value={filters.query}
          onChange={(e) => handleFilterChange('query', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: filters.query && (
              <InputAdornment position="end">
                <IconButton onClick={() => handleFilterChange('query', '')}>
                  <X />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            color={showAdvancedFilters ? 'primary' : 'default'}
          >
            <Badge badgeContent={Object.values(filters).filter(v => 
              Array.isArray(v) ? v.length > 0 : v !== '' && v !== 0 && v !== false && v !== 'all' && v !== 'relevance'
            ).length} color="error">
              <Filter />
            </Badge>
          </IconButton>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              label="Sort by"
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
              <MenuItem value="views">Most Views</MenuItem>
              <MenuItem value="likes">Most Likes</MenuItem>
              <MenuItem value="duration">Duration</MenuItem>
              <MenuItem value="alphabetical">A-Z</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            {filteredVideos.length} of {videos.length} videos
          </Typography>

          {Object.values(filters).some(v => 
            Array.isArray(v) ? v.length > 0 : v !== '' && v !== 0 && v !== false && v !== 'all' && v !== 'relevance'
          ) && (
            <Chip
              label="Clear Filters"
              onClick={clearFilters}
              onDelete={clearFilters}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Card sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Duration Range */}
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Duration Range</Typography>
                <Slider
                  value={filters.duration}
                  onChange={(_, value) => handleFilterChange('duration', value)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatDuration}
                  min={0}
                  max={3600}
                  step={30}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{formatDuration(filters.duration[0])}</Typography>
                  <Typography variant="caption">{formatDuration(filters.duration[1])}</Typography>
                </Box>
              </Grid>

              {/* Date Range */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    label="Date Range"
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="year">This Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Author Filter */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Author</InputLabel>
                  <Select
                    value={filters.author}
                    onChange={(e) => handleFilterChange('author', e.target.value)}
                    label="Author"
                  >
                    <MenuItem value="">All Authors</MenuItem>
                    {availableAuthors.map(author => (
                      <MenuItem key={author} value={author}>{author}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Quality Filter */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    multiple
                    value={filters.quality}
                    onChange={(e) => handleFilterChange('quality', e.target.value)}
                    label="Quality"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Format Filter */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    multiple
                    value={filters.format}
                    onChange={(e) => handleFilterChange('format', e.target.value)}
                    label="Format"
                  >
                    <MenuItem value="mp4">MP4</MenuItem>
                    <MenuItem value="webm">WebM</MenuItem>
                    <MenuItem value="avi">AVI</MenuItem>
                    <MenuItem value="mov">MOV</MenuItem>
                    <MenuItem value="mkv">MKV</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Tags Filter */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tags</InputLabel>
                  <Select
                    multiple
                    value={filters.tags}
                    onChange={(e) => handleFilterChange('tags', e.target.value)}
                    label="Tags"
                  >
                    {availableTags.map(tag => (
                      <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Additional Filters */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.hasComments}
                      onChange={(e) => handleFilterChange('hasComments', e.target.checked)}
                    />
                  }
                  label="Has Comments"
                />
              </Grid>
            </Grid>
          </Card>
        )}
      </Box>

      {/* Results Grid */}
      <Grid container spacing={2}>
        {filteredVideos.map((video) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => onVideoSelect(video)}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={video.thumbnail}
                  alt={video.title}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {formatDuration(video.duration)}
                </Box>
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    },
                  }}
                >
                  <Play />
                </IconButton>
              </Box>
              <CardContent>
                <Typography variant="subtitle2" noWrap gutterBottom>
                  {video.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  by {video.author.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Tooltip title="Views">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Eye fontSize="small" />
                      <Typography variant="caption">{video.views}</Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Likes">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ThumbsUp fontSize="small" />
                      <Typography variant="caption">{video.likes}</Typography>
                    </Box>
                  </Tooltip>
                </Box>
                <Box sx={{ mt: 1 }}>
                  {video.tags.slice(0, 2).map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredVideos.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No videos found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VideoSearch;