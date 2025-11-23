import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Paper,
    useTheme,
    alpha,
    Tooltip,
    Slider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip
} from '@mui/material';
import {
    Play,
    Pause,
    MoreVertical,
    Mic,
    FileAudio,
    Reply,
    Forward
} from 'lucide-react';

interface VoiceMessageBubbleProps {
    audioUrl: string;
    filename: string;
    duration?: number;
    fileSize?: number;
    isOwn: boolean;
    timestamp: string;
    onDownload?: () => void;
    onDelete?: () => void;
    onForward?: () => void;
    onReply?: () => void;
}

const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
    audioUrl,
    filename,
    duration = 0,
    fileSize,
    isOwn,
    timestamp,
    onDownload,
    onDelete,
    onForward,
    onReply
}) => {
    const theme = useTheme();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);
    const [isLoading, setIsLoading] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Set default volume to 100% to ensure audio is audible and unmute
        audio.volume = 1.0;
        audio.muted = false;

        // Validate audio URL
        if (!audioUrl || typeof audioUrl !== 'string') {
          console.error('Invalid audio URL provided to VoiceMessageBubble:', audioUrl);
          setIsLoading(false);
          return;
        }

        // Check if URL is valid
        try {
          new URL(audioUrl);
        } catch (e) {
          console.error('Invalid audio URL format:', audioUrl);
          setIsLoading(false);
          return;
        }

        // Check if audio file exists and is accessible
        fetch(audioUrl, { method: 'HEAD' })
          .then(response => {
            if (!response.ok) {
              console.error('Audio file is not accessible:', response.status, response.statusText);
              alert('Audio file is not accessible. It may have been deleted or the URL is incorrect.');
            } else {
              console.log('Audio file is accessible:', response.status);
            }
          })
          .catch(error => {
            console.error('Error checking audio file accessibility:', error);
          });

        const handleLoadedMetadata = () => {
          setAudioDuration(audio.duration || 0);
          setIsLoading(false);
          
          // Ensure volume is set to 100% and audio is not muted when metadata is loaded
          audio.volume = 1.0;
          audio.muted = false;
          
          // Log audio information for debugging
          console.log('Audio metadata loaded:', {
            duration: audio.duration,
            currentTime: audio.currentTime,
            volume: audio.volume,
            muted: audio.muted,
            src: audio.src,
            readyState: audio.readyState
          });
          
          // If duration is 0 or NaN, there might be an issue with the audio file
          if (!audio.duration || isNaN(audio.duration)) {
            console.warn('Audio file may be invalid - duration is zero or NaN');
          }
        };

        const handleTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
          
          // Log time updates for debugging
          console.log('Audio time update:', {
            currentTime: audio.currentTime,
            duration: audio.duration,
            volume: audio.volume,
            muted: audio.muted
          });
          
          // Ensure volume remains at 100% and audio is not muted during playback
          if (isPlaying && (audio.volume !== 1.0 || audio.muted)) {
            audio.volume = 1.0;
            audio.muted = false;
            console.log('Volume corrected during playback:', { volume: audio.volume, muted: audio.muted });
          }
        };

        const handleEnded = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          console.log('Audio playback ended');
        };

        const handleLoadStart = () => {
          setIsLoading(true);
          console.log('Audio load started');
          // Ensure volume is set when loading starts
          audio.volume = 1.0;
          audio.muted = false;
        };

        const handleCanPlay = () => {
          setIsLoading(false);
          
          // Ensure volume is set to 100% and audio is not muted when ready to play
          audio.volume = 1.0;
          audio.muted = false;
          
          // Log when audio is ready to play
          console.log('Audio can play:', {
            duration: audio.duration,
            readyState: audio.readyState,
            networkState: audio.networkState,
            volume: audio.volume,
            muted: audio.muted
          });
        };

        const handleError = (e: any) => {
          console.error('Audio error:', e);
          console.error('Audio error details:', {
            error: e,
            src: audio.src,
            networkState: audio.networkState,
            readyState: audio.readyState,
            volume: audio.volume,
            muted: audio.muted
          });
          setIsLoading(false);
          alert('Failed to load audio. The file may be corrupted or unsupported.');
        };

        // Add load event listener to ensure audio is properly loaded
        const handleLoad = () => {
          console.log('Audio loaded:', {
            duration: audio.duration,
            readyState: audio.readyState,
            networkState: audio.networkState,
            volume: audio.volume,
            muted: audio.muted
          });
          // Ensure volume is set when loaded
          audio.volume = 1.0;
          audio.muted = false;
        };

        // Set up event listeners
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);
        audio.addEventListener('load', handleLoad);

        // Preload audio for better performance
        audio.preload = 'metadata';
        
        // Force load the audio
        audio.load();

        return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('loadstart', handleLoadStart);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('load', handleLoad);
        };
    }, [audioUrl]);

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) {
            console.error('Audio element not found');
            return;
        }

        // Log current audio state for debugging
        console.log('Audio play/pause requested:', {
            readyState: audio.readyState,
            networkState: audio.networkState,
            currentTime: audio.currentTime,
            duration: audio.duration,
            volume: audio.volume,
            muted: audio.muted,
            paused: audio.paused,
            src: audio.src
        });

        // Ensure volume is set to 100% before playing and unmute
        audio.volume = 1.0;
        audio.muted = false;

        if (isPlaying) {
            console.log('Pausing audio');
            audio.pause();
            setIsPlaying(false);
        } else {
            // Check if we have a valid audio source
            if (!audio.src || audio.src === window.location.href) {
                console.error('Audio source is invalid or missing');
                alert('Audio source is invalid. The file may not have uploaded correctly.');
                return;
            }

            // Reset audio to start if we've reached the end
            if (audio.currentTime >= audio.duration && audio.duration > 0) {
                console.log('Resetting audio to start');
                audio.currentTime = 0;
            }
            
            // Check if audio can play
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                console.log('Playing audio directly');
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // Ensure volume is still set after play starts
                        audio.volume = 1.0;
                        audio.muted = false;
                        console.log('Audio playback started successfully with volume:', audio.volume, 'muted:', audio.muted);
                    }).catch(error => {
                        console.error('Audio playback failed:', error);
                        // Handle autoplay policy restrictions
                        if (error.name === 'NotAllowedError') {
                            console.log('Autoplay policy requires user interaction, showing play button');
                            // Show a visual indicator that the user needs to click play
                            alert('Please click the play button to start audio playback.');
                        } else {
                            // Try to reload the audio
                            console.log('Reloading audio and trying again');
                            audio.load();
                            setTimeout(() => {
                                // Set volume again before retry
                                audio.volume = 1.0;
                                audio.muted = false;
                                audio.play().then(() => {
                                    console.log('Audio playback started successfully on retry with volume:', audio.volume, 'muted:', audio.muted);
                                }).catch(err => {
                                    console.error('Audio playback failed after reload:', err);
                                    alert('Failed to play audio. The file may be corrupted or unsupported.');
                                });
                            }, 100);
                        }
                    });
                }
                setIsPlaying(true);
            } else {
                console.log('Audio not ready, loading first');
                // Load audio and then play
                audio.load();
                audio.addEventListener('canplay', () => {
                    console.log('Audio can play, starting playback');
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            // Ensure volume is still set after play starts
                            audio.volume = 1.0;
                            audio.muted = false;
                            console.log('Audio playback started successfully with volume:', audio.volume, 'muted:', audio.muted);
                        }).catch(error => {
                            console.error('Audio playback failed:', error);
                            // Handle autoplay policy restrictions
                            if (error.name === 'NotAllowedError') {
                                console.log('Autoplay policy requires user interaction, showing play button');
                                alert('Please click the play button to start audio playback.');
                            } else {
                                alert('Failed to play audio. The file may be corrupted or unsupported.');
                            }
                        });
                    }
                    setIsPlaying(true);
                }, { once: true });
            }
        }
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const audio = audioRef.current;
        if (!audio) return;

        const seekTime = (newValue as number) * audioDuration / 100;
        audio.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleSkip = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = Math.max(0, Math.min(audioDuration, currentTime + seconds));
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const changePlaybackRate = (rate: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = rate;
        setPlaybackRate(rate);
        setMenuAnchor(null);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    // Handle known missing files
    const isKnownMissingFile = audioUrl && typeof audioUrl === 'string' && (
      audioUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
      audioUrl.includes('file_1760163879851_tt3fdqqim9') ||
      audioUrl.includes('file_1760263843073_w13593s5t8l') ||
      audioUrl.includes('file_1760276276250_3pqeekj048s')
    );

    // If it's a known missing file, hide the element
    if (isKnownMissingFile) {
        console.warn('Known missing file detected in voice message, hiding element:', audioUrl);
        return null; // Don't render anything for known missing files
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover .voice-message-actions': {
                    opacity: 1
                }
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 0.75,
                    borderRadius: 2,
                    minWidth: 100,
                    maxWidth: 140,
                    bgcolor: isOwn
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        bgcolor: isOwn ? theme.palette.primary.main : theme.palette.secondary.main,
                        opacity: 0.6
                    }
                }}
            >
                {/* Ultra Compact Header with inline layout */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                            onClick={handlePlayPause}
                            disabled={isLoading}
                            sx={{
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                width: 20,
                                height: 20,
                                minWidth: 'unset',
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark,
                                },
                                '&.Mui-disabled': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                                }
                            }}
                        >
                            {isLoading ? (
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        border: `1px solid ${theme.palette.primary.contrastText}`,
                                        borderTop: '1px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        '@keyframes spin': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' }
                                        }
                                    }}
                                />
                            ) : isPlaying ? (
                                <Pause size={10} />
                            ) : (
                                <Play size={10} />
                            )}
                        </IconButton>
                        <Mic size={8} color={theme.palette.primary.main} />
                        <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ fontSize: '0.6rem' }}>Voice</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                            {formatTime(currentTime)} / {formatTime(audioDuration)}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 }, width: 16, height: 16, minWidth: 'unset' }}
                        >
                            <MoreVertical size={8} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Removed Waveform - Using simple progress bar instead */}

                {/* Removed duplicate controls - now integrated in header */}

                {/* Minimal Progress Bar */}
                <Box sx={{ px: 0.5, mb: 0 }}>
                    <Slider
                        value={progress}
                        onChange={handleSeek}
                        size="small"
                        sx={{
                            height: 1.5,
                            '& .MuiSlider-track': {
                                bgcolor: theme.palette.primary.main,
                                border: 'none'
                            },
                            '& .MuiSlider-rail': {
                                bgcolor: alpha(theme.palette.text.secondary, 0.15)
                            },
                            '& .MuiSlider-thumb': {
                                width: 4,
                                height: 4,
                                bgcolor: theme.palette.primary.main,
                                '&:hover': {
                                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`
                                }
                            }
                        }}
                    />
                </Box>

                {/* Removed Footer - timestamp already in main message */}

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    style={{ display: 'none' }}
                />

                {/* Simplified Context Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => changePlaybackRate(0.75)}>0.75x Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1)}>Normal Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.25)}>1.25x Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.5)}>1.5x Speed</MenuItem>

                    {onReply && (
                        <MenuItem onClick={() => { onReply(); setMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Reply size={16} />
                            </ListItemIcon>
                            <ListItemText>Reply</ListItemText>
                        </MenuItem>
                    )}

                    {onForward && (
                        <MenuItem onClick={() => { onForward(); setMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Forward size={16} />
                            </ListItemIcon>
                            <ListItemText>Forward</ListItemText>
                        </MenuItem>
                    )}

                    {onDelete && (
                        <MenuItem
                            onClick={() => { onDelete(); setMenuAnchor(null); }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <FileAudio size={16} color={theme.palette.error.main} />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    )}
                </Menu>
            </Paper>

            {/* Quick Action Buttons */}
            <Box
                className="voice-message-actions"
                sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    gap: 0.5
                }}
            >
                <IconButton
                    size="small"
                    onClick={() => onReply?.()}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                    title="Reply"
                >
                    <Reply size={14} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={() => onForward?.()}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                    title="Forward"
                >
                    <Forward size={14} />
                </IconButton>
            </Box>
        </Box>
    );
};

export default VoiceMessageBubble;