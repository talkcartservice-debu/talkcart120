import React, { useState } from 'react';
import { Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from '@mui/material';
import { Users, UserPlus, UserX, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface GroupInviteButtonProps {
  targetUserId: string;
  targetUsername?: string;
  targetDisplayName?: string;
  targetAllowsGroupInvites?: boolean;
  groupId?: string;
  groupName?: string;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onInviteSuccess?: () => void;
}

export const GroupInviteButton: React.FC<GroupInviteButtonProps> = ({
  targetUserId,
  targetUsername,
  targetDisplayName,
  targetAllowsGroupInvites = true,
  groupId,
  groupName,
  variant = 'button',
  size = 'medium',
  disabled = false,
  onInviteSuccess
}) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacy();
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  // Create group conversation mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      // Fix: Pass only participantIds array for direct conversations
      // For group conversations, we'll need to create the conversation first, then update it
      return await api.messages.createConversation([targetUserId]);
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('Group created successfully!');
        onInviteSuccess?.();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to create group';
      
      if (error.response?.status === 403) {
        // User has disabled group invites
        setShowPrivacyDialog(true);
      } else {
        toast.error(errorMessage);
      }
    }
  });

  // Add to existing group mutation
  const addToGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      
      const response = await api.messages.addGroupMembers(groupId, {
        memberIds: [targetUserId]
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('User added to group successfully!');
        onInviteSuccess?.();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to add user to group';
      
      if (error.response?.status === 403) {
        // User has disabled group invites
        setShowPrivacyDialog(true);
      } else {
        toast.error(errorMessage);
      }
    }
  });

  // Don't show button for own profile
  if (user?.id === targetUserId) {
    return null;
  }

  const handleGroupInvite = () => {
    if (!targetAllowsGroupInvites) {
      setShowPrivacyDialog(true);
      return;
    }

    if (groupId) {
      // Add to existing group
      addToGroupMutation.mutate();
    } else {
      // Create new group
      createGroupMutation.mutate();
    }
  };

  const getButtonContent = () => {
    if (!targetAllowsGroupInvites) {
      return {
        icon: <UserX size={variant === 'icon' ? 20 : 16} />,
        text: 'Group Invites Disabled',
        tooltip: 'This user has disabled group invites'
      };
    }

    if (!privacySettings.allowGroupInvites) {
      return {
        icon: <Lock size={variant === 'icon' ? 20 : 16} />,
        text: 'Group Invites Disabled',
        tooltip: 'You have disabled group invites in your privacy settings'
      };
    }

    return {
      icon: <UserPlus size={variant === 'icon' ? 20 : 16} />,
      text: groupId ? 'Add to Group' : 'Create Group',
      tooltip: groupId ? 'Add user to this group' : 'Create a group with this user'
    };
  };

  const { icon, text, tooltip } = getButtonContent();
  const isDisabled = disabled || !targetAllowsGroupInvites;
  const isLoading = createGroupMutation.isPending || addToGroupMutation.isPending;

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={tooltip}>
          <span>
            <IconButton
              onClick={handleGroupInvite}
              disabled={isDisabled || isLoading}
              size={size}
              color={isDisabled ? 'default' : 'primary'}
            >
              {icon}
            </IconButton>
          </span>
        </Tooltip>

        {/* Privacy Dialog */}
        <Dialog open={showPrivacyDialog} onClose={() => setShowPrivacyDialog(false)}>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <UserX size={24} />
              Group Invites Disabled
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              {!targetAllowsGroupInvites 
                ? `${targetDisplayName || targetUsername || 'This user'} has disabled group invites in their privacy settings.`
                : 'You have disabled group invites in your privacy settings.'
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!targetAllowsGroupInvites 
                ? 'You cannot invite users to groups who have disabled this feature.'
                : 'To create groups or invite others, you need to enable this feature in your privacy settings.'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrivacyDialog(false)}>
              Close
            </Button>
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
            onClick={handleGroupInvite}
            disabled={isDisabled || isLoading}
            size={size}
            color={isDisabled ? 'inherit' : 'primary'}
          >
            {isLoading ? 'Processing...' : text}
          </Button>
        </span>
      </Tooltip>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacyDialog} onClose={() => setShowPrivacyDialog(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <UserX size={24} />
            Group Invites Disabled
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {!targetAllowsGroupInvites 
              ? `${targetDisplayName || targetUsername || 'This user'} has disabled group invites in their privacy settings.`
              : 'You have disabled group invites in your privacy settings.'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!targetAllowsGroupInvites 
              ? 'You cannot invite users to groups who have disabled this feature.'
              : 'To create groups or invite others, you need to enable this feature in your privacy settings.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrivacyDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Hook for checking if group invites are allowed
export const useGroupInvitePermission = (targetUserId: string, targetAllowsGroupInvites?: boolean) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacy();

  const canInviteToGroup = user?.id !== targetUserId && 
                          privacySettings.allowGroupInvites && 
                          (targetAllowsGroupInvites ?? true);

  const reason = !privacySettings.allowGroupInvites 
    ? 'You have disabled group invites'
    : !targetAllowsGroupInvites 
    ? 'User has disabled group invites'
    : user?.id === targetUserId 
    ? 'Cannot invite yourself'
    : null;

  return {
    canInviteToGroup,
    reason,
    isOwnProfile: user?.id === targetUserId,
    userAllowsGroupInvites: privacySettings.allowGroupInvites,
    targetAllowsGroupInvites: targetAllowsGroupInvites ?? true
  };
};

export default GroupInviteButton;
