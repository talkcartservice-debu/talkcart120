const fs = require('fs');
const vm = require('vm');

try {
  const code = fs.readFileSync('marketplace.js', 'utf8');
  // Try to compile the code
  new vm.Script(code);
  console.log('Syntax is valid');
} catch (error) {
  console.log('Syntax error:', error.message);
  console.log('Line:', error.lineNumber);
}