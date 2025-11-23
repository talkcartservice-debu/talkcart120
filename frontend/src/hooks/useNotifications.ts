﻿import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: string;
  title?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  data?: any;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would call an API
      // For now, we'll simulate with mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'like',
          title: 'New Like',
          content: 'John Doe liked your post',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          sender: {
            id: 'user2',
            displayName: 'John Doe',
            avatar: '/default-avatar.png'
          },
          data: {
            postId: 'post123'
          }
        },
        {
          id: '2',
          type: 'comment',
          title: 'New Comment',
          content: 'Jane Smith commented on your post',
          isRead: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          sender: {
            id: 'user3',
            displayName: 'Jane Smith',
            avatar: '/default-avatar.png'
          },
          data: {
            postId: 'post456'
          }
        },
        {
          id: '3',
          type: 'follow',
          title: 'New Follower',
          content: 'Bob Johnson started following you',
          isRead: true,
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          sender: {
            id: 'user4',
            displayName: 'Bob Johnson',
            avatar: '/default-avatar.png'
          }
        }
      ];

      setNotifications(mockNotifications);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Fetch notifications error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      // In a real implementation, this would call an API
      // For now, we'll just refresh notifications to get the count
      await fetchNotifications();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      setError(errorMessage);
      console.error('Fetch unread count error:', errorMessage);
    }
  }, [isAuthenticated, user, fetchNotifications]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isAuthenticated) return false;

    try {
      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // In a real implementation, this would call an API
      // await notificationService.markAsRead(notificationId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Mark as read error:', errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return false;

    try {
      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      );

      // In a real implementation, this would call an API
      // await notificationService.markAllAsRead();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Mark all as read error:', errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Fetch notifications on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    fetchUnreadCount
  };
};

export default useNotifications;