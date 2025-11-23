import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Avatar,
  Paper,
  Chip,
  useTheme,
  alpha,
  Grid
} from '@mui/material';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Minimize2,
  Maximize2,
  Circle,
  Square,
  Pause,
  Play,
  UserPlus,
  VolumeX,
  Lock,
  Unlock,
  Users,
  Crown
} from 'lucide-react';
import { Call } from '@/services/callService';
import CallQualityDialog from './CallQualityDialog';
import InviteParticipantsDialog from './InviteParticipantsDialog';

interface CallInterfaceProps {
  call: Call | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isRecording?: boolean;
  isOnHold?: boolean;
  isLocked?: boolean;
  isModerator?: boolean;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStartRecording?: () => Promise<void>;
  onStopRecording?: () => Promise<void>;
  onHoldCall?: (onHold: boolean) => Promise<void>;
  onTransferCall?: (targetUserId: string) => Promise<void>;
  onMuteParticipant?: (participantId: string, muted: boolean) => Promise<void>;
  onReportQuality?: (callId: string, quality: any) => Promise<void>;
  onInviteParticipants?: (userIds: string[]) => Promise<void>;
  onRemoveParticipant?: (userId: string) => Promise<void>;
  onMuteAllParticipants?: () => Promise<void>;
  onPromoteParticipant?: (userId: string) => Promise<void>;
  onLockCall?: () => Promise<void>;
  onUnlockCall?: () => Promise<void>;
  onEndCallForAll?: () => Promise<void>;
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  call,
  localStream,
  remoteStreams,
  isAudioEnabled,
  isVideoEnabled,
  isRecording = false,
  isOnHold = false,
  isLocked = false,
  isModerator = false,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onStartRecording,
  onStopRecording,
  onHoldCall,
  onTransferCall,
  onMuteParticipant,
  onReportQuality,
  onInviteParticipants,
  onRemoveParticipant,
  onMuteAllParticipants,
  onPromoteParticipant,
  onLockCall,
  onUnlockCall,
  onEndCallForAll
}) => {
  const theme = useTheme();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Setup local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video streams
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Call duration timer
  useEffect(() => {
    if (call && call.status === 'active') {
      const startTime = new Date(call.startedAt).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        const duration = Math.floor((now - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
    // Return undefined when the condition is not met
    return undefined;
  }, [call]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getParticipantName = (userId: string): string => {
    if (call?.initiator.id === userId) {
      return call.initiator.displayName;
    }
    const participant = call?.participants.find(p => p.userId.id === userId);
    return participant?.userId.displayName || 'Unknown';
  };

  const getParticipantAvatar = (userId: string): string | undefined => {
    if (call?.initiator.id === userId) {
      return call.initiator.avatar;
    }
    const participant = call?.participants.find(p => p.userId.id === userId);
    return participant?.userId.avatar;
  };

  const getParticipantRole = (userId: string): string => {
    const participant = call?.participants.find(p => p.userId.id === userId);
    return participant?.role || 'participant';
  };

  const handleEndCall = async () => {
    if (call && onReportQuality) {
      setShowQualityDialog(true);
    }
    onEndCall();
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        // Handle screen share end
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
          };
        }
      } else {
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleQualitySubmit = async (quality: any) => {
    if (call && onReportQuality) {
      await onReportQuality(call.callId, quality);
    }
    setShowQualityDialog(false);
  };

  if (!call) return null;

  const isVideoCall = call.type === 'video';
  const remoteStreamArray = Array.from(remoteStreams.entries());

  return (
    <Dialog
      open={!!call}
      fullScreen={!isMinimized}
      maxWidth={isMinimized ? "sm" : false}
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.default,
          ...(isMinimized && {
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 400,
            height: 300,
            margin: 0,
            borderRadius: 2
          })
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', position: 'relative' }}>
        {/* Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)}, transparent)`,
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant="h6" color="white">
              {isVideoCall ? 'Video Call' : 'Voice Call'}
            </Typography>
            <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
              {formatDuration(callDuration)}
            </Typography>
          </Box>

          <IconButton
            onClick={() => setIsMinimized(!isMinimized)}
            sx={{ color: 'white' }}
          >
            {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
          </IconButton>
        </Box>

        {/* Video Area */}
        {isVideoCall ? (
          <Box sx={{ height: '100%', position: 'relative' }}>
            {/* Remote Videos */}
            {remoteStreamArray.length > 0 ? (
              <Grid container sx={{ height: '100%' }}>
                {remoteStreamArray.map(([userId, stream], index) => (
                  <Grid
                    key={userId}
                    item
                    xs={remoteStreamArray.length === 1 ? 12 : 6}
                    sx={{ height: remoteStreamArray.length === 1 ? '100%' : '50%' }}
                  >
                    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        ref={(el) => {
                          if (el) {
                            remoteVideoRefs.current.set(userId, el);
                            el.srcObject = stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          backgroundColor: '#000'
                        }}
                      />

                      {/* Participant Name */}
                      <Chip
                        label={getParticipantName(userId)}
                        size="small"
                        icon={getParticipantRole(userId) === 'moderator' ? <Crown size={14} /> : undefined}
                        sx={{
                          position: 'absolute',
                          bottom: 10,
                          left: 10,
                          backgroundColor: alpha(theme.palette.background.paper, 0.8)
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              // Waiting for participants
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }}
              >
                <Avatar
                  src={call.initiator.avatar}
                  sx={{ width: 120, height: 120, mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  Waiting for others to join...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {call.participants.length} participant(s) invited
                </Typography>
              </Box>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {localStream && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: 80,
                  right: 20,
                  width: isMinimized ? 100 : 200,
                  height: isMinimized ? 75 : 150,
                  overflow: 'hidden',
                  borderRadius: 2,
                  border: `2px solid ${theme.palette.primary.main}`
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror effect
                  }}
                />
                {!isVideoEnabled && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <VideoOff color="white" size={24} />
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        ) : (
          // Audio Call Interface
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`
            }}
          >
            <Avatar
              src={call.initiator.avatar}
              sx={{ width: 150, height: 150, mb: 3 }}
            />
            <Typography variant="h4" gutterBottom>
              {call.initiator.displayName}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {formatDuration(callDuration)}
            </Typography>

            {/* Participants Status */}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {call.participants.map((participant) => (
                <Chip
                  key={participant.userId.id}
                  avatar={<Avatar src={participant.userId.avatar} sx={{ width: 24, height: 24 }} />}
                  label={participant.userId.displayName}
                  variant={participant.status === 'joined' ? 'filled' : 'outlined'}
                  color={participant.status === 'joined' ? 'success' : 'default'}
                  size="small"
                  icon={participant.role === 'moderator' ? <Crown size={14} /> : undefined}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 3,
            background: `linear-gradient(0deg, ${alpha(theme.palette.background.paper, 0.95)}, transparent)`,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Stack direction="row" spacing={2}>
            {/* Audio Toggle */}
            <IconButton
              onClick={onToggleAudio}
              sx={{
                width: 56,
                height: 56,
                backgroundColor: isAudioEnabled ? alpha(theme.palette.primary.main, 0.1) : theme.palette.error.main,
                color: isAudioEnabled ? theme.palette.primary.main : 'white',
                '&:hover': {
                  backgroundColor: isAudioEnabled ? alpha(theme.palette.primary.main, 0.2) : theme.palette.error.dark
                }
              }}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </IconButton>

            {/* Video Toggle (only for video calls) */}
            {isVideoCall && (
              <IconButton
                onClick={onToggleVideo}
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: isVideoEnabled ? alpha(theme.palette.primary.main, 0.1) : theme.palette.error.main,
                  color: isVideoEnabled ? theme.palette.primary.main : 'white',
                  '&:hover': {
                    backgroundColor: isVideoEnabled ? alpha(theme.palette.primary.main, 0.2) : theme.palette.error.dark
                  }
                }}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </IconButton>
            )}

            {/* Screen Share (only for video calls) */}
            {isVideoCall && (
              <IconButton
                onClick={handleScreenShare}
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: isScreenSharing ? theme.palette.secondary.main : alpha(theme.palette.secondary.main, 0.1),
                  color: isScreenSharing ? 'white' : theme.palette.secondary.main,
                  '&:hover': {
                    backgroundColor: isScreenSharing ? theme.palette.secondary.dark : alpha(theme.palette.secondary.main, 0.2)
                  }
                }}
              >
                <Monitor size={24} />
              </IconButton>
            )}

            {/* Recording */}
            {(onStartRecording || onStopRecording) && (
              <IconButton
                onClick={isRecording ? onStopRecording : onStartRecording}
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: isRecording ? theme.palette.error.main : alpha(theme.palette.warning.main, 0.1),
                  color: isRecording ? 'white' : theme.palette.warning.main,
                  '&:hover': {
                    backgroundColor: isRecording ? theme.palette.error.dark : alpha(theme.palette.warning.main, 0.2)
                  },
                  ...(isRecording && {
                    animation: 'pulse 2s infinite'
                  })
                }}
              >
                {isRecording ? <Square size={24} /> : <Circle size={24} />}
              </IconButton>
            )}

            {/* Hold Call */}
            {onHoldCall && (
              <IconButton
                onClick={() => onHoldCall(!isOnHold)}
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: isOnHold ? theme.palette.warning.main : alpha(theme.palette.info.main, 0.1),
                  color: isOnHold ? 'white' : theme.palette.info.main,
                  '&:hover': {
                    backgroundColor: isOnHold ? theme.palette.warning.dark : alpha(theme.palette.info.main, 0.2)
                  }
                }}
              >
                {isOnHold ? <Play size={24} /> : <Pause size={24} />}
              </IconButton>
            )}

            {/* Transfer Call */}
            {onTransferCall && (
              <IconButton
                onClick={() => {
                  // This would open a transfer dialog
                  console.log('Transfer call clicked');
                }}
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.secondary.main, 0.2)
                  }
                }}
              >
                <UserPlus size={24} />
              </IconButton>
            )}

            {/* Moderator Controls */}
            {isModerator && (
              <>
                {/* Invite Participants */}
                {onInviteParticipants && (
                  <IconButton
                    onClick={() => setShowInviteDialog(true)}
                    sx={{
                      width: 56,
                      height: 56,
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.info.main, 0.2)
                      }
                    }}
                  >
                    <Users size={24} />
                  </IconButton>
                )}

                {/* Mute All Participants */}
                {onMuteAllParticipants && (
                  <IconButton
                    onClick={onMuteAllParticipants}
                    sx={{
                      width: 56,
                      height: 56,
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      color: theme.palette.warning.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.warning.main, 0.2)
                      }
                    }}
                  >
                    <VolumeX size={24} />
                  </IconButton>
                )}

                {/* Lock/Unlock Call */}
                {(onLockCall || onUnlockCall) && (
                  <IconButton
                    onClick={isLocked ? onUnlockCall : onLockCall}
                    sx={{
                      width: 56,
                      height: 56,
                      backgroundColor: isLocked ? theme.palette.secondary.main : alpha(theme.palette.secondary.main, 0.1),
                      color: isLocked ? 'white' : theme.palette.secondary.main,
                      '&:hover': {
                        backgroundColor: isLocked ? theme.palette.secondary.dark : alpha(theme.palette.secondary.main, 0.2)
                      }
                    }}
                  >
                    {isLocked ? <Unlock size={24} /> : <Lock size={24} />}
                  </IconButton>
                )}

                {/* End Call for All */}
                {onEndCallForAll && (
                  <IconButton
                    onClick={onEndCallForAll}
                    sx={{
                      width: 56,
                      height: 56,
                      backgroundColor: theme.palette.error.main,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: theme.palette.error.dark
                      }
                    }}
                  >
                    <PhoneOff size={24} />
                  </IconButton>
                )}
              </>
            )}

            {/* End Call */}
            <IconButton
              onClick={handleEndCall}
              sx={{
                width: 56,
                height: 56,
                backgroundColor: theme.palette.error.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.error.dark,
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <PhoneOff size={24} />
            </IconButton>
          </Stack>
        </Box>
      </DialogContent>

      {/* Invite Participants Dialog */}
      {onInviteParticipants && call && (
        <InviteParticipantsDialog
          open={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onInvite={onInviteParticipants}
          excludeUserIds={call.participants
            .filter(p => p.status === 'joined' || p.status === 'invited')
            .map(p => p.userId.id)
          }
        />
      )}

      {/* Call Quality Dialog */}
      {onReportQuality && (
        <CallQualityDialog
          open={showQualityDialog}
          onClose={() => setShowQualityDialog(false)}
          onSubmit={handleQualitySubmit}
          callType={call.type}
          callDuration={callDuration}
        />
      )}
    </Dialog>
  );
};

export default CallInterface;