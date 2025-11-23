const fs = require('fs');
const acorn = require('acorn');

try {
  const code = fs.readFileSync('marketplace.js', 'utf8');
  acorn.parse(code, { ecmaVersion: 2020 });
  console.log('File parsed successfully');
} catch (error) {
  console.log('Parse error:', error.message);
  console.log('Line:', error.loc.line);
  console.log('Column:', error.loc.column);
}