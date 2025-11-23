/**
 * Create PNG placeholder images for missing local uploads
 * This script creates simple PNG files for posts that reference non-existent local files
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
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

async function createPngPlaceholders() {
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
          
          const resourceType = mediaItem.resource_type || 'image';
          
          if (resourceType === 'image') {
            // Create a PNG placeholder using canvas
            const canvas = createCanvas(800, 600);
            const ctx = canvas.getContext('2d');
            
            // Background
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 800, 600);
            
            // Border
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 798, 598);
            
            // TalkCart text
            ctx.fillStyle = '#666';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TalkCart', 400, 280);
            
            // Placeholder text
            ctx.font = '24px Arial';
            ctx.fillStyle = '#999';
            ctx.fillText('Placeholder Image', 400, 330);
            
            // Filename
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ccc';
            ctx.fillText(path.basename(fullPath), 400, 370);
            
            // Save as PNG
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(fullPath, buffer);
            
            console.log(`✅ Created PNG placeholder: ${relativePath}`);
            created++;
          } else if (resourceType === 'video') {
            console.log(`⚠️  Skipping video: ${relativePath}`);
            skipped++;
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} PNG placeholder images`);
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
createPngPlaceholders();