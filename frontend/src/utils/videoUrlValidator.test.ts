// Simple test utility for URL validation functions
const isValidUrl = (urlString: string): boolean => {
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
const normalizeMediaUrl = (urlString: string): string | null => {
  try {
    if (!urlString) return null;
    
    // Handle Cloudinary URLs that might have encoding issues
    if (urlString.includes('cloudinary.com') && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      return urlString;
    }
    
    // If it's already a valid URL, return it
    if (isValidUrl(urlString)) {
      return urlString;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      // For local development, use localhost:8000 as the base
      // For production, this should be handled by the backend
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

// Test cases
const testCases = [
  // Valid Cloudinary URLs
  'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
  'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  
  // Valid regular URLs
  'https://example.com/video.mp4',
  'https://example.com/image.jpg',
  
  // Invalid URLs
  'invalid-url',
  '',
  null,
  
  // Edge cases
  '/local/video.mp4',
  'http://localhost:8000/uploads/video.mp4'
];

console.log('Testing URL validation functions...\n');

testCases.forEach((testCase, index) => {
  const isValid = isValidUrl(testCase as string);
  const normalized = normalizeMediaUrl(testCase as string);
  
  console.log(`Test ${index + 1}:`, testCase);
  console.log(`  isValidUrl: ${isValid}`);
  console.log(`  normalizeMediaUrl: ${normalized}`);
  console.log('');
});

export { isValidUrl, normalizeMediaUrl };