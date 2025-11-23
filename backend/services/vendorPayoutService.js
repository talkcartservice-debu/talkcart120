const Order = require('../models/Order');
const VendorPaymentPreferences = require('../models/VendorPaymentPreferences');
const Settings = require('../models/Settings');
const User = require('../models/User');
// Node.js 18+ has built-in fetch support
const fetch = global.fetch || require('node-fetch');

class VendorPayoutService {
  /**
   * Calculate the amount vendor should receive after commission
   * @param {number} orderAmount - Total order amount
   * @param {string} currency - Currency of the order
   * @returns {Object} Object containing vendor amount, commission amount, and rate
   */
  async calculatePayout(orderAmount, currency) {
    try {
      // Get commission rate from settings
      const settings = await Settings.getOrCreateDefault('marketplace');
      const commissionRate = settings.commissionRate || 0.10; // Default 10%
      
      const commissionAmount = orderAmount * commissionRate;
      const vendorAmount = orderAmount - commissionAmount;
      
      return {
        vendorAmount: parseFloat(vendorAmount.toFixed(2)),
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        commissionRate,
        currency
      };
    } catch (error) {
      console.error('Error calculating payout:', error);
      throw new Error(`Failed to calculate payout: ${error.message}`);
    }
  }

  /**
   * Get vendor's payment preferences
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Vendor's payment preferences
   */
  async getVendorPaymentPreferences(vendorId) {
    try {
      const preferences = await VendorPaymentPreferences.findOne({ vendorId: { $eq: String(vendorId) } });
      return preferences || {
        mobileMoney: { enabled: false },
        bankAccount: { enabled: false },
        paypal: { enabled: false },
        cryptoWallet: { enabled: false },
        defaultPaymentMethod: 'mobileMoney'
      };
    } catch (error) {
      console.error('Error fetching vendor payment preferences:', error);
      throw new Error(`Failed to fetch vendor payment preferences: ${error.message}`);
    }
  }

  /**
   * Process payout to vendor based on their preferences
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} payoutDetails - Details about the payout
   * @returns {Object} Payout result
   */
  async processVendorPayout(vendor, amount, currency, payoutDetails) {
    try {
      const vendorId = vendor._id;
      console.log(`Processing vendor payout for vendor ${vendorId}`, { amount, currency, payoutDetails });
      
      const preferences = await this.getVendorPaymentPreferences(vendorId);
      const paymentMethod = preferences.defaultPaymentMethod || 'mobileMoney';
      
      // Check if the preferred payment method is enabled
      if (!preferences[paymentMethod] || !preferences[paymentMethod].enabled) {
        const errorMsg = `Vendor's preferred payment method (${paymentMethod}) is not enabled`;
        console.error(errorMsg, { vendorId, paymentMethod, preferences });
        throw new Error(errorMsg);
      }
      
      let result = {
        status: 'pending',
        method: paymentMethod,
        amount,
        currency,
        vendorId,
        payoutDetails
      };
      
      // Process based on payment method
      switch (paymentMethod) {
        case 'mobileMoney':
          result = await this.processMobileMoneyPayout(vendor, amount, currency, preferences.mobileMoney, payoutDetails);
          break;
        case 'bankAccount':
          result = await this.processBankPayout(vendor, amount, currency, preferences.bankAccount, payoutDetails);
          break;
        case 'paypal':
          result = await this.processPayPalPayout(vendor, amount, currency, preferences.paypal, payoutDetails);
          break;
        case 'cryptoWallet':
          result = await this.processCryptoPayout(vendor, amount, currency, preferences.cryptoWallet, payoutDetails);
          break;
        default:
          const errorMsg = `Unsupported payment method: ${paymentMethod}`;
          console.error(errorMsg, { vendorId, paymentMethod });
          throw new Error(errorMsg);
      }
      
      console.log(`Vendor payout processed successfully`, { vendorId, result });
      
      // Record payout in vendor's payment preferences
      await this.recordPayout(vendorId, {
        orderId: payoutDetails.orderId,
        amount: result.amount,
        currency: result.currency,
        method: result.method,
        status: result.status,
        transactionId: result.transactionId,
        details: result.details
      });
      
      // Send notification to vendor
      try {
        const Notification = require('../models/Notification');
        await Notification.create({
          userId: vendorId,
          type: 'payout_processed',
          title: 'Payout Processed',
          message: `A payout of ${result.amount} ${result.currency} has been processed to your ${paymentMethod} account.`,
          data: {
            payoutId: result.transactionId,
            amount: result.amount,
            currency: result.currency,
            method: result.method,
            status: result.status
          }
        });
      } catch (notificationError) {
        console.error('Failed to send payout notification:', notificationError);
      }
      
      return result;
    } catch (error) {
      console.error('Error processing vendor payout:', error);
      
      // Record failed payout attempt
      try {
        await this.recordPayout(vendorId, {
          orderId: payoutDetails.orderId,
          amount: amount,
          currency: currency,
          method: paymentMethod,
          status: 'failed',
          details: {
            ...payoutDetails,
            error: error.message
          }
        });
      } catch (recordError) {
        console.error('Failed to record failed payout:', recordError);
      }
      
      throw new Error(`Failed to process vendor payout: ${error.message}`);
    }
  }

  /**
   * Record payout in vendor's payment preferences
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} payoutRecord - Payout record to store
   */
  async recordPayout(vendorId, payoutRecord) {
    try {
      console.log(`Recording payout for vendor ${vendorId}`, { payoutRecord });
      await VendorPaymentPreferences.findOneAndUpdate(
        { vendorId: { $eq: String(vendorId) } },
        { 
          $push: { 
            payoutHistory: {
              ...payoutRecord,
              processedAt: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
      console.log(`Payout recorded successfully for vendor ${vendorId}`);
    } catch (error) {
      console.error('Error recording payout:', error);
      // Don't throw error as this is just for tracking
    }
  }

  /**
   * Process mobile money payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} mobileMoneyDetails - Mobile money details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processMobileMoneyPayout(vendor, amount, currency, mobileMoneyDetails, payoutDetails) {
    try {
      console.log(`Processing mobile money payout for vendor ${vendor._id}`, { amount, currency, mobileMoneyDetails });
      
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
        vendorId: vendor._id,
        transactionId: `mm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          provider: mobileMoneyDetails.provider,
          phoneNumber: mobileMoneyDetails.phoneNumber,
          country: mobileMoneyDetails.country,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Mobile money payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing mobile money payout:', error);
      throw new Error(`Failed to process mobile money payout: ${error.message}`);
    }
  }

  /**
   * Process bank account payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} bankDetails - Bank account details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processBankPayout(vendor, amount, currency, bankDetails, payoutDetails) {
    try {
      console.log(`Processing bank payout for vendor ${vendor._id}`, { amount, currency, bankDetails });
      
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
        vendorId: vendor._id,
        transactionId: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          country: bankDetails.country,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Bank payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing bank payout:', error);
      throw new Error(`Failed to process bank payout: ${error.message}`);
    }
  }

  /**
   * Process PayPal payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} paypalDetails - PayPal details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processPayPalPayout(vendor, amount, currency, paypalDetails, payoutDetails) {
    try {
      console.log(`Processing PayPal payout for vendor ${vendor._id}`, { amount, currency, paypalDetails });
      
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
        vendorId: vendor._id,
        transactionId: `pp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          email: paypalDetails.email,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`PayPal payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing PayPal payout:', error);
      throw new Error(`Failed to process PayPal payout: ${error.message}`);
    }
  }

  /**
   * Process crypto wallet payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} cryptoDetails - Crypto wallet details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processCryptoPayout(vendor, amount, currency, cryptoDetails, payoutDetails) {
    try {
      console.log(`Processing crypto payout for vendor ${vendor._id}`, { amount, currency, cryptoDetails });
      
      // Validate crypto details
      if (!cryptoDetails.walletAddress || !cryptoDetails.network) {
        throw new Error('Missing required crypto wallet details');
      }
      
      // For crypto payouts, we would typically integrate with a crypto payment provider
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'cryptoWallet',
        amount,
        currency,
        vendorId: vendor._id,
        transactionId: `crypto_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          walletAddress: cryptoDetails.walletAddress,
          network: cryptoDetails.network,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Crypto payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing crypto payout:', error);
      throw new Error(`Failed to process crypto payout: ${error.message}`);
    }
  }

  /**
   * Process payouts for completed orders
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  async processCompletedOrderPayouts(options = {}) {
    try {
      const { limit = 100, force = false } = options;
      
      console.log(`Starting vendor payout processing`, { limit, force });
      
      // Find completed orders that haven't been processed for vendor payouts
      const query = {
        status: 'completed',
        'metadata.vendorPayoutProcessed': { $ne: true }
      };
      
      const orders = await Order.find(query)
        .limit(limit)
        .populate('userId', 'username displayName email walletAddress')
        .populate('items.productId', 'vendorId name price')
        .sort({ createdAt: 1 });
      
      console.log(`Found ${orders.length} orders to process for vendor payouts`);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        payouts: []
      };
      
      for (const order of orders) {
        try {
          console.log(`Processing order ${order._id} for vendor payouts`);
          
          // Process payout for each item in the order
          for (const item of order.items) {
            // Fix: Check for proper vendor ID structure
            let vendorId = null;
            if (item.productId && item.productId.vendorId) {
              // New structure
              vendorId = item.productId.vendorId;
            } else if (item.vendorId) {
              // Old structure or direct vendor ID
              vendorId = item.vendorId;
            }
            
            if (vendorId) {
              const vendor = await User.findById(vendorId);
              if (vendor) {
                // Calculate payout amount (item price * quantity)
                const itemTotal = item.price * item.quantity;
                
                console.log(`Calculating payout for vendor ${vendorId}`, { itemTotal, currency: order.currency });
                
                // Calculate vendor payout after commission
                const payoutCalculation = await this.calculatePayout(itemTotal, order.currency);
                
                console.log(`Payout calculation result`, { vendorId, payoutCalculation });
                
                // Process the payout
                const payoutResult = await this.processVendorPayout(
                  vendor,
                  payoutCalculation.vendorAmount,
                  order.currency,
                  {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    itemId: item._id,
                    productName: item.name,
                    quantity: item.quantity,
                    orderTotal: itemTotal,
                    commissionRate: payoutCalculation.commissionRate,
                    commissionAmount: payoutCalculation.commissionAmount
                  }
                );
                
                results.payouts.push(payoutResult);
                results.successful++;
                console.log(`Successfully processed payout for vendor ${vendorId}`, { payoutResult });
                
                // Update order with payout information
                if (!order.metadata) order.metadata = {};
                if (!order.metadata.vendorPayouts) order.metadata.vendorPayouts = [];
                order.metadata.vendorPayouts.push({
                  vendorId: vendorId,
                  amount: payoutCalculation.vendorAmount,
                  currency: order.currency,
                  status: 'completed',
                  processedAt: new Date(),
                  payoutResult: payoutResult
                });
              } else {
                console.warn(`Vendor not found for item`, { vendorId, itemId: item._id });
                
                // Add error to order metadata
                if (!order.metadata) order.metadata = {};
                if (!order.metadata.payoutErrors) order.metadata.payoutErrors = [];
                order.metadata.payoutErrors.push({
                  vendorId: vendorId,
                  itemId: item._id,
                  error: 'Vendor not found',
                  timestamp: new Date()
                });
              }
            } else {
              console.warn(`No vendor ID found for item`, { item });
              
              // Add error to order metadata
              if (!order.metadata) order.metadata = {};
              if (!order.metadata.payoutErrors) order.metadata.payoutErrors = [];
              order.metadata.payoutErrors.push({
                itemId: item._id,
                error: 'No vendor ID found',
                timestamp: new Date()
              });
            }
          }
          
          // Mark order as processed for vendor payouts
          if (!order.metadata) order.metadata = {};
          order.metadata.vendorPayoutProcessed = true;
          await order.save();
          
          results.processed++;
          console.log(`Order ${order._id} marked as processed for vendor payouts`);
        } catch (error) {
          console.error(`Error processing payout for order ${order._id}:`, error);
          results.failed++;
          results.errors.push({
            orderId: order._id,
            error: error.message
          });
          
          // Add error to order metadata
          if (!order.metadata) order.metadata = {};
          if (!order.metadata.payoutErrors) order.metadata.payoutErrors = [];
          order.metadata.payoutErrors.push({
            error: error.message,
            timestamp: new Date()
          });
          
          // Save order with error information
          await order.save();
        }
      }
      
      console.log(`Vendor payout processing completed`, results);
      return results;
    } catch (error) {
      console.error('Error processing completed order payouts:', error);
      throw new Error(`Failed to process completed order payouts: ${error.message}`);
    }
  }

  /**
   * Get vendor's payout history
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} options - Query options
   * @returns {Array} Payout history
   */
  async getVendorPayoutHistory(vendorId, options = {}) {
    try {
      const { limit = 50, status } = options;
      
      console.log(`Fetching payout history for vendor ${vendorId}`, { limit, status });
      
      // Validate vendorId
      if (!vendorId) {
        throw new Error('Vendor ID is required');
      }
      
      const query = { vendorId };
      if (status) {
        query['payoutHistory.status'] = status;
      }
      
      const preferences = await VendorPaymentPreferences.findOne({ ...query, vendorId: { $eq: String(vendorId) } });
      
      if (!preferences || !preferences.payoutHistory) {
        console.log(`No payout history found for vendor ${vendorId}`);
        return [];
      }
      
      let history = preferences.payoutHistory;
      
      // Filter by status if provided
      if (status) {
        history = history.filter(payout => payout.status === status);
      }
      
      // Sort by processed date (newest first) and limit
      history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
      
      const result = history.slice(0, limit);
      console.log(`Found ${result.length} payout history records for vendor ${vendorId}`);
      
      return result;
    } catch (error) {
      console.error('Error fetching vendor payout history:', error);
      throw new Error(`Failed to fetch vendor payout history: ${error.message}`);
    }
  }

  /**
   * Process automatic payouts based on vendor preferences
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  async processAutomaticPayouts(options = {}) {
    try {
      const { limit = 50 } = options;
      
      console.log(`Starting automatic payout processing`, { limit });
      
      // Find vendors with auto-payout enabled
      const vendorPreferences = await VendorPaymentPreferences.find({
        'autoPayoutEnabled': true,
        'payoutHistory': { $exists: true, $ne: [] }
      }).limit(limit);
      
      console.log(`Found ${vendorPreferences.length} vendors with auto-payout enabled`);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        payouts: []
      };
      
      for (const preference of vendorPreferences) {
        try {
          const vendorId = preference.vendorId;
          console.log(`Processing automatic payout for vendor ${vendorId}`);
          
          // Get vendor
          const vendor = await User.findById(vendorId);
          if (!vendor) {
            console.warn(`Vendor not found for automatic payout`, { vendorId });
            continue;
          }
          
          // Check if vendor has pending payouts
          const pendingPayouts = preference.payoutHistory.filter(payout => 
            payout.status === 'pending' || payout.status === 'pending_manual'
          );
          
          if (pendingPayouts.length === 0) {
            console.log(`No pending payouts for vendor ${vendorId}`);
            continue;
          }
          
          // Process each pending payout
          for (const payout of pendingPayouts) {
            try {
              // Update payout status
              const updatedPayout = {
                ...payout,
                status: 'processing',
                processedAt: new Date()
              };
              
              // Update in database
              await VendorPaymentPreferences.updateOne(
                { vendorId: vendorId, 'payoutHistory._id': payout._id },
                { $set: { 'payoutHistory.$': updatedPayout } }
              );
              
              // Process the payout based on method
              let result;
              switch (payout.method) {
                case 'mobileMoney':
                  result = await this.processMobileMoneyPayout(vendor, payout.amount, payout.currency, preference.mobileMoney, payout.details);
                  break;
                case 'bankAccount':
                  result = await this.processBankPayout(vendor, payout.amount, payout.currency, preference.bankAccount, payout.details);
                  break;
                case 'paypal':
                  result = await this.processPayPalPayout(vendor, payout.amount, payout.currency, preference.paypal, payout.details);
                  break;
                case 'cryptoWallet':
                  result = await this.processCryptoPayout(vendor, payout.amount, payout.currency, preference.cryptoWallet, payout.details);
                  break;
                default:
                  throw new Error(`Unsupported payment method: ${payout.method}`);
              }
              
              // Update payout with result
              await VendorPaymentPreferences.updateOne(
                { vendorId: vendorId, 'payoutHistory._id': payout._id },
                { $set: { 'payoutHistory.$': result } }
              );
              
              results.payouts.push(result);
              results.successful++;
              console.log(`Successfully processed automatic payout for vendor ${vendorId}`, { result });
              
              // Send notification
              try {
                const Notification = require('../models/Notification');
                await Notification.create({
                  userId: vendorId,
                  type: 'payout_processed',
                  title: 'Automatic Payout Processed',
                  message: `An automatic payout of ${result.amount} ${result.currency} has been processed to your ${result.method} account.`,
                  data: {
                    payoutId: result.transactionId,
                    amount: result.amount,
                    currency: result.currency,
                    method: result.method,
                    status: result.status
                  }
                });
              } catch (notificationError) {
                console.error('Failed to send automatic payout notification:', notificationError);
              }
            } catch (payoutError) {
              console.error(`Error processing automatic payout for vendor ${vendorId}:`, payoutError);
              results.failed++;
              results.errors.push({
                vendorId: vendorId,
                payoutId: payout._id,
                error: payoutError.message
              });
              
              // Update payout status to failed
              const failedPayout = {
                ...payout,
                status: 'failed',
                processedAt: new Date(),
                error: payoutError.message
              };
              
              await VendorPaymentPreferences.updateOne(
                { vendorId: vendorId, 'payoutHistory._id': payout._id },
                { $set: { 'payoutHistory.$': failedPayout } }
              );
            }
          }
          
          results.processed++;
        } catch (vendorError) {
          console.error(`Error processing automatic payouts for vendor ${preference.vendorId}:`, vendorError);
          results.failed++;
          results.errors.push({
            vendorId: preference.vendorId,
            error: vendorError.message
          });
        }
      }
      
      console.log(`Automatic payout processing completed`, results);
      return results;
    } catch (error) {
      console.error('Error processing automatic payouts:', error);
      throw new Error(`Failed to process automatic payouts: ${error.message}`);
    }
  }
}

module.exports = new VendorPayoutService();