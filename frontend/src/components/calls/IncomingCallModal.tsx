import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  IconButton,
  Stack,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff
} from 'lucide-react';
import { Call } from '@/services/callService';
import { notificationService } from '@/services/notificationService';

interface IncomingCallModalProps {
  call: Call | null;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline
}) => {
  const theme = useTheme();
  const alertStartedRef = useRef(false);

  // Start notification, ringtone, and vibration when call comes in
  useEffect(() => {
    if (call && !alertStartedRef.current) {
      alertStartedRef.current = true;

      // Start all alert mechanisms
      notificationService.startIncomingCallAlert(call);

      // Listen for notification actions
      const handleNotificationAccept = (event: CustomEvent) => {
        if (event.detail.callId === call.callId) {
          onAccept();
        }
      };

      window.addEventListener('notification-call-accept', handleNotificationAccept as EventListener);

      return () => {
        window.removeEventListener('notification-call-accept', handleNotificationAccept as EventListener);
      };
    }
    // Return undefined when the condition is not met
    return undefined;
  }, [call, onAccept]);

  // Stop alerts when call ends or component unmounts
  useEffect(() => {
    return () => {
      if (alertStartedRef.current) {
        notificationService.stopIncomingCallAlert();
        alertStartedRef.current = false;
      }
    };
  }, []);

  // Stop alerts when call is accepted or declined
  const handleAccept = () => {
    notificationService.stopIncomingCallAlert();
    alertStartedRef.current = false;
    onAccept();
  };

  const handleDecline = () => {
    notificationService.stopIncomingCallAlert();
    alertStartedRef.current = false;
    onDecline();
  };

  if (!call) return null;

  const isVideoCall = call.type === 'video';

  return (
    <Dialog
      open={!!call}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus  // Prevents focus trapping issues
      hideBackdrop={false}  // Ensure backdrop is properly handled
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={isVideoCall ? <Video size={16} /> : <Phone size={16} />}
            label={`Incoming ${call.type} call`}
            color="primary"
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Avatar
            src={call.initiator.avatar}
            alt={call.initiator.displayName}
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 2,
              border: `4px solid ${theme.palette.primary.main}`,
              animation: 'pulse 2s infinite'
            }}
          />

          <Typography variant="h5" fontWeight={600} gutterBottom>
            {call.initiator.displayName}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {isVideoCall ? 'wants to video chat with you' : 'is calling you'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={3} justifyContent="center">
          {/* Decline Button */}
          <IconButton
            onClick={handleDecline}
            sx={{
              width: 64,
              height: 64,
              backgroundColor: theme.palette.error.main,
              color: 'white',
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <PhoneOff size={28} />
          </IconButton>

          {/* Accept Button */}
          <IconButton
            onClick={handleAccept}
            sx={{
              width: 64,
              height: 64,
              backgroundColor: theme.palette.success.main,
              color: 'white',
              '&:hover': {
                backgroundColor: theme.palette.success.dark,
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {isVideoCall ? <Video size={28} /> : <Phone size={28} />}
          </IconButton>
        </Stack>

        <style jsx>{`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0.7)};
            }
            70% {
              box-shadow: 0 0 0 20px ${alpha(theme.palette.primary.main, 0)};
            }
            100% {
              box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0)};
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;