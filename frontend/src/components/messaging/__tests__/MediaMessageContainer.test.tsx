import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Message } from '@/types/message';
import MediaMessageContainer from '../MediaMessageContainer';

// Mock the dependencies
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('@/hooks/useMediaMute', () => ({
  useMediaMute: jest.fn(() => ({
    muted: false,
    toggleMute: jest.fn(),
    volume: 1,
    setVolume: jest.fn(),
  })),
}));

const mockMessage: Message = {
  id: '1',
  content: 'Test message with media',
  type: 'image', // Use 'image' instead of 'media'
  senderId: 'user1',
  conversationId: 'conv1',
  createdAt: new Date().toISOString(),
  isEdited: false,
  isDeleted: false,
  isForwarded: false,
  reactions: [],
  readBy: [],
  sender: {
    id: 'user1',
    username: 'johndoe',
    displayName: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
  },
  isOwn: true,
  isRead: true,
  media: [
    {
      type: 'image',
      url: 'https://example.com/image.jpg',
      filename: 'test-image.jpg',
      fileSize: 102400,
    },
    {
      type: 'video',
      url: 'https://example.com/video.mp4',
      filename: 'test-video.mp4',
      fileSize: 2048000,
    },
    {
      type: 'audio',
      url: 'https://example.com/audio.mp3',
      filename: 'test-audio.mp3',
      fileSize: 512000,
    },
  ],
};

const theme = createTheme();

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MediaMessageContainer', () => {
  test('renders all media types correctly', () => {
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
      />
    );

    // Check that all media items are rendered
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
  });

  test('handles reply action', async () => {
    const mockOnReply = jest.fn();
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={mockOnReply}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
      />
    );

    const replyButton = screen.getByText('Reply');
    fireEvent.click(replyButton);

    await waitFor(() => {
      expect(mockOnReply).toHaveBeenCalledTimes(1);
    });
  });

  test('handles forward action', async () => {
    const mockOnForward = jest.fn();
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={mockOnForward}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
      />
    );

    const forwardButton = screen.getByText('Forward');
    fireEvent.click(forwardButton);

    await waitFor(() => {
      expect(mockOnForward).toHaveBeenCalledTimes(1);
    });
  });

  test('handles delete action', async () => {
    const mockOnDelete = jest.fn().mockResolvedValue(true);
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={mockOnDelete}
        onDownload={jest.fn()}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(mockMessage.id);
    });
  });

  test('handles download action', async () => {
    const mockOnDownload = jest.fn();
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockOnDownload).toHaveBeenCalledWith('https://example.com/image.jpg');
    });
  });

  test('renders placeholder for missing files', () => {
    const messageWithMissingFile: Message = {
      ...mockMessage,
      media: [
        {
          type: 'image',
          url: 'https://example.com/missing-image.jpg',
          filename: 'missing-image.jpg',
          fileSize: 102400,
        },
      ],
    };

    renderWithTheme(
      <MediaMessageContainer
        message={messageWithMissingFile}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
      />
    );

    // Should render placeholder instead of the actual image
    expect(screen.getByAltText('Media Preview')).toBeInTheDocument();
  });

  test('renders timestamp when showTimestamp is true', () => {
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
        showTimestamp={true}
      />
    );

    // Check if timestamp is rendered
    const timestampElement = screen.getByText(/ago/);
    expect(timestampElement).toBeInTheDocument();
  });

  test('does not render timestamp when showTimestamp is false', () => {
    renderWithTheme(
      <MediaMessageContainer
        message={mockMessage}
        onReply={jest.fn()}
        onForward={jest.fn()}
        onDelete={jest.fn()}
        onDownload={jest.fn()}
        showTimestamp={false}
      />
    );

    // Check if timestamp is not rendered
    const timestampElement = screen.queryByText(/ago/);
    expect(timestampElement).not.toBeInTheDocument();
  });
});
