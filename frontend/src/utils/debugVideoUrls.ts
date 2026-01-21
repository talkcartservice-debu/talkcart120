// Debug script to test video URL handling with actual problematic cases
interface MediaItem {
  id?: string;
  url?: string;
  secure_url?: string;
  resource_type?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  public_id?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  created_at?: string;
}

// Import our fixed functions
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
};

// Test function to debug media items
const debugMediaItem = (mediaItem: MediaItem) => {
  console.log('=== Debugging Media Item ===');
  console.log('Media Item:', JSON.stringify(mediaItem, null, 2));
  
  // Extract URLs
  const url = mediaItem.secure_url || mediaItem.url;
  console.log('Primary URL:', url);
  
  // Test URL validation
  const isValid = isValidUrl(url || '');
  console.log('isValidUrl:', isValid);
  
  // Test URL normalization
  const normalized = normalizeMediaUrl(url || '');
  console.log('normalizeMediaUrl:', normalized);
  
  // Check if normalized URL is valid
  const isNormalizedValid = normalized ? isValidUrl(normalized) : false;
  console.log('isNormalizedValid:', isNormalizedValid);
  
  // Additional checks
  if (normalized) {
    console.log('Starts with http:', normalized.startsWith('http://') || normalized.startsWith('https://'));
    console.log('Contains uploads/vetora/vetora:', normalized.includes('uploads/vetora/vetora/'));
  }
  
  console.log('===========================\n');
};

// Test cases based on common problematic scenarios
const testCases: MediaItem[] = [
  // Case 1: Duplicate path issue
  {
    id: 'test1',
    secure_url: 'http://localhost:8000/uploads/vetora/vetora/file_1760446946793_ix9n9oc37qk',
    resource_type: 'video',
    public_id: 'vetora/file_1760446946793_ix9n9oc37qk'
  },
  
  // Case 2: Valid local URL
  {
    id: 'test2',
    secure_url: 'http://localhost:8000/uploads/vetora/file_1760459532573_hmjwxi463j',
    resource_type: 'video',
    public_id: 'vetora/file_1760459532573_hmjwxi463j'
  },
  
  // Case 3: Cloudinary URL
  {
    id: 'test3',
    secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
    resource_type: 'video',
    public_id: 'demo/video/upload/v1234567890/sample.mp4'
  },
  
  // Case 4: Missing URL
  {
    id: 'test4',
    resource_type: 'video',
    public_id: 'vetora/missing-file'
  },
  
  // Case 5: Invalid URL format
  {
    id: 'test5',
    secure_url: 'invalid-url-format',
    resource_type: 'video',
    public_id: 'vetora/invalid-url'
  }
];

console.log('Running debug tests for video URL handling...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}:`);
  debugMediaItem(testCase);
});

export { debugMediaItem, isValidUrl, normalizeMediaUrl };