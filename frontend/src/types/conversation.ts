import { Participant, Message } from './message';

export interface Conversation {
    id: string;
    _id?: string; // For MongoDB compatibility
    participants: Participant[];
    lastMessage: {
        id: string;
        content: string;
        type: string;
        senderId: string;
        createdAt: string;
    } | null;
    unreadCount: number;
    isGroup: boolean;
    groupName?: string | null;
    groupDescription?: string | null;
    groupAvatar?: string | null;
    adminId?: string;
    isEncrypted: boolean;
    lastActivity: string;
    title?: string; // For ForwardMessageDialog
    avatar?: string; // For ForwardMessageDialog
    settings?: {
        allowInvites: boolean;
        muteNotifications: boolean;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface ConversationSettings {
    groupName?: string;
    groupDescription?: string;
    allowInvites?: boolean;
    muteNotifications?: boolean;
    isEncrypted?: boolean;
}

export interface CreateConversationRequest {
    participantIds: string[];
    isGroup?: boolean;
    groupName?: string;
    groupDescription?: string;
}

export interface ConversationListResponse {
    conversations: Conversation[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}