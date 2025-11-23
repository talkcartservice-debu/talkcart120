const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust the path to your Express app

describe('Checkout API', () => {
  let server;
  let token;
  let userId;

  beforeAll(async () => {
    // Connect to the test database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/talkcart-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Start the server
    server = app.listen(8001);

    // Create a test user and get a token
    // This would typically involve making a request to your auth endpoint
    // For now, we'll mock the token
    token = 'test-token';
    userId = 'test-user-id';
  });

  afterAll(async () => {
    // Close the server and database connection
    await server.close();
    await mongoose.connection.close();
  });

  describe('POST /api/marketplace/cart/checkout', () => {
    it('should create an order from cart items', async () => {
      // First, add items to the cart
      // Then, checkout the cart
      const response = await request(server)
        .post('/api/marketplace/cart/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            country: 'Test Country',
            phone: '1234567890'
          },
          paymentMethod: 'mobile_money'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.items).toHaveLength(0); // Cart should be cleared
    });

    it('should handle empty cart', async () => {
      const response = await request(server)
        .post('/api/marketplace/cart/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            name: 'Test User',
            address: '123 Test St',
            city: 'Test City',
            country: 'Test Country',
            phone: '1234567890'
          },
          paymentMethod: 'mobile_money'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cart is empty');
    });
  });
});