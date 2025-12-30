import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  useTheme,
  alpha,
  LinearProgress,
  Chip,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Image as ImageIcon,
  Video,
  Mic,
  File,
  X,
  Send,
  Play,
  Pause,
  Camera,
  Video as VideoIcon,
  Mic as MicIcon,
  FileUp,
  Upload,
  Trash2,
  Check
} from 'lucide-react';
import UnifiedImageMedia from '../media/UnifiedImageMedia';
import UnifiedVideoMedia from '../media/UnifiedVideoMedia';

interface MediaFile {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
  duration?: number;
}

interface MediaMessageUploadProps {
  onSend: (files: File[], message?: string) => Promise<void>;
  onCancel?: () => void;
  initialMessage?: string;
  disabled?: boolean;
}

const MediaMessageUpload: React.FC<MediaMessageUploadProps> = ({
  onSend,
  onCancel,
  initialMessage = '',
  disabled = false
}) => {
  const theme = useTheme();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [message, setMessage] = useState(initialMessage);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Simple frontend validation rules
  const MAX_IMAGE_MB = 20;
  const MAX_VIDEO_MB = 200;
  const MAX_AUDIO_MB = 50;
  const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/webm', 'video/avi', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg'];
  const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm'];

  const validateFile = (file: File, type: 'image' | 'video' | 'audio' | 'file'): boolean => {
    const sizeMB = file.size / (1024 * 1024);
    const mime = file.type;

    if (type === 'image') {
      if (!IMAGE_TYPES.includes(mime)) {
        alert('Unsupported image type. Use JPG, PNG, GIF, or WebP.');
        return false;
      }
      if (sizeMB > MAX_IMAGE_MB) {
        alert(`Image exceeds ${MAX_IMAGE_MB}MB.`);
        return false;
      }
    }

    if (type === 'video') {
      if (!VIDEO_TYPES.includes(mime)) {
        alert('Unsupported video type. Use MP4, MOV, WEBM, AVI.');
        return false;
      }
      if (sizeMB > MAX_VIDEO_MB) {
        alert(`Video exceeds ${MAX_VIDEO_MB}MB.`);
        return false;
      }
    }

    if (type === 'audio') {
      // Check if the MIME type starts with any of the supported audio types (to handle codecs like 'audio/webm;codecs=opus')
      const isSupportedAudioType = AUDIO_TYPES.some(type => mime.startsWith(type));
      if (!isSupportedAudioType) {
        alert('Unsupported audio type. Use MP3, WAV, AAC, OGG, or WEBM.');
        return false;
      }
      if (sizeMB > MAX_AUDIO_MB) {
        alert(`Audio exceeds ${MAX_AUDIO_MB}MB.`);
        return false;
      }
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'file') => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: MediaFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (!file || !validateFile(file, type)) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const mediaFile: MediaFile = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl,
        type,
        name: file.name,
        size: file.size
      };

      newFiles.push(mediaFile);
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    // Reset the input to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(file => file.id !== id);
      // Revoke the preview URL to free up memory
      const fileToRemove = prev.find(file => file.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return newFiles;
    });
  };

  const handleSend = async () => {
    if (files.length === 0 && !recordedAudio) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a progress handler for the upload
      const progressHandler = (progress: number) => {
        setUploadProgress(progress);
      };

      // Get files to upload
      const filesToUpload = files.map(f => f.file);
      
      if (recordedAudio) {
        // Create a file from the recorded audio
        const audioFile = new (window.File)([recordedAudio], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        filesToUpload.push(audioFile);
      }

      // Call the onSend callback with the files
      await onSend(filesToUpload, message);
      
      // Reset state after successful send
      setFiles([]);
      setMessage('');
      setRecordedAudio(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to send media: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
                        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' :
                        'audio/mp4';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          console.warn('No audio data recorded');
          stream.getTracks().forEach(t => t.stop());
          setRecording(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert(`Microphone access denied or not available: ${(err as Error).message || err}`);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (err) {
        console.error('Error stopping recording:', err);
        if (recorder.stream) {
          recorder.stream.getTracks().forEach(t => t.stop());
        }
      }
    }
  };

  const playRecordedAudio = () => {
    if (!recordedAudio || !audioRef.current) return;

    const audioUrl = URL.createObjectURL(recordedAudio);
    audioRef.current.src = audioUrl;
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        setCurrentPlaying('recorded');
      })
      .catch(err => {
        console.error('Error playing audio:', err);
      });
  };

  const pauseRecordedAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentPlaying(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePreviewMedia = (media: MediaFile) => {
    setPreviewMedia(media);
    setShowPreviewDialog(true);
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.previewUrl));
      if (recordedAudio) {
        URL.revokeObjectURL(URL.createObjectURL(recordedAudio));
      }
    };
  }, [files, recordedAudio]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        backdropFilter: 'blur(10px)',
        position: 'relative'
      }}
    >
      {/* Hidden audio element for playing recorded audio */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentPlaying(null);
        }}
        onTimeUpdate={() => {
          // Update playhead if needed
        }}
        style={{ display: 'none' }}
      />

      {/* Progress bar when uploading */}
      {uploading && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ 
              borderRadius: '8px 8px 0 0',
              '& .MuiLinearProgress-bar': {
                bgcolor: theme.palette.primary.main
              }
            }} 
          />
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Media Upload
        </Typography>
        <Chip 
          label={`${files.length + (recordedAudio ? 1 : 0)} file(s)`} 
          size="small" 
          sx={{ ml: 1 }} 
        />
      </Box>

      {/* Media selection buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' }, width: '100%' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, 'image')}
          accept="image/*"
          style={{ display: 'none' }}
          multiple
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<ImageIcon size={16} />}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          sx={{ flex: { xs: 1, sm: 'none' }, minHeight: 40, width: { xs: '100%', sm: 'auto' } }}
        >
          Image
        </Button>

        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileChange(e, 'video')}
          accept="video/*"
          style={{ display: 'none' }}
          multiple
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<VideoIcon size={16} />}
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled}
          sx={{ flex: { xs: 1, sm: 'none' }, minHeight: 40, width: { xs: '100%', sm: 'auto' } }}
        >
          Video
        </Button>

        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => handleFileChange(e, 'audio')}
          accept="audio/*"
          style={{ display: 'none' }}
          multiple
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<MicIcon size={16} />}
          onClick={() => audioInputRef.current?.click()}
          disabled={disabled}
          sx={{ flex: { xs: 1, sm: 'none' }, minHeight: 40, width: { xs: '100%', sm: 'auto' } }}
        >
          Audio
        </Button>

        <Button
          variant={recording ? "contained" : "outlined"}
          size="small"
          startIcon={recording ? <Pause size={16} /> : <MicIcon size={16} />}
          onClick={recording ? stopRecording : startRecording}
          color={recording ? "error" : "primary"}
          disabled={disabled}
          sx={{ flex: { xs: 1, sm: 'none' }, minHeight: 40, width: { xs: '100%', sm: 'auto' } }}
        >
          {recording ? "Stop" : "Record"}
        </Button>
      </Box>

      {/* Message input */}
      <Box sx={{ mb: 2 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a caption..."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            backgroundColor: alpha(theme.palette.background.paper, 0.5),
            color: theme.palette.text.primary,
            resize: 'vertical',
            minHeight: '60px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        />
      </Box>

      {/* Uploaded files list */}
      {(files.length > 0 || recordedAudio) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 1, display: 'block' }}>
            Selected Media:
          </Typography>
          
          <List dense>
            {files.map((file) => (
              <ListItem
                key={file.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveFile(file.id)}>
                    <X size={16} />
                  </IconButton>
                }
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.3),
                  borderRadius: 1,
                  mb: 1,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      width: 32,
                      height: 32
                    }}
                  >
                    {file.type === 'image' && <ImageIcon size={16} />}
                    {file.type === 'video' && <Video size={16} />}
                    {file.type === 'audio' && <Mic size={16} />}
                    {file.type === 'file' && <File size={16} />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography 
                      noWrap 
                      sx={{ 
                        fontSize: '0.8rem',
                        cursor: file.type === 'image' || file.type === 'video' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (file.type === 'image' || file.type === 'video') {
                          handlePreviewMedia(file);
                        }
                      }}
                    >
                      {file.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {formatFileSize(file.size)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}

            {recordedAudio && (
              <ListItem
                secondaryAction={
                  <IconButton edge="end" onClick={() => setRecordedAudio(null)}>
                    <X size={16} />
                  </IconButton>
                }
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.3),
                  borderRadius: 1,
                  mb: 1,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      width: 32,
                      height: 32
                    }}
                  >
                    <Mic size={16} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.8rem' }}>
                      Voice Message
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {formatFileSize(recordedAudio.size)}
                    </Typography>
                  }
                />
                <IconButton
                  size="small"
                  onClick={isPlaying && currentPlaying === 'recorded' ? pauseRecordedAudio : playRecordedAudio}
                >
                  {isPlaying && currentPlaying === 'recorded' ? <Pause size={16} /> : <Play size={16} />}
                </IconButton>
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-end' } }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<X size={16} />}
            onClick={onCancel}
            disabled={disabled}
            sx={{ flex: { xs: 1, sm: 'none' }, width: { xs: '100%', sm: 'auto' } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Send size={16} />}
            onClick={handleSend}
            disabled={disabled || (files.length === 0 && !recordedAudio) || uploading}
            sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark }, flex: { xs: 1, sm: 'none' }, width: { xs: '100%', sm: 'auto' } }}
          >
            {uploading ? <CircularProgress size={16} /> : 'Send'}
          </Button>
        </Box>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{previewMedia?.name}</Typography>
            <IconButton onClick={() => setShowPreviewDialog(false)}>
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {previewMedia && (
            <Box sx={{ textAlign: 'center' }}>
              {previewMedia.type === 'image' ? (
                <UnifiedImageMedia
                  src={previewMedia.previewUrl}
                  alt={previewMedia.name}
                  maxHeight="60vh"
                />
              ) : previewMedia.type === 'video' ? (
                <UnifiedVideoMedia
                  src={previewMedia.previewUrl}
                  alt={previewMedia.name}
                  maxHeight="60vh"
                />
              ) : (
                <Typography variant="body2" sx={{ py: 4 }}>
                  Preview not available for this file type
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default MediaMessageUpload;