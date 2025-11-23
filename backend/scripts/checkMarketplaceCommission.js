#!/usr/bin/env node

/**
 * Script to verify marketplace commission system is working correctly
 * This script checks the actual implementation with database connections
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import services and models
const vendorPayoutService = require('../services/vendorPayoutService');
const adminCommissionService = require('../services/adminCommissionService');
const Settings = require('../models/Settings');

async function checkDatabaseConnection() {
  try {
    // Connect to MongoDB
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart';
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

async function checkCommissionSystem() {
  console.log('🔍 Checking Marketplace Commission System...\n');
  
  // Check database connection first
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.log('⚠️  Skipping database-dependent checks due to connection failure');
    return false;
  }
  
  try {
    // Check current commission rate
    console.log('1. Checking current commission rate...');
    const settings = await Settings.getOrCreateDefault('marketplace');
    console.log(`   Current commission rate: ${(settings.commissionRate * 100).toFixed(1)}%`);
    
    // Test vendor payout calculation
    console.log('\n2. Testing vendor payout calculation...');
    const testAmount = 100;
    const testCurrency = 'USD';
    const payoutResult = await vendorPayoutService.calculatePayout(testAmount, testCurrency);
    
    console.log(`   Order amount: $${testAmount} ${testCurrency}`);
    console.log(`   Commission: $${payoutResult.commissionAmount} (${(payoutResult.commissionRate * 100).toFixed(1)}%)`);
    console.log(`   Vendor payout: $${payoutResult.vendorAmount}`);
    
    // Verify calculation
    const expectedCommission = testAmount * settings.commissionRate;
    const expectedPayout = testAmount - expectedCommission;
    
    if (payoutResult.commissionAmount === expectedCommission && 
        payoutResult.vendorAmount === expectedPayout) {
      console.log('   ✅ Vendor payout calculation is correct');
    } else {
      console.log('   ❌ Vendor payout calculation is incorrect');
      return false;
    }
    
    // Test admin commission calculation
    console.log('\n3. Testing admin commission calculation...');
    const commissionResult = await adminCommissionService.calculateTotalCommission();
    
    console.log(`   Total revenue: $${commissionResult.totalRevenue.toFixed(2)}`);
    console.log(`   Total commission: $${commissionResult.totalCommission.toFixed(2)}`);
    console.log(`   Commission rate: ${(commissionResult.commissionRate * 100).toFixed(1)}%`);
    console.log(`   Total orders: ${commissionResult.orderCount}`);
    
    console.log('   ✅ Admin commission calculation structure is correct');
    
    // Summary
    console.log('\n🎉 Commission system verification completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Commission rate: ${(settings.commissionRate * 100).toFixed(1)}%`);
    console.log(`   - For a $100 sale:`);
    console.log(`     - Vendor receives: $${payoutResult.vendorAmount}`);
    console.log(`     - Commission to admin: $${payoutResult.commissionAmount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking commission system:', error.message);
    return false;
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('\n🔒 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database connection:', closeError.message);
    }
  }
}

// Run the check
checkCommissionSystem().then(success => {
  if (success) {
    console.log('\n✅ Marketplace commission system is working correctly');
    process.exit(0);
  } else {
    console.log('\n❌ Marketplace commission system has issues');
    process.exit(1);
  }
});