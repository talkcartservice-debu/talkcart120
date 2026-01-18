const axios = require('axios');

/**
 * Script to delete all posts from the database
 * This script performs a soft delete (sets isActive to false) for all posts
 */

async function deleteAllPosts() {
  try {
    console.log('Starting to delete all posts...');
    
    // Get the authentication token
    // You'll need to replace this with a valid admin user token
    const adminAuthToken = process.env.ADMIN_AUTH_TOKEN;
    
    if (!adminAuthToken) {
      console.error('Error: ADMIN_AUTH_TOKEN environment variable is required');
      console.log('Please set ADMIN_AUTH_TOKEN to a valid admin user JWT token');
      process.exit(1);
    }

    // Backend server URL
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    console.log(`Connecting to backend: ${baseUrl}`);
    
    const response = await axios.delete(`${baseUrl}/api/posts/all`, {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', response.data);
    
    if (response.data.success) {
      console.log(`✓ Successfully deleted ${response.data.deletedCount} posts`);
    } else {
      console.error('✗ Failed to delete posts:', response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error('Server responded with error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
      console.log('Make sure the backend server is running');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  deleteAllPosts();
}

module.exports = deleteAllPosts;