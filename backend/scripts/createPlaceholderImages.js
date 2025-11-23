/**
 * Create placeholder images for missing local uploads
 * This script creates placeholder files for posts that reference non-existent local files
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const Post = require('../models/Post');

async function createPlaceholderImages() {
  try {
    console.log('🔍 Finding posts with local upload URLs...\n');
    
    // Find all posts with media
    const posts = await Post.find({
      'media.url': { $regex: 'localhost:8000/uploads/' }
    }).limit(100);
    
    console.log(`Found ${posts.length} posts with local upload URLs\n`);
    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const talkcartDir = path.join(uploadsDir, 'talkcart');
    const talkcartSubDir = path.join(talkcartDir, 'talkcart');
    
    // Ensure directories exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(talkcartDir)) {
      fs.mkdirSync(talkcartDir, { recursive: true });
    }
    if (!fs.existsSync(talkcartSubDir)) {
      fs.mkdirSync(talkcartSubDir, { recursive: true });
    }
    
    let created = 0;
    let skipped = 0;
    
    for (const post of posts) {
      for (const mediaItem of post.media) {
        const url = mediaItem.secure_url || mediaItem.url;
        
        // Extract file path from URL
        const match = url.match(/\/uploads\/(.+)$/);
        if (match) {
          const relativePath = match[1];
          const fullPath = path.join(uploadsDir, relativePath);
          
          // Check if file exists
          if (fs.existsSync(fullPath)) {
            console.log(`✓ File already exists: ${relativePath}`);
            skipped++;
            continue;
          }
          
          // Ensure directory exists
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Create a simple SVG placeholder
          const format = mediaItem.format || 'jpg';
          const resourceType = mediaItem.resource_type || 'image';
          
          if (resourceType === 'image') {
            // Create a proper SVG placeholder with XML declaration
            const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f0f0f0"/>
  <text x="400" y="280" font-family="Arial, sans-serif" font-size="24" fill="#666" text-anchor="middle">
    TalkCart
  </text>
  <text x="400" y="320" font-family="Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle">
    Placeholder Image
  </text>
  <text x="400" y="350" font-family="Arial, sans-serif" font-size="14" fill="#ccc" text-anchor="middle">
    ${path.basename(fullPath)}
  </text>
</svg>`;
            
            fs.writeFileSync(fullPath, svg, 'utf8');
            console.log(`✅ Created placeholder: ${relativePath}`);
            created++;
          } else if (resourceType === 'video') {
            // For videos, we can't easily create a placeholder, skip
            console.log(`⚠️  Skipping video: ${relativePath}`);
            skipped++;
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} placeholder images`);
    console.log(`   Skipped: ${skipped} existing/video files`);
    console.log(`\n✅ Done!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
createPlaceholderImages();
