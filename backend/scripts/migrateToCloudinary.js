require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('✅ Cloudinary configured successfully');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('posts');
    
    // Find all posts with media
    console.log('Finding posts with media...');
    const postsWithMedia = await collection.find({ 
      'media.0': { $exists: true } 
    }).toArray();
    
    console.log(`Found ${postsWithMedia.length} posts with media\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Process each post
    for (const post of postsWithMedia) {
      console.log(`Processing post ${post._id}...`);
      let needsUpdate = false;
      const updatedMedia = [];
      
      for (const media of post.media) {
        // Check if this is a local file URL (localhost:8000)
        if (media.secure_url && media.secure_url.includes('localhost:8000')) {
          console.log(`  Found local media: ${media.secure_url}`);
          
          // Extract filename from URL
          const filename = media.secure_url.split('/').pop();
          const localFilePath = path.join(__dirname, '..', 'uploads', 'talkcart', filename);
          
          // Check if file exists locally
          if (fs.existsSync(localFilePath)) {
            console.log(`  Uploading ${filename} to Cloudinary...`);
            
            try {
              // Upload to Cloudinary
              const result = await cloudinary.uploader.upload(localFilePath, {
                folder: 'talkcart',
                resource_type: media.resource_type || 'auto',
                public_id: `talkcart/${filename.replace(path.extname(filename), '')}`,
              });
              
              console.log(`  ✅ Uploaded to Cloudinary: ${result.secure_url}`);
              
              // Update media object with Cloudinary URLs
              updatedMedia.push({
                ...media,
                public_id: result.public_id,
                secure_url: result.secure_url,
                url: result.secure_url, // Use secure_url for both
              });
              
              // Delete local file after successful upload
              fs.unlinkSync(localFilePath);
              console.log(`  🗑️  Deleted local file: ${filename}`);
              
              needsUpdate = true;
            } catch (error) {
              console.error(`  ❌ Failed to upload ${filename}:`, error.message);
              // Keep original media if upload fails
              updatedMedia.push(media);
            }
          } else {
            console.log(`  ⚠️  Local file not found: ${filename}`);
            // Keep original media if file doesn't exist
            updatedMedia.push(media);
          }
        } else if (media.secure_url && media.secure_url.includes('res.cloudinary.com')) {
          console.log(`  Already in Cloudinary: ${media.secure_url}`);
          // Already in Cloudinary, keep as is
          updatedMedia.push(media);
          skippedCount++;
        } else {
          console.log(`  Unknown media type: ${media.secure_url}`);
          // Keep original media
          updatedMedia.push(media);
        }
      }
      
      // Update the post if needed
      if (needsUpdate) {
        await collection.updateOne(
          { _id: post._id },
          { $set: { media: updatedMedia } }
        );
        console.log(`✅ Updated post ${post._id}\n`);
        migratedCount++;
      } else {
        console.log(`⏭️  No changes needed for post ${post._id}\n`);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Migrated posts: ${migratedCount}`);
    console.log(`⏭️  Skipped posts: ${skippedCount}`);
    console.log(`📊 Total posts processed: ${postsWithMedia.length}`);
    
    mongoose.connection.close();
  })
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1);
  });