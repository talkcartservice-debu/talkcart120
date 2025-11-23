# Database Management Scripts

This directory contains various scripts for managing the TalkCart database.

## Post Management Scripts

### removeAllPosts.js
**Purpose**: Remove all posts from the database while maintaining all other functionality.

**Usage**:
```bash
# Interactive mode (prompts for confirmation)
npm run remove-posts

# Automated mode (no prompts)
npm run remove-posts -- --yes
```

**What it does**:
- Deletes all documents from the Post collection
- Resets post counts for all users
- Cleans up related data (comments, notifications, shares)
- Preserves all other data (users, products, etc.)
- Maintains database functionality

### clearRecentPosts.js
**Purpose**: Clear only recent posts (useful for testing).

**Usage**:
```bash
node scripts/clearRecentPosts.js
```

### deleteAllPostsAndUsers.js
**Purpose**: Delete all posts AND users (destructive).

**Usage**:
```bash
node scripts/deleteAllPostsAndUsers.js
# Or with auto-confirmation:
node scripts/deleteAllPostsAndUsers.js --yes
```

## Other Scripts

### seedDatabase.js
Populate the database with sample data.

### resetDatabase.js
Reset the entire database to a clean state.

### optimizeDatabase.js
Optimize database indexes and clean up orphaned data.

### verifyCloudinaryUrls.js
Verify Cloudinary configuration and URL handling.

**Usage**:
```bash
npm run verify-cloudinary
```

**What it does**:
- Verifies Cloudinary credentials and connectivity
- Tests URL generation and transformation
- Validates URL handling functions
- Checks duplicate path resolution
- Ensures HTTPS conversion works correctly

### testContentRendering.js
Test content rendering URLs to ensure media displays correctly.

**Usage**:
```bash
npm run test-content-rendering
```

**What it does**:
- Tests media URL validation and normalization
- Verifies content rendering logic
- Checks error handling for missing files
- Tests duplicate path resolution
- Verifies HTTPS conversion

### verifyFrontendCode.js
Verify that the actual frontend code is working correctly for content rendering URLs.

**Usage**:
```bash
npm run verify-frontend-code
```

**What it does**:
- Tests the exact functions used in the frontend
- Verifies media URL validation and normalization
- Checks duplicate path resolution
- Tests missing file detection
- Verifies HTTPS conversion

### testPostListItem.js
Test the enhanced PostListItem component features and functionality.

**Usage**:
```bash
npm run test-postlistitem
```

**What it does**:
- Tests enhanced media rendering capabilities
- Verifies new action features
- Checks improved user interaction
- Validates accessibility improvements

### verifyPostDeletion.js
Verify that post deletion functionality works correctly.

**Usage**:
```bash
npm run verify-post-deletion
```

**What it does**:
- Creates a test post with related data
- Tests the deletion process
- Verifies cleanup of related data
- Confirms post deletion works correctly

### verifyPostListItemFeatures.js
Verify that all requested PostListItem features have been implemented correctly.

**Usage**:
```bash
npm run verify-postlistitem-features
```

**What it does**:
- Verifies engagement metrics visualization
- Checks post actions menu implementation
- Validates user interaction features
- Confirms media rendering improvements
- Ensures accessibility improvements
- Tests loading states implementation