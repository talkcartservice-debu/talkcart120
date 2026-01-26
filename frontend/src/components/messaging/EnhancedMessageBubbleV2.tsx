import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Stack,
    Typography,
    Avatar,
    Paper,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    useTheme,
    alpha,
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    useMediaQuery,
    Collapse,
    LinearProgress,
    Fab,
    Badge,
    Skeleton
} from '@mui/material';
import {
    Reply,
    Forward,
    Edit,
    Trash2,
    Copy,
    MoreVertical,
    Check,
    CheckCheck,
    Share2,
    ExternalLink,
    FileText,
    Heart,
    ThumbsUp,
    Laugh,
    MessageCircle,
    Download,
    Pin,
    Archive,
    Volume2,
    VolumeX,
    Clock,
    Shield,
    Lock,
    Eye,
    EyeOff,
    X
} from 'lucide-react';
import { Message } from '@/types/message';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import VoiceMessageBubble from './VoiceMessageBubble';
import { useMediaMute } from '@/hooks/useMediaMute'; // Import the new hook
import UnifiedVideoMedia from '@/components/media/UnifiedVideoMedia';
import UnifiedImageMedia from '@/components/media/UnifiedImageMedia';
import { isKnownMissingFile } from '@/utils/mediaUtils';
import UserAvatar from '@/components/common/UserAvatar';
import MediaMessageContainer from './MediaMessageContainer';

// Placeholder VoiceMessageBubble component if not exists
const VoiceMessageBubblePlaceholder: React.FC<any> = (props) => (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="body2">Voice Message: {props.filename}</Typography>
    </Box>
);

interface EnhancedMessageBubbleV2Props {
    message: Message;
    showAvatar?: boolean;
    onReply?: () => void;
    onEdit?: (messageId: string, content: string) => Promise<boolean>;
    onDelete?: (messageId: string) => Promise<boolean>;
    onReaction?: (messageId: string, emoji: string) => Promise<boolean>;
    onForward?: () => void;
    onPin?: (messageId: string) => void;
    onArchive?: (messageId: string) => void;
    onDownload?: (mediaUrl: string) => void;
    onMute?: (messageId: string) => void;
    onUnmute?: (messageId: string) => void;
    onCopy?: (content: string) => void;
    onReplyAll?: () => void;
    onReact?: (messageId: string, emoji: string) => void;
    onThread?: () => void;
    onSearch?: (query: string) => void;
}

const EnhancedMessageBubbleV2: React.FC<EnhancedMessageBubbleV2Props> = (props) => {
    const {
        message,
        showAvatar = true,
        onReply,
        onEdit,
        onDelete,
        onReaction,
        onForward,
        onPin,
        onArchive,
        onDownload,
        onMute,
        onUnmute,
        onCopy,
        onReplyAll,
        onReact,
        onThread,
        onSearch
    } = props;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('xs'));
    const isExtraSmall = useMediaQuery(theme.breakpoints.down(400));
    const { user } = useAuth();
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [showReactions, setShowReactions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [audioStates, setAudioStates] = useState<Record<string, { playing: boolean; currentTime: number; duration: number; muted: boolean }>>({});
    const [showThread, setShowThread] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [isPinned, setIsPinned] = useState(message.isPinned || false);
    const [isArchived, setIsArchived] = useState(message.isArchived || false);
    
    // Sync local state with message props when they change
    useEffect(() => {
        setIsPinned(message.isPinned || false);
    }, [message.isPinned]);
    
    useEffect(() => {
        setIsArchived(message.isArchived || false);
    }, [message.isArchived]);
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMediaPreview, setShowMediaPreview] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [showQuickReactions, setShowQuickReactions] = useState(false);
    const [showTimestamp, setShowTimestamp] = useState(true);
    const [isRead, setIsRead] = useState(message.isRead);
    const [isDelivered, setIsDelivered] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
    const messageRef = useRef<HTMLDivElement>(null);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handlePinMessage = () => {
        if (onPin) {
            onPin(message.id);
            // Toggle the local state immediately for better UX
            setIsPinned(!isPinned);
        }
        handleMenuClose();
    };

    const handleArchiveMessage = () => {
        if (onArchive) {
            onArchive(message.id);
            // Toggle the local state immediately for better UX
            setIsArchived(!isArchived);
        }
        handleMenuClose();
    };

    const handleDownload = () => {
        if (onDownload && message.media && Array.isArray(message.media) && message.media.length > 0) {
            setIsDownloading(true);
            setProgress(0);
            
            // Simulate download progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsDownloading(false);
                        const mediaArray = message.media;
                        if (mediaArray && Array.isArray(mediaArray) && mediaArray.length > 0 && mediaArray[0]?.url) {
                            onDownload(mediaArray[0].url);
                        }
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);
        }
        handleMenuClose();
    };

    const handleMuteToggle = () => {
        if (isMuted && onUnmute) {
            onUnmute(message.id);
        } else if (!isMuted && onMute) {
            onMute(message.id);
        }
        setIsMuted(!isMuted);
        handleMenuClose();
    };

    const handleCopy = () => {
        if (onCopy) {
            onCopy(message.content);
        } else {
            navigator.clipboard.writeText(message.content);
        }
        handleMenuClose();
    };

    const handleReplyAll = () => {
        if (onReplyAll) {
            onReplyAll();
        }
        handleMenuClose();
    };

    const handleThread = () => {
        if (onThread) {
            onThread();
            setShowThread(!showThread);
        }
        handleMenuClose();
    };

    const handleQuickReaction = (emoji: string) => {
        if (onReact) {
            onReact(message.id, emoji);
        } else if (onReaction) {
            onReaction(message.id, emoji);
        }
        setShowQuickReactions(false);
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    const handleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleToggleMediaPreview = () => {
        setShowMediaPreview(!showMediaPreview);
    };

    const handleToggleTimestamp = () => {
        setShowTimestamp(!showTimestamp);
    };

    const handleShowReplies = () => {
        setShowReplies(!showReplies);
    };

    const handleEdit = async () => {
        if (onEdit && editContent.trim() !== message.content) {
            const success = await onEdit(message.id, editContent.trim());
            if (success) {
                setIsEditing(false);
            }
        } else {
            setIsEditing(false);
        }
    };

    // Update read status when message is viewed
    useEffect(() => {
        if (messageRef.current && !isRead && message.isOwn) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !isRead) {
                        setIsRead(true);
                        // In a real app, you would call an API to mark as read
                        // props.onMarkAsRead && props.onMarkAsRead(message.id);
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(messageRef.current);
            return () => observer.disconnect();
        }
        // Return undefined when condition is not met
        return undefined;
    }, [isRead, message.id, message.isOwn]);

    const handleDelete = async (): Promise<boolean> => {
        try {
            if (onDelete) {
                const result = await onDelete(message.id);
                handleMenuClose();
                return result;
            }
            handleMenuClose();
            return true;
        } catch (error) {
            console.error('Error deleting message:', error);
            return false;
        }
    };

    const handleReaction = async (emoji: string) => {
        if (onReaction) {
            await onReaction(message.id, emoji);
        }
        setShowReactions(false);
    };



    const getMessageTime = () => {
        try {
            const messageDate = new Date(message.createdAt);
            const now = new Date();
            const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
                return format(messageDate, 'HH:mm');
            } else {
                return format(messageDate, 'MMM dd, HH:mm');
            }
        } catch {
            return '';
        }
    };

    const getReadStatus = () => {
        if (!message.isOwn) return null;

        const readByOthers = message.readBy?.filter(read => read.userId !== user?.id) || [];

        if (readByOthers.length > 0) {
            return <CheckCheck size={14} color={theme.palette.primary.main} />;
        } else {
            return <Check size={14} color={theme.palette.text.secondary} />;
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAudioPlay = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        const currentState = audioStates[mediaUrl] || { playing: false, currentTime: 0, duration: 0, muted: false };

        if (currentState.playing) {
            audio.pause();
        } else {
            // Pause all other audio elements
            Object.values(audioRefs.current).forEach(otherAudio => {
                if (otherAudio !== audio) {
                    otherAudio.pause();
                }
            });
            audio.play();
        }
    };

    const handleAudioTimeUpdate = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                playing: prev[mediaUrl]?.playing ?? false,
                currentTime: audio.currentTime,
                duration: audio.duration || 0,
                muted: prev[mediaUrl]?.muted ?? false
            }
        }));
    };

    const handleAudioLoadedMetadata = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                playing: prev[mediaUrl]?.playing ?? false,
                currentTime: prev[mediaUrl]?.currentTime ?? 0,
                duration: audio.duration,
                muted: prev[mediaUrl]?.muted ?? false
            }
        }));
    };

    const handleAudioEnded = (mediaUrl: string) => {
        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                playing: false,
                currentTime: 0,
                duration: prev[mediaUrl]?.duration ?? 0,
                muted: prev[mediaUrl]?.muted ?? false
            }
        }));
    };

    const toggleMute = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        // Use the unified mute hook functionality
        const newMutedState = !audio.muted;
        audio.muted = newMutedState;
        
        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                playing: prev[mediaUrl]?.playing ?? false,
                currentTime: prev[mediaUrl]?.currentTime ?? 0,
                duration: prev[mediaUrl]?.duration ?? 0,
                muted: newMutedState
            }
        }));
    };

    const renderMediaContent = () => {
        // Only render media content if message has media and is not a pure text message
        if (!message.media || message.media.length === 0 || message.type === 'text') {
            return null;
        }

        // Check if this is an audio message to use the specialized VoiceMessageBubble
        const audioMedia = message.media.find(media => media.type === 'audio');
        
        if (audioMedia) {
            // Use VoiceMessageBubble for audio messages
            return (
                <VoiceMessageBubble
                    audioUrl={audioMedia.url}
                    filename={audioMedia.filename || 'Voice Message'}
                    duration={audioMedia.duration}
                    fileSize={audioMedia.fileSize}
                    isOwn={message.isOwn}
                    timestamp={message.createdAt}
                    onReply={onReply}
                    onForward={onForward}
                    onDelete={message.isOwn ? () => handleDelete() : undefined}
                    onDownload={() => window.open(audioMedia.url, '_blank')}
                />
            );
        }

        // Use MediaMessageContainer for other media types (images, videos, files)
        return (
            <MediaMessageContainer
                message={message}
                onReply={onReply}
                onForward={onForward}
                onDelete={message.isOwn ? async (messageId: string) => { await handleDelete(); return true; } : undefined}
                onDownload={(mediaUrl) => window.open(mediaUrl, '_blank')}
                showActions={false} // Actions are handled by the message bubble context menu
                showTimestamp={false} // Timestamp is shown in the message bubble
                isOwn={message.isOwn}
            />
        );
    };

    const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    const quickReactions = [
        { emoji: '👍', label: 'Like', icon: ThumbsUp },
        { emoji: '❤️', label: 'Love', icon: Heart },
        { emoji: '😂', label: 'Haha', icon: Laugh },
        { emoji: '😮', label: 'Wow', icon: MessageCircle },
        { emoji: '😢', label: 'Sad', icon: MessageCircle },
        { emoji: '👏', label: 'Clap', icon: MessageCircle },
    ];

    // If this is a pure text message, ensure no media content is rendered
    const isTextOnlyMessage = message.type === 'text' || (!Array.isArray(message.media) || message.media.length === 0);

    // Handle post share messages
    if (message.type === 'post_share') {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: message.isOwn ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: { xs: 1, sm: 2 },
            mb: 2,
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 },
            position: 'relative',
          }}
        >
          {/* Avatar */}
          {showAvatar && !message.isOwn && (
            <UserAvatar
              src={message.sender.avatarUrl || message.sender.avatar || undefined}
              alt={message.sender.displayName}
              size={32}
            />
          )}
          {!showAvatar && !message.isOwn && (
            <Box sx={{ width: { xs: 28, sm: 32 } }} />
          )}

          {/* Post Share Message Content */}
          <Box
            sx={{
              maxWidth: { xs: '85%', sm: '70%' },
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.isOwn ? 'flex-start' : 'flex-end'
            }}
          >
            {/* Sender Name (for group chats) */}
            {showAvatar && !message.isOwn && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, ml: 1, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              >
                {message.sender.displayName}
              </Typography>
            )}

            {/* Post Share Message Bubble */}
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Paper
                className="message-bubble"
                elevation={0}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                  position: 'relative',
                  minWidth: { xs: 'auto', sm: 200 },
                  maxWidth: { xs: '100%', sm: '75%', md: '70%' },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.info.main, 0.2)}`
                  }
                }}
              >
                {/* Post Share Icon and Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.info.main, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Share2 size={16} color={theme.palette.info.main} />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.info.main
                    }}
                  >
                    Post Shared
                  </Typography>
                </Box>

                {/* Message Content */}
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1.5,
                    color: theme.palette.text.primary
                  }}
                >
                  {message.content}
                </Typography>

                {/* Post Preview Card */}
                {Array.isArray(message.media) && message.media[0] && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: alpha(theme.palette.grey[100], 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.grey[200], 0.7)
                      }
                    }}
                    onClick={() => {
                      if (Array.isArray(message.media) && message.media[0]) {
                        window.open(message.media[0].url, '_blank');
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FileText size={14} color={theme.palette.primary.main} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: theme.palette.text.primary
                          }}
                        >
                          Shared Post
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: theme.palette.text.secondary
                          }}
                        >
                          Click to view post
                        </Typography>
                      </Box>
                      <ExternalLink size={16} color={theme.palette.text.secondary} />
                    </Box>
                  </Paper>
                )}

                {/* Message Timestamp */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.7,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      fontWeight: 500,
                      color: theme.palette.text.secondary
                    }}
                  >
                    {getMessageTime()}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      );
    }



    // Regular message rendering (text, images, videos, files)
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: message.isOwn ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: { xs: 1, sm: 2 },
                    mb: 2,
                    px: { xs: 1, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    position: 'relative',
                    '&:hover .message-actions': {
                        opacity: 1,
                        transform: 'translateX(0)'
                    },
                    '&:hover .message-bubble': {
                        transform: 'translateY(-1px)',
                        boxShadow: message.isOwn
                            ? `0 12px 40px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 1px ${alpha(theme.palette.primary.light, 0.3)}`
                            : `0 8px 28px ${alpha(theme.palette.grey[500], 0.15)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.25)}`
                    }
                }}
            >
                {/* Avatar */}
                {showAvatar && !message.isOwn && (
                    <UserAvatar
                        src={message.sender.avatarUrl || message.sender.avatar || undefined}
                        alt={message.sender.displayName}
                        size={32}
                    />
                )}
                {!showAvatar && !message.isOwn && (
                    <Box sx={{ width: { xs: 28, sm: 32 } }} />
                )}

                {/* Message Content */}
                <Box
                    sx={{
                        maxWidth: { xs: '85%', sm: '70%' },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.isOwn ? 'flex-start' : 'flex-end'
                    }}
                >
                    {/* Sender Name (for group chats) */}
                    {showAvatar && !message.isOwn && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, ml: 1, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                            {message.sender.displayName}
                        </Typography>
                    )}

                    {/* Enhanced Reply Preview */}
                    {message.replyTo && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 1, sm: 1.5 },
                                mb: 1,
                                maxWidth: '100%',
                                borderLeft: `4px solid ${theme.palette.primary.main}`,
                                background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 15%)`,
                                borderRadius: '12px',
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: 4,
                                    background: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    borderRadius: '0 4px 4px 0'
                                }
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    color: theme.palette.primary.main,
                                    fontWeight: 700,
                                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                    display: 'block',
                                    mb: 0.3
                                }}
                            >
                                ↳ {message.replyTo.sender?.displayName || 'Unknown'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                                    color: theme.palette.text.secondary,
                                    fontStyle: 'italic'
                                }}
                            >
                                {message.replyTo.content}
                            </Typography>
                        </Paper>
                    )}

                    {/* Message Bubble */}
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Paper
                            className="message-bubble"
                            elevation={0}
                            sx={{
                                p: message.content ? { xs: 1, sm: 2, md: 2.5 } : { xs: 0.5, sm: 1.5 },
                                borderRadius: message.isOwn 
                                    ? { xs: '16px 16px 4px 16px', sm: '24px 24px 8px 24px' } 
                                    : { xs: '16px 16px 16px 4px', sm: '24px 24px 24px 8px' },
                                background: message.isOptimistic
                                    ? `linear-gradient(135deg, ${alpha(theme.palette.grey[400], 0.3)} 0%, ${alpha(theme.palette.grey[500], 0.2)} 100%)`
                                    : message.isOwn
                                    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 60%, ${alpha(theme.palette.primary.main, 0.9)} 100%)`
                                    : theme.palette.mode === 'dark'
                                        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.grey[800], 0.9)} 70%, ${alpha(theme.palette.background.default, 0.8)} 100%)`
                                        : `linear-gradient(135deg, ${theme.palette.common.white} 0%, ${alpha(theme.palette.grey[50], 0.8)} 70%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                                backdropFilter: isMobile ? 'blur(12px)' : 'blur(24px)',
                                border: message.isOptimistic
                                    ? `1px solid ${alpha(theme.palette.grey[500], 0.3)}`
                                    : message.isOwn
                                    ? `1px solid ${alpha(theme.palette.primary.light, 0.5)}`
                                    : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                                boxShadow: message.isOwn
                                    ? isMobile 
                                        ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}, 0 1px 8px ${alpha(theme.palette.primary.dark, 0.1)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.1)}`
                                        : `0 8px 40px ${alpha(theme.palette.primary.main, 0.2)}, 0 2px 16px ${alpha(theme.palette.primary.dark, 0.15)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.2)}`
                                    : isMobile 
                                        ? `0 2px 12px ${alpha(theme.palette.grey[500], 0.08)}, 0 1px 4px ${alpha(theme.palette.common.black, 0.04)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.3)}`
                                        : `0 4px 24px ${alpha(theme.palette.grey[500], 0.12)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.08)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.5)}`,
                                color: message.isOptimistic
                                    ? alpha(theme.palette.text.primary, 0.7)
                                    : message.isOwn
                                    ? theme.palette.primary.contrastText
                                    : theme.palette.text.primary,
                                position: 'relative',
                                minWidth: message.content ? { xs: 'auto', sm: 120 } : 0,
                                maxWidth: { xs: '100%', sm: '75%', md: '70%' },
                                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                '&::after': message.isOwn ? {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: { xs: 6, sm: 8 },
                                    right: { xs: -6, sm: -8 },
                                    width: 0,
                                    height: 0,
                                    borderStyle: 'solid',
                                    borderWidth: { xs: '6px 0 0 9px', sm: '8px 0 0 12px' },
                                    borderColor: `transparent transparent transparent ${theme.palette.primary.main}`,
                                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
                                } : {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: { xs: 6, sm: 8 },
                                    left: { xs: -6, sm: -8 },
                                    width: 0,
                                    height: 0,
                                    borderStyle: 'solid',
                                    borderWidth: { xs: '6px 9px 0 0', sm: '8px 12px 0 0' },
                                    borderColor: `transparent ${theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.common.white} transparent transparent`,
                                    filter: 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.1))'
                                }
                            }}
                        >
                            {/* Enhanced Forwarded Message Indicator */}
                            {message.isForwarded && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.8,
                                        mb: 1.2,
                                        p: 1,
                                        borderRadius: '8px',
                                        background: alpha(theme.palette.info.main, 0.08),
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                        backdropFilter: 'blur(4px)'
                                    }}
                                >
                                    <Forward size={12} color={theme.palette.info.main} />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontStyle: 'italic',
                                            fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                            fontWeight: 600,
                                            color: theme.palette.info.main,
                                            letterSpacing: 0.2
                                        }}
                                    >
                                        Forwarded Message
                                    </Typography>
                                </Box>
                            )}

                            {/* Enhanced Message Content */}
                            {message.isDeleted ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontStyle: 'italic',
                                            fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                            color: message.isOptimistic
                                                ? alpha(theme.palette.text.secondary, 0.5)
                                                : message.isOwn
                                                ? alpha(theme.palette.primary.contrastText, 0.7)
                                                : theme.palette.text.secondary
                                        }}
                                    >
                                        🚫 This message was deleted
                                    </Typography>
                                </Box>
                            ) : isEditing ? (
                                <Box sx={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEdit();
                                            } else if (e.key === 'Escape') {
                                                setIsEditing(false);
                                                setEditContent(message.content);
                                            }
                                        }}
                                        onBlur={handleEdit}
                                        autoFocus
                                        style={{
                                            background: 'transparent',
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            outline: 'none',
                                            color: 'inherit',
                                            font: 'inherit',
                                            width: '100%',
                                            fontSize: '13px'
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: 'absolute',
                                            bottom: -20,
                                            right: 0,
                                            fontSize: '0.6rem',
                                            opacity: 0.7,
                                            color: message.isOwn
                                                ? alpha(theme.palette.primary.contrastText, 0.6)
                                                : theme.palette.text.secondary
                                        }}
                                    >
                                        Press Enter to save, Esc to cancel
                                    </Typography>
                                </Box>
                            ) : message.content ? (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        wordBreak: 'break-word',
                                        lineHeight: 1.6,
                                        fontSize: { xs: '13px', sm: '14px', md: '15px' },
                                        fontWeight: 400,
                                        letterSpacing: 0.3,
                                        color: message.isOwn
                                            ? theme.palette.primary.contrastText
                                            : theme.palette.text.primary,
                                        textShadow: message.isOwn
                                            ? `0 1px 2px ${alpha(theme.palette.common.black, 0.1)}`
                                            : 'none'
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            ) : null}

                            {/* Enhanced Media Content Section */}
                            {!isTextOnlyMessage && message.type !== 'text' && (
                                <Box
                                    sx={{
                                        mt: message.content ? 1.5 : 0,
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        background: alpha(theme.palette.background.paper, 0.3),
                                        backdropFilter: 'blur(8px)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                        p: 0.5
                                    }}
                                >
                                    {renderMediaContent()}
                                </Box>
                            )}

                            {/* Enhanced Message Info */}
                            {message.content && (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{
                                        mt: 1.5,
                                        justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
                                        opacity: 0.85
                                    }}
                                >
                                    {message.isPinned && (
                                        <Tooltip title="Pinned Message" placement="top">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                                                <Pin size={14} color={theme.palette.warning.main} style={{ opacity: 0.9, strokeWidth: 2.5 }} />
                                            </Box>
                                        </Tooltip>
                                    )}
                                    {message.isEdited && (
                                        <Chip
                                            label="edited"
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: { xs: 16, sm: 18 },
                                                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                                fontStyle: 'italic',
                                                borderColor: message.isOwn
                                                    ? alpha(theme.palette.primary.contrastText, 0.3)
                                                    : alpha(theme.palette.text.secondary, 0.3),
                                                color: message.isOwn
                                                    ? alpha(theme.palette.primary.contrastText, 0.7)
                                                    : theme.palette.text.secondary,
                                                backgroundColor: 'transparent'
                                            }}
                                        />
                                    )}
                                    {!message.isOwn && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                opacity: 0.9,
                                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                fontWeight: 600,
                                                color: message.isOptimistic
                                                    ? alpha(theme.palette.text.secondary, 0.5)
                                                    : theme.palette.text.secondary,
                                                letterSpacing: 0.2
                                            }}
                                        >
                                            {getMessageTime()}
                                        </Typography>
                                    )}
                                    {message.isOwn && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    opacity: 0.9,
                                                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                    fontWeight: 600,
                                                    color: message.isOptimistic
                                                        ? alpha(theme.palette.text.secondary, 0.5)
                                                        : alpha(theme.palette.primary.contrastText, 0.8),
                                                    letterSpacing: 0.2
                                                }}
                                            >
                                                {getMessageTime()}
                                            </Typography>
                                            <Box sx={{ ml: 0.5 }}>
                                                {getReadStatus()}
                                            </Box>
                                        </Box>
                                    )}
                                </Stack>
                            )}
                        </Paper>

                        {/* Enhanced Message Actions - Keep only More Options */}
                        <Box
                            className="message-actions"
                            sx={{
                                opacity: 0,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                                flexDirection: 'column',
                                gap: 0.5,
                                position: 'absolute',
                                [message.isOwn ? 'left' : 'right']: { xs: -32, sm: -50 },
                                top: '50%',
                                transform: `translateY(-50%) ${message.isOwn ? 'translateX(10px)' : 'translateX(-10px)'}`
                            }}
                        >
                            {/* Add Reaction Button */}
                            <Tooltip title="Add Reaction" placement="left">
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setShowReactions(!showReactions);
                                        setMenuAnchor(null); // Close menu if open
                                    }}
                                    sx={{
                                        width: { xs: 32, sm: 36 },
                                        height: { xs: 32, sm: 36 },
                                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.12)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.1)}`,
                                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                        color: theme.palette.secondary.main,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.secondary.main, 0.08),
                                            transform: 'scale(1.15) rotate(5deg)',
                                            boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.2)}`,
                                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                                        },
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                >
                                    <Typography sx={{ fontSize: '1.1rem' }}>😊</Typography>
                                </IconButton>
                            </Tooltip>
                            
                            {/* More Options Menu Button */}
                            <Tooltip title="More Options" placement="left">
                                <IconButton
                                    size="small"
                                    onClick={handleMenuOpen}
                                    sx={{
                                        width: { xs: 32, sm: 36 },
                                        height: { xs: 32, sm: 36 },
                                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.12)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.1)}`,
                                        border: `1px solid ${alpha(theme.palette.text.secondary, 0.1)}`,
                                        color: theme.palette.text.secondary,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.text.secondary, 0.08),
                                            transform: 'scale(1.15) rotate(5deg)',
                                            boxShadow: `0 8px 25px ${alpha(theme.palette.text.secondary, 0.15)}`,
                                            border: `1px solid ${alpha(theme.palette.text.secondary, 0.3)}`,
                                            color: theme.palette.text.primary
                                        },
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                >
                                    <MoreVertical size={16} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                                <Chip
                                    key={emoji}
                                    label={`${emoji} ${count}`}
                                    size="small"
                                    clickable
                                    onClick={() => handleReaction(emoji)}
                                    sx={{
                                        height: { xs: 20, sm: 24 },
                                        fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    {/* Enhanced Reaction Picker */}
                    {showReactions && (
                        <Paper
                            elevation={8}
                            sx={{
                                p: { xs: 1, sm: 2 },
                                mt: 1.5,
                                display: 'flex',
                                gap: { xs: 0.5, sm: 1 },
                                borderRadius: '20px',
                                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                                backdropFilter: 'blur(24px)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.15)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                                animation: 'slideInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                '@keyframes slideInUp': {
                                    '0%': {
                                        opacity: 0,
                                        transform: 'translateY(20px) scale(0.9)'
                                    },
                                    '100%': {
                                        opacity: 1,
                                        transform: 'translateY(0) scale(1)'
                                    }
                                }
                            }}
                        >
                            {commonReactions.map((emoji, index) => (
                                <IconButton
                                    key={emoji}
                                    size="medium"
                                    onClick={() => handleReaction(emoji)}
                                    sx={{
                                        width: { xs: 36, sm: 44 },
                                        height: { xs: 36, sm: 44 },
                                        borderRadius: '50%',
                                        border: `2px solid transparent`,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.grey[100], 0.6)})`,
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        animation: `popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`,
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            transform: 'scale(1.2) rotate(10deg)',
                                            border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`
                                        },
                                        '@keyframes popIn': {
                                            '0%': {
                                                opacity: 0,
                                                transform: 'scale(0.3) rotate(-10deg)'
                                            },
                                            '80%': {
                                                transform: 'scale(1.1) rotate(5deg)'
                                            },
                                            '100%': {
                                                opacity: 1,
                                                transform: 'scale(1) rotate(0deg)'
                                            }
                                        }
                                    }}
                                >
                                    <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>{emoji}</Typography>
                                </IconButton>
                            ))}
                        </Paper>
                    )}

                    {/* Enhanced Thread View */}
                    {showThread && (
                        <Box sx={{ mt: 1.5, ml: 1, pl: 2, borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.3)}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                                    Thread Replies
                                </Typography>
                                <IconButton size="small" onClick={() => setShowThread(false)}>
                                    <X size={14} />
                                </IconButton>
                            </Box>
                            {(message.replies || []).length > 0 ? (
                                (message.replies || []).map((reply) => (
                                    <Box key={reply.id} sx={{ mb: 1 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1,
                                                borderRadius: '12px',
                                                background: alpha(theme.palette.grey[300], 0.2),
                                                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                {reply.content}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                                {format(new Date(reply.createdAt), 'HH:mm')}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                ))
                            ) : (
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                                    No replies in this thread yet
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Sent message timestamp and status for own messages */}
                {message.isOwn && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 0.5,
                            ml: 1
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                opacity: 0.8
                            }}
                        >
                            {getMessageTime()}
                        </Typography>
                        <Box sx={{ color: message.isOptimistic ? alpha(theme.palette.text.secondary, 0.5) : theme.palette.text.secondary }}>
                            {getReadStatus()}
                        </Box>
                    </Box>
                )}

                {/* Context Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => { handleMenuClose(); onReply?.(); }}>
                        <ListItemIcon>
                            <Reply size={16} />
                        </ListItemIcon>
                        <ListItemText>Reply</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={() => { handleMenuClose(); onForward?.(); }}>
                        <ListItemIcon>
                            <Forward size={16} />
                        </ListItemIcon>
                        <ListItemText>Forward</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleCopy}>
                        <ListItemIcon>
                            <Copy size={16} />
                        </ListItemIcon>
                        <ListItemText>Copy</ListItemText>
                    </MenuItem>

                    {message.isOwn && !message.isDeleted && (
                        <MenuItem onClick={() => { handleMenuClose(); setIsEditing(true); }}>
                            <ListItemIcon>
                                <Edit size={16} />
                            </ListItemIcon>
                            <ListItemText>Edit</ListItemText>
                        </MenuItem>
                    )}

                    {message.isOwn && (
                        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                            <ListItemIcon>
                                <Trash2 size={16} color={theme.palette.error.main} />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    )}
                    
                    {/* Pin/Unpin Message */}
                    <MenuItem onClick={() => { handleMenuClose(); handlePinMessage(); }}>
                        <ListItemIcon>
                            <Pin size={16} />
                        </ListItemIcon>
                        <ListItemText>{isPinned ? 'Unpin' : 'Pin'}</ListItemText>
                    </MenuItem>
                    
                    {/* Archive/Unarchive Message */}
                    <MenuItem onClick={() => { handleMenuClose(); handleArchiveMessage(); }}>
                        <ListItemIcon>
                            <Archive size={16} />
                        </ListItemIcon>
                        <ListItemText>{isArchived ? 'Unarchive' : 'Archive'}</ListItemText>
                    </MenuItem>
                    
                    {/* Mute/Unmute Conversation */}
                    <MenuItem onClick={() => { handleMenuClose(); handleMuteToggle(); }}>
                        <ListItemIcon>
                            {isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </ListItemIcon>
                        <ListItemText>{isMuted ? 'Unmute' : 'Mute'}</ListItemText>
                    </MenuItem>
                    
                    {/* Reply All */}
                    <MenuItem onClick={() => { handleMenuClose(); handleReplyAll(); }}>
                        <ListItemIcon>
                            <Reply size={16} />
                        </ListItemIcon>
                        <ListItemText>Reply All</ListItemText>
                    </MenuItem>
                    
                    {/* Thread Message */}
                    <MenuItem onClick={() => { handleMenuClose(); handleThread(); }}>
                        <ListItemIcon>
                            <MessageCircle size={16} />
                        </ListItemIcon>
                        <ListItemText>Thread</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>

            {/* Image Dialog */}
            <Dialog
                open={showImageDialog}
                onClose={() => setShowImageDialog(false)}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogContent sx={{ p: 0 }}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Full size"
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '80vh',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowImageDialog(false)}>Close</Button>
                    {selectedImage && (
                        <Button onClick={() => window.open(selectedImage, '_blank')}>
                            Download
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

export default EnhancedMessageBubbleV2;