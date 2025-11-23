import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardMedia,
    Box,
    IconButton,
    Typography,
    Skeleton,
    Alert,
    Button,
    Dialog,
    DialogContent,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    PlayArrow,
    Close,
    Download,
    Share,
    Fullscreen,
    Image as ImageIcon,
    VideoLibrary,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import UnifiedVideoMedia from '@/components/media/UnifiedVideoMedia';
import UnifiedImageMedia from '@/components/media/UnifiedImageMedia';

interface MediaItem {
    _id: string;
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    createdAt: string;
    postId?: string;
}

interface MediaGridProps {
    userId: string;
    mediaType?: 'image' | 'video' | 'all';
    showPrivate?: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({
    userId,
    mediaType = 'all',
    showPrivate = false,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Fetch media
    useEffect(() => {
        const fetchMedia = async () => {
            try {
                setLoading(true);
                setError(null);

                // For now, we'll show a message that this feature is not implemented
                // In a real application, you would fetch media from an appropriate API endpoint
                setMedia([]);
                setHasMore(false);
                setError('Media gallery feature not implemented');
            } catch (err: any) {
                console.error('Error fetching media:', err);
                setError(err.message || 'Failed to load media');
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, [userId, mediaType, showPrivate, page]);

    // Handle media click
    const handleMediaClick = (mediaItem: MediaItem) => {
        // Check if this is a known missing file pattern
        const isKnownMissingFile = mediaItem.url && typeof mediaItem.url === 'string' && (
          mediaItem.url.includes('file_1760168733155_lfhjq4ik7ht') ||
          mediaItem.url.includes('file_1760163879851_tt3fdqqim9') ||
          mediaItem.url.includes('file_1760263843073_w13593s5t8l') ||
          mediaItem.url.includes('file_1760276276250_3pqeekj048s')
        );
        
        if (isKnownMissingFile) {
          console.warn('Known missing file detected in MediaGrid, cannot open:', mediaItem.url);
          // Silently handle missing files without showing error to user
          return;
        }
        
        setSelectedMedia(mediaItem);
        setDialogOpen(true);
    };

    // Handle dialog close
    const handleDialogClose = () => {
        setDialogOpen(false);
        setSelectedMedia(null);
    };

    // Handle download
    const handleDownload = async (mediaItem: MediaItem) => {
        try {
            const response = await fetch(mediaItem.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `media-${mediaItem._id}.${mediaItem.format || 'jpg'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download media');
        }
    };

    // Handle share
    const handleShare = async (mediaItem: MediaItem) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Shared Media',
                    url: mediaItem.url,
                });
            } catch (error) {
                // User cancelled sharing
            }
        } else {
            try {
                await navigator.clipboard.writeText(mediaItem.url);
                toast.success('Link copied to clipboard');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                toast.error('Failed to copy link');
            }
        }
    };

    // Load more media
    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    if (loading && page === 1) {
        return (
            <Grid container spacing={2}>
                {Array.from({ length: 12 }).map((_, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                        <Skeleton
                            variant="rectangular"
                            sx={{
                                width: '100%',
                                paddingBottom: '100%', // 1:1 aspect ratio
                                borderRadius: 2,
                            }}
                        />
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
            </Alert>
        );
    }

    if (media.length === 0) {
        const emptyIcon = mediaType === 'video' ? VideoLibrary : ImageIcon;
        const emptyText = mediaType === 'video' ? 'No videos' : mediaType === 'image' ? 'No images' : 'No media';

        return (
            <Box
                sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                }}
            >
                {React.createElement(emptyIcon, { sx: { fontSize: 64, mb: 2, opacity: 0.5 } })}
                <Typography variant="h6" gutterBottom>
                    {emptyText}
                </Typography>
                <Typography variant="body2">
                    Media files will appear here when uploaded
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <Grid container spacing={2}>
                {media.map((mediaItem) => (
                    <Grid item xs={6} sm={4} md={3} key={mediaItem._id}>
                        <Card
                            sx={{
                                position: 'relative',
                                paddingBottom: '100%', // 1:1 aspect ratio
                                cursor: 'pointer',
                                borderRadius: 2,
                                overflow: 'hidden',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: 4,
                                    '& .media-overlay': {
                                        opacity: 1,
                                    },
                                },
                            }}
                            onClick={() => handleMediaClick(mediaItem)}
                        >
                            <Box sx={{ position: 'absolute', inset: 0 }}>
                                <UnifiedImageMedia
                                  src={mediaItem.thumbnail || mediaItem.url}
                                  alt="Media"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </Box>

                            {/* Video play button */}
                            {mediaItem.type === 'video' && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                                        borderRadius: '50%',
                                        p: 1,
                                    }}
                                >
                                    <PlayArrow sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                            )}

                            {/* Hover overlay */}
                            <Box
                                className="media-overlay"
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                <IconButton
                                    sx={{ color: 'white' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMediaClick(mediaItem);
                                    }}
                                >
                                    <Fullscreen />
                                </IconButton>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Load More Button */}
            {hasMore && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={loadMore}
                        disabled={loading}
                        sx={{ borderRadius: 2 }}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </Box>
            )}

            {/* Media Viewer Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                maxWidth="lg"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        bgcolor: 'black',
                        borderRadius: isMobile ? 0 : 2,
                    },
                }}
            >
                <DialogContent sx={{ p: 0, position: 'relative' }}>
                    {selectedMedia && (
                        <>
                            {/* Close button */}
                            <IconButton
                                onClick={handleDialogClose}
                                sx={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    color: 'white',
                                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                                    zIndex: 1,
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                                    },
                                }}
                            >
                                <Close />
                            </IconButton>

                            {/* Action buttons */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 16,
                                    right: 16,
                                    display: 'flex',
                                    gap: 1,
                                    zIndex: 1,
                                }}
                            >
                                <IconButton
                                    onClick={() => handleDownload(selectedMedia)}
                                    sx={{
                                        color: 'white',
                                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                                        },
                                    }}
                                >
                                    <Download />
                                </IconButton>
                                <IconButton
                                    onClick={() => handleShare(selectedMedia)}
                                    sx={{
                                        color: 'white',
                                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                                        },
                                    }}
                                >
                                    <Share />
                                </IconButton>
                            </Box>

                            {/* Media content */}
                            {selectedMedia.type === 'video' ? (
                                <UnifiedVideoMedia
                                    src={selectedMedia.url}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        maxHeight: '70vh',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : (
                                <UnifiedImageMedia
                                    src={selectedMedia.url}
                                    alt="Media"
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        maxHeight: '70vh',
                                        objectFit: 'contain' 
                                    }}
                                />
                            )}

                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MediaGrid;