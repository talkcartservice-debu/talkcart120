const axios = require('axios');

// Flutterwave configuration
const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Flutterwave API base URL
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

// Initialize Flutterwave payment
const initializePayment = async (payload) => {
  try {
    if (!FLW_SECRET_KEY) {
      throw new Error('Flutterwave not configured');
    }

    const response = await axios.post(
      `${FLW_BASE_URL}/payments`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Flutterwave initialization error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Verify Flutterwave payment
const verifyPayment = async (transactionId) => {
  try {
    if (!FLW_SECRET_KEY) {
      throw new Error('Flutterwave not configured');
    }

    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Flutterwave verification error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Create mobile money payment
const createMobileMoneyPayment = async (payload) => {
  try {
    if (!FLW_SECRET_KEY) {
      throw new Error('Flutterwave not configured');
    }

    // Ensure mobile money payment options are set
    const mobileMoneyPayload = {
      ...payload,
      payment_options: 'mobilemoneyuganda,mobilemoneyrwanda,mobilemoneytanzania,mobilemoneyzambia,mobilemoneyghana',
      currency: payload.currency || 'UGX' // Default to UGX for mobile money
    };

    const response = await axios.post(
      `${FLW_BASE_URL}/payments`,
      mobileMoneyPayload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Flutterwave mobile money payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  createMobileMoneyPayment,
  FLW_PUBLIC_KEY,
  FLW_SECRET_KEY
};