// Ensure your CORS middleware is properly configured
const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:3000',  // Frontend
    'http://localhost:4100',  // Super admin
    // Add your production domains here
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);