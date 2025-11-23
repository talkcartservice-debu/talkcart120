const User = require('../models/User');
const VendorStore = require('../models/VendorStore');
const VendorPaymentPreferences = require('../models/VendorPaymentPreferences');

class VendorVerificationService {
  /**
   * Submit vendor for verification
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} verificationData - Verification data
   * @returns {Object} Verification result
   */
  async submitVendorForVerification(vendorId, verificationData) {
    try {
      console.log(`Submitting vendor ${vendorId} for verification`, verificationData);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Validate vendor is actually a vendor
      const isVendor = await vendor.isVendor();
      if (!isVendor) {
        throw new Error('User is not a vendor');
      }
      
      // Get vendor store
      const store = await VendorStore.findOne({ vendorId });
      if (!store) {
        throw new Error('Vendor store not found');
      }
      
      // Get vendor payment preferences
      const paymentPreferences = await VendorPaymentPreferences.findOne({ vendorId });
      if (!paymentPreferences) {
        throw new Error('Vendor payment preferences not found');
      }
      
      // Update store verification status
      store.verificationStatus = 'pending';
      store.verificationDocuments = verificationData.storeDocuments || [];
      await store.save();
      
      // Update payment preferences verification status
      paymentPreferences.isVerified = false;
      paymentPreferences.verificationDocuments = verificationData.paymentDocuments || [];
      await paymentPreferences.save();
      
      // Update user verification status
      vendor.isVerified = false;
      await vendor.save();
      
      console.log(`Vendor ${vendorId} submitted for verification successfully`);
      
      return {
        success: true,
        message: 'Vendor submitted for verification successfully',
        data: {
          vendorId,
          storeId: store._id,
          verificationStatus: 'pending'
        }
      };
    } catch (error) {
      console.error('Error submitting vendor for verification:', error);
      throw new Error(`Failed to submit vendor for verification: ${error.message}`);
    }
  }
  
  /**
   * Verify vendor documents
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} verificationResult - Verification result
   * @returns {Object} Verification result
   */
  async verifyVendorDocuments(vendorId, verificationResult) {
    try {
      console.log(`Verifying vendor ${vendorId} documents`, verificationResult);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor store
      const store = await VendorStore.findOne({ vendorId });
      if (!store) {
        throw new Error('Vendor store not found');
      }
      
      // Get vendor payment preferences
      const paymentPreferences = await VendorPaymentPreferences.findOne({ vendorId });
      if (!paymentPreferences) {
        throw new Error('Vendor payment preferences not found');
      }
      
      // Update verification based on result
      if (verificationResult.storeVerified) {
        store.verificationStatus = 'approved';
        store.isVerified = true;
      } else if (verificationResult.storeRejected) {
        store.verificationStatus = 'rejected';
        store.isVerified = false;
      }
      
      if (verificationResult.paymentVerified) {
        paymentPreferences.isVerified = true;
      } else if (verificationResult.paymentRejected) {
        paymentPreferences.isVerified = false;
      }
      
      // If both are verified, mark vendor as verified
      if (store.isVerified && paymentPreferences.isVerified) {
        vendor.isVerified = true;
      } else {
        vendor.isVerified = false;
      }
      
      // Save all changes
      await store.save();
      await paymentPreferences.save();
      await vendor.save();
      
      console.log(`Vendor ${vendorId} documents verified successfully`);
      
      // Send notification to vendor
      try {
        const Notification = require('../models/Notification');
        const statusMessage = store.isVerified && paymentPreferences.isVerified 
          ? 'approved' 
          : store.verificationStatus === 'rejected' || !paymentPreferences.isVerified
            ? 'rejected'
            : 'under review';
            
        await Notification.create({
          userId: vendorId,
          type: 'vendor_verification',
          title: 'Vendor Verification Status Updated',
          message: `Your vendor verification status has been updated to: ${statusMessage}`,
          data: {
            verificationStatus: statusMessage,
            storeVerified: store.isVerified,
            paymentVerified: paymentPreferences.isVerified
          }
        });
      } catch (notificationError) {
        console.error('Failed to send verification notification:', notificationError);
      }
      
      return {
        success: true,
        message: 'Vendor documents verified successfully',
        data: {
          vendorId,
          storeId: store._id,
          isVerified: vendor.isVerified,
          storeVerified: store.isVerified,
          paymentVerified: paymentPreferences.isVerified,
          verificationStatus: store.verificationStatus
        }
      };
    } catch (error) {
      console.error('Error verifying vendor documents:', error);
      throw new Error(`Failed to verify vendor documents: ${error.message}`);
    }
  }
  
  /**
   * Get vendor verification status
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Verification status
   */
  async getVendorVerificationStatus(vendorId) {
    try {
      console.log(`Getting verification status for vendor ${vendorId}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor store
      const store = await VendorStore.findOne({ vendorId });
      if (!store) {
        throw new Error('Vendor store not found');
      }
      
      // Get vendor payment preferences
      const paymentPreferences = await VendorPaymentPreferences.findOne({ vendorId });
      if (!paymentPreferences) {
        throw new Error('Vendor payment preferences not found');
      }
      
      const status = {
        vendorId,
        isVendor: await vendor.isVendor(),
        userVerified: vendor.isVerified,
        storeVerified: store.isVerified,
        storeVerificationStatus: store.verificationStatus,
        paymentVerified: paymentPreferences.isVerified,
        overallVerificationStatus: vendor.isVerified ? 'verified' : 'pending'
      };
      
      console.log(`Verification status for vendor ${vendorId}:`, status);
      
      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error('Error getting vendor verification status:', error);
      throw new Error(`Failed to get vendor verification status: ${error.message}`);
    }
  }
  
  /**
   * Get pending vendor verifications
   * @param {Object} options - Query options
   * @returns {Array} Pending verifications
   */
  async getPendingVerifications(options = {}) {
    try {
      const { limit = 50, skip = 0 } = options;
      
      console.log(`Getting pending vendor verifications`, { limit, skip });
      
      // Find stores with pending verification
      const pendingStores = await VendorStore.find({
        verificationStatus: 'pending'
      })
      .limit(limit)
      .skip(skip)
      .populate('vendorId', 'username displayName email isVerified');
      
      const verifications = await Promise.all(pendingStores.map(async (store) => {
        const paymentPreferences = await VendorPaymentPreferences.findOne({ vendorId: store.vendorId._id });
        
        return {
          storeId: store._id,
          vendorId: store.vendorId._id,
          vendorName: store.vendorId.displayName || store.vendorId.username,
          vendorEmail: store.vendorId.email,
          storeName: store.storeName,
          storeDescription: store.storeDescription,
          verificationDocuments: store.verificationDocuments,
          paymentDocuments: paymentPreferences?.verificationDocuments || [],
          submittedAt: store.updatedAt
        };
      }));
      
      console.log(`Found ${verifications.length} pending verifications`);
      
      return {
        success: true,
        data: verifications,
        pagination: {
          limit,
          skip,
          total: verifications.length
        }
      };
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      throw new Error(`Failed to get pending verifications: ${error.message}`);
    }
  }
  
  /**
   * Revoke vendor verification
   * @param {string} vendorId - Vendor's user ID
   * @param {string} reason - Reason for revocation
   * @returns {Object} Revocation result
   */
  async revokeVendorVerification(vendorId, reason) {
    try {
      console.log(`Revoking verification for vendor ${vendorId}`, { reason });
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor store
      const store = await VendorStore.findOne({ vendorId });
      if (!store) {
        throw new Error('Vendor store not found');
      }
      
      // Get vendor payment preferences
      const paymentPreferences = await VendorPaymentPreferences.findOne({ vendorId });
      if (!paymentPreferences) {
        throw new Error('Vendor payment preferences not found');
      }
      
      // Revoke all verifications
      vendor.isVerified = false;
      store.isVerified = false;
      store.verificationStatus = 'rejected';
      paymentPreferences.isVerified = false;
      
      // Save all changes
      await vendor.save();
      await store.save();
      await paymentPreferences.save();
      
      console.log(`Verification revoked for vendor ${vendorId}`);
      
      // Send notification to vendor
      try {
        const Notification = require('../models/Notification');
        await Notification.create({
          userId: vendorId,
          type: 'vendor_verification_revoked',
          title: 'Vendor Verification Revoked',
          message: `Your vendor verification has been revoked. Reason: ${reason}`,
          data: {
            reason,
            revokedAt: new Date()
          }
        });
      } catch (notificationError) {
        console.error('Failed to send revocation notification:', notificationError);
      }
      
      return {
        success: true,
        message: 'Vendor verification revoked successfully',
        data: {
          vendorId,
          revokedAt: new Date(),
          reason
        }
      };
    } catch (error) {
      console.error('Error revoking vendor verification:', error);
      throw new Error(`Failed to revoke vendor verification: ${error.message}`);
    }
  }
}

module.exports = new VendorVerificationService();