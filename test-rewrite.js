// Test if the rewrite rule matches our URL
const pathToRegexp = require('path-to-regexp');

// Our rewrite rule from next.config.js
const sourcePattern = '/api/:path((?!image-proxy).*)';
const sourceRegex = pathToRegexp(sourcePattern);

// Test URL
const testUrl = '/api/marketplace/products/trending';

console.log('Source pattern:', sourcePattern);
console.log('Source regex:', sourceRegex);
console.log('Test URL:', testUrl);
console.log('Does it match?', sourceRegex.test(testUrl));

// Try to match and extract params
const match = sourceRegex.exec(testUrl);
if (match) {
  console.log('Match result:', match);
  
  // Extract the path parameter
  const keys = [];
  const regexp = pathToRegexp(sourcePattern, keys);
  const result = regexp.exec(testUrl);
  
  if (result) {
    console.log('Keys:', keys);
    console.log('Result:', result);
    
    // Create params object
    const params = {};
    keys.forEach((key, index) => {
      params[key.name] = result[index + 1];
    });
    
    console.log('Params:', params);
  }
} else {
  console.log('No match found');
}