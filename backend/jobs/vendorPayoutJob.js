const cron = require('node-cron');
const vendorPayoutService = require('../services/vendorPayoutService');
const Order = require('../models/Order');
const User = require('../models/User');

class VendorPayoutJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Process vendor payouts for completed orders
   */
  async processPayouts() {
    if (this.isRunning) {
      console.log('_vendor payout job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log('Starting vendor payout processing job at', startTime.toISOString());

    try {
      // Process completed order payouts
      const results = await vendorPayoutService.processCompletedOrderPayouts({
        limit: 50 // Process 50 orders at a time
      });

      const endTime = new Date();
      const duration = (endTime - startTime) / 1000; // in seconds

      console.log('Vendor payout processing completed:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds: duration,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        payouts: results.payouts.length
      });

      // Log any errors
      if (results.errors.length > 0) {
        console.error('Errors during vendor payout processing:', results.errors);
      }

      return results;
    } catch (error) {
      console.error('Error in vendor payout job:', error);
      // Log error details
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    } finally {
      this.isRunning = false;
      console.log('Vendor payout job finished at', new Date().toISOString());
    }
  }

  /**
   * Start the scheduled job
   */
  start() {
    // Run every hour to process vendor payouts
    cron.schedule('0 * * * *', async () => {
      try {
        await this.processPayouts();
      } catch (error) {
        console.error('Scheduled vendor payout job failed:', error);
      }
    });

    console.log('Vendor payout job scheduled to run every hour');
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow() {
    return await this.processPayouts();
  }
}

module.exports = new VendorPayoutJob();