const { proxyCloudinaryUrl } = require('./src/utils/cloudinaryProxy');
const { convertToProxyUrl } = require('./src/utils/urlConverter');

// Test URLs
const testUrls = [
  'http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
  '/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  '/cloudinary/demo/image/upload/sample.jpg'
];

console.log('Testing URL conversion functions...\n');

testUrls.forEach(url => {
  console.log('Original URL:', url);
  const converted = convertToProxyUrl(url);
  console.log('After convertToProxyUrl:', converted);
  const proxied = proxyCloudinaryUrl(url);
  console.log('After proxyCloudinaryUrl:', proxied);
  console.log('---');
});