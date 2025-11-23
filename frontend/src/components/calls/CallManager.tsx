import React, { useEffect, useState } from 'react';
import { Box, Fab, Badge, useTheme, alpha } from '@mui/material';
import {
    Phone,
    PhoneMissed,
    History,
    PhoneCall,
    Video
} from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useAuth } from '@/contexts/AuthContext';
import CallInterface from './CallInterface';
import IncomingCallModal from './IncomingCallModal';
import MissedCallsDialog from './MissedCallsDialog';
import CallHistoryDialog from './CallHistoryDialog';
import CallPermissionsDialog from './CallPermissionsDialog';
import { notificationService } from '@/services/notificationService';

interface CallManagerProps {
    conversationId?: string;
}

const CallManager: React.FC<CallManagerProps> = ({ conversationId }) => {
    const theme = useTheme();
    const { user } = useAuth();
    const {
        currentCall,
        incomingCall,
        isCallActive,
        isAudioEnabled,
        isVideoEnabled,
        isRecording,
        localStream,
        remoteStreams,
        callHistory,
        missedCalls,
        activeCalls,
        loading,
        error,
        isModerator,
        isLocked,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleAudio,
        toggleVideo,
        startRecording,
        stopRecording,
        getCallHistory,
        getMissedCalls,
        getActiveCalls,
        markMissedCallsAsSeen,
        reportCallQuality,
        clearIncomingCall,
        clearError,
        inviteParticipants,
        removeParticipant,
        muteAllParticipants,
        promoteParticipant,
        lockCall,
        unlockCall,
        endCallForAll
    } = useCall();

    const [showMissedCalls, setShowMissedCalls] = useState(false);
    const [showCallHistory, setShowCallHistory] = useState(false);
    const [showActiveCalls, setShowActiveCalls] = useState(false);
    const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    // Check permissions on mount
    useEffect(() => {
        if (!permissionsChecked) {
            const checkPermissions = async () => {
                const permissions = notificationService.getPermissionStatus();
                const support = notificationService.isSupported();

                // Show permissions dialog if notifications are supported but not granted
                if (support.notifications && permissions.notification !== 'granted') {
                    setShowPermissionsDialog(true);
                }

                setPermissionsChecked(true);
            };

            checkPermissions();
        }
    }, [permissionsChecked]);

    // Load missed calls and active calls on mount
    useEffect(() => {
        getMissedCalls();
        getActiveCalls();
    }, [getMissedCalls, getActiveCalls]);

    // Auto-refresh missed calls every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            getMissedCalls();
            getActiveCalls();
        }, 30000);

        return () => clearInterval(interval);
    }, [getMissedCalls, getActiveCalls]);

    const handleInitiateCall = async (type: 'audio' | 'video') => {
        if (!conversationId) {
            console.error('No conversation ID provided');
            return;
        }

        try {
            await initiateCall(conversationId, type);
        } catch (error) {
            console.error('Failed to initiate call:', error);
        }
    };

    const handleAcceptCall = async () => {
        if (incomingCall) {
            try {
                await acceptCall(incomingCall.callId);
            } catch (error) {
                console.error('Failed to accept call:', error);
            }
        }
    };

    const handleDeclineCall = async () => {
        if (incomingCall) {
            try {
                await declineCall(incomingCall.callId);
            } catch (error) {
                console.error('Failed to decline call:', error);
            }
        }
    };

    const handleEndCall = async () => {
        try {
            await endCall();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    };

    const handleShowCallHistory = () => {
        if (conversationId) {
            getCallHistory(conversationId);
            setShowCallHistory(true);
        }
    };

    const handleShowMissedCalls = () => {
        setShowMissedCalls(true);
    };

    const handleMarkMissedCallsAsSeen = async (callIds: string[]) => {
        try {
            await markMissedCallsAsSeen(callIds);
        } catch (error) {
            console.error('Failed to mark missed calls as seen:', error);
        }
    };

    const handleReportCallQuality = async (callId: string, quality: any) => {
        try {
            await reportCallQuality(callId, quality);
        } catch (error) {
            console.error('Failed to report call quality:', error);
        }
    };

    const handleCallBack = (targetConversationId: string, type: 'audio' | 'video') => {
        initiateCall(targetConversationId, type);
        setShowMissedCalls(false);
        setShowCallHistory(false);
    };

    const handlePermissionsGranted = () => {
        setShowPermissionsDialog(false);
    };

    const handlePermissionsClose = () => {
        setShowPermissionsDialog(false);
    };

    return (
        <>
            {/* Call Interface */}
            <CallInterface
                call={currentCall}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isRecording={isRecording}
                isLocked={isLocked}
                isModerator={isModerator}
                onEndCall={handleEndCall}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onReportQuality={handleReportCallQuality}
                onInviteParticipants={inviteParticipants}
                onRemoveParticipant={removeParticipant}
                onMuteAllParticipants={muteAllParticipants}
                onPromoteParticipant={promoteParticipant}
                onLockCall={lockCall}
                onUnlockCall={unlockCall}
                onEndCallForAll={endCallForAll}
            />

            {/* Incoming Call Modal */}
            <IncomingCallModal
                call={incomingCall}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
            />

            {/* Missed Calls Dialog */}
            <MissedCallsDialog
                open={showMissedCalls}
                onClose={() => setShowMissedCalls(false)}
                missedCalls={missedCalls}
                loading={loading}
                onMarkAsSeen={handleMarkMissedCallsAsSeen}
                onCallBack={handleCallBack}
            />

            {/* Call History Dialog */}
            {conversationId && (
                <CallHistoryDialog
                    open={showCallHistory}
                    onClose={() => setShowCallHistory(false)}
                    conversationId={conversationId}
                    callHistory={callHistory}
                    loading={loading}
                    onCallBack={handleCallBack}
                    currentUserId={user?.id || ''}
                />
            )}

            {/* Floating Action Buttons */}
            {!isCallActive && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        zIndex: 1000
                    }}
                >
                    {/* Active Calls Indicator */}
                    {activeCalls.length > 0 && (
                        <Fab
                            size="medium"
                            onClick={() => setShowActiveCalls(true)}
                            sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: theme.palette.success.dark,
                                },
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            <Badge badgeContent={activeCalls.length} color="error">
                                <PhoneCall size={24} />
                            </Badge>
                        </Fab>
                    )}

                    {/* Missed Calls */}
                    {missedCalls.length > 0 && (
                        <Fab
                            size="medium"
                            onClick={handleShowMissedCalls}
                            sx={{
                                backgroundColor: theme.palette.error.main,
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: theme.palette.error.dark,
                                }
                            }}
                        >
                            <Badge badgeContent={missedCalls.length} color="secondary">
                                <PhoneMissed size={24} />
                            </Badge>
                        </Fab>
                    )}

                    {/* Call History */}
                    {conversationId && (
                        <Fab
                            size="medium"
                            onClick={handleShowCallHistory}
                            sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.9),
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: theme.palette.primary.dark,
                                }
                            }}
                        >
                            <History size={24} />
                        </Fab>
                    )}

                    {/* Video Call */}
                    {conversationId && (
                        <Fab
                            size="large"
                            onClick={() => handleInitiateCall('video')}
                            sx={{
                                backgroundColor: theme.palette.primary.main,
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: theme.palette.primary.dark,
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <Video size={28} />
                        </Fab>
                    )}

                    {/* Audio Call */}
                    {conversationId && (
                        <Fab
                            size="large"
                            onClick={() => handleInitiateCall('audio')}
                            sx={{
                                backgroundColor: theme.palette.success.main,
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: theme.palette.success.dark,
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <Phone size={28} />
                        </Fab>
                    )}
                </Box>
            )}

            {/* Call Permissions Dialog */}
            <CallPermissionsDialog
                open={showPermissionsDialog}
                onClose={handlePermissionsClose}
                onPermissionsGranted={handlePermissionsGranted}
            />

            {/* Pulse animation for active calls */}
            <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 ${alpha(theme.palette.success.main, 0.7)};
          }
          70% {
            box-shadow: 0 0 0 10px ${alpha(theme.palette.success.main, 0)};
          }
          100% {
            box-shadow: 0 0 0 0 ${alpha(theme.palette.success.main, 0)};
          }
        }
      `}</style>
        </>
    );
};

export default CallManager;