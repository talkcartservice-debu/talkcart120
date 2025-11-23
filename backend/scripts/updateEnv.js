const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env');
  process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');

// Ensure file ends with a newline to avoid concatenation issues
if (!content.endsWith('\n') && !content.endsWith('\r\n')) {
  content += '\r\n';
}

const randomHex = (lenBytes = 48) => crypto.randomBytes(lenBytes).toString('hex');

// Update JWT_SECRET if it's missing or looks like a placeholder
if (!/^JWT_SECRET=/m.test(content) || /JWT_SECRET=your-super-secret/i.test(content)) {
  const jwt = randomHex();
  if (/^JWT_SECRET=/m.test(content)) {
    content = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${jwt}`);
  } else {
    content += `JWT_SECRET=${jwt}\r\n`;
  }
}

// Ensure REFRESH_TOKEN_SECRET exists and is on its own line
if (!/^REFRESH_TOKEN_SECRET=/m.test(content)) {
  const ref = randomHex();
  content += `REFRESH_TOKEN_SECRET=${ref}\r\n`;
}

fs.writeFileSync(envPath, content);
console.log('Updated .env with secure JWT secrets.');

