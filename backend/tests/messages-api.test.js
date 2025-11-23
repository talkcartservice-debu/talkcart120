const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const messagesRouter = require('../routes/messages');

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/api/messages', messagesRouter);

// Mock authentication middleware
jest.mock('../routes/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-id' };
    next();
  },
  authenticateTokenStrict: (req, res, next) => {
    req.user = { userId: 'test-user-id' };
    next();
  }
}));

// Mock models
jest.mock('../models', () => {
  const conversationModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
  };

  const messageModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
  };

  return {
    Conversation: jest.fn(() => ({
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockReturnThis(),
    })),
    Message: jest.fn(() => ({
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockReturnThis(),
    })),
  };
});

describe('Messages API', () => {
  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Close MongoDB connection
    await mongoose.connection.close();
  });

  describe('GET /api/messages/health', () => {
    it('should return health check response', async () => {
      const res = await request(app).get('/api/messages/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Messages service is healthy');
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('should return conversations list', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', 'Bearer test-token');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/messages/conversations', () => {
    it('should create a new conversation', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', 'Bearer test-token')
        .send({
          participantId: 'participant-id',
          isGroup: false
        });
      
      // Since we're mocking, we can't fully test creation
      // but we can verify the endpoint is accessible
      expect(res.status).toBe(201);
    });
  });
});