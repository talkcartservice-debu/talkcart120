import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, ICE_SERVERS } from '@/config';

export interface PeerInfo {
  peerId: string;
  stream?: MediaStream;
  displayName?: string;
}

export interface HostInfo {
  socketId: string;
  userId?: string;
  displayName?: string;
}

interface Options {
  streamId: string;
  role: 'host' | 'viewer';
}

export function useWebRTC({ streamId, role }: Options) {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hosts, setHosts] = useState<string[]>([]);
  const [hostInfos, setHostInfos] = useState<HostInfo[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [selfId, setSelfId] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const pendingRequestsRef = useRef<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  // Connect socket
  useEffect(() => {
    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSelfId(socket.id || '');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
      socket.emit('webrtc:join', { streamId, role, token });
      setReady(true);
    });

    // Handle remote track moderation commands (register once per connection)
    socket.on('webrtc:moderate-track', ({ kind, action }: { streamId: string; kind: 'audio'|'video'; action: 'mute'|'unmute' }) => {
      try {
        if (!localStreamRef.current) return;
        if (kind === 'audio') localStreamRef.current.getAudioTracks().forEach(t => t.enabled = action !== 'mute');
        if (kind === 'video') localStreamRef.current.getVideoTracks().forEach(t => t.enabled = action !== 'mute');
      } catch {}
    });

    socket.on('webrtc:hosts', ({ hosts }: { hosts: Array<{ socketId: string; userId?: string; displayName?: string }> }) => {
      const ids = hosts.map(h => h.socketId);
      setHosts(ids);
      setHostInfos(hosts);
      // As viewer, create offers to all hosts
      if (role === 'viewer') {
        ids.forEach((hostId) => ensurePeer(hostId, true));
      }
      // Update display names for existing peers, if any
      setPeers(prev => prev.map(p => {
        const info = hosts.find(h => h.socketId === p.peerId);
        return info ? { ...p, displayName: info.displayName } : p;
      }));
    });

    socket.on('webrtc:publishers', ({ publishers }: { publishers: Array<{ socketId: string; userId?: string; displayName?: string }> }) => {
      const ids = publishers.map(p => p.socketId);
      setPublishers(ids);
      const amPublisher = ids.includes(selfId);
      setPublishing(amPublisher);
      // Connect to all publishers to receive their streams
      ids.forEach((pid) => {
        if (pid === selfId) return;
        // Initiate connection to receive remote stream
        ensurePeer(pid, true);
      });
      // If I'm a publisher, also connect to all hosts
      if (amPublisher) {
        hosts.forEach((hid) => ensurePeer(hid, true));
      }
    });

    socket.on('webrtc:publish-request', ({ requester }: { streamId: string; requester: { socketId: string; userId?: string; displayName?: string } }) => {
      // Host receives incoming request
      if (role === 'host') {
        pendingRequestsRef.current.add(requester.socketId);
        setPendingRequests(Array.from(pendingRequestsRef.current));
        // Store display name on peers (for chip label)
        setPeers(prev => {
          const exists = prev.find(p => p.peerId === requester.socketId);
          if (exists) return prev.map(p => p.peerId === requester.socketId ? { ...p, displayName: requester.displayName || p.displayName } : p);
          return [...prev, { peerId: requester.socketId, displayName: requester.displayName }];
        });
      }
    });

    socket.on('webrtc:publish-approved', async () => {
      try {
        // Start local media and mark publishing
        await startLocalMedia({ video: true, audio: true });
        setPublishing(true);
        // Send offers to all current hosts and publishers to distribute our stream
        hosts.forEach((hid) => ensurePeer(hid, true));
        publishers.forEach((pid) => { if (pid !== selfId) ensurePeer(pid, true); });
      } catch (e: any) {
        setError(e?.message || 'Failed to start publishing');
      }
    });

    socket.on('webrtc:publish-denied', () => {
      setPublishing(false);
    });

    // Pending request expired (server-side TTL)
    socket.on('webrtc:publish-request-expired', ({ requesterId }: { streamId: string; requesterId: string }) => {
      pendingRequestsRef.current.delete(requesterId);
      setPendingRequests(Array.from(pendingRequestsRef.current));
    });

    socket.on('webrtc:signal', async ({ from, data }: any) => {
      const pc = ensurePeer(from, false);
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err: any) {
        setError(err?.message || 'Signaling error');
      }
    });

    socket.on('webrtc:participant-leave', ({ peerId }: any) => {
      const pc = peersRef.current.get(peerId);
      if (pc) pc.close();
      peersRef.current.delete(peerId);
      setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
      pendingRequestsRef.current.delete(peerId);
      setPendingRequests(Array.from(pendingRequestsRef.current));
    });

    return () => {
      try { socket.emit('webrtc:leave', { streamId }); } catch {}
      socket.disconnect();
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      setPeers([]);
      pendingRequestsRef.current.clear();
      setPendingRequests([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, role]);

  // Create peer connection and wire handlers
  function ensurePeer(peerId: string, isInitiator: boolean) {
    let pc = peersRef.current.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });
    peersRef.current.set(peerId, pc);

    // Add local tracks (for sending media if available)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc!.addTrack(t, localStreamRef.current!));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('webrtc:signal', { to: peerId, data: { candidate: e.candidate } });
    };

    pc.ontrack = (e) => {
      setPeers((prev) => {
        const existing = prev.find((p) => p.peerId === peerId);
        if (existing) {
          existing.stream = e.streams[0];
          return [...prev];
        }
        return [...prev, { peerId, stream: e.streams[0] }];
      });
    };

    // On datachannel (optional future): could transfer display names or metadata
    pc.ondatachannel = (ev) => {
      const channel = ev.channel;
      if (!channel) return;
      channel.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data || ''));
          if (data?.type === 'displayName' && typeof data?.peerId === 'string') {
            setPeers((prev) => prev.map(p => p.peerId === data.peerId ? { ...p, displayName: data.displayName } : p));
          }
        } catch {}
      };
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
        socketRef.current?.emit('webrtc:participant-leave', { peerId });
      }
    };



    // Initiate offer if required
    if (isInitiator) {
      (async () => {
        try {
          const offer = await pc!.createOffer();
          await pc!.setLocalDescription(offer);
          socketRef.current?.emit('webrtc:signal', { to: peerId, data: { sdp: pc!.localDescription } });
        } catch (err: any) {
          setError(err?.message || 'Offer error');
        }
      })();
    }

    return pc;
  }

  const startLocalMedia = useCallback(async (constraints: MediaStreamConstraints = { video: true, audio: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Add tracks to all peers (if any already exist)
      peersRef.current.forEach((pc) => {
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      });

      return stream;
    } catch (err: any) {
      setError(err?.message || 'Failed to access camera/microphone');
      throw err;
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setPublishing(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:stop-publish', { streamId, token }); } catch {}
  }, [streamId]);

  const requestPublish = useCallback(() => {
    try { socketRef.current?.emit('webrtc:request-publish', { streamId }); } catch {}
  }, [streamId]);

  const approvePublish = useCallback((requesterId: string) => {
    pendingRequestsRef.current.delete(requesterId);
    setPendingRequests(Array.from(pendingRequestsRef.current));
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:approve-publish', { streamId, requester: requesterId, token }); } catch {}
  }, [streamId]);

  const denyPublish = useCallback((requesterId: string) => {
    pendingRequestsRef.current.delete(requesterId);
    setPendingRequests(Array.from(pendingRequestsRef.current));
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:deny-publish', { streamId, requester: requesterId, token }); } catch {}
  }, [streamId]);

  const revokePublish = useCallback((targetSocketId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:revoke-publish', { streamId, targetSocketId, token }); } catch {}
  }, [streamId]);

  const kickParticipant = useCallback((targetSocketId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:kick', { streamId, targetSocketId, token }); } catch {}
  }, [streamId]);

  const clearRequests = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:clear-requests', { streamId, token }); } catch {}
    pendingRequestsRef.current.clear();
    setPendingRequests([]);
  }, [streamId]);

  const moderateTrack = useCallback((targetSocketId: string, kind: 'audio'|'video', action: 'mute'|'unmute') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    try { socketRef.current?.emit('webrtc:moderate-track', { streamId, targetSocketId, kind, action, token }); } catch {}
  }, [streamId]);

  return {
    peers,
    ready,
    error,
    publishing,
    publishers,
    hosts,
    hostInfos,
    selfId,
    pendingRequests,
    localStream,
    startLocalMedia,
    stopLocalMedia,
    requestPublish,
    approvePublish,
    denyPublish,
    revokePublish,
    kickParticipant,
    clearRequests,
    moderateTrack,
  };
}