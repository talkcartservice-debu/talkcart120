const AdminPaymentPreferences = require('../models/AdminPaymentPreferences');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const User = require('../models/User');
// Node.js 18+ has built-in fetch support
const fetch = global.fetch || require('node-fetch');

class AdminCommissionService {
  /**
   * Calculate total admin commission
   * @returns {Object} Object containing total commission and details
   */
  async calculateTotalCommission() {
    try {
      // Get commission rate from settings
      const settings = await Settings.getOrCreateDefault('marketplace');
      const commissionRate = settings.commissionRate || 0.10; // Default 10%
      
      // Get all completed orders
      const orders = await Order.find({ 
        status: 'completed',
        'metadata.vendorPayoutProcessed': { $eq: true }
      });
      
      let totalRevenue = 0;
      let totalCommission = 0;
      
      // Calculate total commission
      for (const order of orders) {
        for (const item of order.items) {
          // Calculate item total (price * quantity)
          const itemTotal = item.price * item.quantity;
          totalRevenue += itemTotal;
          totalCommission += itemTotal * commissionRate;
        }
      }
      
      return {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        commissionRate,
        orderCount: orders.length,
        currency: 'USD' // Using USD as base currency
      };
    } catch (error) {
      console.error('Error calculating total commission:', error);
      throw new Error(`Failed to calculate total commission: ${error.message}`);
    }
  }
  
  /**
   * Get admin's payment preferences
   * @param {string} adminId - Admin's user ID
   * @returns {Object} Admin's payment preferences
   */
  async getAdminPaymentPreferences(adminId) {
    try {
      const preferences = await AdminPaymentPreferences.findOne({ adminId: { $eq: String(adminId) } });
      return preferences || {
        mobileMoney: { enabled: false },
        bankAccount: { enabled: false },
        paypal: { enabled: false },
        cryptoWallet: { enabled: false },
        defaultPaymentMethod: 'bankAccount'
      };
    } catch (error) {
      console.error('Error fetching admin payment preferences:', error);
      throw new Error(`Failed to fetch admin payment preferences: ${error.message}`);
    }
  }
  
  /**
   * Process commission withdrawal to admin based on their preferences
   * @param {Object} admin - Admin user object
   * @param {number} amount - Amount to withdraw
   * @param {string} currency - Currency of the withdrawal
   * @param {Object} withdrawalDetails - Details about the withdrawal
   * @returns {Object} Withdrawal result
   */
  async processCommissionWithdrawal(admin, amount, currency, withdrawalDetails) {
    try {
      const adminId = admin._id;
      console.log(`Processing admin commission withdrawal for admin ${adminId}`, { amount, currency, withdrawalDetails });
      
      const preferences = await this.getAdminPaymentPreferences(adminId);
      const paymentMethod = preferences.defaultPaymentMethod || 'bankAccount';
      
      // Check if the preferred payment method is enabled
      if (!preferences[paymentMethod] || !preferences[paymentMethod].enabled) {
        const errorMsg = `Admin's preferred payment method (${paymentMethod}) is not enabled`;
        console.error(errorMsg, { adminId, paymentMethod, preferences });
        throw new Error(errorMsg);
      }
      
      let result = {
        status: 'pending',
        method: paymentMethod,
        amount,
        currency,
        adminId,
        withdrawalDetails
      };
      
      // Process based on payment method
      switch (paymentMethod) {
        case 'mobileMoney':
          result = await this.processMobileMoneyWithdrawal(admin, amount, currency, preferences.mobileMoney, withdrawalDetails);
          break;
        case 'bankAccount':
          result = await this.processBankWithdrawal(admin, amount, currency, preferences.bankAccount, withdrawalDetails);
          break;
        case 'paypal':
          result = await this.processPayPalWithdrawal(admin, amount, currency, preferences.paypal, withdrawalDetails);
          break;
        case 'cryptoWallet':
          result = await this.processCryptoWithdrawal(admin, amount, currency, preferences.cryptoWallet, withdrawalDetails);
          break;
        default:
          const errorMsg = `Unsupported payment method: ${paymentMethod}`;
          console.error(errorMsg, { adminId, paymentMethod });
          throw new Error(errorMsg);
      }
      
      console.log(`Admin commission withdrawal processed successfully`, { adminId, result });
      
      // Record withdrawal in admin's payment preferences
      await this.recordWithdrawal(adminId, {
        amount: result.amount,
        currency: result.currency,
        method: result.method,
        status: result.status,
        transactionId: result.transactionId,
        details: result.details
      });
      
      // Send notification to admin
      try {
        const Notification = require('../models/Notification');
        await Notification.create({
          userId: adminId,
          type: 'commission_withdrawal_processed',
          title: 'Commission Withdrawal Processed',
          message: `A withdrawal of ${result.amount} ${result.currency} has been processed to your ${paymentMethod} account.`,
          data: {
            withdrawalId: result.transactionId,
            amount: result.amount,
            currency: result.currency,
            method: result.method,
            status: result.status
          }
        });
      } catch (notificationError) {
        console.error('Failed to send commission withdrawal notification:', notificationError);
      }
      
      return result;
    } catch (error) {
      console.error('Error processing admin commission withdrawal:', error);
      
      // Record failed withdrawal attempt
      try {
        await this.recordWithdrawal(adminId, {
          amount: amount,
          currency: currency,
          method: paymentMethod,
          status: 'failed',
          details: {
            ...withdrawalDetails,
            error: error.message
          }
        });
      } catch (recordError) {
        console.error('Failed to record failed withdrawal:', recordError);
      }
      
      throw new Error(`Failed to process admin commission withdrawal: ${error.message}`);
    }
  }
  
  /**
   * Record withdrawal in admin's payment preferences
   * @param {string} adminId - Admin's user ID
   * @param {Object} withdrawalRecord - Withdrawal record to store
   */
  async recordWithdrawal(adminId, withdrawalRecord) {
    try {
      console.log(`Recording withdrawal for admin ${adminId}`, { withdrawalRecord });
      await AdminPaymentPreferences.findOneAndUpdate(
        { adminId: { $eq: String(adminId) } },
        { 
          $push: { 
            payoutHistory: {
              ...withdrawalRecord,
              processedAt: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
      console.log(`Withdrawal recorded successfully for admin ${adminId}`);
    } catch (error) {
      console.error('Error recording withdrawal:', error);
      // Don't throw error as this is just for tracking
    }
  }
  
  /**
   * Process mobile money withdrawal
   * @param {Object} admin - Admin user object
   * @param {number} amount - Amount to withdraw
   * @param {string} currency - Currency of the withdrawal
   * @param {Object} mobileMoneyDetails - Mobile money details
   * @param {Object} withdrawalDetails - Withdrawal details
   * @returns {Object} Withdrawal result
   */
  async processMobileMoneyWithdrawal(admin, amount, currency, mobileMoneyDetails, withdrawalDetails) {
    try {
      console.log(`Processing mobile money withdrawal for admin ${admin._id}`, { amount, currency, mobileMoneyDetails });
      
      // Validate mobile money details
      if (!mobileMoneyDetails.provider || !mobileMoneyDetails.phoneNumber || !mobileMoneyDetails.country) {
        throw new Error('Missing required mobile money details');
      }
      
      // For mobile money, we would typically integrate with a payment provider
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'mobileMoney',
        amount,
        currency,
        adminId: admin._id,
        transactionId: `mm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          provider: mobileMoneyDetails.provider,
          phoneNumber: mobileMoneyDetails.phoneNumber,
          country: mobileMoneyDetails.country,
          adminName: admin.displayName || admin.username,
          ...withdrawalDetails
        }
      };
      
      console.log(`Mobile money withdrawal processed`, { adminId: admin._id, result });
      return result;
    } catch (error) {
      console.error('Error processing mobile money withdrawal:', error);
      throw new Error(`Failed to process mobile money withdrawal: ${error.message}`);
    }
  }
  
  /**
   * Process bank account withdrawal
   * @param {Object} admin - Admin user object
   * @param {number} amount - Amount to withdraw
   * @param {string} currency - Currency of the withdrawal
   * @param {Object} bankDetails - Bank account details
   * @param {Object} withdrawalDetails - Withdrawal details
   * @returns {Object} Withdrawal result
   */
  async processBankWithdrawal(admin, amount, currency, bankDetails, withdrawalDetails) {
    try {
      console.log(`Processing bank withdrawal for admin ${admin._id}`, { amount, currency, bankDetails });
      
      // Validate bank details
      if (!bankDetails.accountHolderName || !bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.country) {
        throw new Error('Missing required bank account details');
      }
      
      // For bank transfers, we would typically integrate with a banking API
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'bankAccount',
        amount,
        currency,
        adminId: admin._id,
        transactionId: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          country: bankDetails.country,
          adminName: admin.displayName || admin.username,
          ...withdrawalDetails
        }
      };
      
      console.log(`Bank withdrawal processed`, { adminId: admin._id, result });
      return result;
    } catch (error) {
      console.error('Error processing bank withdrawal:', error);
      throw new Error(`Failed to process bank withdrawal: ${error.message}`);
    }
  }
  
  /**
   * Process PayPal withdrawal
   * @param {Object} admin - Admin user object
   * @param {number} amount - Amount to withdraw
   * @param {string} currency - Currency of the withdrawal
   * @param {Object} paypalDetails - PayPal details
   * @param {Object} withdrawalDetails - Withdrawal details
   * @returns {Object} Withdrawal result
   */
  async processPayPalWithdrawal(admin, amount, currency, paypalDetails, withdrawalDetails) {
    try {
      console.log(`Processing PayPal withdrawal for admin ${admin._id}`, { amount, currency, paypalDetails });
      
      // Validate PayPal details
      if (!paypalDetails.email) {
        throw new Error('Missing required PayPal email');
      }
      
      // For PayPal, we would typically integrate with PayPal's API
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'paypal',
        amount,
        currency,
        adminId: admin._id,
        transactionId: `pp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          email: paypalDetails.email,
          adminName: admin.displayName || admin.username,
          ...withdrawalDetails
        }
      };
      
      console.log(`PayPal withdrawal processed`, { adminId: admin._id, result });
      return result;
    } catch (error) {
      console.error('Error processing PayPal withdrawal:', error);
      throw new Error(`Failed to process PayPal withdrawal: ${error.message}`);
    }
  }
  
  /**
   * Process crypto wallet withdrawal
   * @param {Object} admin - Admin user object
   * @param {number} amount - Amount to withdraw
   * @param {string} currency - Currency of the withdrawal
   * @param {Object} cryptoDetails - Crypto wallet details
   * @param {Object} withdrawalDetails - Withdrawal details
   * @returns {Object} Withdrawal result
   */
  async processCryptoWithdrawal(admin, amount, currency, cryptoDetails, withdrawalDetails) {
    try {
      console.log(`Processing crypto withdrawal for admin ${admin._id}`, { amount, currency, cryptoDetails });
      
      // Validate crypto details
      if (!cryptoDetails.walletAddress || !cryptoDetails.network) {
        throw new Error('Missing required crypto wallet details');
      }
      
      // For crypto withdrawals, we would typically integrate with a crypto payment provider
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'cryptoWallet',
        amount,
        currency,
        adminId: admin._id,
        transactionId: `crypto_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          walletAddress: cryptoDetails.walletAddress,
          network: cryptoDetails.network,
          adminName: admin.displayName || admin.username,
          ...withdrawalDetails
        }
      };
      
      console.log(`Crypto withdrawal processed`, { adminId: admin._id, result });
      return result;
    } catch (error) {
      console.error('Error processing crypto withdrawal:', error);
      throw new Error(`Failed to process crypto withdrawal: ${error.message}`);
    }
  }
  
  /**
   * Get admin's withdrawal history
   * @param {string} adminId - Admin's user ID
   * @param {Object} options - Query options
   * @returns {Array} Withdrawal history
   */
  async getAdminWithdrawalHistory(adminId, options = {}) {
    try {
      const { limit = 50, status } = options;
      
      console.log(`Fetching withdrawal history for admin ${adminId}`, { limit, status });
      
      // Validate adminId
      if (!adminId) {
        throw new Error('Admin ID is required');
      }
      
      const query = { adminId };
      if (status) {
        query['payoutHistory.status'] = status;
      }
      
      const preferences = await AdminPaymentPreferences.findOne({ ...query, adminId: { $eq: String(adminId) } });
      
      if (!preferences || !preferences.payoutHistory) {
        console.log(`No withdrawal history found for admin ${adminId}`);
        return [];
      }
      
      let history = preferences.payoutHistory;
      
      // Filter by status if provided
      if (status) {
        history = history.filter(withdrawal => withdrawal.status === status);
      }
      
      // Sort by processed date (newest first) and limit
      history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
      
      const result = history.slice(0, limit);
      console.log(`Found ${result.length} withdrawal history records for admin ${adminId}`);
      
      return result;
    } catch (error) {
      console.error('Error fetching admin withdrawal history:', error);
      throw new Error(`Failed to fetch admin withdrawal history: ${error.message}`);
    }
  }
}

module.exports = new AdminCommissionService();