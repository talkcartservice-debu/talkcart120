const axios = require('axios');

// Paystack configuration
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Paystack API base URL
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Paystack payment
const initializePayment = async (payload) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack not configured');
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Verify Paystack payment
const verifyPayment = async (reference) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack not configured');
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Create a transfer recipient (for vendor payouts)
const createTransferRecipient = async (payload) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack not configured');
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack transfer recipient error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Initiate a transfer (for vendor payouts)
const initiateTransfer = async (payload) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack not configured');
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack transfer error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  createTransferRecipient,
  initiateTransfer,
  PAYSTACK_PUBLIC_KEY,
  PAYSTACK_SECRET_KEY
};