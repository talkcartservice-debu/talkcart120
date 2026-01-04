export interface Participant {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  avatarUrl?: string;
  isVerified: boolean;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: string;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface MessageMedia {
  type: string;
  url: string;
  filename: string;
  duration?: number;
  fileSize?: number;
  public_id?: string;
}

export interface ReplyMessage {
  id: string;
  content: string;
  senderId: string;
  type: string;
  sender?: {
    id: string;
    displayName: string;
  };
}

export interface Message {
  id: string;
  _id?: string; // For MongoDB compatibility
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'post_share';
  senderId: string;
  conversationId: string;
  createdAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded: boolean;
  forwardedFrom?: {
    messageId: string;
    conversationId: string;
    originalSenderId: string;
  };
  media?: MessageMedia[];
  reactions: MessageReaction[];
  readBy: ReadReceipt[];
  replyTo?: ReplyMessage | null;
  editHistory?: {
    content: string;
    editedAt: string;
  }[];
  replies?: Message[];
  sender: Participant;
  isOwn: boolean;
  isRead: boolean;
  isOptimistic?: boolean;
}

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
    allowInvites?: boolean;
    muteNotifications?: boolean;
  };
}

export interface ConversationSettings {
  groupName?: string;
  groupDescription?: string;
  allowInvites?: boolean;
  muteNotifications?: boolean;
  isEncrypted?: boolean;
}


