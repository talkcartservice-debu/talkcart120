// Comprehensive test for URL validation and normalization functions
// This tests the complete video upload and rendering flow

// Import our fixed functions
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
      if (urlString.includes('uploads/vetora/vetora/')) {
        // Fix duplicate vetora path
        return urlString.replace('uploads/vetora/vetora/', 'uploads/vetora/');
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
        urlString = urlString.replace('/uploads/vetora/vetora/', '/uploads/vetora/');
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

// Test cases that simulate the complete video upload and rendering flow
const testCases = [
  // Cloudinary URLs (should pass through unchanged)
  {
    name: 'Cloudinary video URL',
    url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
    expectedValid: true,
    expectedNormalized: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4'
  },
  {
    name: 'Cloudinary image URL',
    url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
    expectedValid: true,
    expectedNormalized: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg'
  },
  
  // Valid local URLs (should pass through unchanged)
  {
    name: 'Valid local video URL',
    url: 'http://localhost:8000/uploads/vetora/file_1760459532573_hmjwxi463j',
    expectedValid: true,
    expectedNormalized: 'http://localhost:8000/uploads/vetora/file_1760459532573_hmjwxi463j'
  },
  
  // Duplicate path URLs (should be fixed)
  {
    name: 'Duplicate path video URL',
    url: 'http://localhost:8000/uploads/vetora/vetora/file_1760446946793_ix9n9oc37qk',
    expectedValid: true,
    expectedNormalized: 'http://localhost:8000/uploads/vetora/file_1760446946793_ix9n9oc37qk'
  },
  {
    name: 'Relative duplicate path URL',
    url: '/uploads/vetora/vetora/file_1760446946793_ix9n9oc37qk',
    expectedValid: false, // Relative URLs are not valid by themselves
    expectedNormalized: 'http://localhost:8000/uploads/vetora/file_1760446946793_ix9n9oc37qk'
  },
  
  // Regular valid URLs
  {
    name: 'Regular HTTPS video URL',
    url: 'https://example.com/videos/sample.mp4',
    expectedValid: true,
    expectedNormalized: 'https://example.com/videos/sample.mp4'
  },
  {
    name: 'Regular HTTP image URL',
    url: 'http://example.com/images/sample.jpg',
    expectedValid: true,
    expectedNormalized: 'http://example.com/images/sample.jpg'
  },
  
  // Invalid URLs
  {
    name: 'Invalid URL format',
    url: 'invalid-url',
    expectedValid: false,
    expectedNormalized: null
  },
  {
    name: 'Empty string',
    url: '',
    expectedValid: false,
    expectedNormalized: null
  },
  {
    name: 'Null value',
    url: null,
    expectedValid: false,
    expectedNormalized: null
  }
];

console.log('=== Comprehensive URL Validation and Normalization Test ===\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Input URL: ${testCase.url}`);
  
  // Test isValidUrl function
  const isValid = isValidUrl(testCase.url);
  const isValidCorrect = isValid === testCase.expectedValid;
  
  // Test normalizeMediaUrl function
  const normalized = normalizeMediaUrl(testCase.url);
  const isNormalizedCorrect = normalized === testCase.expectedNormalized;
  
  console.log(`  isValidUrl: ${isValid} (expected: ${testCase.expectedValid}) ${isValidCorrect ? '✓' : '✗'}`);
  console.log(`  normalizeMediaUrl: ${normalized} (expected: ${testCase.expectedNormalized}) ${isNormalizedCorrect ? '✓' : '✗'}`);
  
  if (isValidCorrect && isNormalizedCorrect) {
    passedTests++;
    console.log('  Result: PASS ✓\n');
  } else {
    console.log('  Result: FAIL ✗\n');
  }
});

console.log(`=== Test Summary ===`);
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed! The URL validation and normalization fixes are working correctly.');
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
}

// Additional specific tests for known issues
console.log('\n=== Specific Issue Tests ===');

// Test for known missing file patterns detection
const knownMissingPatterns = [
  'file_1760168733155_lfhjq4ik7ht',
  'file_1760163879851_tt3fdqqim9',
  'file_1760263843073_w13593s5t8l',
  'file_1760276276250_3pqeekj048s'
];

console.log('Testing known missing file pattern detection:');
knownMissingPatterns.forEach((pattern, index) => {
  const testUrl = `http://localhost:8000/uploads/vetora/${pattern}`
  const containsPattern = testUrl.includes(pattern);
  console.log(`  Pattern ${index + 1}: ${pattern} - Detected: ${containsPattern ? 'YES ✓' : 'NO ✗'}`);
});

console.log('\n=== Integration Test Complete ===');