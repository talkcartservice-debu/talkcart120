const request = require('supertest');
const express = require('express');
const searchRoutes = require('../routes/search');
const { Conversation, Message, User } = require('../models');

// Mock the authenticateToken middleware
jest.mock('../routes/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-id' };
    next();
  }
}));

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/search', searchRoutes);

describe('Global Message Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 for empty query', async () => {
    const response = await request(app)
      .get('/api/search/messages')
      .query({ q: '' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Search query must be at least 2 characters');
  });

  test('should return 400 for query less than 2 characters', async () => {
    const response = await request(app)
      .get('/api/search/messages')
      .query({ q: 'a' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Search query must be at least 2 characters');
  });

  test('should search messages successfully', async () => {
    // Mock Conversation.find to return test conversations
    Conversation.find = jest.fn().mockResolvedValue([
      { _id: 'conv-1' },
      { _id: 'conv-2' }
    ]);

    // Mock Message.find to return test messages
    Message.find = jest.fn().mockResolvedValue([
      {
        _id: 'msg-1',
        content: 'Hello world',
        conversationId: 'conv-1',
        senderId: { _id: 'user-1', username: 'testuser' },
        createdAt: new Date(),
        isEdited: false,
        isDeleted: false,
        isForwarded: false
      }
    ]);

    // Mock Message.countDocuments to return count
    Message.countDocuments = jest.fn().mockResolvedValue(1);

    const response = await request(app)
      .get('/api/search/messages')
      .query({ q: 'hello', limit: 10, page: 1 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.messages).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.query).toBe('hello');
  });

  test('should handle search errors gracefully', async () => {
    // Mock Message.find to throw an error
    Message.find = jest.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/api/search/messages')
      .query({ q: 'error test' })
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Message search failed');
  });
});
