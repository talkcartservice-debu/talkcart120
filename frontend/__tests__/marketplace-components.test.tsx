import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductCard from '@/components/marketplace/ProductCard';
import TrendingProducts from '@/components/marketplace/TrendingProducts';
import VendorAnalyticsDashboard from '@/components/marketplace/VendorAnalyticsDashboard';
import RecommendedProducts from '@/components/marketplace/RecommendedProducts';
import ReviewEditModal from '@/components/marketplace/ReviewEditModal';

// Mock API functions
jest.mock('@/lib/api', () => ({
  api: {
    marketplace: {
      getTrendingProducts: jest.fn().mockResolvedValue({
        success: true,
        data: {
          products: []
        }
      }),
      getUserRecommendations: jest.fn().mockResolvedValue({
        success: true,
        data: {
          recommendations: []
        }
      }),
      getVendorAnalytics: jest.fn().mockResolvedValue({
        success: true,
        data: {
          totalSales: 0,
          totalRevenue: 0,
          totalOrders: 0,
          averageRating: 0,
          totalReviews: 0,
          topProducts: [],
          orderStatusDistribution: [],
          salesTrend: []
        }
      }),
      updateProductReview: jest.fn().mockResolvedValue({
        success: true,
        data: {}
      })
    }
  }
}));

describe('Marketplace Components', () => {
  test('renders ProductCard component', () => {
    const product = {
      id: '1',
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      currency: 'USD',
      images: [],
      category: 'Test',
      vendor: {
        id: 'vendor-1',
        username: 'testvendor',
        displayName: 'Test Vendor',
        avatar: '',
        isVerified: true,
      },
      isNFT: false,
      tags: [],
      stock: 10,
      rating: 4.5,
      reviewCount: 10,
      sales: 50,
      views: 100,
      availability: 'in_stock',
      createdAt: '2023-01-01',
    };

    render(<ProductCard product={product} />);
    
    // Check if product name is displayed
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  test('renders TrendingProducts component', () => {
    render(<TrendingProducts />);
    
    // Check if component renders without crashing
    expect(screen.getByText('Trending Products')).toBeInTheDocument();
  });

  test('renders VendorAnalyticsDashboard component', () => {
    render(<VendorAnalyticsDashboard />);
    
    // Check if component renders without crashing
    expect(screen.getByText('Vendor Analytics Dashboard')).toBeInTheDocument();
  });

  test('renders RecommendedProducts component', () => {
    render(<RecommendedProducts />);
    
    // Check if component renders without crashing
    expect(screen.getByText('Recommended For You')).toBeInTheDocument();
  });

  test('renders ReviewEditModal component', () => {
    const review = {
      id: 'review-1',
      rating: 4,
      title: 'Test Review',
      comment: 'Test comment',
      productId: 'product-1',
      userId: 'user-1',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    render(
      <ReviewEditModal
        open={true}
        onClose={jest.fn()}
        review={review}
        onReviewUpdated={jest.fn()}
      />
    );
    
    // Check if modal elements are present
    expect(screen.getByText('Edit Your Review')).toBeInTheDocument();
  });
});