// Detailed debug test to identify the exact issue with video rendering

// Import our functions
const isValidUrl = (urlString) => {
  try {
    if (!urlString) return false;
    
    // Handle Cloudinary URLs with special characters
    if (urlString.includes('cloudinary.com')) {
      // Cloudinary URLs are generally valid even with special characters
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Helper function to validate and normalize URLs with better Cloudinary handling
const normalizeMediaUrl = (urlString) => {
  try {
    if (!urlString) return null;
    
    // Handle Cloudinary URLs that might have encoding issues
    if (urlString.includes('cloudinary.com') && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      return urlString;
    }
    
    // Handle local URLs correctly - check if it's already a valid absolute URL
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      // Check for malformed URLs with duplicate path segments
      if (urlString.includes('uploads/vetora/vetora/')) {
        // Fix duplicate vetora path
        console.log('🔧 Fixing duplicate path in URL:', urlString);
        const fixedUrl = urlString.replace('uploads/vetora/vetora/', 'uploads/vetora/');
        console.log('✅ Fixed URL:', fixedUrl);
        return fixedUrl;
      }
      return urlString;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      // For local development, use localhost:8000 as the base
      // For production, this should be handled by the backend
      // Check for malformed URLs with duplicate path segments
      if (urlString.includes('/uploads/vetora/vetora/')) {
        // Fix duplicate vetora path
        console.log('🔧 Fixing duplicate path in relative URL:', urlString);
        urlString = urlString.replace('/uploads/vetora/vetora/', '/uploads/vetora/');
        console.log('✅ Fixed relative URL:', urlString);
      }
      const absoluteUrl = `http://localhost:8000${urlString}`;
      console.log('🔗 Converted relative URL to absolute:', absoluteUrl);
      return absoluteUrl;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Error in normalizeMediaUrl:', e);
    // Try one more time with basic validation for edge cases
    if (urlString && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      return urlString;
    }
    return null;
  }
};

// Test the exact error case from the console
console.log('=== TESTING EXACT ERROR CASE ===');
const errorCase = {
  src: 'http://localhost:8000/uploads/vetora/file_1760459532573_hmjwxi463j',
  normalizedSrc: 'http://localhost:8000/uploads/vetora/file_1760459532573_hmjwxi463j',
  error: true
};

console.log('Error case from console:', errorCase);

// Test our functions with this data
console.log('\n=== TESTING OUR FUNCTIONS ===');
const testResult = normalizeMediaUrl(errorCase.src);
console.log('normalizeMediaUrl result:', testResult);
console.log('isValidUrl result:', isValidUrl(testResult || ''));

// Test with a media item that would cause the duplicate path issue
console.log('\n=== TESTING MEDIA ITEM WITH DUPLICATE PATH ===');
const mediaItemWithDuplicatePath = {
  id: 'video1',
  public_id: 'vetora/file_1760459532573_hmjwxi463j',
  secure_url: 'http://localhost:8000/uploads/vetora/vetora/file_1760459532573_hmjwxi463j',
  resource_type: 'video',
  format: 'mp4'
};

console.log('Media item:', mediaItemWithDuplicatePath);

// Simulate the exact logic from PostListItem
const url = mediaItemWithDuplicatePath.secure_url || mediaItemWithDuplicatePath.url;
console.log('Extracted URL:', url);

const normalizedSrc = normalizeMediaUrl(url) || url;
console.log('Normalized URL:', normalizedSrc);

const isValid = normalizedSrc && isValidUrl(normalizedSrc);
console.log('Is valid URL:', isValid);

const isMediaUrlValid = normalizedSrc && (normalizedSrc.startsWith('http://') || normalizedSrc.startsWith('https://'));
console.log('Is media URL valid:', isMediaUrlValid);

const wouldShowError = !isMediaUrlValid;
console.log('Would show error:', wouldShowError);

if (wouldShowError) {
  console.log('❌ This would show "Video not available"');
} else {
  console.log('✅ This should render the video correctly');
}

// Test edge cases
console.log('\n=== TESTING EDGE CASES ===');

const edgeCases = [
  // Case 1: Missing URL
  {
    name: 'Missing URL',
    mediaItem: {
      id: 'test1',
      resource_type: 'video'
    }
  },
  
  // Case 2: Invalid URL format
  {
    name: 'Invalid URL format',
    mediaItem: {
      id: 'test2',
      secure_url: 'invalid-url',
      resource_type: 'video'
    }
  },
  
  // Case 3: Cloudinary URL
  {
    name: 'Cloudinary URL',
    mediaItem: {
      id: 'test3',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
      resource_type: 'video'
    }
  },
  
  // Case 4: Valid local URL
  {
    name: 'Valid local URL',
    mediaItem: {
      id: 'test4',
      secure_url: 'http://localhost:8000/uploads/vetora/file_1234567890.mp4',
      resource_type: 'video'
    }
  }
];

edgeCases.forEach((testCase, index) => {
  console.log(`\nTest Case ${index + 1}: ${testCase.name}`);
  const url = testCase.mediaItem.secure_url || testCase.mediaItem.url;
  console.log('URL:', url);
  
  if (!url) {
    console.log('❌ No URL - would show error');
    return;
  }
  
  const normalized = normalizeMediaUrl(url) || url;
  console.log('Normalized:', normalized);
  
  const isValid = isValidUrl(normalized);
  console.log('Is valid:', isValid);
  
  const isMediaValid = normalized && (normalized.startsWith('http://') || normalized.startsWith('https://'));
  console.log('Is media valid:', isMediaValid);
  
  if (isMediaValid) {
    console.log('✅ Would render correctly');
  } else {
    console.log('❌ Would show error');
  }
});

console.log('\n=== DEBUG COMPLETE ===');