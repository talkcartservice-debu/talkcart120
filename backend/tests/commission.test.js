const assert = require('assert');
const vendorPayoutService = require('../services/vendorPayoutService');
const adminCommissionService = require('../services/adminCommissionService');
const Settings = require('../models/Settings');

describe('Commission System', function() {
  describe('Vendor Payout Service', function() {
    it('should calculate correct vendor payout with 10% commission', async function() {
      // Set commission rate to 10% (0.10)
      const settings = await Settings.getOrCreateDefault('marketplace');
      settings.commissionRate = 0.10;
      await settings.save();
      
      // Test payout calculation
      const orderAmount = 100; // $100
      const currency = 'USD';
      const result = await vendorPayoutService.calculatePayout(orderAmount, currency);
      
      // With 10% commission:
      // Commission: $100 * 0.10 = $10
      // Vendor payout: $100 - $10 = $90
      assert.strictEqual(result.commissionAmount, 10);
      assert.strictEqual(result.vendorAmount, 90);
      assert.strictEqual(result.commissionRate, 0.10);
      assert.strictEqual(result.currency, currency);
    });
    
    it('should calculate correct vendor payout with different commission rate', async function() {
      // Set commission rate to 15% (0.15)
      const settings = await Settings.getOrCreateDefault('marketplace');
      settings.commissionRate = 0.15;
      await settings.save();
      
      // Test payout calculation
      const orderAmount = 200; // $200
      const currency = 'USD';
      const result = await vendorPayoutService.calculatePayout(orderAmount, currency);
      
      // With 15% commission:
      // Commission: $200 * 0.15 = $30
      // Vendor payout: $200 - $30 = $170
      assert.strictEqual(result.commissionAmount, 30);
      assert.strictEqual(result.vendorAmount, 170);
      assert.strictEqual(result.commissionRate, 0.15);
      assert.strictEqual(result.currency, currency);
    });
  });
  
  describe('Admin Commission Service', function() {
    it('should calculate total commission correctly', async function() {
      // Set commission rate to 10% (0.10)
      const settings = await Settings.getOrCreateDefault('marketplace');
      settings.commissionRate = 0.10;
      await settings.save();
      
      // Test total commission calculation
      const result = await adminCommissionService.calculateTotalCommission();
      
      // Verify the structure of the result
      assert.strictEqual(typeof result.totalRevenue, 'number');
      assert.strictEqual(typeof result.totalCommission, 'number');
      assert.strictEqual(typeof result.commissionRate, 'number');
      assert.strictEqual(typeof result.orderCount, 'number');
      assert.strictEqual(result.currency, 'USD');
    });
  });
});