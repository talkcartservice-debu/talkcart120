// Test the fixed URL validation functions
function isValidUrl(urlString) {
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
}

// Helper function to validate and normalize URLs with better Cloudinary handling
function normalizeMediaUrl(urlString) {
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
}

// Test cases that were failing before
const testCases = [
  // Valid Cloudinary URLs
  'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
  'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  
  // Valid local URLs that were causing issues
  'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
  
  // Malformed URLs with duplicate path segments (the main issue)
  'http://localhost:8000/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk',
  '/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk',
  
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

console.log('Testing FIXED URL validation functions...\n');

testCases.forEach((testCase, index) => {
  const isValid = isValidUrl(testCase);
  const normalized = normalizeMediaUrl(testCase);
  
  console.log(`Test ${index + 1}:`, testCase);
  console.log(`  isValidUrl: ${isValid}`);
  console.log(`  normalizeMediaUrl: ${normalized}`);
  console.log('');
});

// Specific tests for the issues we fixed
console.log('=== Specific Tests for Fixed Issues ===\n');

// Test the duplicate path issue
const duplicatePathUrl = 'http://localhost:8000/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk';
const normalizedDuplicate = normalizeMediaUrl(duplicatePathUrl);
console.log('Duplicate path URL fix test:');
console.log(`  Original: ${duplicatePathUrl}`);
console.log(`  Normalized: ${normalizedDuplicate}`);
console.log(`  Fixed correctly: ${normalizedDuplicate === 'http://localhost:8000/uploads/talkcart/file_1760446946793_ix9n9oc37qk'}`);
console.log('');

// Test the relative duplicate path issue
const relativeDuplicatePathUrl = '/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk';
const normalizedRelativeDuplicate = normalizeMediaUrl(relativeDuplicatePathUrl);
console.log('Relative duplicate path URL fix test:');
console.log(`  Original: ${relativeDuplicatePathUrl}`);
console.log(`  Normalized: ${normalizedRelativeDuplicate}`);
console.log(`  Fixed correctly: ${normalizedRelativeDuplicate === 'http://localhost:8000/uploads/talkcart/file_1760446946793_ix9n9oc37qk'}`);
console.log('');

module.exports = { isValidUrl, normalizeMediaUrl };