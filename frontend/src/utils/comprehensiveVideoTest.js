// Comprehensive test to identify the exact issue with video rendering

// Import our fixed functions
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
      if (urlString.includes('uploads/talkcart/talkcart/')) {
        // Fix duplicate talkcart path
        return urlString.replace('uploads/talkcart/talkcart/', 'uploads/talkcart/');
      }
      return urlString;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      // For local development, use localhost:8000 as the base
      // For production, this should be handled by the backend
      // Check for malformed URLs with duplicate path segments
      if (urlString.includes('/uploads/talkcart/talkcart/')) {
        // Fix duplicate talkcart path
        urlString = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
      }
      return `http://localhost:8000${urlString}`;
    }
    
    return null;
  } catch (e) {
    // Try one more time with basic validation for edge cases
    if (urlString && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      return urlString;
    }
    return null;
  }
};

// Test function that simulates the exact logic used in PostListItem
const testVideoRenderingLogic = (mediaItem) => {
  console.log('=== Testing Video Rendering Logic ===');
  console.log('Input Media Item:', JSON.stringify(mediaItem, null, 2));
  
  // Extract URL (same as in PostListItem)
  const url = mediaItem.secure_url || mediaItem.url;
  console.log('Extracted URL:', url);
  
  // Normalize URL (same as in PostListItem)
  const normalizedSrc = normalizeMediaUrl(url) || url;
  console.log('Normalized URL:', normalizedSrc);
  
  // Validate URL format (same as in PostListItem)
  const isValid = normalizedSrc && isValidUrl(normalizedSrc);
  console.log('Is Valid URL:', isValid);
  
  // Additional validation (same as in PostListItem)
  const isMediaUrlValid = normalizedSrc && (normalizedSrc.startsWith('http://') || normalizedSrc.startsWith('https://'));
  console.log('Is Media URL Valid:', isMediaUrlValid);
  
  // Simulate the error condition
  const wouldShowError = !isMediaUrlValid;
  console.log('Would Show Error:', wouldShowError);
  
  console.log('===========================\n');
  
  return {
    url,
    normalizedSrc,
    isValid,
    isMediaUrlValid,
    wouldShowError
  };
};

// Test cases based on actual problematic scenarios
const testCases = [
  // Case 1: The exact duplicate path issue from the error message
  {
    id: 'exact-duplicate-case',
    secure_url: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
    resource_type: 'video',
    public_id: 'talkcart/file_1760459532573_hmjwxi463j'
  },
  
  // Case 2: Valid local URL
  {
    id: 'valid-local-url',
    secure_url: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
    resource_type: 'video',
    public_id: 'talkcart/file_1760459532573_hmjwxi463j'
  },
  
  // Case 3: Missing URL
  {
    id: 'missing-url',
    resource_type: 'video',
    public_id: 'talkcart/missing-file'
  },
  
  // Case 4: Invalid URL format
  {
    id: 'invalid-url-format',
    secure_url: 'invalid-url',
    resource_type: 'video',
    public_id: 'talkcart/invalid-file'
  }
];

console.log('Running comprehensive video rendering logic tests...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}: ${testCase.id}`);
  const result = testVideoRenderingLogic(testCase);
  
  if (result.wouldShowError) {
    console.log('❌ This case would show "Video not available"');
  } else {
    console.log('✅ This case would render the video correctly');
  }
  console.log('');
});

// Additional test: Check if the file actually exists and is accessible
console.log('=== File Accessibility Test ===');

// Test URL accessibility (this would normally be done in the browser)
const testUrls = [
  'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
  'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j'
];

testUrls.forEach((url, index) => {
  console.log(`Testing URL ${index + 1}: ${url}`);
  const normalized = normalizeMediaUrl(url);
  console.log(`  Normalized: ${normalized}`);
  
  // Check if it's the duplicate path case
  if (url.includes('uploads/talkcart/talkcart/')) {
    console.log('  ❌ This URL has duplicate path segments');
  } else {
    console.log('  ✅ This URL has correct path segments');
  }
  console.log('');
});