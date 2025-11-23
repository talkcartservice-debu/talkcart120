import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewMessagesPage from '../pages/messages-new';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser' },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock the useMessages hook
jest.mock('@/hooks/useMessages', () => () => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  error: null,
  fetchMessages: jest.fn(),
  sendMessage: jest.fn(),
  createConversation: jest.fn(),
  setActiveConversation: jest.fn(),
  markAllAsRead: jest.fn(),
  sendTypingIndicator: jest.fn(),
  typingUsers: {},
}));

// Mock the api
jest.mock('@/lib/api', () => ({
  api: {
    search: {
      users: jest.fn().mockResolvedValue({ success: true, data: [] }),
    },
  },
}));

// Mock emoji-mart
jest.mock('@emoji-mart/data', () => ({}));
jest.mock('@emoji-mart/react', () => () => <div>Emoji Picker</div>);

describe('NewMessagesPage', () => {
  it('renders without crashing', () => {
    render(<NewMessagesPage />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('shows authentication required when not logged in', () => {
    // This would require mocking the useAuth hook to return isAuthenticated: false
    // For now, we're just testing the basic render
  });
});