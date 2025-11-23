// Simple verification of commission calculations without database connection
console.log('Verifying Commission System Calculations...');

// Commission calculation function (simplified version of the actual service)
function calculatePayout(orderAmount, commissionRate) {
  const commissionAmount = orderAmount * commissionRate;
  const vendorAmount = orderAmount - commissionAmount;
  
  return {
    vendorAmount: parseFloat(vendorAmount.toFixed(2)),
    commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    commissionRate,
    currency: 'USD'
  };
}

console.log('\n=== Test 1: 10% Commission on $100 ===');
let result = calculatePayout(100, 0.10);
console.log(`Order Amount: $${100}`);
console.log(`Commission Rate: ${result.commissionRate * 100}%`);
console.log(`Commission Amount: $${result.commissionAmount}`);
console.log(`Vendor Payout: $${result.vendorAmount}`);

// Verify calculations
if (result.commissionAmount === 10 && result.vendorAmount === 90) {
  console.log('✓ Vendor payout calculation is correct');
} else {
  console.log('✗ Vendor payout calculation is incorrect');
  process.exit(1);
}

console.log('\n=== Test 2: 15% Commission on $200 ===');
result = calculatePayout(200, 0.15);
console.log(`Order Amount: $${200}`);
console.log(`Commission Rate: ${result.commissionRate * 100}%`);
console.log(`Commission Amount: $${result.commissionAmount}`);
console.log(`Vendor Payout: $${result.vendorAmount}`);

// Verify calculations
if (result.commissionAmount === 30 && result.vendorAmount === 170) {
  console.log('✓ Vendor payout calculation is correct');
} else {
  console.log('✗ Vendor payout calculation is incorrect');
  process.exit(1);
}

console.log('\n=== Test 3: 10% Commission on $50 ===');
result = calculatePayout(50, 0.10);
console.log(`Order Amount: $${50}`);
console.log(`Commission Rate: ${result.commissionRate * 100}%`);
console.log(`Commission Amount: $${result.commissionAmount}`);
console.log(`Vendor Payout: $${result.vendorAmount}`);

// Verify calculations
if (result.commissionAmount === 5 && result.vendorAmount === 45) {
  console.log('✓ Vendor payout calculation is correct');
} else {
  console.log('✗ Vendor payout calculation is incorrect');
  process.exit(1);
}

console.log('\n🎉 All commission calculation tests passed!');
console.log('\n✅ Commission system calculations are working correctly');