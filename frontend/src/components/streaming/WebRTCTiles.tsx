import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useWebRTC } from '@/hooks/useWebRTC';
import HostList from './HostList';
import VideoTile from './VideoTile';

interface Props {
  streamId: string;
  hostUserId: string;
}

const WebRTCTiles: React.FC<Props> = ({ streamId, hostUserId }) => {
  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return {} as any;
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {} as any; }
  }, []);

  const role: 'host' | 'viewer' = (currentUser?.id === hostUserId || currentUser?._id === hostUserId) ? 'host' : 'viewer';
  const { peers, ready, error, localStream, publishing, pendingRequests, requestPublish, approvePublish, denyPublish, revokePublish, kickParticipant, clearRequests, startLocalMedia, stopLocalMedia, moderateTrack, hostInfos, hosts, publishers } = useWebRTC({ streamId, role });

  // Start local camera automatically for host
  useEffect(() => {
    if (role !== 'host' || !ready) return;
    (async () => {
      try {
        await startLocalMedia({ video: true, audio: true });
      } catch {}
    })();
    return () => { if (role === 'host') { stopLocalMedia(); } };
  }, [role, ready, startLocalMedia, stopLocalMedia]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">Face-to-face</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`${peers.length} peers`} />
          {role === 'viewer' && ready && (
            publishing ? (
              <Button size="small" variant="outlined" onClick={stopLocalMedia}>Stop Sharing</Button>
            ) : (
              <Button size="small" variant="contained" onClick={requestPublish}>Request to Join</Button>
            )
          )}
        </Box>
      </Box>

      {/* Host list visible to everyone */}
      <HostList hosts={hostInfos.map(h => ({ socketId: h.socketId, displayName: h.displayName }))} />

      {role === 'host' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pendingRequests.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {pendingRequests.map((reqId) => {
                const peer = peers.find(p => p.peerId === reqId);
                const label = peer?.displayName ? `Request: ${peer.displayName}` : `Request ${reqId.slice(-4)}`;
                return (
                  <Box key={reqId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip size="small" label={label} />
                    <Button size="small" variant="contained" onClick={() => approvePublish(reqId)}>Approve</Button>
                    <Button size="small" variant="text" onClick={() => denyPublish(reqId)}>Deny</Button>
                  </Box>
                );
              })}
              <Button size="small" onClick={clearRequests}>Clear All</Button>
            </Box>
          )}
          {/* Host moderation controls for current peers */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {peers.map((p) => (
              <Box key={p.peerId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip size="small" label={p.displayName || p.peerId.slice(-4)} />
                <Button size="small" variant="outlined" onClick={() => revokePublish(p.peerId)}>Revoke Publish</Button>
                <Button size="small" onClick={() => moderateTrack(p.peerId, 'audio', 'mute')}>Mute Audio</Button>
                <Button size="small" onClick={() => moderateTrack(p.peerId, 'audio', 'unmute')}>Unmute Audio</Button>
                <Button size="small" onClick={() => moderateTrack(p.peerId, 'video', 'mute')}>Mute Video</Button>
                <Button size="small" onClick={() => moderateTrack(p.peerId, 'video', 'unmute')}>Unmute Video</Button>
                <Button size="small" color="error" onClick={() => kickParticipant(p.peerId)}>Kick</Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {error && (
        <Typography variant="caption" color="error">{error}</Typography>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1 }}>
        {/* Local preview for host */}
        {role === 'host' && (
          <VideoTile title="You" stream={localStream || null} muted isHost />
        )}
        {/* Remote peers */}
        {peers.map((p) => {
          const isHost = hosts.includes(p.peerId);
          const isPublisher = publishers.includes(p.peerId);
          return (
            <VideoTile key={p.peerId} title={p.displayName || `Guest ${p.peerId.slice(-4)}`} stream={p.stream || null} isHost={isHost} isPublisher={isPublisher} />
          );
        })}
      </Box>
    </Box>
  );
};



export default WebRTCTiles;