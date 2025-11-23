# Anonymous Access Policy

## Overview
This document outlines the comprehensive anonymous access control system implemented in TalkCart to ensure security while providing appropriate public access to content.

## 1. Anonymous User Definition
An anonymous user is defined as:
- A user without a valid JWT token
- A user with an invalid/expired JWT token
- A user explicitly using the `anonymous-access-token`
- A user with `isAnonymous: true` flag

## 2. Anonymous Access Permissions

### 2.1 Read Permissions (Allowed)

#### Posts
- ✅ **Allowed**: View public posts
- ✅ **Allowed**: View post metadata (likes, comments count)
- ✅ **Allowed**: View post media (images, videos)
- ❌ **Restricted**: Private posts, draft posts
- ❌ **Restricted**: Post edit history, internal tags
- ❌ **Restricted**: Author private information

#### Comments
- ✅ **Allowed**: View public comments on public posts
- ✅ **Allowed**: View comment replies
- ❌ **Restricted**: Private comments, deleted comments
- ❌ **Restricted**: Comment author private information

#### Users
- ✅ **Allowed**: View public user profiles
- ✅ **Allowed**: View public user information (username, display name, avatar)
- ✅ **Allowed**: View public user stats (follower count, post count)
- ❌ **Restricted**: Email, phone, private settings
- ❌ **Restricted**: Last seen, online status
- ❌ **Restricted**: Private profile information

#### Products
- ✅ **Allowed**: Browse public products
- ✅ **Allowed**: View product details, images
- ✅ **Allowed**: View product categories, tags
- ❌ **Restricted**: Pricing details, vendor information
- ❌ **Restricted**: Purchase history, private notes

#### Marketplace
- ✅ **Allowed**: Browse marketplace
- ✅ **Allowed**: Search products
- ✅ **Allowed**: View product listings
- ❌ **Restricted**: Create listings, make purchases
- ❌ **Restricted**: Access vendor dashboard

### 2.2 Write Permissions (Restricted)

#### Content Creation
- ❌ **Posts**: Authentication required
- ❌ **Comments**: Authentication required
- ❌ **Messages**: Authentication required
- ❌ **Orders**: Authentication required
- ❌ **Profile Updates**: Authentication required

#### Actions
- ❌ **Likes/Reactions**: Authentication required
- ❌ **Bookmarks**: Authentication required
- ❌ **Shares**: Authentication required
- ❌ **Follows**: Authentication required
- ❌ **Reports**: Authentication required

## 3. Rate Limiting for Anonymous Users

### 3.1 General API Access
- **Limit**: 100 requests per 15 minutes
- **Scope**: All API endpoints
- **Key**: IP address based

### 3.2 Read Operations
- **Limit**: 200 requests per 15 minutes
- **Scope**: GET requests to public content
- **Key**: IP address based

### 3.3 Search Operations
- **Limit**: 30 searches per minute
- **Scope**: Search endpoints
- **Key**: IP address based

### 3.4 Upload Operations
- **Limit**: 0 uploads allowed
- **Scope**: All upload endpoints
- **Reason**: Authentication required for uploads

## 4. Data Restrictions Applied

### 4.1 Post Data Filtering
```javascript
// Anonymous users see:
{
  id: "post_id",
  content: "post_content",
  author: {
    id: "author_id",
    username: "author_username",
    displayName: "Author Name",
    avatar: "avatar_url"
  },
  media: [...],
  likes: 123,
  comments: 45,
  createdAt: "2024-01-01T00:00:00Z"
}

// Anonymous users DON'T see:
{
  privateNotes: "...",
  internalTags: [...],
  editHistory: [...],
  ipAddress: "...",
  userAgent: "..."
}
```

### 4.2 User Data Filtering
```javascript
// Anonymous users see:
{
  id: "user_id",
  username: "username",
  displayName: "Display Name",
  avatar: "avatar_url",
  bio: "public_bio",
  followerCount: 123,
  followingCount: 45,
  postCount: 67,
  isVerified: true
}

// Anonymous users DON'T see:
{
  email: "user@example.com",
  phone: "+1234567890",
  settings: {...},
  lastSeenAt: "2024-01-01T00:00:00Z",
  isOnline: true,
  privateInfo: {...}
}
```

### 4.3 Product Data Filtering
```javascript
// Anonymous users see:
{
  id: "product_id",
  name: "Product Name",
  description: "Product Description",
  images: [...],
  category: "Electronics",
  tags: [...],
  isActive: true
}

// Anonymous users DON'T see:
{
  cost: 100,
  profitMargin: 0.3,
  vendorPrice: 80,
  vendor: {...},
  vendorContact: {...},
  vendorNotes: "..."
}
```

## 5. Security Measures

### 5.1 Access Control
- **IP-based rate limiting** for anonymous users
- **Data filtering** to prevent information leakage
- **Operation restrictions** for sensitive actions
- **Audit logging** of anonymous access attempts

### 5.2 Privacy Protection
- **No personal information** exposure
- **No private content** access
- **No contact details** visible
- **No internal system information** leaked

### 5.3 Abuse Prevention
- **Rate limiting** to prevent scraping
- **Request size limits** to prevent DoS
- **User agent filtering** to block bots
- **IP filtering** for known bad actors

## 6. Implementation Details

### 6.1 Middleware Stack
```javascript
// Order of middleware application:
1. Security headers
2. Request size limiting
3. IP filtering
4. User agent filtering
5. Request timing protection
6. SQL injection protection
7. XSS protection
8. Anonymous access control
9. Rate limiting
10. Authentication
```

### 6.2 Anonymous User Object
```javascript
req.user = {
  userId: 'anonymous-user',
  isAnonymous: true,
  role: 'anonymous',
  permissions: ANONYMOUS_PERMISSIONS
};
```

### 6.3 Permission Checking
```javascript
// Check if operation is allowed
const permission = isAnonymousOperationAllowed('write', 'posts', 'create');
if (!permission.allowed) {
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: permission.reason
  });
}
```

## 7. Monitoring and Logging

### 7.1 Access Logging
- **Anonymous access attempts** are logged
- **Rate limit violations** are tracked
- **Suspicious patterns** are flagged
- **IP addresses** are recorded for analysis

### 7.2 Metrics Collected
- Number of anonymous requests per IP
- Most accessed endpoints by anonymous users
- Rate limit violations
- Data access patterns
- Geographic distribution of anonymous users

## 8. Configuration

### 8.1 Environment Variables
```env
# Anonymous access configuration
ANONYMOUS_ACCESS_ENABLED=true
ANONYMOUS_RATE_LIMIT_ENABLED=true
ANONYMOUS_DATA_FILTERING_ENABLED=true
ANONYMOUS_LOGGING_ENABLED=true
```

### 8.2 Permission Configuration
```javascript
const ANONYMOUS_PERMISSIONS = {
  read: {
    posts: { allowed: true, restrictions: ['public_posts_only'] },
    users: { allowed: true, restrictions: ['public_profiles_only'] },
    products: { allowed: true, restrictions: ['public_products_only'] }
  },
  write: {
    posts: { allowed: false, reason: 'Authentication required' },
    comments: { allowed: false, reason: 'Authentication required' }
  }
};
```

## 9. Best Practices

### 9.1 For Developers
- Always check `req.isAnonymous` before sensitive operations
- Use `requireAuthentication` middleware for protected endpoints
- Apply data restrictions using `applyDataRestrictions` middleware
- Log anonymous access for monitoring

### 9.2 For Security
- Regularly review anonymous access logs
- Monitor for abuse patterns
- Update rate limits based on usage patterns
- Review and update permission configurations

### 9.3 For Performance
- Cache public content for anonymous users
- Use CDN for static assets
- Implement efficient data filtering
- Monitor anonymous user impact on performance

## 10. Compliance and Legal

### 10.1 Privacy Compliance
- Anonymous users have no personal data stored
- No tracking cookies for anonymous users
- No personal information collection
- GDPR compliant for anonymous access

### 10.2 Terms of Service
- Anonymous access is subject to rate limits
- Abuse of anonymous access is prohibited
- Content access is limited to public content only
- No guarantee of service availability for anonymous users

## Conclusion

The anonymous access policy provides a secure, controlled way for users to browse public content while maintaining strict security boundaries. The system balances accessibility with security, ensuring that sensitive operations require authentication while allowing appropriate public access to content.

Regular monitoring and updates to this policy ensure continued security and compliance with privacy regulations.
