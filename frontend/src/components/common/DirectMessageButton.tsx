import React, { useState } from 'react';
import { Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from '@mui/material';
import { MessageCircle, MessageSquareOff, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

interface DirectMessageButtonProps {
  targetUserId: string;
  targetUsername?: string;
  targetDisplayName?: string;
  targetAllowsDirectMessages?: boolean;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export const DirectMessageButton: React.FC<DirectMessageButtonProps> = ({
  targetUserId,
  targetUsername,
  targetDisplayName,
  targetAllowsDirectMessages = true,
  variant = 'button',
  size = 'medium',
  disabled = false
}) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacy();
  const router = useRouter();
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  // Don't show button for own profile
  if (user?.id === targetUserId) {
    return null;
  }

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      // Ensure we're passing the correct parameter format
      return await api.messages.createConversation([targetUserId]);
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        // Navigate to the conversation
        // Fix: Use the correct data structure
        const conversationId = data.data?.id || data.data?._id || data.data?.conversation?.id;
        if (conversationId) {
          router.push(`/messages?conversation=${conversationId}`);
          toast.success('Conversation started!');
        } else {
          // Fallback: Just go to messages page
          router.push('/messages');
          toast.success('Conversation started! Please select it from your conversations list.');
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to start conversation';
      
      if (error.response?.status === 403) {
        // User has disabled direct messages
        setShowPrivacyDialog(true);
      } else {
        toast.error(errorMessage);
      }
    }
  });

  const handleDirectMessage = () => {
    if (!targetAllowsDirectMessages) {
      setShowPrivacyDialog(true);
      return;
    }

    createConversationMutation.mutate();
  };

  const getButtonContent = () => {
    if (!targetAllowsDirectMessages) {
      return {
        icon: <MessageSquareOff size={variant === 'icon' ? 20 : 16} />,
        text: 'Messages Disabled',
        tooltip: 'This user has disabled direct messages'
      };
    }

    if (!privacySettings.allowDirectMessages) {
      return {
        icon: <Lock size={variant === 'icon' ? 20 : 16} />,
        text: 'Messages Disabled',
        tooltip: 'You have disabled direct messages in your privacy settings'
      };
    }

    return {
      icon: <MessageCircle size={variant === 'icon' ? 20 : 16} />,
      text: 'Message',
      tooltip: 'Send a direct message'
    };
  };

  const { icon, text, tooltip } = getButtonContent();
  const isDisabled = disabled || !targetAllowsDirectMessages || !privacySettings.allowDirectMessages;
  const isLoading = createConversationMutation.isPending;

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={tooltip}>
          <span>
            <IconButton
              onClick={handleDirectMessage}
              disabled={isDisabled || isLoading}
              size={size}
              color={isDisabled ? 'default' : 'primary'}
            >
              {icon}
            </IconButton>
          </span>
        </Tooltip>

        {/* Privacy Dialog */}
        <Dialog 
          open={showPrivacyDialog} 
          onClose={() => setShowPrivacyDialog(false)}
          disableEnforceFocus  // Prevents focus trapping issues
          hideBackdrop={false}  // Ensure backdrop is properly handled
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <MessageSquareOff size={24} />
              Direct Messages Disabled
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              {!targetAllowsDirectMessages 
                ? `${targetDisplayName || targetUsername || 'This user'} has disabled direct messages in their privacy settings.`
                : 'You have disabled direct messages in your privacy settings.'
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!targetAllowsDirectMessages 
                ? 'You cannot send direct messages to users who have disabled this feature.'
                : 'To send direct messages, you need to enable this feature in your privacy settings.'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrivacyDialog(false)}>
              Close
            </Button>
            {privacySettings.allowDirectMessages === false && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setShowPrivacyDialog(false);
                  router.push('/settings');
                }}
              >
                Privacy Settings
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <Button
            variant="outlined"
            startIcon={icon}
            onClick={handleDirectMessage}
            disabled={isDisabled || isLoading}
            size={size}
            color={isDisabled ? 'inherit' : 'primary'}
          >
            {isLoading ? 'Starting...' : text}
          </Button>
        </span>
      </Tooltip>

      {/* Privacy Dialog */}
      <Dialog 
        open={showPrivacyDialog} 
        onClose={() => setShowPrivacyDialog(false)}
        disableEnforceFocus  // Prevents focus trapping issues
        hideBackdrop={false}  // Ensure backdrop is properly handled
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <MessageSquareOff size={24} />
            Direct Messages Disabled
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {!targetAllowsDirectMessages 
              ? `${targetDisplayName || targetUsername || 'This user'} has disabled direct messages in their privacy settings.`
              : 'You have disabled direct messages in your privacy settings.'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!targetAllowsDirectMessages 
              ? 'You cannot send direct messages to users who have disabled this feature.'
              : 'To send direct messages, you need to enable this feature in your privacy settings.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrivacyDialog(false)}>
            Close
          </Button>
          {privacySettings.allowDirectMessages === false && (
            <Button 
              variant="contained" 
              onClick={() => {
                setShowPrivacyDialog(false);
                router.push('/settings');
              }}
            >
              Privacy Settings
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

// Hook for checking if direct messages are allowed
export const useDirectMessagePermission = (targetUserId: string, targetAllowsDirectMessages?: boolean) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacy();

  const canSendDirectMessage = user?.id !== targetUserId && 
                              privacySettings.allowDirectMessages && 
                              (targetAllowsDirectMessages ?? true);

  const reason = !privacySettings.allowDirectMessages 
    ? 'You have disabled direct messages'
    : !targetAllowsDirectMessages 
    ? 'User has disabled direct messages'
    : user?.id === targetUserId 
    ? 'Cannot message yourself'
    : null;

  return {
    canSendDirectMessage,
    reason,
    isOwnProfile: user?.id === targetUserId,
    userAllowsDirectMessages: privacySettings.allowDirectMessages,
    targetAllowsDirectMessages: targetAllowsDirectMessages ?? true
  };
};

export default DirectMessageButton;
