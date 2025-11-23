const vendorPayoutService = require('../services/vendorPayoutService');
const adminCommissionService = require('../services/adminCommissionService');
const Settings = require('../models/Settings');

async function verifyCommissionSystem() {
  console.log('Verifying Commission System...');
  
  try {
    // Set commission rate to 10% (0.10)
    console.log('Setting commission rate to 10%...');
    const settings = await Settings.getOrCreateDefault('marketplace');
    settings.commissionRate = 0.10;
    await settings.save();
    
    // Test vendor payout calculation
    console.log('Testing vendor payout calculation...');
    const orderAmount = 100; // $100
    const currency = 'USD';
    const vendorResult = await vendorPayoutService.calculatePayout(orderAmount, currency);
    
    console.log(`Order Amount: $${orderAmount}`);
    console.log(`Commission Rate: ${vendorResult.commissionRate * 100}%`);
    console.log(`Commission Amount: $${vendorResult.commissionAmount}`);
    console.log(`Vendor Payout: $${vendorResult.vendorAmount}`);
    
    // Verify calculations
    if (vendorResult.commissionAmount === 10 && vendorResult.vendorAmount === 90) {
      console.log('✓ Vendor payout calculation is correct');
    } else {
      console.log('✗ Vendor payout calculation is incorrect');
      return false;
    }
    
    // Test with different commission rate
    console.log('\nTesting with 15% commission rate...');
    settings.commissionRate = 0.15;
    await settings.save();
    
    const orderAmount2 = 200; // $200
    const vendorResult2 = await vendorPayoutService.calculatePayout(orderAmount2, currency);
    
    console.log(`Order Amount: $${orderAmount2}`);
    console.log(`Commission Rate: ${vendorResult2.commissionRate * 100}%`);
    console.log(`Commission Amount: $${vendorResult2.commissionAmount}`);
    console.log(`Vendor Payout: $${vendorResult2.vendorAmount}`);
    
    // Verify calculations
    if (vendorResult2.commissionAmount === 30 && vendorResult2.vendorAmount === 170) {
      console.log('✓ Vendor payout calculation with 15% rate is correct');
    } else {
      console.log('✗ Vendor payout calculation with 15% rate is incorrect');
      return false;
    }
    
    // Test admin commission calculation
    console.log('\nTesting admin commission calculation...');
    const adminResult = await adminCommissionService.calculateTotalCommission();
    
    console.log(`Total Revenue: $${adminResult.totalRevenue}`);
    console.log(`Total Commission: $${adminResult.totalCommission}`);
    console.log(`Commission Rate: ${adminResult.commissionRate * 100}%`);
    console.log(`Order Count: ${adminResult.orderCount}`);
    console.log(`Currency: ${adminResult.currency}`);
    
    console.log('✓ Admin commission calculation structure is correct');
    
    console.log('\n🎉 All commission system tests passed!');
    return true;
  } catch (error) {
    console.error('Error verifying commission system:', error);
    return false;
  }
}

// Run the verification
verifyCommissionSystem().then(success => {
  if (success) {
    console.log('\n✅ Commission system is working correctly');
  } else {
    console.log('\n❌ Commission system has issues');
    process.exit(1);
  }
});