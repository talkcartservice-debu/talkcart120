const fs = require('fs');
const path = require('path');

// Create placeholder files for the missing media
const placeholderFiles = [
  'file_1760025826930_ii8eziwki6',
  'file_1760026534268_mfb8h2pd3h',
  'file_1760027022888_oihwi8gmqgc',
  'file_1760079801568_7z9qmsnswnc',
  'file_1760086943290_6vg7qxh28gl',
  'file_1760088152389_c8nlmwcpwrf'
];

// Create a simple placeholder image as base64
const placeholderImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Create a simple placeholder video as base64 (this is actually a tiny GIF, but we'll treat it as video)
const placeholderVideo = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function createPlaceholderMedia() {
  console.log('Creating placeholder media files...\n');
  
  // Create talkcart directory if it doesn't exist
  const talkcartDir = path.join(__dirname, '..', 'uploads', 'talkcart');
  if (!fs.existsSync(talkcartDir)) {
    fs.mkdirSync(talkcartDir, { recursive: true });
  }
  
  // Create placeholder image files
  placeholderFiles.forEach(filename => {
    const imagePath = path.join(talkcartDir, `${filename}`);
    
    // For video files, we'll still create image placeholders since we can't easily generate video
    try {
      // Write as binary data
      const buffer = Buffer.from(placeholderImage, 'base64');
      fs.writeFileSync(imagePath, buffer);
      console.log(`✅ Created placeholder: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to create ${filename}:`, error.message);
    }
  });
  
  console.log('\n✅ All placeholder files created successfully!');
  console.log('\nNote: These are tiny placeholder files. In a real application, you would:');
  console.log('1. Upload actual media files to the uploads directory');
  console.log('2. Update the database records to point to the correct files');
  console.log('3. Ensure proper file permissions and access controls');
}

createPlaceholderMedia();