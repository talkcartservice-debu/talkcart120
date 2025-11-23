import axios from 'axios';
import socketService from './socketService';
import { ICE_SERVERS, API_URL } from '@/config';

export interface Call {
  id: string;
  callId: string;
  conversationId: string;
  initiator: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  participants: Array<{
    userId: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    joinedAt?: Date;
    leftAt?: Date;
    status: 'invited' | 'joined' | 'declined' | 'missed' | 'left';
    role: 'participant' | 'moderator';
  }>;
  type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  isLocked?: boolean;
}

export interface CallOffer {
  callId: string;
  offer: RTCSessionDescriptionInit;
  fromUserId: string;
}

export interface CallAnswer {
  callId: string;
  answer: RTCSessionDescriptionInit;
  fromUserId: string;
}

export interface CallIceCandidate {
  callId: string;
  candidate: RTCIceCandidateInit;
  fromUserId: string;
}

class CallService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private callEventListeners: Map<string, Function[]> = new Map();

  // ICE servers configuration
  private iceServers = ICE_SERVERS;

  constructor() {
    this.setupSocketListeners();
  }

  // API Methods

  async initiateCall(conversationId: string, type: 'audio' | 'video'): Promise<Call> {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('Initiating call with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', `${API_URL}/calls/initiate`);

      const response = await axios.post(`${API_URL}/calls/initiate`, {
        conversationId,
        type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('Call initiation error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to initiate call');
    }
  }

  async joinCall(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to join call');
    }
  }

  async leaveCall(callId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/calls/${callId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clean up WebRTC resources
      this.cleanupCall(callId);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to leave call');
    }
  }

  async declineCall(callId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/calls/${callId}/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to decline call');
    }
  }

  async getCallDetails(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/${callId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get call details');
    }
  }

  async getCallHistory(conversationId: string, page = 1, limit = 20): Promise<{
    calls: Call[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCalls: number;
      hasMore: boolean;
    };
  }> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/conversation/${conversationId}/history`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get call history');
    }
  }

  async reportCallQuality(callId: string, quality: {
    audioQuality?: number;
    videoQuality?: number;
    connectionQuality?: number;
    feedback?: string;
  }): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/calls/${callId}/quality`, quality, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to report call quality');
    }
  }

  async getMissedCalls(page = 1, limit = 20): Promise<{
    missedCalls: Call[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMissedCalls: number;
      hasMore: boolean;
    };
  }> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/missed`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get missed calls');
    }
  }

  async markMissedCallsAsSeen(callIds: string[]): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/calls/missed/mark-seen`, { callIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark missed calls as seen');
    }
  }

  async getActiveCalls(): Promise<Call[]> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.activeCalls;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get active calls');
    }
  }

  async startRecording(callId: string): Promise<{ recordingId: string }> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/recording/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start recording');
    }
  }

  async stopRecording(callId: string): Promise<{ recordingId: string; duration: number }> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/recording/stop`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to stop recording');
    }
  }

  async getCallRecordings(callId: string): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/${callId}/recordings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.recording;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get call recordings');
    }
  }

  async transferCall(callId: string, targetUserId: string): Promise<{ transferId: string }> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/transfer`, {
        targetUserId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to transfer call');
    }
  }

  async acceptCallTransfer(callId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/transfer/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to accept call transfer');
    }
  }

  async declineCallTransfer(callId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/transfer/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to decline call transfer');
    }
  }

  async muteParticipant(callId: string, participantId: string, muted: boolean): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/mute`, {
        participantId,
        muted
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mute participant');
    }
  }

  async holdCall(callId: string, onHold: boolean): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/hold`, {
        onHold
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update hold status');
    }
  }

  async getWaitingQueue(): Promise<any[]> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/waiting-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.waitingCalls;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get waiting queue');
    }
  }

  async inviteParticipants(callId: string, userIds: string[]): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/invite`, {
        userIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to invite participants');
    }
  }

  async removeParticipant(callId: string, userId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/remove`, {
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove participant');
    }
  }

  async muteAllParticipants(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/mute-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mute all participants');
    }
  }

  async promoteParticipant(callId: string, userId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/promote`, {
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to promote participant');
    }
  }

  async lockCall(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/lock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to lock call');
    }
  }

  async unlockCall(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to unlock call');
    }
  }

  async endCallForAll(callId: string): Promise<Call> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/calls/${callId}/end-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data.call;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to end call for all');
    }
  }

  async getCallStats(period: string = '30d'): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calls/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get call statistics');
    }
  }

  // WebRTC Methods

  async getUserMedia(type: 'audio' | 'video'): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  async createPeerConnection(callId: string, targetUserId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.remoteStreams.set(targetUserId, remoteStream);
        this.emit('remoteStream', { userId: targetUserId, stream: remoteStream });
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        if (socketService['socket']) {
          socketService['socket'].emit('call:ice-candidate', {
            callId,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            },
            targetUserId
          });
        }
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state: ${peerConnection.connectionState}`);
      this.emit('connectionStateChange', {
        callId,
        userId: targetUserId,
        state: peerConnection.connectionState
      });
    };

    this.peerConnections.set(`${callId}_${targetUserId}`, peerConnection);
    return peerConnection;
  }

  async createOffer(callId: string, targetUserId: string): Promise<void> {
    const peerConnection = await this.createPeerConnection(callId, targetUserId);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (socketService['socket']) {
      socketService['socket'].emit('call:offer', {
        callId,
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        targetUserId
      });
    }
  }

  async handleOffer(data: CallOffer): Promise<void> {
    const { callId, offer, fromUserId } = data;
    const peerConnection = await this.createPeerConnection(callId, fromUserId);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (socketService['socket']) {
      socketService['socket'].emit('call:answer', {
        callId,
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        targetUserId: fromUserId
      });
    }
  }

  async handleAnswer(data: CallAnswer): Promise<void> {
    const { callId, answer, fromUserId } = data;
    const peerConnection = this.peerConnections.get(`${callId}_${fromUserId}`);

    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(data: CallIceCandidate): Promise<void> {
    const { callId, candidate, fromUserId } = data;
    const peerConnection = this.peerConnections.get(`${callId}_${fromUserId}`);

    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  // Media Controls

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Cleanup

  cleanupCall(callId: string): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connections
    for (const [key, peerConnection] of this.peerConnections.entries()) {
      if (key.startsWith(callId)) {
        peerConnection.close();
        this.peerConnections.delete(key);
      }
    }

    // Clear remote streams
    for (const [userId, stream] of this.remoteStreams.entries()) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.remoteStreams.clear();
  }

  // Socket Event Listeners

  private setupSocketListeners(): void {
    socketService.on('call:incoming', (data: any) => {
      this.emit('incomingCall', data.call);
    });

    socketService.on('call:offer', (data: CallOffer) => {
      this.handleOffer(data);
    });

    socketService.on('call:answer', (data: CallAnswer) => {
      this.handleAnswer(data);
    });

    socketService.on('call:ice-candidate', (data: CallIceCandidate) => {
      this.handleIceCandidate(data);
    });

    socketService.on('call:participant-joined', (data: any) => {
      this.emit('participantJoined', data);
    });

    socketService.on('call:participant-left', (data: any) => {
      this.emit('participantLeft', data);
    });

    socketService.on('call:ended', (data: any) => {
      this.cleanupCall(data.callId);
      this.emit('callEnded', data);
    });

    socketService.on('call:declined', (data: any) => {
      this.emit('callDeclined', data);
    });

    // Moderator events
    socketService.on('call:locked', (data: any) => {
      this.emit('callLocked', data);
    });

    socketService.on('call:unlocked', (data: any) => {
      this.emit('callUnlocked', data);
    });

    socketService.on('participant:promoted', (data: any) => {
      this.emit('participantPromoted', data);
    });

    socketService.on('participant:removed', (data: any) => {
      this.emit('participantRemoved', data);
    });

    socketService.on('call:muted-all', (data: any) => {
      this.emit('callMutedAll', data);
    });

    socketService.on('call:ended-all', (data: any) => {
      this.emit('callEndedAll', data);
    });
  }

  // Event Management

  on(event: string, callback: Function): void {
    if (!this.callEventListeners.has(event)) {
      this.callEventListeners.set(event, []);
    }
    this.callEventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.callEventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.callEventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Getters

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(userId: string): MediaStream | null {
    return this.remoteStreams.get(userId) || null;
  }

  getPeerConnection(callId: string, userId: string): RTCPeerConnection | null {
    return this.peerConnections.get(`${callId}_${userId}`) || null;
  }
}

export default new CallService();