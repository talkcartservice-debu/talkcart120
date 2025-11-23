const fs = require('fs');
const path = require('path');

// Rename placeholder files with proper extensions
const filesToRename = [
  { old: 'file_1760025826930_ii8eziwki6', type: 'image' },
  { old: 'file_1760026534268_mfb8h2pd3h', type: 'image' },
  { old: 'file_1760027022888_oihwi8gmqgc', type: 'video' },
  { old: 'file_1760079801568_7z9qmsnswnc', type: 'image' },
  { old: 'file_1760086943290_6vg7qxh28gl', type: 'video' },
  { old: 'file_1760088152389_c8nlmwcpwrf', type: 'video' }
];

function renameMediaFiles() {
  console.log('Renaming media files with proper extensions...\n');
  
  const talkcartDir = path.join(__dirname, '..', 'uploads', 'talkcart');
  
  filesToRename.forEach(file => {
    const oldPath = path.join(talkcartDir, file.old);
    const extension = file.type === 'video' ? '.mp4' : '.jpg';
    const newPath = oldPath + extension;
    
    try {
      // Check if the file without extension exists
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renamed: ${file.old} -> ${file.old}${extension}`);
      } else {
        console.log(`ℹ️  File not found: ${file.old} (might already be renamed)`);
      }
    } catch (error) {
      console.error(`❌ Failed to rename ${file.old}:`, error.message);
    }
  });
  
  console.log('\n✅ All files renamed successfully!');
}

renameMediaFiles();