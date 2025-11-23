const mongoose = require('mongoose');
const { Product, Order, User, ProductReview } = require('../models');

/**
 * Vendor Analytics Service
 * Provides comprehensive analytics and performance metrics for vendors
 */

class VendorAnalyticsService {
  /**
   * Get vendor performance overview
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Performance overview data
   */
  async getVendorPerformanceOverview(vendorId) {
    try {
      console.log(`Getting vendor performance overview for vendor ${vendorId}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      // Validate vendorId before creating ObjectId
      let productQuery = { vendorId: vendorId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        productQuery = { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true };
      }
      
      const products = await Product.find(productQuery);
      
      const productIds = products.map(p => p._id);
      
      // Get orders for vendor's products
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        status: { $in: ['completed', 'delivered'] }
      }).populate('items.productId');
      
      // Calculate key metrics
      const totalSales = orders.reduce((sum, order) => {
        const vendorItems = order.items.filter(item => 
          item.productId && productIds.some(id => id.equals(item.productId._id)) // Fixed: null-safe access
        );
        return sum + vendorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);
      
      const totalOrders = orders.length;
      const totalProducts = products.length;
      
      // Calculate average order value
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // Get recent orders (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = orders.filter(order => 
        new Date(order.createdAt) >= thirtyDaysAgo
      );
      
      const recentSales = recentOrders.reduce((sum, order) => {
        const vendorItems = order.items.filter(item => 
          item.productId && productIds.some(id => id.equals(item.productId._id)) // Fixed: null-safe access
        );
        return sum + vendorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);
      
      // Get product reviews
      const reviews = await ProductReview.find({
        productId: { $in: productIds },
        isActive: true
      });
      
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;
      
      // Get top selling products
      const productSales = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId && productIds.some(id => id.equals(item.productId._id))) { // Fixed: null-safe access
            const productId = item.productId?._id.toString(); // Fixed: null-safe access
            if (!productSales[productId]) {
              productSales[productId] = {
                product: item.productId,
                sales: 0,
                quantity: 0,
                revenue: 0
              };
            }
            productSales[productId].sales += 1;
            productSales[productId].quantity += item.quantity;
            productSales[productId].revenue += item.price * item.quantity;
          }
        });
      });
      
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      return {
        success: true,
        data: {
          overview: {
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalOrders,
            totalProducts,
            avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
            recentSales: parseFloat(recentSales.toFixed(2)),
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalReviews: reviews.length
          },
          topProducts: topProducts.map(item => ({
            id: item.product?._id, // Fixed: null-safe access
            name: item.product?.name, // Fixed: null-safe access
            sales: item.sales,
            quantity: item.quantity,
            revenue: parseFloat(item.revenue.toFixed(2)),
            rating: item.product?.rating || 0 // Fixed: null-safe access
          }))
        }
      };
    } catch (error) {
      console.error('Error getting vendor performance overview:', error);
      throw new Error(`Failed to get vendor performance overview: ${error.message}`);
    }
  }
  
  /**
   * Get vendor sales trends
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} options - Query options
   * @returns {Object} Sales trends data
   */
  async getVendorSalesTrends(vendorId, options = {}) {
    try {
      const { period = '30d' } = options;
      
      console.log(`Getting vendor sales trends for vendor ${vendorId} with period ${period}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      const products = await Product.find({ 
        vendorId: new mongoose.Types.ObjectId(vendorId),
        isActive: true
      });
      
      const productIds = products.map(p => p._id);
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Get orders for vendor's products within date range
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        status: { $in: ['completed', 'delivered'] },
        createdAt: { $gte: startDate, $lte: now }
      }).populate('items.productId');
      
      // Group orders by date
      const dailySales = {};
      orders.forEach(order => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        if (!dailySales[dateKey]) {
          dailySales[dateKey] = {
            date: dateKey,
            orders: 0,
            sales: 0,
            revenue: 0
          };
        }
        
        dailySales[dateKey].orders += 1;
        
        // Calculate revenue for vendor's products only
        const vendorItems = order.items.filter(item => 
          item.productId && productIds.some(id => id.equals(item.productId._id)) // Fixed: null-safe access
        );
        
        const orderRevenue = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        dailySales[dateKey].revenue += orderRevenue;
        dailySales[dateKey].sales += vendorItems.reduce((sum, item) => sum + item.quantity, 0);
      });
      
      // Convert to array and sort by date
      const salesTrends = Object.values(dailySales)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return {
        success: true,
        data: salesTrends.map(item => ({
          ...item,
          revenue: parseFloat(item.revenue.toFixed(2))
        })),
        period
      };
    } catch (error) {
      console.error('Error getting vendor sales trends:', error);
      throw new Error(`Failed to get vendor sales trends: ${error.message}`);
    }
  }
  
  /**
   * Get detailed vendor analytics
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} options - Query options
   * @returns {Object} Detailed analytics data
   */
  async getVendorAnalytics(vendorId, options = {}) {
    try {
      const { period = '30d' } = options;
      
      console.log(`Getting detailed vendor analytics for vendor ${vendorId} with period ${period}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      // Validate vendorId before creating ObjectId
      let productQuery = { vendorId: vendorId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        productQuery = { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true };
      }
      
      const products = await Product.find(productQuery);
      
      const productIds = products.map(p => p._id);
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Get orders for vendor's products within date range
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        createdAt: { $gte: startDate, $lte: now }
      }).populate('items.productId');
      
      // Calculate status distribution
      const statusDistribution = {};
      orders.forEach(order => {
        const status = order.status;
        if (!statusDistribution[status]) {
          statusDistribution[status] = 0;
        }
        statusDistribution[status] += 1;
      });
      
      // Calculate revenue by status (only for completed/delivered)
      const revenueByStatus = {};
      orders.forEach(order => {
        const status = order.status;
        if (['completed', 'delivered'].includes(status)) {
          if (!revenueByStatus[status]) {
            revenueByStatus[status] = 0;
          }
          
          // Calculate revenue for vendor's products only
          const vendorItems = order.items.filter(item => 
            item.productId && productIds.some(id => id.equals(item.productId._id)) // Fixed: null-safe access
          );
          
          const orderRevenue = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          revenueByStatus[status] += orderRevenue;
        }
      });
      
      // Get product performance
      const productPerformance = {};
      products.forEach(product => {
        productPerformance[product._id.toString()] = {
          id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          views: product.views || 0,
          orders: 0,
          quantitySold: 0,
          revenue: 0
        };
      });
      
      // Calculate product sales
      orders.forEach(order => {
        order.items.forEach(item => {
          const productId = item.productId?._id.toString(); // Fixed: null-safe access
          if (productId && productPerformance[productId]) {
            productPerformance[productId].orders += 1;
            productPerformance[productId].quantitySold += item.quantity;
            productPerformance[productId].revenue += item.price * item.quantity;
          }
        });
      });
      
      // Convert to array and sort by revenue
      const topProducts = Object.values(productPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      
      return {
        success: true,
        data: {
          orders: {
            total: orders.length,
            statusDistribution,
            revenueByStatus: Object.keys(revenueByStatus).reduce((obj, key) => {
              obj[key] = parseFloat(revenueByStatus[key].toFixed(2));
              return obj;
            }, {})
          },
          products: {
            total: products.length,
            topPerformers: topProducts.map(item => ({
              ...item,
              revenue: parseFloat(item.revenue.toFixed(2))
            }))
          }
        },
        period
      };
    } catch (error) {
      console.error('Error getting vendor analytics:', error);
      throw new Error(`Failed to get vendor analytics: ${error.message}`);
    }
  }
  
  /**
   * Get vendor comparison data for admin dashboard
   * @param {Object} options - Query options
   * @returns {Object} Vendor comparison data
   */
  async getVendorComparison(options = {}) {
    try {
      const { limit = 10, period = '30d' } = options;
      
      console.log(`Getting vendor comparison data with limit ${limit} and period ${period}`);
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Get vendors with products
      const vendorsWithProducts = await User.aggregate([
        {
          $match: {
            role: 'vendor'
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'vendorId',
            as: 'products'
          }
        },
        {
          $match: {
            'products.0': { $exists: true }
          }
        },
        {
          $project: {
            _id: 1,
            username: 1,
            displayName: 1,
            email: 1,
            isVerified: 1,
            productCount: { $size: '$products' }
          }
        },
        {
          $limit: limit
        }
      ]);
      
      // Get vendor performance data
      const vendorPerformance = [];
      
      for (const vendor of vendorsWithProducts) {
        try {
          // Get vendor's products
          const products = await Product.find({ 
            vendorId: vendor._id,
            isActive: true
          });
          
          const productIds = products.map(p => p._id);
          
          // Get orders for vendor's products within date range
          const orders = await Order.find({
            'items.productId': { $in: productIds },
            status: { $in: ['completed', 'delivered'] },
            createdAt: { $gte: startDate, $lte: now }
          });
          
          // Calculate metrics
          const totalSales = orders.reduce((sum, order) => {
            const vendorItems = order.items.filter(item => 
              productIds.some(id => id.equals(item.productId))
            );
            return sum + vendorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
          }, 0);
          
          const totalOrders = orders.length;
          const totalProducts = products.length;
          
          // Get product reviews
          const reviews = await ProductReview.find({
            productId: { $in: productIds },
            isActive: true
          });
          
          const avgRating = reviews.length > 0 
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
            : 0;
          
          vendorPerformance.push({
            vendor: {
              id: vendor._id,
              username: vendor.username,
              displayName: vendor.displayName,
              email: vendor.email,
              isVerified: vendor.isVerified,
              productCount: vendor.productCount
            },
            performance: {
              totalSales: parseFloat(totalSales.toFixed(2)),
              totalOrders,
              totalProducts,
              avgOrderValue: totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0,
              avgRating: parseFloat(avgRating.toFixed(1)),
              totalReviews: reviews.length
            }
          });
        } catch (error) {
          console.error(`Error getting performance data for vendor ${vendor._id}:`, error);
          // Continue with other vendors
        }
      }
      
      // Sort by total sales
      vendorPerformance.sort((a, b) => b.performance.totalSales - a.performance.totalSales);
      
      return {
        success: true,
        data: vendorPerformance,
        period
      };
    } catch (error) {
      console.error('Error getting vendor comparison data:', error);
      throw new Error(`Failed to get vendor comparison data: ${error.message}`);
    }
  }
  
  /**
   * Get customer demographics
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Customer demographics data
   */
  async getCustomerDemographics(vendorId) {
    try {
      console.log(`Getting customer demographics for vendor ${vendorId}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      // Validate vendorId before creating ObjectId
      let productQuery = { vendorId: vendorId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        productQuery = { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true };
      }
      
      const products = await Product.find(productQuery);
      
      const productIds = products.map(p => p._id);
      
      // Get orders for vendor's products
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        status: { $in: ['completed', 'delivered'] }
      }).populate('userId', 'username displayName email location');
      
      // Extract customer data
      const customers = {};
      orders.forEach(order => {
        const customerId = order.userId?._id.toString();
        if (customerId && !customers[customerId]) {
          customers[customerId] = {
            id: customerId,
            username: order.userId?.username,
            displayName: order.userId?.displayName,
            email: order.userId?.email,
            location: order.userId?.location,
            orderCount: 0,
            totalSpent: 0,
            firstOrder: order.createdAt,
            lastOrder: order.createdAt
          };
        }
        
        if (customerId && customers[customerId]) {
          customers[customerId].orderCount += 1;
          
          // Calculate order total for this customer
          const vendorItems = order.items.filter(item => 
            item.productId && productIds.some(id => id.equals(item.productId._id))
          );
          
          const orderTotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          customers[customerId].totalSpent += orderTotal;
          
          // Update first and last order dates
          if (order.createdAt < customers[customerId].firstOrder) {
            customers[customerId].firstOrder = order.createdAt;
          }
          if (order.createdAt > customers[customerId].lastOrder) {
            customers[customerId].lastOrder = order.createdAt;
          }
        }
      });
      
      // Convert to array
      const customerList = Object.values(customers);
      
      // Calculate demographics
      const locations = {};
      const spendingRanges = {
        '0-50': 0,
        '51-100': 0,
        '101-500': 0,
        '501-1000': 0,
        '1001+': 0
      };
      
      customerList.forEach(customer => {
        // Location distribution
        const location = customer.location || 'Unknown';
        if (!locations[location]) {
          locations[location] = 0;
        }
        locations[location] += 1;
        
        // Spending distribution
        if (customer.totalSpent <= 50) {
          spendingRanges['0-50'] += 1;
        } else if (customer.totalSpent <= 100) {
          spendingRanges['51-100'] += 1;
        } else if (customer.totalSpent <= 500) {
          spendingRanges['101-500'] += 1;
        } else if (customer.totalSpent <= 1000) {
          spendingRanges['501-1000'] += 1;
        } else {
          spendingRanges['1001+'] += 1;
        }
      });
      
      // Top customers
      const topCustomers = customerList
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
      
      return {
        success: true,
        data: {
          totalCustomers: customerList.length,
          locations,
          spendingRanges,
          topCustomers: topCustomers.map(customer => ({
            ...customer,
            totalSpent: parseFloat(customer.totalSpent.toFixed(2))
          }))
        }
      };
    } catch (error) {
      console.error('Error getting customer demographics:', error);
      throw new Error(`Failed to get customer demographics: ${error.message}`);
    }
  }
  
  /**
   * Get inventory analytics
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Inventory analytics data
   */
  async getInventoryAnalytics(vendorId) {
    try {
      console.log(`Getting inventory analytics for vendor ${vendorId}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      // Validate vendorId before creating ObjectId
      let productQuery = { vendorId: vendorId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        productQuery = { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true };
      }
      
      const products = await Product.find(productQuery);
      
      // Calculate inventory metrics
      let totalProducts = 0;
      let totalStock = 0;
      let lowStockItems = 0;
      let outOfStockItems = 0;
      let totalValue = 0;
      
      const categoryStock = {};
      
      products.forEach(product => {
        totalProducts += 1;
        totalStock += product.stock || 0;
        totalValue += (product.price * (product.stock || 0));
        
        // Count low stock and out of stock
        if (product.stock === 0) {
          outOfStockItems += 1;
        } else if (product.stock <= 5) {
          lowStockItems += 1;
        }
        
        // Category stock distribution
        const category = product.category || 'Uncategorized';
        if (!categoryStock[category]) {
          categoryStock[category] = {
            count: 0,
            stock: 0,
            value: 0
          };
        }
        categoryStock[category].count += 1;
        categoryStock[category].stock += product.stock || 0;
        categoryStock[category].value += (product.price * (product.stock || 0));
      });
      
      return {
        success: true,
        data: {
          inventory: {
            totalProducts,
            totalStock,
            lowStockItems,
            outOfStockItems,
            totalValue: parseFloat(totalValue.toFixed(2)),
            avgStockPerProduct: totalProducts > 0 ? parseFloat((totalStock / totalProducts).toFixed(2)) : 0
          },
          categoryDistribution: Object.keys(categoryStock).reduce((obj, key) => {
            obj[key] = {
              count: categoryStock[key].count,
              stock: categoryStock[key].stock,
              value: parseFloat(categoryStock[key].value.toFixed(2))
            };
            return obj;
          }, {})
        }
      };
    } catch (error) {
      console.error('Error getting inventory analytics:', error);
      throw new Error(`Failed to get inventory analytics: ${error.message}`);
    }
  }
  
  /**
   * Get performance benchmarks
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Performance benchmarks data
   */
  async getPerformanceBenchmarks(vendorId) {
    try {
      console.log(`Getting performance benchmarks for vendor ${vendorId}`);
      
      // Validate vendor exists
      const vendor = await User.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      // Get vendor's products
      // Validate vendorId before creating ObjectId
      let productQuery = { vendorId: vendorId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        productQuery = { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true };
      }
      
      const products = await Product.find(productQuery);
      
      const productIds = products.map(p => p._id);
      
      // Get orders for vendor's products
      const orders = await Order.find({
        'items.productId': { $in: productIds },
        status: { $in: ['completed', 'delivered'] }
      });
      
      // Calculate vendor metrics
      const totalSales = orders.reduce((sum, order) => {
        const vendorItems = order.items.filter(item => 
          item.productId && productIds.some(id => id.equals(item.productId._id))
        );
        return sum + vendorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);
      
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // Get all vendors for comparison
      const allVendors = await User.find({ role: 'vendor' });
      
      // Calculate industry averages
      let industryTotalSales = 0;
      let industryTotalOrders = 0;
      let industryVendorCount = 0;
      
      for (const v of allVendors) {
        try {
          // Validate vendorId before creating ObjectId
          let vendorProductQuery = { vendorId: v._id, isActive: true };
          if (mongoose.Types.ObjectId.isValid(v._id)) {
            vendorProductQuery = { vendorId: new mongoose.Types.ObjectId(v._id), isActive: true };
          }
          
          const vendorProducts = await Product.find(vendorProductQuery);
          
          if (vendorProducts.length > 0) {
            const vendorProductIds = vendorProducts.map(p => p._id);
            
            const vendorOrders = await Order.find({
              'items.productId': { $in: vendorProductIds },
              status: { $in: ['completed', 'delivered'] }
            });
            
            const vendorSales = vendorOrders.reduce((sum, order) => {
              const vendorItems = order.items.filter(item => 
                vendorProductIds.some(id => id.equals(item.productId))
              );
              return sum + vendorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
            }, 0);
            
            industryTotalSales += vendorSales;
            industryTotalOrders += vendorOrders.length;
            industryVendorCount += 1;
          }
        } catch (error) {
          // Continue with other vendors
          console.error(`Error calculating metrics for vendor ${v._id}:`, error);
        }
      }
      
      const industryAvgSales = industryVendorCount > 0 ? industryTotalSales / industryVendorCount : 0;
      const industryAvgOrders = industryVendorCount > 0 ? industryTotalOrders / industryVendorCount : 0;
      const industryAvgOrderValue = industryAvgOrders > 0 ? industryTotalSales / industryAvgOrders : 0;
      
      // Calculate rankings
      const salesRank = industryAvgSales > 0 ? (totalSales / industryAvgSales) * 100 : 0;
      const ordersRank = industryAvgOrders > 0 ? (totalOrders / industryAvgOrders) * 100 : 0;
      const aovRank = industryAvgOrderValue > 0 ? (avgOrderValue / industryAvgOrderValue) * 100 : 0;
      
      return {
        success: true,
        data: {
          vendor: {
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalOrders,
            avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
          },
          industry: {
            avgSales: parseFloat(industryAvgSales.toFixed(2)),
            avgOrders: parseFloat(industryAvgOrders.toFixed(2)),
            avgOrderValue: parseFloat(industryAvgOrderValue.toFixed(2))
          },
          benchmarks: {
            salesPerformance: salesRank > 100 ? 'Above Average' : salesRank === 100 ? 'Average' : 'Below Average',
            ordersPerformance: ordersRank > 100 ? 'Above Average' : ordersRank === 100 ? 'Average' : 'Below Average',
            aovPerformance: aovRank > 100 ? 'Above Average' : aovRank === 100 ? 'Average' : 'Below Average'
          },
          rankings: {
            sales: parseFloat(salesRank.toFixed(2)),
            orders: parseFloat(ordersRank.toFixed(2)),
            avgOrderValue: parseFloat(aovRank.toFixed(2))
          }
        }
      };
    } catch (error) {
      console.error('Error getting performance benchmarks:', error);
      throw new Error(`Failed to get performance benchmarks: ${error.message}`);
    }
  }
}

module.exports = new VendorAnalyticsService();