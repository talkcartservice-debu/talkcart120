# Vetora Super Admin Panel

A comprehensive administration dashboard built with Next.js for managing the Vetora platform.

## 🏗️ Architecture Overview

### Directory Structure

```
super-admin/
├── components/              # Reusable UI components
│   ├── BulkEmailDialog.tsx # Bulk email functionality
│   ├── ChatManagementDashboard.tsx # Chat system management
│   ├── DisputesDashboard.tsx # Dispute resolution dashboard
│   ├── MediaDashboard.tsx # Media management
│   ├── PaymentsDashboard.tsx # Payment analytics
│   ├── PayoutsDashboard.tsx # Vendor payout tracking
│   ├── UserDashboard.tsx # User analytics dashboard
│   ├── UserDetailDialog.tsx # User detail view
│   ├── VendorAdminChatInterface.tsx # Admin chat interface
│   ├── VendorChatInterface.tsx # Vendor chat interface
│   └── VendorDashboard.tsx # Vendor analytics dashboard
├── pages/                   # Next.js pages
│   ├── admin/              # Admin routes
│   ├── api/                # API routes
│   └── auth/               # Authentication pages
├── src/
│   ├── components/         # Shared components
│   ├── config/             # Configuration files
│   ├── services/           # API services
│   └── theme/              # Theme configuration
├── public/                 # Static assets
└── styles/                 # Global styles
```

## 🚀 Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: Material-UI v6
- **State Management**: React Context API
- **Authentication**: JWT with refresh tokens
- **Data Fetching**: Custom fetch wrapper with authentication
- **Charts**: Chart.js with React Chart.js 2
- **Icons**: Material Icons

## 🔧 Key Features

### User Management
- **User Analytics**: Dashboard with user metrics
- **User List**: Filterable user list with search
- **User Details**: Detailed user profile view
- **User Actions**: Suspend, restore, delete users
- **Bulk Operations**: Mass user management

### Vendor Management
- **Vendor Analytics**: Dashboard with vendor metrics
- **Vendor List**: Filterable vendor list
- **KYC Management**: Approve/reject vendor KYC
- **Vendor Actions**: Suspend, restore vendors

### Product Management
- **Product List**: Filterable product list
- **Product Creation**: Create new products
- **Product Approval**: Approve/reject products
- **Product Actions**: Activate/deactivate products
- **Bulk Operations**: Mass product management

### Order Management
- **Order List**: Filterable order list
- **Order Details**: Detailed order view
- **Order Status**: Update order status
- **Order Analytics**: Sales trends and metrics

### Chat Management
- **Conversation List**: View all chat conversations
- **Message History**: View conversation messages
- **Chat Analytics**: Chat metrics and performance
- **Chat Moderation**: Monitor and manage chats

### Payment Management
- **Payment Dashboard**: Payment analytics
- **Refund Management**: Process refunds
- **Payout Tracking**: Vendor payout monitoring
- **Financial Reports**: Export payment data

### Communication
- **Email System**: Send emails to users
- **Bulk Email**: Mass email campaigns
- **Email History**: Track sent emails
- **Templates**: Email template management

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend server running

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## 📁 Component Organization

### Dashboard Components
- **UserDashboard** - User analytics and metrics
- **VendorDashboard** - Vendor analytics and metrics
- **MediaDashboard** - Media management and analytics
- **PaymentsDashboard** - Payment analytics
- **PayoutsDashboard** - Vendor payout tracking
- **DisputesDashboard** - Dispute resolution dashboard
- **ChatManagementDashboard** - Chat system management

### Management Components
- **UserDetailDialog** - Detailed user view
- **BulkEmailDialog** - Bulk email functionality
- **VendorChatInterface** - Vendor chat interface
- **VendorAdminChatInterface** - Admin chat interface

## 🔌 API Integration

### AdminApi Service
The AdminApi service provides all backend integration for the super admin panel.

#### User Management
```typescript
// List users with filters
const users = await AdminApi.listUsers({ 
  role: 'user', 
  status: 'active',
  page: 1,
  limit: 20
});

// Get user details
const user = await AdminApi.getUser('user123');

// Update user
await AdminApi.updateUser('user123', { 
  status: 'suspended' 
});

// Delete user
await AdminApi.deleteUser('user123');

// Restore user
await AdminApi.restoreUser('user123');
```

#### Product Management
```typescript
// List products
const products = await AdminApi.listProductsAdmin({ 
  status: 'pending',
  page: 1,
  limit: 20
});

// Create product
await AdminApi.createProduct({
  name: 'Product Name',
  description: 'Product Description',
  price: 99.99,
  category: 'electronics'
});

// Approve product
await AdminApi.approveProduct('product123', true);

// Toggle product status
await AdminApi.toggleProduct('product123', { 
  isActive: true,
  featured: true
});
```

#### Order Management
```typescript
// List orders
const orders = await AdminApi.listOrders({ 
  status: 'pending',
  page: 1,
  limit: 20
});

// Update order status
await AdminApi.updateOrderStatus('order123', 'shipped');
```

#### Chat Management
```typescript
// List conversations
const conversations = await AdminApi.getChatConversations({ 
  isActive: true,
  page: 1,
  limit: 20
});

// Get conversation messages
const messages = await AdminApi.getChatMessages('conversation123');
```

## 🎨 UI Components

### Dashboard Components
Dashboard components provide analytics and metrics for different aspects of the platform:

```tsx
import UserDashboard from '@/components/UserDashboard';
import VendorDashboard from '@/components/VendorDashboard';

const DashboardPage = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <UserDashboard />
      </Grid>
      <Grid item xs={12}>
        <VendorDashboard />
      </Grid>
    </Grid>
  );
};
```

### Dialog Components
Dialog components provide detailed views and management interfaces:

```tsx
import { useState } from 'react';
import UserDetailDialog from '@/components/UserDetailDialog';

const UserList = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  return (
    <>
      {/* User list implementation */}
      <UserDetailDialog 
        open={dialogOpen}
        user={selectedUser}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};
```

## 🔐 Authentication Flow

### Admin Access
1. **Login**: Admins log in through the admin login page
2. **Token Storage**: JWT tokens stored in localStorage
3. **Route Protection**: AdminGuard protects admin routes
4. **Session Management**: Automatic token refresh

### API Authentication
All API calls are automatically authenticated through the fetchWithAuth wrapper:

```typescript
// API calls automatically include authentication
const response = await AdminApi.listUsers({ role: 'admin' });
```

## 📊 Analytics and Reporting

### Dashboard Metrics
- **User Growth**: Active user trends
- **Vendor Performance**: Vendor success metrics
- **Sales Analytics**: Revenue and order trends
- **Chat Performance**: Response times and resolution rates
- **Payment Metrics**: Transaction success rates

### Export Functionality
- **CSV Exports**: Export user, product, and order data
- **Report Generation**: Automated report creation
- **Data Filtering**: Export filtered datasets

## 🧪 Testing

### Unit Tests
- Test dashboard components
- Test API service functions
- Test authentication flows
- Test data transformation functions

### Integration Tests
- Test with real API endpoints
- Test dashboard data loading
- Test user management workflows
- Test product approval flows

## 🚀 Deployment

### Environment Configuration
- Development, staging, production environments
- Environment-specific configuration
- Secure secret management

### Build Process
- TypeScript compilation
- Asset optimization
- Code splitting
- Bundle analysis

### Scaling
- Horizontal scaling support
- Load balancer configuration
- Database connection pooling